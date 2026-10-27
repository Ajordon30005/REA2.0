import { z } from "zod";
import { jsonObjectSchema, jsonValueSchema } from "./jsonValue.js";
const integer = z.string().regex(/^-?\d+$/u);
const digest = z.string().regex(/^[a-f0-9]{64}$/u);
const count = z.number().int().nonnegative();
const packedTrace = (recordType) => z.strictObject({
    format: z.literal("rea-hcl-trace/1"),
    encoding: z.literal("gzip-jsonl"),
    codec: z.string(),
    record_type: z.literal(recordType),
    record_count: count,
    uncompressed_bytes: count,
    sha256: digest,
    base64: z.string(),
});
const braid = z.union([
    packedTrace("generator"),
    z.array(z.strictObject({
        operation: z.string(),
        phase_fraction: integer,
        amplitude: integer,
    })),
]);
const braidSources = z.union([
    packedTrace("source"),
    z.array(z.strictObject({ source: z.string().nullable(), start: count, end: count })),
]);
const analysis = z.strictObject({
    functions: z.array(z.strictObject({
        id: z.string(),
        name: z.string(),
        path: z.string(),
        parameters: z.array(z.string()),
    })),
    calls: z.array(z.strictObject({ id: z.string(), scope: z.string(), target: z.string() })),
    operations: z.array(z.strictObject({
        id: z.string(),
        scope: z.string(),
        operator: z.string(),
        primitive: z.string(),
    })),
    unknowns: z.array(z.strictObject({
        id: z.string(),
        scope: z.string(),
        syntax: z.string(),
        reason: z.string(),
    })),
    constant_results: z.array(z.strictObject({ id: z.string(), value: jsonValueSchema })),
    generator_count: count,
    braid,
    braid_sources: braidSources,
});
const callIdentity = {
    module: z.string(),
    entry: z.string(),
    braid_start: count,
    braid_end: count,
    newly_executed_nodes: z.array(z.string()),
};
const execution = z.strictObject({
    calls: z.array(z.discriminatedUnion("status", [
        z.strictObject({
            ...callIdentity,
            status: z.literal("completed"),
            value: jsonValueSchema,
        }),
        z.strictObject({
            ...callIdentity,
            status: z.enum(["error", "unsupported"]),
            error: z.strictObject({
                code: z.string(),
                message: z.string(),
                source: z.string().nullable(),
            }),
        }),
    ])),
    generator_count: count,
    braid,
    braid_sources: braidSources,
    executed_nodes: z.array(z.string()),
});
const source = z.strictObject({
    path: z.string(),
    original_path: z.string(),
    language: z.string(),
    encoding: z.enum(["utf8", "base64"]),
    content: z.string(),
    sha256: digest,
    text_sha256: digest,
    bytes: count,
});
const program = z.strictObject({
    format: z.literal("rea-hcl-program/1"),
    project: z
        .strictObject({
        entry_module: z.string().nullable(),
        manifests: z.record(z.string(), jsonObjectSchema),
        dependencies: z.array(z.strictObject({
            source: z.string(),
            module: z.string(),
            specifier: z.string().nullable(),
            status: z.enum(["resolved", "boundary", "dynamic", "unresolved"]),
            target: z.string().optional(),
            reason: z.string().optional(),
        })),
    })
        .optional(),
    sources: z.array(source),
    modules: z.array(z.strictObject({
        path: z.string(),
        language: z.string(),
        body: z.array(jsonObjectSchema),
        strict: z.boolean().optional(),
        source_type: z.enum(["script", "module"]).optional(),
    })),
    locations: z.record(z.string(), jsonObjectSchema),
    analysis,
    engine: jsonObjectSchema,
    program_sha256: digest,
});
/** Full source, graph and observed execution remain available in Evidence. */
export const hclTranscriptionOutput = z.strictObject({
    program,
    program_sha256: digest,
    analysis,
    execution,
    working_memory: z.strictObject({
        engine: z.literal("LivingMemory"),
        whole_sources: count,
        source_regeneration_verified: z
            .boolean()
            .nullable()
            .describe("Null when the optional memory round-trip verification was not requested"),
        memory_line: z.string(),
        signature: z.record(z.string(), integer),
        query: z.string().nullable(),
        matches: z.array(z.strictObject({ path: z.string(), phase_rank: count, hvp_rank: count })),
    }),
    coverage: z.strictObject({
        source_files: count,
        source_bytes: count,
        functions: count,
        mapped_operations: count,
        unknown_syntax: count,
        interpretation: z.string(),
    }),
    limitations: z.array(z.string()),
});
/** Saved programs use the same observation schema as the integrated workflow. */
export const hclRunOutput = z.strictObject({
    program_sha256: digest,
    execution,
    limitations: z.array(z.string()),
});
