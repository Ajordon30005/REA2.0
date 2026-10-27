import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { AnalysisCancelledError, AnalysisInputError, bufferedJsonParts, canonicalJsonParts, init_analysisErrorCore, init_jsonSerialization, init_jsonValue, jsonValueSchema } from "./jsonSerialization-BNsB4Jxk.js";
import { EvidenceFileError, EvidenceIntegrityError, init_evidenceErrors } from "./cliResultOutput-BfQ9qNAk.js";
import { createImmutableEvidenceBundle, describeEvidenceBundleFailure, describeValidationFailure, err, init_evidenceBundle, init_processCaptureParsing, init_result, ok, parseEvidenceBundle, parseImmutableEvidenceBundle, parseProcessCapture } from "./reconstructionObligationLedgerSchemas-DY5ovcSC.js";
import { ArtifactResourceScope, init_ArtifactResourceScope } from "./ArtifactResourceScope-CUj-RaaF.js";
import { absoluteCallerPath, init_callerPath } from "./callerPath-D1wtkHi_.js";
import { init_AnalysisViewService, inspectAnalysisViewValidated } from "./AnalysisViewService-DxKKyDxp.js";
import { init_JsonAuthenticationHeadroom, requireAuthenticationHeadroom } from "./JsonAuthenticationHeadroom-7YzbtnRu.js";
import { init_JsonFiles, readJsonFile, writeTextParts } from "./JsonFiles-DABxEMVV.js";
import { compareBundles, init_bundleComparison } from "./toolOutputSchemaGroups-DBB3-BTZ.js";
import { setImmediate } from "node:timers/promises";

//#region dist/process/queuedInterrupts.js
var dispatchQueuedInterrupts;
function init_queuedInterrupts() {
	return (init_queuedInterrupts = __esmMin((() => {
		dispatchQueuedInterrupts = async () => {
			await setImmediate();
			await setImmediate();
		};
	})))();
}

//#endregion
//#region dist/application/EvidenceBundleFiles.js
var readEvidenceBundle, readImmutableEvidenceBundle, readBundle, writeEvidenceBundle;
function init_EvidenceBundleFiles() {
	return (init_EvidenceBundleFiles = __esmMin((() => {
		init_JsonAuthenticationHeadroom();
		init_callerPath();
		init_evidenceBundle();
		init_evidenceErrors();
		init_result();
		init_analysisErrorCore();
		init_processCaptureParsing();
		init_jsonSerialization();
		init_JsonFiles();
		readEvidenceBundle = (path, signal, resources, operation = "import_evidence_bundle") => readBundle(path, parseEvidenceBundle, signal, resources, operation);
		readImmutableEvidenceBundle = (path, signal, resources, operation = "import_evidence_bundle") => readBundle(path, parseImmutableEvidenceBundle, signal, resources, operation);
		readBundle = async (path, parseBundle, signal, resources, operation = "import_evidence_bundle") => {
			if (signal?.aborted) return err(new AnalysisCancelledError(operation, { cause: signal.reason }));
			const loaded = await readJsonFile(path, signal, resources, operation);
			if (!loaded.ok) return loaded;
			if (signal?.aborted) return err(new AnalysisCancelledError(operation, { cause: signal.reason }));
			const headroom = requireAuthenticationHeadroom(loaded.value, {
				operation,
				path: absoluteCallerPath(path),
				description: "Insufficient heap headroom to authenticate the Evidence bundle"
			});
			if (!headroom.ok) return headroom;
			let bundle;
			try {
				bundle = parseBundle(loaded.value);
			} catch (cause) {
				const failure = describeEvidenceBundleFailure(loaded.value, cause);
				if (failure.kind === "single-record") return err(new EvidenceFileError("read", "wrong-kind", {
					path: absoluteCallerPath(path),
					cause,
					userMessage: failure.message
				}));
				return err(new EvidenceIntegrityError("Evidence bundle validation failed", {
					cause,
					userMessage: failure.message
				}));
			}
			for (const record of bundle.records) {
				if (record.predicate_type !== "rea.process-capture") continue;
				try {
					parseProcessCapture(record.normalized_result);
				} catch (cause) {
					return err(new EvidenceIntegrityError("Evidence bundle validation failed", {
						cause,
						userMessage: `Process capture record ${record.evidence_id} has an invalid normalized_result (${describeValidationFailure(cause)}). Recreate or re-export the bundle, then try again.`
					}));
				}
			}
			return ok(bundle);
		};
		writeEvidenceBundle = async (bundle, path, overwrite, resources, signal, operation = "export_evidence_bundle") => {
			if (signal?.aborted === true) return err(new AnalysisCancelledError(operation, { cause: signal.reason }));
			let checked;
			try {
				checked = parseEvidenceBundle(bundle);
			} catch (cause) {
				return err(new EvidenceIntegrityError("Evidence bundle validation failed", { cause }));
			}
			return writeTextParts(bufferedJsonParts(canonicalJsonParts(checked)), path, overwrite, resources, signal === undefined ? undefined : {
				signal,
				operation
			});
		};
	})))();
}

