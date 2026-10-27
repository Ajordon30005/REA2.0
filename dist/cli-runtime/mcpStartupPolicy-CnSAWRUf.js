import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";

//#region dist/mcpStartupPolicy.js
var MCP_STARTUP_POLICY, fixedMcpPhaseBudgetRecovery, mcpDoctorDeadlineRecovery, mcpProviderDeadlineAllowanceMs, recommendedMcpToolTimeoutMs, recommendedMcpToolTimeoutSeconds;
function init_mcpStartupPolicy() {
	return (init_mcpStartupPolicy = __esmMin((() => {
		MCP_STARTUP_POLICY = {
			codexStartupTimeoutSeconds: 30,
			kimiStartupTimeoutMs: 3e4,
			toolOperationHeadroomMs: 12e4,
			initializeBudgetMs: 15e3,
			toolsListBudgetMs: 5e3,
			firstCatalogBudgetMs: 2e4,
			doctorDeadlineMs: 3e4,
			doctorStderrBytes: 64 * 1024
		};
		fixedMcpPhaseBudgetRecovery = (phase, value, unit) => `REA's fixed ${phase} is ${String(value)} ${unit} and this release has no runtime override.`;
		mcpDoctorDeadlineRecovery = (budgetMs) => `${fixedMcpPhaseBudgetRecovery("MCP doctor startup deadline", budgetMs, "ms")} Codex startup_timeout_sec of ${String(MCP_STARTUP_POLICY.codexStartupTimeoutSeconds)} seconds is client guidance; REA does not enforce that figure as this deadline.`;
		mcpProviderDeadlineAllowanceMs = (inputs) => {
			const selectedProvider = inputs.analysisProvider;
			const selectedTimeout = selectedProvider === "ghidra" ? inputs.ghidraStartupTimeoutMs : selectedProvider === "hopper" ? inputs.hopperStartupTimeoutMs : Math.max(inputs.ghidraStartupTimeoutMs, inputs.hopperStartupTimeoutMs);
			return Math.max(selectedTimeout, inputs.jebMcpTimeoutMs ?? 0, inputs.providerRequestTimeoutMs ?? 0);
		};
		recommendedMcpToolTimeoutMs = (inputs) => mcpProviderDeadlineAllowanceMs(inputs) + MCP_STARTUP_POLICY.toolOperationHeadroomMs;
		recommendedMcpToolTimeoutSeconds = (inputs) => Math.ceil(recommendedMcpToolTimeoutMs(inputs) / 1e3);
	})))();
}

//#endregion
export { MCP_STARTUP_POLICY, init_mcpStartupPolicy, mcpDoctorDeadlineRecovery, mcpProviderDeadlineAllowanceMs, recommendedMcpToolTimeoutMs, recommendedMcpToolTimeoutSeconds };