import { summarizeRetainedAnalysis } from "../application/analysisView/AnalysisViewService.js";
import { toolContract } from "../contracts/toolContracts.js";
import { logToolExecution } from "./toolLogging.js";
import { applicationToolRegistrationOptions } from "./toolRegistrationOptions.js";
import { analysisInputErrorFromIssues } from "../domain/inputIssueProjection.js";
import { err } from "../domain/result.js";
import { runAdmittedToolOperation } from "./admittedToolOperation.js";
/** Bind offline layout inspection to its named contract and session Evidence owner. */
export const registerBinaryDiagnosticsTools = (server, service, logger, recordEvidence, evidenceById, withAdmittedAnalysis) => {
    const contract = toolContract("inspect_binary_layout");
    server.registerTool(contract.name, applicationToolRegistrationOptions(contract), async (rawInput, context) => {
        const parsed = contract.inputSchema.safeParse(rawInput);
        if (!parsed.success)
            return server.delivery.toCallToolResult(err(analysisInputErrorFromIssues(contract.name, parsed.error.issues, rawInput, { cause: parsed.error })), contract);
        const { detail, ...request } = parsed.data;
        return runAdmittedToolOperation(server, withAdmittedAnalysis, contract.name, context.mcpReq.signal, async () => {
            const result = await logToolExecution(logger, contract.name, async () => {
                const inspected = await service.inspect(request, {
                    signal: context.mcpReq.signal,
                });
                return detail === "summary" && inspected.ok
                    ? summarizeRetainedAnalysis(inspected.value, {
                        recordEvidence,
                        evidenceById,
                    })
                    : inspected;
            });
            if (!result.ok)
                return server.delivery.toCallToolResult(result, contract);
            const recorded = recordEvidence?.(result.value);
            return server.delivery.toEvidenceToolResult(result.value, contract, recorded);
        });
    });
};
