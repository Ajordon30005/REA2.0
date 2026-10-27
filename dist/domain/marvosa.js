import { z } from "zod";
import { prefixedDigestSchema } from "./digests.js";
import { absoluteLocalPathStringSchema } from "./localPath.js";
import { jsonObjectSchema } from "./jsonValue.js";
import { hclTranscriptionOutput, hclRunOutput } from "./hclTranscription.js";
const casePath = absoluteLocalPathStringSchema.describe("Local directory containing a REA × Marvosa investigation case");
const entry = z.strictObject({
    source: z
        .string()
        .min(1)
        .describe("Stable provenance label; keep it identical when comparing versions"),
    raw_json: z
        .string()
        .min(1)
        .describe("Original JSON evidence object; bytes retained verbatim"),
});
const hclCall = z.strictObject({
    module: z
        .string()
        .min(1)
        .optional()
        .describe("Exact relative module path; defaults to the retained package main/index or the only executable module"),
    entry: z
        .string()
        .min(1)
        .describe("Export or function to run; default selects the module's default export/data"),
    arguments_json: z
        .string()
        .optional()
        .describe("JSON argument array; decimal tokens enter HCL without a JavaScript float conversion"),
    keywords_json: z
        .string()
        .optional()
        .describe("JSON keyword argument object for Python functions"),
    result_id: z
        .string()
        .min(1)
        .optional()
        .describe("Retain this result for subsequent calls in the same request"),
    receiver_id: z
        .string()
        .min(1)
        .optional()
        .describe("Call entry as a method on this previous result"),
    construct: z
        .boolean()
        .optional()
        .describe("Construct the selected JavaScript function/class through the HCL graph"),
    return_value: z
        .boolean()
        .optional()
        .describe("False returns a handle for result_id, retaining an opaque instance inside this request"),
    arguments_from: z
        .array(z.strictObject({
        index: z.number().int().nonnegative(),
        result_id: z.string().min(1),
        path: z.array(z.string()).optional(),
    }))
        .optional()
        .describe("Replace explicit argument slots with previous results, preserving object identity and HCL values"),
});
export const marvosaInputs = {
    hcl_transcribe: z.strictObject({
        verify_memory: z
            .boolean()
            .optional()
            .describe("Explicitly regenerate every source from HCL memory and verify its identity"),
        path: absoluteLocalPathStringSchema.describe("Complete source file or directory to analyze and transcribe together"),
        language: z
            .enum(["auto", "python", "javascript", "wasm", "json", "text"])
            .optional(),
        calls: z
            .array(hclCall)
            .optional()
            .describe("Optional calls to observe through the emitted HCL graph in the same operation"),
        query: z
            .string()
            .min(1)
            .optional()
            .describe("Recall complete source records through native LivingMemory resonance"),
    }),
    hcl_run: z.strictObject({
        path: absoluteLocalPathStringSchema.describe("Saved HCL program JSON or complete REA transcription result"),
        calls: z.array(hclCall).min(1),
    }),
    hcl_remember_evidence: z
        .strictObject({
        case_path: casePath,
        entries: z.array(entry).optional(),
        evidence_ids: z
            .array(prefixedDigestSchema("ev"))
            .optional()
            .describe("Evidence already retained in the active REA session"),
    })
        .refine((input) => (input.entries?.length ?? 0) + (input.evidence_ids?.length ?? 0) >= 1, "Supply at least one entry and/or session evidence_id"),
    hcl_recall_evidence: z.strictObject({
        case_path: casePath,
        query: z.string().min(1),
        limit: z.number().int().min(1).optional(),
        confidence: z
            .enum(["observed", "derived", "inferred", "unknown"])
            .optional(),
    }),
    hcl_get_evidence: z.strictObject({
        case_path: casePath,
        record_id: z.string().regex(/^hcl:[0-9a-f]{64}$/u),
    }),
    hcl_inspect_case: z.strictObject({ case_path: casePath }),
    hcl_verify_case: z.strictObject({ case_path: casePath }),
    hcl_compare_cases: z.strictObject({
        left_case: casePath,
        right_case: casePath,
    }),
    hcl_calculate: z.strictObject({
        expression: z
            .string()
            .min(1)
            .describe("HCL scalar expression; + - * / ^ sqrt exp ln sin cos abs; optional assignment; pi is derived by Marvosa"),
        variables: z
            .record(z.string().regex(/^[A-Za-z_][A-Za-z_0-9]*$/u), z.string().regex(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/u))
            .optional(),
    }),
};
const integer = z.string().regex(/^-?\d+$/u);
const alpha = z.strictObject({
    intact: z.boolean(),
    engines: z.record(z.string(), z.strictObject({
        intact: z.boolean(),
        alpha_inverse: integer,
        scale: integer,
    })),
});
const metadata = z.strictObject({
    operation: z.string(),
    confidence: z.enum(["observed", "derived", "inferred", "unknown"]),
    evidence_id: z.string(),
    subject_path: z.string(),
    limitations: z.array(z.string()),
    evidence_links: z.array(z.string()),
    source: z.string(),
    comparison_key: z.string(),
    indexed_characters: z.number().int().nonnegative(),
    index_truncated: z.boolean(),
});
const inspection = z.strictObject({
    case_path: z.string(),
    format: z.enum(["rea-marvosa-case/1", "rea-marvosa-case/2"]),
    records: z.number().int().nonnegative(),
    evidence_bytes: z.number().int().nonnegative(),
    confidence_counts: z.record(z.string(), z.number().int()),
    operations: z.array(z.string()),
    unresolved_evidence_links: z.array(z.string()),
    records_with_partial_index: z.number().int().nonnegative(),
    memory_line: z.string(),
    signature: z.record(z.string(), integer),
    integrity: alpha,
    hvp_verified: z.boolean(),
    evidence_digests_verified: z.boolean(),
    limits: jsonObjectSchema,
    limitations: z.array(z.string()),
});
export const marvosaOutputs = {
    hcl_transcribe: hclTranscriptionOutput,
    hcl_run: hclRunOutput,
    hcl_remember_evidence: z.strictObject({
        case_path: z.string(),
        record_ids: z.array(z.string()),
        added: z.number().int().nonnegative(),
        total: z.number().int().nonnegative(),
        memory_line: z.string(),
        integrity: alpha,
        publication: z.string(),
    }),
    hcl_recall_evidence: z.strictObject({
        query: z.string(),
        matches: z.array(z.strictObject({
            record_id: z.string(),
            score_integer: integer,
            score_scale: integer,
            metadata,
            excerpt: z.string(),
        })),
        examined_records: z.number().int().nonnegative(),
        memory_line: z.string(),
        ranking: z.string(),
        limitations: z.array(z.string()),
    }),
    hcl_get_evidence: z.strictObject({
        record_id: z.string(),
        raw_json: z.string(),
        sha256: z.string(),
        byte_count: z.number().int(),
        metadata,
        hvp_parameters: z.record(z.string(), integer),
        verified: z.boolean(),
    }),
    hcl_inspect_case: inspection,
    hcl_verify_case: inspection,
    hcl_compare_cases: z.strictObject({
        left_case: z.string(),
        right_case: z.string(),
        changes: z.array(z.strictObject({
            comparison_key: z.array(z.string()),
            status: z.enum(["added", "removed", "changed"]),
            before: z.array(z.string()),
            after: z.array(z.string()),
            ambiguous_pairing: z.boolean(),
        })),
        unchanged_groups: z.number().int().nonnegative(),
        limitations: z.array(z.string()),
    }),
    hcl_calculate: z.strictObject({
        name: z.string(),
        expression: z.string(),
        value_integer: integer,
        scale: integer,
        decimal: z.string(),
        precision_digits: z.number().int(),
        braid: z.array(z.strictObject({
            operation: z.string(),
            phase_fraction: integer,
            amplitude: integer,
        })),
        generator_count: z.number().int(),
        integrity: alpha,
        semantics: z.string(),
    }),
};
