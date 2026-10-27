import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { AnalysisError } from "../domain/analysisErrorBase.js";
import { AnalysisCancelledError, AnalysisInputError, AnalysisOutputError, AnalysisResourceConstraintError, } from "../domain/analysisErrorCore.js";
import { ProviderCleanupError } from "../domain/providerCleanupError.js";
import { EvidenceIntegrityError } from "../domain/evidenceErrors.js";
import { jsonObjectSchema } from "../domain/jsonValue.js";
import { err, ok } from "../domain/result.js";
import { OwnedCommandFailure, runOwnedCommandUntilCancelled, } from "../process/OwnedCommand.js";
import { PrivateRuntimeRoot } from "../process/PrivateRuntimeRoot.js";
import { snapshotEnvironment } from "../process/snapshotEnvironment.js";
import { ArtifactResourceScope } from "../artifacts/ArtifactResourceScope.js";
import { prepareMarvosaSourceInput } from "./MarvosaSourceInput.js";
// Diagnostics are separate from complete result delivery through the owned file.
const DIAGNOSTIC_BYTES = 64 * 1024;
const replySchema = z.discriminatedUnion("ok", [
    z.strictObject({ ok: z.literal(true), result: jsonObjectSchema }),
    z.strictObject({
        ok: z.literal(false),
        error: z.strictObject({ code: z.string(), message: z.string() }),
    }),
]);
/** One-shot pinned Python workers using REA's existing process ownership. */
export class MarvosaBridge {
    #environment;
    #active = new Map();
    #retained = new Set();
    #closing = false;
    constructor(environment) {
        this.#environment = snapshotEnvironment(environment);
    }
    async execute(operation, input, options) {
        if (options?.signal?.aborted)
            return err(new AnalysisCancelledError(operation, { cause: options.signal.reason }));
        if (this.#closing || this.#retained.size > 0)
            return err(new AnalysisResourceConstraintError(operation, "capacity", "Marvosa is closing or cleanup remains pending", { pending_cleanup: this.#retained.size }, { retryable: true }));
        const controller = new AbortController();
        const signal = options?.signal === undefined
            ? controller.signal
            : AbortSignal.any([controller.signal, options.signal]);
        const running = this.#run(operation, input, signal);
        this.#active.set(running, controller);
        try {
            return await running;
        }
        finally {
            this.#active.delete(running);
        }
    }
    async #run(operation, input, signal) {
        const resources = {};
        let result;
        try {
            let workerInput = input;
            if (operation === "hcl_transcribe" || operation === "hcl_run") {
                resources.sources = new ArtifactResourceScope();
                workerInput = await prepareMarvosaSourceInput(operation, input, resources.sources, signal);
            }
            const payload = JSON.stringify({ operation, input: workerInput });
            signal.throwIfAborted();
            resources.root = await PrivateRuntimeRoot.create({
                prefix: "rea-marvosa-",
            });
            const requestPath = join(resources.root.path, "request.json");
            const responsePath = join(resources.root.path, "response.json");
            await writeFile(requestPath, payload, { flag: "wx", mode: 0o600 });
            await runOwnedCommandUntilCancelled({
                command: this.#environment.REA_MARVOSA_PYTHON ??
                    (process.platform === "win32" ? "python" : "python3"),
                arguments: [
                    "-I",
                    "-B",
                    fileURLToPath(new URL("../../bridge/marvosa/rea_hcl.py", import.meta.url)),
                    "--request",
                    requestPath,
                    "--response",
                    responsePath,
                ],
                expectedCommand: null,
                runId: `rea-marvosa-${randomUUID()}`,
                cwd: resources.root.path,
                hostEnvironment: this.#environment,
                env: { ...this.#environment, MARVOSA_PREC: "40" },
            }, { diagnosticBytes: DIAGNOSTIC_BYTES }, {
                signal,
                retainCleanup: (owner) => {
                    resources.process = owner;
                },
            });
            signal.throwIfAborted();
            const reply = replySchema.parse(JSON.parse(await readFile(responsePath, "utf8")));
            if (!reply.ok && reply.error.code === "IntegrityError")
                throw new EvidenceIntegrityError(reply.error.message, {
                    userMessage: reply.error.message,
                });
            if (!reply.ok)
                throw new AnalysisInputError(operation, {
                    userMessage: reply.error.message,
                    diagnostics: { worker_code: reply.error.code },
                });
            result = ok(reply.result);
        }
        catch (cause) {
            const diagnostics = operation === "hcl_remember_evidence"
                ? {
                    commit_status: "Unknown on interrupted delivery; inspect the selected case. Repeating identical entries is idempotent.",
                }
                : {};
            if (cause instanceof AnalysisError)
                result = err(cause);
            else if ((cause instanceof OwnedCommandFailure &&
                cause.cancellation !== undefined) ||
                signal.aborted)
                result = err(new AnalysisCancelledError(operation, {
                    cause: signal.reason,
                    diagnostics,
                }));
            else
                result = err(new AnalysisOutputError(operation, cause instanceof Error ? cause.message : String(cause), { cause, diagnostics }));
        }
        try {
            await this.#release(resources);
        }
        catch (cause) {
            this.#retained.add(resources);
            const marker = new ProviderCleanupError("marvosa", [resources.root?.path ?? "Marvosa worker"], { reason: cause instanceof Error ? cause.message : String(cause) }, { operation, cause });
            resources.marker = marker;
            if (result.ok)
                marker.retainDiagnostics({ completed_result: result.value });
            else
                marker.retainSecondaryFailure(result.error);
            return err(marker);
        }
        if (result.ok && signal.aborted)
            return err(new AnalysisCancelledError(operation, {
                cause: signal.reason,
                diagnostics: { completed_result: result.value },
            }));
        return result;
    }
    async #release(resources) {
        if (resources.process !== undefined) {
            const stopped = await resources.process.stop();
            if (stopped.status === "incomplete")
                throw new Error(stopped.reason);
            delete resources.process;
        }
        await resources.sources?.close();
        delete resources.sources;
        await resources.root?.close();
        delete resources.root;
        resources.marker?.resolveCleanup();
        this.#retained.delete(resources);
    }
    async close() {
        this.#closing = true;
        for (const controller of this.#active.values())
            controller.abort(new Error("Marvosa provider shutdown"));
        await Promise.allSettled(this.#active.keys());
        const failures = [];
        for (const resources of this.#retained) {
            try {
                await this.#release(resources);
            }
            catch (cause) {
                failures.push(cause);
            }
        }
        if (failures.length > 0)
            throw new AggregateError(failures, "Marvosa cleanup remains pending");
        this.#closing = false;
    }
}
