import { marvosaInputs, marvosaOutputs } from "../domain/marvosa.js";
import { toolContractMetadata } from "./toolEffects.js";
import { evidenceResultOf } from "./toolOutputSchemaPrimitives.js";
export const MARVOSA_TOOL_CONTRACTS = [
    {
        name: "hcl_transcribe",
        kind: "application",
        ...toolContractMetadata("hcl_transcribe"),
        description: "Analyze complete source files while lowering their operations into an executable HCL-pure graph. Python and JavaScript/TypeScript frontends share the original Marvosa HCL arithmetic core for constant analysis and execution; whole sources enter native LivingMemory during analysis. Returns complete sources, source-linked functions/calls/operations, analysis braid, explicit unknown syntax, saved-program identity and optional observed graph calls. Directories are read in full without an integration-imposed size/depth/time quota. Other formats remain complete unresolved content, not falsely executable translations. Host syntax/control/container adapters remain; finite fixed-point semantics can differ from IEEE-754 source behavior. No MST or remote model. Optional calls interpret only the emitted graph, with no target OS/network API or host eval/import. Python 3.10+ required. Existing REA provider internals are not rewritten.",
        inputSchema: marvosaInputs.hcl_transcribe,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_transcribe),
        examples: [
            {
                title: "Analyze and transcribe a complete source module",
                input: {
                    path: "/analysis/project/codec.js",
                    calls: [{ entry: "fromByteArray", arguments_json: "[[72,67,76]]" }],
                },
            },
        ],
    },
    {
        name: "hcl_run",
        kind: "application",
        ...toolContractMetadata("hcl_run"),
        description: "Run selected calls from a saved HCL program or complete hcl_transcribe Evidence JSON without rereading or executing the original target. Verifies program and retained source digests, then executes the same source-linked operation graph through unchanged Marvosa HCL primitives. Returns exact lattice values, complete operation braid, executed-node coverage and per-call errors/unknowns. Calls share module state within this request. No host eval, target import, filesystem/network API, MST, or external model. Finite precision and the declared boundary adapters apply. Cancellable owned worker; no integration-imposed execution deadline.",
        inputSchema: marvosaInputs.hcl_run,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_run),
        examples: [
            {
                title: "Execute an emitted program",
                input: {
                    path: "/analysis/codec.hcl.json",
                    calls: [{ entry: "toByteArray", arguments_json: '["SENM"]' }],
                },
            },
        ],
    },
    {
        name: "hcl_remember_evidence",
        kind: "application",
        ...toolContractMetadata("hcl_remember_evidence"),
        description: "Retain selected REA Evidence records in a local Marvosa case. Supply complete raw JSON with a stable source label or active-session evidence_ids. Stores original forensic bytes and HVP addresses atomically; native HCL memory terms cover the complete selected normalized content. Duplicate inputs are idempotent. No integration-imposed record/case/batch quota, indexing prefix, worker timeout or memory cap; host resources and actual client/transport constraints still apply. An explicit remember upgrades a verified legacy v1 case atomically without changing evidence IDs or original bytes. Does not execute targets. Python 3.10+ is required. After interrupted delivery, inspect the case because a transaction may have committed.",
        inputSchema: marvosaInputs.hcl_remember_evidence,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_remember_evidence),
        examples: [
            {
                title: "Retain local analysis evidence",
                input: {
                    case_path: "/analysis/search-v1",
                    entries: [
                        {
                            source: "search",
                            raw_json: '{"operation":"inspect","confidence":"observed","normalized_result":{"symbol":"search"}}',
                        },
                    ],
                },
            },
        ],
    },
    {
        name: "hcl_recall_evidence",
        kind: "application",
        ...toolContractMetadata("hcl_recall_evidence"),
        description: "Recall case evidence using unmodified Marvosa HCLMemory resonance. Verifies evidence digests and re-derived memory topology before ranking. Returns integer scores, provenance, confidence and excerpts; scores are not probabilities. Use hcl_get_evidence for complete verified content. Filters preserve original HCL ranking. No embeddings, remote model or target execution.",
        inputSchema: marvosaInputs.hcl_recall_evidence,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_recall_evidence),
        examples: [
            {
                title: "Recall observed search behavior",
                input: {
                    case_path: "/analysis/search-v1",
                    query: "search",
                    confidence: "observed",
                },
            },
        ],
    },
    {
        name: "hcl_get_evidence",
        kind: "application",
        ...toolContractMetadata("hcl_get_evidence"),
        description: "Recover the exact retained JSON bytes through Marvosa's HVP inverse with verify=True, compare the stored HVP address and SHA-256, and return complete provenance. Requires a record_id returned by hcl_remember_evidence or hcl_recall_evidence.",
        inputSchema: marvosaInputs.hcl_get_evidence,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_get_evidence),
        examples: [
            {
                title: "Recover one retained record",
                input: {
                    case_path: "/analysis/search-v1",
                    record_id: `hcl:${"0".repeat(64)}`,
                },
            },
        ],
    },
    {
        name: "hcl_inspect_case",
        kind: "application",
        ...toolContractMetadata("hcl_inspect_case"),
        description: "Inspect a retained case: evidence counts, observation/derivation/inference separation, missing evidence links, index coverage, native memory line, capacity and alpha checks. Verifies record digests and memory topology. Does not imply the evidence's substantive conclusions are true.",
        inputSchema: marvosaInputs.hcl_inspect_case,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_inspect_case),
        examples: [
            {
                title: "Resume an investigation",
                input: { case_path: "/analysis/search-v1" },
            },
        ],
    },
    {
        name: "hcl_verify_case",
        kind: "application",
        ...toolContractMetadata("hcl_verify_case"),
        description: "Verify every retained record: SHA-256 identity, metadata, HVP address, verified inverse byte equality, alpha checks and reconstructed memory line. Detects inconsistent evidence; does not authenticate external authors. Cancellable native Python worker with no integration-imposed work deadline; no target execution.",
        inputSchema: marvosaInputs.hcl_verify_case,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_verify_case),
        examples: [
            {
                title: "Verify a case before reuse",
                input: { case_path: "/analysis/search-v1" },
            },
        ],
    },
    {
        name: "hcl_compare_cases",
        kind: "application",
        ...toolContractMetadata("hcl_compare_cases"),
        description: "Compare two verified local cases by stable source label, operation and subject path. Reports added, removed and changed evidence sets and ambiguous pairings. Changes are byte-level evidence differences, not a claim of behavioral equivalence or semantic contradiction.",
        inputSchema: marvosaInputs.hcl_compare_cases,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_compare_cases),
        examples: [
            {
                title: "Compare two builds",
                input: {
                    left_case: "/analysis/search-v1",
                    right_case: "/analysis/search-v2",
                },
            },
        ],
    },
    {
        name: "hcl_calculate",
        kind: "application",
        ...toolContractMetadata("hcl_calculate"),
        description: "Evaluate a scalar expression through Marvosa's original integer HCLTranscriber. Decimal literals and variables cross the boundary as strings, never binary floats. Returns fixed-point integer, scale, decimal display, full operation braid and alpha checks. Supports + - * / integer powers, sqrt, exp, ln, sin/cos in radians and abs; pi is derived. Finite precision and original series behavior apply. Scalar domain errors are explicit. Computation remains caller-cancellable without an integration-imposed work deadline.",
        inputSchema: marvosaInputs.hcl_calculate,
        outputSchema: evidenceResultOf(marvosaOutputs.hcl_calculate),
        examples: [
            {
                title: "Calculate with an HCL operation trace",
                input: { expression: "E = m * c^2", variables: { m: "2", c: "3" } },
            },
        ],
    },
];
