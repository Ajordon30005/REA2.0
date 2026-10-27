import { requireAuthenticationHeadroom } from "./JsonAuthenticationHeadroom.js";
import { absoluteCallerPath } from "../filesystem/callerPath.js";
import { describeEvidenceBundleFailure, describeValidationFailure, parseImmutableEvidenceBundle, parseEvidenceBundle, } from "../domain/evidenceBundle.js";
import { EvidenceFileError, EvidenceIntegrityError, } from "../domain/evidenceErrors.js";
import { err, ok } from "../domain/result.js";
import { AnalysisCancelledError, } from "../domain/analysisErrorCore.js";
import { parseProcessCapture } from "../domain/process/processCaptureParsing.js";
import { bufferedJsonParts, canonicalJsonParts, } from "../domain/jsonSerialization.js";
import { readJsonFile, writeTextParts } from "./JsonFiles.js";
/** Read and validate an evidence bundle at the caller-supplied path. */
export const readEvidenceBundle = (path, signal, resources, operation = "import_evidence_bundle") => readBundle(path, parseEvidenceBundle, signal, resources, operation);
/** Read an authenticated immutable snapshot for a subsequent session import. */
export const readImmutableEvidenceBundle = (path, signal, resources, operation = "import_evidence_bundle") => readBundle(path, parseImmutableEvidenceBundle, signal, resources, operation);
const readBundle = async (path, parseBundle, signal, resources, operation = "import_evidence_bundle") => {
    if (signal?.aborted)
        return err(new AnalysisCancelledError(operation, {
            cause: signal.reason,
        }));
    const loaded = await readJsonFile(path, signal, resources, operation);
    if (!loaded.ok)
        return loaded;
    if (signal?.aborted)
        return err(new AnalysisCancelledError(operation, {
            cause: signal.reason,
        }));
    const headroom = requireAuthenticationHeadroom(loaded.value, {
        operation,
        path: absoluteCallerPath(path),
        description: "Insufficient heap headroom to authenticate the Evidence bundle",
    });
    if (!headroom.ok)
        return headroom;
    let bundle;
    try {
        bundle = parseBundle(loaded.value);
    }
    catch (cause) {
        const failure = describeEvidenceBundleFailure(loaded.value, cause);
        if (failure.kind === "single-record")
            return err(new EvidenceFileError("read", "wrong-kind", {
                path: absoluteCallerPath(path),
                cause,
                userMessage: failure.message,
            }));
        return err(new EvidenceIntegrityError("Evidence bundle validation failed", {
            cause,
            userMessage: failure.message,
        }));
    }
    for (const record of bundle.records) {
        if (record.predicate_type !== "rea.process-capture")
            continue;
        try {
            parseProcessCapture(record.normalized_result);
        }
        catch (cause) {
            return err(new EvidenceIntegrityError("Evidence bundle validation failed", {
                cause,
                userMessage: `Process capture record ${record.evidence_id} has an invalid normalized_result (${describeValidationFailure(cause)}). Recreate or re-export the bundle, then try again.`,
            }));
        }
    }
    return ok(bundle);
};
/** Atomically write deterministic evidence JSON at the caller-supplied path. */
export const writeEvidenceBundle = async (bundle, path, overwrite, resources, signal, operation = "export_evidence_bundle") => {
    if (signal?.aborted === true)
        return err(new AnalysisCancelledError(operation, {
            cause: signal.reason,
        }));
    let checked;
    try {
        checked = parseEvidenceBundle(bundle);
    }
    catch (cause) {
        return err(new EvidenceIntegrityError("Evidence bundle validation failed", {
            cause,
        }));
    }
    return writeTextParts(bufferedJsonParts(canonicalJsonParts(checked)), path, overwrite, resources, signal === undefined ? undefined : { signal, operation });
};
