import { digestCanonicalValue } from "../canonicalDigest.js";
import { managedNativeBoundaryInspectionSchema, } from "./managedArtifact.js";
import { parseManagedInspectionEvidence } from "./managedInspectionEvidence.js";
import { managedNativeVerificationResultSchema, } from "./managedNativeVerificationSchemas.js";
import { buildVerificationResult, collectNativeSymbols, verifyPinvoke, } from "./managedNativeVerificationMatch.js";
const parseManagedBoundary = (input) => parseManagedInspectionEvidence(input.managed_boundaries, "inspect_managed_native_boundaries", managedNativeBoundaryInspectionSchema);
/** Verify managed P/Invoke declarations against authenticated native Evidence. */
export const verifyManagedNativeBoundaries = (input) => {
    const { evidence: managedEvidence, result: managed } = parseManagedBoundary(input);
    const native = collectNativeSymbols(input.native_observations);
    const verifiedPinvokes = managed.pinvoke_imports.map((item) => verifyPinvoke({
        item,
        managedEvidenceId: managedEvidence.evidence_id,
        native,
    }));
    const pinvokeImports = verifiedPinvokes.map(({ verification }) => verification);
    const withoutId = buildVerificationResult({
        managedEvidence,
        managed,
        native,
        pinvokeImports,
        input,
    });
    return managedNativeVerificationResultSchema.parse({
        ...withoutId,
        verification_id: `mnv_${digestCanonicalValue(withoutId, "Managed/native verification")}`,
    });
};