//#endregion
//#region dist/application/EvidenceBundleCommands.js
var importEvidenceBundleCommand, exportEvidenceBundleCommand, deliverAnalysisEvidence, publishEvidenceDelivery, inspectAnalysisViewFromBundle, persistEvidenceBundleCommand, compareEvidenceBundlesCommand, projectWrite;
function init_EvidenceBundleCommands() {
	return (init_EvidenceBundleCommands = __esmMin((() => {
		init_queuedInterrupts();
		init_callerPath();
		init_JsonAuthenticationHeadroom();
		init_evidenceErrors();
		init_analysisErrorCore();
		init_evidenceBundle();
		init_jsonValue();
		init_result();
		init_bundleComparison();
		init_ArtifactResourceScope();
		init_EvidenceBundleFiles();
		init_AnalysisViewService();
		importEvidenceBundleCommand = async (path) => {
			const loaded = await readEvidenceBundle(path, undefined, undefined, "import_evidence_bundle");
			if (!loaded.ok) return loaded;
			return ok({
				imported: loaded.value.records.length,
				unknowns_added: loaded.value.unknowns.length,
				total: loaded.value.records.length
			});
		};
		exportEvidenceBundleCommand = async (sourcePath, outputPath, overwrite) => {
			const loaded = await readImmutableEvidenceBundle(sourcePath, undefined, undefined, "export_evidence_bundle");
			if (!loaded.ok) return loaded;
			return projectWrite(loaded.value, await persistEvidenceBundleCommand(loaded.value, outputPath, overwrite));
		};
		deliverAnalysisEvidence = async (evidence, outputPath, detail = "complete", signal) => {
			const headroom = requireAuthenticationHeadroom(evidence, {
				operation: evidence.operation,
				path: absoluteCallerPath(outputPath),
				description: "Insufficient heap headroom to authenticate the complete parent Evidence"
			});
			if (!headroom.ok) return err(headroom.error.retainPartialObservation(evidence));
			const bundle = createImmutableEvidenceBundle([evidence]);
			const delivered = detail === "summary" ? inspectAnalysisViewValidated({
				source: {
					kind: "retained-evidence",
					evidence_id: evidence.evidence_id
				},
				view: { kind: "summary" }
			}, (id) => bundle.records.find((record) => record.evidence_id === id)) : ok(evidence);
			if (!delivered.ok) return delivered;
			const published = await publishEvidenceDelivery({
				bundle,
				complete: evidence,
				delivered: delivered.value,
				outputPath,
				operation: evidence.operation,
				signal
			});
			return published.ok ? ok(published.value.delivered) : published;
		};
		publishEvidenceDelivery = async (input) => {
			const { signal, operation } = input;
			const written = await persistEvidenceBundleCommand(input.bundle, input.outputPath, false, signal, operation);
			await dispatchQueuedInterrupts();
			if (!written.ok) return err(written.error.retainPartialObservation(input.complete));
			if (signal?.aborted) return err(new AnalysisCancelledError(operation, {
				cause: signal.reason,
				partialObservation: input.delivered,
				diagnostics: { evidence_bundle: { ...written.value } }
			}));
			return ok({
				delivered: input.delivered,
				evidenceBundle: written.value
			});
		};
		inspectAnalysisViewFromBundle = async (input, bundlePath, resources, signal) => {
			if (input.source.kind !== "retained-evidence") return err(new AnalysisInputError("inspect_analysis_view", undefined, [{
				path: ["source", "kind"],
				reason: "invalid_value",
				message: "--evidence-bundle requires a retained-evidence source with the exact parent evidence_id; inline Evidence already supplies its source"
			}]));
			const loaded = await readImmutableEvidenceBundle(bundlePath, signal, resources, "inspect_analysis_view");
			await dispatchQueuedInterrupts();
			if (!loaded.ok) return loaded;
			if (signal?.aborted) return err(new AnalysisCancelledError("inspect_analysis_view", { cause: signal.reason }));
			const projected = inspectAnalysisViewValidated(input, (id) => loaded.value.records.find((record) => record.evidence_id === id));
			await dispatchQueuedInterrupts();
			if (projected.ok && signal?.aborted) return err(new AnalysisCancelledError("inspect_analysis_view", {
				cause: signal.reason,
				partialObservation: projected.value
			}));
			return projected;
		};
		persistEvidenceBundleCommand = async (bundle, outputPath, overwrite, signal, operation) => {
			const resources = new ArtifactResourceScope();
			const written = await writeEvidenceBundle(bundle, outputPath, overwrite, resources, signal, operation);
			if (written.ok) return written;
			await resources.close().catch(() => undefined);
			if (!written.error.cleanupIncomplete && written.error instanceof EvidenceFileError && written.error.published) {
				return ok(written.error.published);
			}
			return written;
		};
		compareEvidenceBundlesCommand = async (input) => {
			const [left, right] = await Promise.all([readImmutableEvidenceBundle(input.leftPath, undefined, undefined, "compare_bundles"), readImmutableEvidenceBundle(input.rightPath, undefined, undefined, "compare_bundles")]);
			if (!left.ok) return left;
			if (!right.ok) return right;
			try {
				return ok(jsonValueSchema.parse(compareBundles(left.value, right.value)));
			} catch (cause) {
				return err(new EvidenceIntegrityError("Evidence bundle comparison failed", { cause }));
			}
		};
		projectWrite = (bundle, written) => written.ok ? ok({
			path: written.value.path,
			bytes: written.value.bytes,
			records: bundle.records.length
		}) : err(written.error);
	})))();
}

//#endregion
export { compareEvidenceBundlesCommand, deliverAnalysisEvidence, dispatchQueuedInterrupts, exportEvidenceBundleCommand, importEvidenceBundleCommand, init_EvidenceBundleCommands, init_EvidenceBundleFiles, init_queuedInterrupts, inspectAnalysisViewFromBundle, publishEvidenceDelivery, readEvidenceBundle, readImmutableEvidenceBundle };