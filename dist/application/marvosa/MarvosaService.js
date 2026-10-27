import { AnalysisInputError, AnalysisOutputError, } from "../../domain/analysisErrorCore.js";
import { createEvidence } from "../../domain/evidence.js";
import { jsonObjectSchema } from "../../domain/jsonValue.js";
import { marvosaInputs, marvosaOutputs, } from "../../domain/marvosa.js";
import { analysisInputErrorFromIssues } from "../../domain/inputIssueProjection.js";
import { err, ok } from "../../domain/result.js";
/** Shared CLI/MCP case and calculation semantics. */
export class MarvosaService {
    provider;
    constructor(provider) {
        this.provider = provider;
    }
    close() {
        return this.provider.close();
    }
    async execute(operation, raw, options, evidenceById) {
        const parsed = marvosaInputs[operation].safeParse(raw);
        if (!parsed.success)
            return err(analysisInputErrorFromIssues(operation, parsed.error.issues, raw));
        let input = jsonObjectSchema.parse(parsed.data);
        const links = [];
        if (operation === "hcl_remember_evidence") {
            const selected = marvosaInputs.hcl_remember_evidence.parse(parsed.data);
            const entries = [...(selected.entries ?? [])];
            for (const id of selected.evidence_ids ?? []) {
                const evidence = evidenceById?.(id);
                if (evidence === undefined)
                    return err(new AnalysisInputError(operation, {
                        userMessage: `Evidence is unavailable in this session: ${id}`,
                    }));
                entries.push({
                    source: `${evidence.operation}:${evidence.subject?.local_path ?? "session"}`,
                    raw_json: JSON.stringify(evidence),
                });
                links.push(id);
            }
            input = { case_path: selected.case_path, entries };
        }
        const output = await this.provider.execute(operation, input, options);
        if (!output.ok)
            return output;
        const report = marvosaOutputs[operation].safeParse(output.value);
        if (!report.success)
            return err(new AnalysisOutputError(operation, "Marvosa worker returned a malformed result", { cause: report.error }));
        return ok(createEvidence(undefined, { id: "marvosa", name: "Marvosa HCL", version: "1.0.0" }, {
            operation,
            parameters: operation === "hcl_remember_evidence"
                ? {
                    case_path: input.case_path ?? null,
                    evidence_ids: links,
                    entry_count: input.entries.length,
                }
                : jsonObjectSchema.parse(parsed.data),
            result: jsonObjectSchema.parse(report.data),
            confidence: "derived",
            evidenceLinks: links,
            limitations: [
                ...(operation === "hcl_transcribe" || operation === "hcl_run"
                    ? []
                    : [
                        "Marvosa is an added evidence-memory and arithmetic layer; existing REA analyzers retain their own semantics.",
                    ]),
                ...(Array.isArray(output.value.limitations)
                    ? output.value.limitations.filter((value) => typeof value === "string")
                    : []),
            ],
        }));
    }
}
