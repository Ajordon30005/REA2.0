import { z } from "incur";
import { constants as bufferConstants } from "node:buffer";
import { createMarvosaService } from "../composition/marvosa.js";
import { CLI_COMMANDS } from "../cliCommandNames.js";
import { AnalysisInputError } from "../domain/analysisErrorCore.js";
import { absoluteCallerPath } from "../filesystem/callerPath.js";
import { readStableArtifact } from "../artifacts/readStableArtifact.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { withCommandCancellation } from "./commandCancellation.js";
import { finishAnalysisCommand } from "./finishAnalysisCommand.js";
import { logCliCommand } from "../cliLogging.js";
/** Native CLI commands use the same service and schemas as MCP. */
export const registerMarvosaCommands = (cli, logger, environment) => {
    const service = createMarvosaService(environment);
    const run = (operation, input) => withCommandCancellation((signal) => logCliCommand(logger, operation, () => finishAnalysisCommand(() => service.execute(operation, input, { signal }), service, "marvosa", operation, signal)));
    for (const [command, operation] of [
        [CLI_COMMANDS.hclTranscribe, "hcl_transcribe"],
        [CLI_COMMANDS.hclRun, "hcl_run"],
    ]) {
        cli.command(command, {
            description: operation === "hcl_transcribe"
                ? "Analyze complete sources in HCL while emitting an executable HCL operation graph"
                : "Run a saved HCL graph through the original Marvosa primitives",
            args: z.object({
                path: z
                    .string()
                    .describe("Source file/directory or saved HCL program JSON"),
            }),
            options: z.object({
                verifyMemory: z
                    .boolean()
                    .optional()
                    .describe("Verify a complete source-memory round trip during transcription"),
                entry: z
                    .string()
                    .optional()
                    .describe("Function/export to run; default selects default export/data"),
                module: z
                    .string()
                    .optional()
                    .describe("Exact module path within a multi-file program"),
                arguments: z
                    .string()
                    .optional()
                    .describe("JSON argument array; decimal tokens remain exact"),
                keywords: z
                    .string()
                    .optional()
                    .describe("JSON keyword arguments for Python"),
                calls: z
                    .string()
                    .optional()
                    .describe("JSON array of calls with entry, module and arguments_json fields"),
                language: z
                    .enum(["auto", "python", "javascript", "wasm", "json", "text"])
                    .optional(),
                query: z
                    .string()
                    .optional()
                    .describe("Source recall through native HCL LivingMemory"),
            }),
            run: ({ args, options }) => {
                if (options.calls !== undefined &&
                    (options.entry !== undefined ||
                        options.module !== undefined ||
                        options.arguments !== undefined ||
                        options.keywords !== undefined))
                    throw new AnalysisInputError(operation, {
                        userMessage: "Use --calls or the individual call options",
                    });
                if (options.entry === undefined &&
                    options.calls === undefined &&
                    (options.arguments !== undefined ||
                        options.module !== undefined ||
                        options.keywords !== undefined))
                    throw new AnalysisInputError(operation, {
                        userMessage: "Call options require --entry",
                    });
                if (operation === "hcl_run" &&
                    (options.language !== undefined ||
                        options.query !== undefined ||
                        options.verifyMemory !== undefined))
                    throw new AnalysisInputError(operation, {
                        userMessage: "--language, --query and --verify-memory apply to source transcription",
                    });
                const calls = options.calls !== undefined
                    ? JSON.parse(options.calls)
                    : options.entry === undefined
                        ? []
                        : [
                            {
                                entry: options.entry,
                                ...(options.module === undefined
                                    ? {}
                                    : { module: options.module }),
                                ...(options.arguments === undefined
                                    ? {}
                                    : { arguments_json: options.arguments }),
                                ...(options.keywords === undefined
                                    ? {}
                                    : { keywords_json: options.keywords }),
                            },
                        ];
                return run(operation, {
                    path: absoluteCallerPath(args.path),
                    calls,
                    ...(options.verifyMemory === undefined
                        ? {}
                        : { verify_memory: options.verifyMemory }),
                    ...(options.language === undefined
                        ? {}
                        : { language: options.language }),
                    ...(options.query === undefined ? {} : { query: options.query }),
                });
            },
        });
    }
    cli.command(CLI_COMMANDS.hclCalculate, {
        description: "Evaluate through Marvosa HCL with a complete integer operation trace",
        args: z.object({
            expression: z.string().describe("HCL scalar expression to evaluate"),
        }),
        options: z.object({
            variable: z
                .array(z.string())
                .optional()
                .describe("Repeat NAME=DECIMAL; values remain strings"),
        }),
        run: ({ args, options }) => {
            const variables = {};
            for (const binding of options.variable ?? []) {
                const split = binding.indexOf("=");
                if (split < 1 || Object.hasOwn(variables, binding.slice(0, split)))
                    throw new AnalysisInputError("hcl_calculate", {
                        userMessage: "Use unique NAME=DECIMAL variable bindings",
                    });
                variables[binding.slice(0, split)] = binding.slice(split + 1);
            }
            return run("hcl_calculate", { expression: args.expression, variables });
        },
    });
    cli.command(CLI_COMMANDS.hclRememberEvidence, {
        description: "Retain a JSON evidence file in a persistent HCL investigation case",
        args: z.object({
            casePath: z.string().describe("Local investigation case directory"),
            file: z.string().describe("Complete JSON evidence file to retain"),
        }),
        options: z.object({
            source: z
                .string()
                .optional()
                .describe("Stable provenance label for version comparisons"),
        }),
        run: ({ args, options }) => withCommandCancellation((signal) => {
            const scope = new ArtifactResourceScope();
            return finishAnalysisCommand(async () => {
                const path = absoluteCallerPath(args.file);
                const snapshot = await readStableArtifact(path, bufferConstants.MAX_LENGTH, signal, undefined, scope);
                const raw = new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes);
                return service.execute("hcl_remember_evidence", {
                    case_path: absoluteCallerPath(args.casePath),
                    entries: [{ source: options.source ?? path, raw_json: raw }],
                }, { signal });
            }, {
                close: async () => {
                    const results = await Promise.allSettled([
                        service.close(),
                        scope.close(),
                    ]);
                    const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
                    if (failures.length)
                        throw new AggregateError(failures, "Marvosa CLI cleanup failed");
                },
            }, "marvosa", "hcl_remember_evidence", signal);
        }),
    });
    cli.command(CLI_COMMANDS.hclRecallEvidence, {
        description: "Recall evidence by native HCL resonance and return provenance",
        args: z.object({
            casePath: z.string().describe("Local investigation case directory"),
            query: z.string().describe("Text to match through native HCL resonance"),
        }),
        options: z.object({
            limit: z
                .number()
                .int()
                .min(1)
                .optional()
                .describe("Requested number of ranked evidence records"),
            confidence: z
                .enum(["observed", "derived", "inferred", "unknown"])
                .optional()
                .describe("Select records with this retained confidence label"),
        }),
        run: ({ args, options }) => run("hcl_recall_evidence", {
            case_path: absoluteCallerPath(args.casePath),
            query: args.query,
            ...(options.limit === undefined ? {} : { limit: options.limit }),
            ...(options.confidence === undefined
                ? {}
                : { confidence: options.confidence }),
        }),
    });
    cli.command(CLI_COMMANDS.hclGetEvidence, {
        description: "Recover one evidence record with verified HVP transduction",
        args: z.object({
            casePath: z.string().describe("Local investigation case directory"),
            recordId: z
                .string()
                .describe("Record identity returned by remember or recall"),
        }),
        run: ({ args }) => run("hcl_get_evidence", {
            case_path: absoluteCallerPath(args.casePath),
            record_id: args.recordId,
        }),
    });
    cli.command(CLI_COMMANDS.hclInspectCase, {
        description: "Inspect case topology, provenance coverage and unresolved evidence links",
        args: z.object({
            casePath: z
                .string()
                .describe("Local investigation case directory to inspect"),
        }),
        run: ({ args }) => run("hcl_inspect_case", { case_path: absoluteCallerPath(args.casePath) }),
    });
    cli.command(CLI_COMMANDS.hclVerifyCase, {
        description: "Verify every record, HVP address and composite memory line",
        args: z.object({
            casePath: z
                .string()
                .describe("Local investigation case directory to verify"),
        }),
        run: ({ args }) => run("hcl_verify_case", { case_path: absoluteCallerPath(args.casePath) }),
    });
    cli.command(CLI_COMMANDS.hclCompareCases, {
        description: "Compare exact evidence sets across two investigation cases",
        args: z.object({
            leftCase: z.string().describe("First local investigation case directory"),
            rightCase: z
                .string()
                .describe("Second local investigation case directory"),
        }),
        run: ({ args }) => run("hcl_compare_cases", {
            left_case: absoluteCallerPath(args.leftCase),
            right_case: absoluteCallerPath(args.rightCase),
        }),
    });
};
