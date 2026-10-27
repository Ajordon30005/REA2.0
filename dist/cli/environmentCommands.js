import { absoluteCallerPath } from "../filesystem/callerPath.js";
import { z } from "incur";
import { CLI_COMMANDS } from "../cliCommandNames.js";
import { parseCliJsonInput } from "../cliJsonInput.js";
import { logCliCommand } from "../cliLogging.js";
import { parseEnvironmentName } from "../config/environmentName.js";
import { parseMcpHttpEndpoint, mcpHttpListenerPortSchema, } from "../config/mcpHttpEndpoint.js";
import { AnalysisCancelledError, AnalysisResourceConstraintError, } from "../domain/analysisErrorCore.js";
import { projectAnalysisError } from "../domain/analysisErrorProjection.js";
import { err, ok } from "../domain/result.js";
import { createLogger } from "../logger.js";
import { withCommandCancellation } from "./commandCancellation.js";
/** Same envelope label as the other JSON-input commands and `parseCliJsonInput`. */
const cliError = (error) => ({
    error: "Application workflow failed",
    ...projectAnalysisError(error),
});
/** The listener announces its URL at info like `rea mcp --http`; an explicit REA_LOG_LEVEL still wins. */
const listenerLogger = (environment, logger) => environment.REA_LOG_LEVEL === undefined
    ? createLogger("cli", "info")
    : logger;
/** Resolve until the one-shot signal requests shutdown. */
const untilAborted = (signal) => new Promise((resolve) => {
    if (signal.aborted)
        resolve(undefined);
    else
        signal.addEventListener("abort", () => resolve(undefined), {
            once: true,
        });
});
/** A listener failure as the command's typed refusal. */
export const transportError = (endpoint, cause) => new AnalysisResourceConstraintError(CLI_COMMANDS.environmentServe, "transport", cause.message, { host: endpoint.host, port: endpoint.port }, {
    cause,
    retryable: false,
    diagnostics: {
        listener_failure: cause.classification.ok
            ? {
                kind: cause.classification.value.kind,
                system_code: cause.classification.value.systemCode,
            }
            : {
                kind: cause.classification.error.kind,
                ...(cause.classification.error.systemCode === undefined
                    ? {}
                    : { system_code: cause.classification.error.systemCode }),
            },
        listener_phase: cause.phase,
    },
    remediationAction: listenerRemediation(cause.classification),
});
const listenerRemediation = (classification) => {
    if (!classification.ok)
        return "Check the selected listener host, port, and binding permissions, then retry.";
    switch (classification.value.kind) {
        case "host_lookup":
            return "Check --host or MCP_HOST and host name resolution; correct the value or resolve the lookup failure, then retry.";
        case "host_unavailable":
            return "Choose an address assigned to this machine with --host or MCP_HOST, then retry.";
        case "port_in_use":
            return "Choose another --port or MCP_PORT, or stop the process using it.";
        case "permission_denied":
            return "Choose a host and port this process is permitted to bind; if the selected port is restricted, use an allowed port.";
    }
};
const cancelledServe = () => cliError(new AnalysisCancelledError(CLI_COMMANDS.environmentServe));
/** Pure replay, as `--replay-only` asks for: no state is derived. */
const REPLAY_ONLY = {
    state: undefined,
    report: { served: false, reason: "replay-only" },
};
/** Read and authenticate the manifest and capture, then prepare the state under the served name unless pure replay is asked for; a refusal is the command's output. */
const loadServeInputs = async (input, environmentName, signal) => {
    const read = (path) => parseCliJsonInput(path, CLI_COMMANDS.environmentServe, signal, {
        snapshot: true,
    });
    const manifest = await read(input.manifest);
    if (!manifest.ok)
        return manifest;
    const evidence = await read(input.evidence);
    if (!evidence.ok)
        return evidence;
    const { loadEnvironmentSource } = await import("../application/environment/environmentSource.js");
    if (signal.aborted)
        return err(cancelledServe());
    const source = loadEnvironmentSource(manifest.value, evidence.value);
    if (!source.ok)
        return err(cliError(source.error));
    if (input.replayOnly)
        return ok({ source: source.value, served: REPLAY_ONLY });
    const { prepareServedState } = await import("../application/environment/environmentState.js");
    if (signal.aborted)
        return err(cancelledServe());
    return ok({
        source: source.value,
        served: prepareServedState(source.value, evidence.value, {
            name: environmentName,
        }),
    });
};
/** Load the Evidence files, bind the listener and run until a signal ends it. */
const serveEnvironmentCommand = async (input, environment, logger, signal) => {
    if (signal.aborted)
        return cancelledServe();
    const endpoint = parseMcpHttpEndpoint(environment, {
        ...(input.host === undefined ? {} : { host: input.host }),
        ...(input.port === undefined ? {} : { port: input.port }),
    });
    if (!endpoint.ok)
        return cliError(endpoint.error);
    const environmentName = parseEnvironmentName(environment);
    if (!environmentName.ok)
        return cliError(environmentName.error);
    const inputs = await loadServeInputs(input, environmentName.value, signal);
    if (!inputs.ok)
        return inputs.error;
    const { source, served: { state, report }, } = inputs.value;
    const commandLogger = listenerLogger(environment, logger);
    if (!report.served && report.reason === "unavailable")
        commandLogger.warn({ code: report.code, error: report.message }, "Environment state unavailable; serving recorded replay");
    if (signal.aborted)
        return cancelledServe();
    // Loaded here so registering the command catalog never loads the HTTP listener.
    const { serveEnvironment } = await import("../server/environment/serveEnvironment.js");
    const { StreamableHttpListenError } = await import("../server/http/streamableHttpListenError.js");
    if (signal.aborted)
        return cancelledServe();
    // A listener that fails after binding ends the command instead of serving nothing.
    let failListener = () => undefined;
    const listenerFailed = new Promise((resolve) => {
        failListener = resolve;
    });
    let served;
    try {
        const started = await serveEnvironment({
            source,
            ...(state === undefined ? {} : { state }),
            signal,
            ...endpoint.value,
            ...(environmentName.value === undefined
                ? {}
                : { environmentName: environmentName.value }),
            logger: commandLogger,
            onerror: failListener,
        });
        if (!started.ok)
            return cliError(started.error);
        served = started.value;
    }
    catch (cause) {
        if (signal.aborted && cause === signal.reason)
            return cancelledServe();
        if (!(cause instanceof StreamableHttpListenError))
            throw cause;
        return cliError(transportError(endpoint.value, cause));
    }
    let failure;
    try {
        failure = await Promise.race([untilAborted(signal), listenerFailed]);
    }
    finally {
        await served.close();
    }
    if (failure !== undefined)
        return cliError(transportError(endpoint.value, failure));
    return {
        status: "stopped",
        url: served.url,
        environment: served.card.name,
        tools: served.card.capabilities.tools.length,
        evidence_id: source.evidenceId,
        manifest_evidence_id: source.manifestEvidenceId,
        state: report,
    };
};
/** The written files with sizes, whether the bundle serves the state, and the pinned package source, as the command prints them. */
const exportDocument = (result) => ({
    status: result.status,
    directory: result.directory,
    name: result.name,
    tool_count: result.tool_count,
    evidence_id: result.evidence_id,
    manifest_evidence_id: result.manifest_evidence_id,
    state: result.state,
    package_source: result.package_source,
    files: result.files.map(({ path, bytes }) => ({ path, bytes })),
});
/** Read each file once, authenticate the pair as the serve command does, then write the bundle from the same bytes. */
const exportEnvironmentCommand = async (input) => {
    const { readEnvironmentExportInputs, exportEnvironmentBundle } = await import("../application/environment/environmentExport.js");
    const inputs = await readEnvironmentExportInputs(input.manifest, input.evidence);
    if (!inputs.ok)
        return cliError(inputs.error);
    // Loaded here, as for environment-serve, so registering the command catalog never loads it.
    const { loadEnvironmentSource } = await import("../application/environment/environmentSource.js");
    const source = loadEnvironmentSource(inputs.value.manifest.value, inputs.value.evidence.value, CLI_COMMANDS.environmentExport);
    if (!source.ok)
        return cliError(source.error);
    const exported = await exportEnvironmentBundle({
        ...inputs.value,
        source: source.value,
        directory: absoluteCallerPath(input.directory),
        name: input.name,
        packageTarball: input.packageTarball === undefined
            ? undefined
            : absoluteCallerPath(input.packageTarball),
    });
    return exported.ok
        ? exportDocument(exported.value)
        : cliError(exported.error);
};
const manifestArgument = z
    .string()
    .describe("Environment manifest Evidence JSON path (inspect-analysis-view environment-manifest output)");
