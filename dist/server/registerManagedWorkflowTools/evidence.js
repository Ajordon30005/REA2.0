import { parseEvidence } from "../../domain/evidence.js";
import { EvidenceIntegrityError } from "../../domain/evidenceErrors.js";
import { err, ok } from "../../domain/result.js";
/** Authenticate one caller-supplied record and preserve Evidence errors. */
const parseEvidenceRecord = (rawEvidence) => {
    try {
        return ok(parseEvidence(rawEvidence));
    }
    catch (cause) {
        return err(new EvidenceIntegrityError(cause instanceof Error ? cause.message : "Invalid Evidence"));
    }
};
const parseEvidenceRecords = (rawEvidence) => {
    const evidence = [];
    for (const rawRecord of rawEvidence) {
        const record = parseEvidenceRecord(rawRecord);
        if (!record.ok)
            return err(record.error);
        evidence.push(record.value);
    }
    return ok(evidence);
};
const resolveExpectedEvidence = (rawEvidence, expectedOperation) => {
    const evidence = parseEvidenceRecord(rawEvidence);
    if (!evidence.ok)
        return evidence;
    if (evidence.value.operation !== expectedOperation ||
        evidence.value.predicate_type !== "rea.analysis")
        return err(new EvidenceIntegrityError(`Expected ${expectedOperation} Evidence, received ${evidence.value.operation}`));
    return evidence;
};
export const resolveManagedEvidence = (evidence) => resolveExpectedEvidence(evidence, "inspect_managed_members");
export const resolveManagedArtifactEvidence = (evidence) => resolveExpectedEvidence(evidence, "inspect_managed_artifact");
export const resolveManagedBoundaryEvidence = (evidence) => resolveExpectedEvidence(evidence, "inspect_managed_native_boundaries");
/**
 * Authenticate native observations without an operation allowlist: the domain
 * counts authentic operations it cannot read symbols from as unsupported.
 */
export const resolveNativeEvidence = (evidence) => parseEvidenceRecords(evidence);
export const sourceEvidence = (input) => [
    input.managed_artifact,
    input.managed_members,
    input.managed_native_boundaries,
].filter((evidence) => evidence !== undefined);
