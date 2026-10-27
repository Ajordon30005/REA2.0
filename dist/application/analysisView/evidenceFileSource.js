import { requireAuthenticationHeadroom } from "../JsonAuthenticationHeadroom.js";
import { z } from "zod";
import { AnalysisCancelledError } from "../../domain/analysisErrorCore.js";
import { INSPECT_ANALYSIS_VIEW_OPERATION } from "../../domain/analysisView/analysisViewErrors.js";
import { err, ok } from "../../domain/result.js";
import { parseEvidence } from "../../domain/evidence.js";
import { EvidenceFileError, EvidenceIntegrityError, } from "../../domain/evidenceErrors.js";
import { projectInputIssues } from "../../domain/inputIssueProjection.js";
import { readJsonFile } from "../JsonFiles.js";
/** Read and authenticate one Evidence file under the request's cancellation and resource scope. */
export const readEvidenceFileSource = async (path, options = {}) => {
    const { signal, resources } = options;
    if (signal?.aborted)
        return err(new AnalysisCancelledError(INSPECT_ANALYSIS_VIEW_OPERATION, {
            cause: signal.reason,
        }));
    const loaded = await readJsonFile(path, signal, resources, INSPECT_ANALYSIS_VIEW_OPERATION);
    if (!loaded.ok)
        return loaded;
    if (signal?.aborted)
        return err(new AnalysisCancelledError(INSPECT_ANALYSIS_VIEW_OPERATION, {
            cause: signal.reason,
        }));
    const headroom = requireAuthenticationHeadroom(loaded.value, {
        operation: INSPECT_ANALYSIS_VIEW_OPERATION,
        path,
        description: "Insufficient heap headroom to authenticate the Evidence file",
    });
    if (!headroom.ok)
        return headroom;
    try {
        return ok(parseEvidence(loaded.value));
    }
    catch (cause) {
        if (cause instanceof z.ZodError)
            return err(new EvidenceFileError("read", "wrong-kind", {
                path,
                cause,
                contentIssues: projectInputIssues(cause.issues, loaded.value),
                userMessage: "The selected file does not contain valid Evidence. Repair or recreate the file and try again.",
            }));
        if (cause instanceof TypeError)
            return err(new EvidenceIntegrityError(cause.message, {
                cause,
                userMessage: cause.message,
            }));
        throw cause;
    }
};