const evidenceOption = z
    .string()
    .describe("Parent capture Evidence JSON path (inspect-web-network-capture or capture-browser-scenario output) the manifest cites");
/** Register the one-shot bundle export command. */
const registerExportCommand = (cli, logger) => {
    cli.command(CLI_COMMANDS.environmentExport, {
        description: "Export an environment manifest and its capture Evidence as an agent environment bundle folder the agentenv framework runs with agent-env run",
        args: z.object({
            manifest: manifestArgument,
            directory: z
                .string()
                .describe("Bundle directory to create; must be absent or empty, nothing is overwritten"),
        }),
        options: z.object({
            evidence: evidenceOption,
            packageTarball: z
                .string()
                .optional()
                .describe("Packed rea-agents tarball (npm pack) copied into the env folder and installed by the Dockerfile instead of the registry package pinned to this version"),
            name: z
                .string()
                .optional()
                .describe("Env folder and env id (kebab-case); default the manifest's name"),
        }),
        run: ({ args, options }) => logCliCommand(logger, CLI_COMMANDS.environmentExport, () => exportEnvironmentCommand({
            manifest: args.manifest,
            evidence: options.evidence,
            directory: args.directory,
            packageTarball: options.packageTarball,
            name: options.name,
        })),
    });
};
/** Register the long-running agent environment server command and the bundle export. */
export const registerEnvironmentCommands = (cli, logger, environment) => {
    registerExportCommand(cli, logger);
    cli.command(CLI_COMMANDS.environmentServe, {
        description: "Serve an environment manifest as an agent environment over streamable HTTP until SIGINT or SIGTERM: read tools answer from the state the capture observed, derived at startup, or every tool replays retained capture records with --replay-only or when the state is unavailable",
        args: z.object({ manifest: manifestArgument }),
        options: z.object({
            evidence: evidenceOption,
            replayOnly: z
                .boolean()
                .default(false)
                .describe("Serve pure replay: derive no state, serve every manifest tool from its retained records and answer every /agentenv method as not found"),
            host: z
                .string()
                .min(1)
                .optional()
                .describe("Listener address; default MCP_HOST, else 127.0.0.1"),
            port: mcpHttpListenerPortSchema
                .optional()
                .describe("Listener port; default MCP_PORT, else 0 for an ephemeral port"),
        }),
        run: ({ args, options }) => withCommandCancellation((signal) => logCliCommand(logger, CLI_COMMANDS.environmentServe, () => serveEnvironmentCommand({
            manifest: args.manifest,
            evidence: options.evidence,
            replayOnly: options.replayOnly,
            host: options.host,
            port: options.port,
        }, environment, logger, signal))),
    });
};
