import { MARVOSA_TOOL_CONTRACTS } from "../contracts/marvosaToolContracts.js";
import { createEvidenceToolHandler } from "./contractToolHandler.js";
import { applicationToolRegistrationOptions } from "./toolRegistrationOptions.js";
export const registerMarvosaTools = (server, service, logger, recordEvidence, admission, evidenceById) => {
    for (const contract of MARVOSA_TOOL_CONTRACTS) {
        const handler = createEvidenceToolHandler(server, (input, options) => service.execute(contract.name, input, options, evidenceById), logger, recordEvidence, admission);
        server.registerTool(contract.name, applicationToolRegistrationOptions(contract), handler(contract));
    }
};
