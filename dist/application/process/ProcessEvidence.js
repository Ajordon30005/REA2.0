import { posix, win32 } from "node:path";
import { createEvidence, parseEvidence, } from "../../domain/evidence.js";
import { PROCESS_PROVIDER, isProcessEvidenceProvider, } from "../../domain/process/processEvidenceProvider.js";
import { jsonValueSchema } from "../../domain/jsonValue.js";
import { parseProcessCapture, } from "../../domain/process/processCaptureParsing.js";
import { err, ok } from "../../domain/result.js";
const PROCESS_CAPTURE_EVIDENCE = {
    operation: "capture_process_scenario",
    predicate: "rea.process-capture",
};
/** Authenticate capture Evidence before admitting its workflow, provider and payload. */
export const parseProcessCaptureEvidence = (input) => {
    let record;
    try {
        record = parseEvidence(input);
    }
    catch (cause) {
        return err({ kind: "invalid-evidence", cause });
    }
    if (record.operation !== PROCESS_CAPTURE_EVIDENCE.operation ||
        record.predicate_type !== PROCESS_CAPTURE_EVIDENCE.predicate)
        return err({
            kind: "wrong-workflow",
            expected: PROCESS_CAPTURE_EVIDENCE,
            actual: { operation: record.operation, predicate: record.predicate_type },
        });
    if (!isProcessEvidenceProvider(record.provider))
        return err({ kind: "unsupported-provider", provider: record.provider });
    try {
        return ok({
            record,
            capture: parseProcessCapture(record.normalized_result),
        });
    }
    catch (cause) {
        return err({ kind: "invalid-capture", cause });
    }
};
/** Project one process scenario into secret-free Evidence parameters. */
const processEvidenceParameters = (scenario, platform) => ({
    executable_name: (platform === "win32" ? win32 : posix).basename(scenario.executable),
    argument_count: scenario.arguments.length,
    event_count: scenario.events.length,
    filesystem_observation_path_count: scenario.filesystem_observation_paths.length,
    normalization: scenario.normalization,
});
/** Create one canonical observed process capture Evidence record. */
export const createProcessCaptureEvidence = (scenario, capture) => {
    return createEvidence(undefined, PROCESS_PROVIDER, {
        predicateType: PROCESS_CAPTURE_EVIDENCE.predicate,
        operation: PROCESS_CAPTURE_EVIDENCE.operation,
        parameters: processEvidenceParameters(scenario, capture.manifest.platform),
        result: jsonValueSchema.parse(capture),
        confidence: "observed",
        authority: "controlled-replay",
        environment: {
            id: `${capture.manifest.platform}-${capture.manifest.architecture}`,
            platform: capture.manifest.platform,
            architecture: capture.manifest.architecture,
            isolation: "process",
        },
        limitations: capture.limitations,
    });
};
