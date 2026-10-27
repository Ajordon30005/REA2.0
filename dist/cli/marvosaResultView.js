/** Human-facing HCL results. The complete Evidence remains the API/export form. */
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
    ? value
    : undefined;
const pick = (value, keys) => Object.fromEntries(keys
    .filter((key) => Object.hasOwn(value, key))
    .map((key) => [key, value[key]]));
/** Preserve decimal precision when displaying returned HCL values. */
const displayValue = (value) => {
    if (Array.isArray(value))
        return value.map(displayValue);
    const fields = object(value);
    if (fields === undefined)
        return value;
    if (fields.type === "number" &&
        typeof fields.decimal === "string" &&
        typeof fields.integer === "string" &&
        typeof fields.scale === "string")
        return fields.decimal;
    return Object.fromEntries(Object.entries(fields).map(([key, item]) => [key, displayValue(item)]));
};
const calls = (execution) => {
    const observed = object(execution)?.calls;
    if (!Array.isArray(observed))
        return observed;
    return observed.map((call) => {
        const result = object(call);
        return result === undefined
            ? call
            : displayValue(pick(result, ["module", "entry", "status", "value", "error"]));
    });
};
export const marvosaResultView = (value) => {
    const evidence = object(value);
    if (object(evidence?.provider)?.id !== "marvosa")
        return undefined;
    const result = object(evidence?.normalized_result);
    if (result === undefined)
        return undefined;
    switch (evidence?.operation) {
        case "hcl_calculate":
            return { result: result.decimal };
        case "hcl_transcribe": {
            const coverage = object(result.coverage);
            return {
                sources: coverage?.source_files,
                functions: coverage?.functions,
                unknowns: object(result.analysis)?.unknowns,
                calls: calls(result.execution),
            };
        }
        case "hcl_run":
            return { calls: calls(result.execution) };
        case "hcl_remember_evidence":
            return pick(result, ["case_path", "record_ids", "added", "total"]);
        case "hcl_recall_evidence":
            return {
                matches: Array.isArray(result.matches)
                    ? result.matches.map((value) => {
                        const match = object(value);
                        if (match === undefined)
                            return value;
                        const metadata = object(match.metadata);
                        return {
                            record_id: match.record_id,
                            source: metadata?.source,
                            confidence: metadata?.confidence,
                            excerpt: match.excerpt,
                        };
                    })
                    : result.matches,
                limitations: result.limitations,
            };
        case "hcl_get_evidence":
            return pick(result, ["record_id", "raw_json", "metadata"]);
        case "hcl_inspect_case":
        case "hcl_verify_case":
            return pick(result, [
                "case_path",
                "records",
                "evidence_bytes",
                "confidence_counts",
                "operations",
                "unresolved_evidence_links",
                "records_with_partial_index",
                "limitations",
                ...(evidence.operation === "hcl_verify_case"
                    ? ["hvp_verified", "evidence_digests_verified", "integrity"]
                    : []),
            ]);
        case "hcl_compare_cases":
            return pick(result, [
                "left_case",
                "right_case",
                "changes",
                "unchanged_groups",
                "limitations",
            ]);
        default:
            return undefined;
    }
};
