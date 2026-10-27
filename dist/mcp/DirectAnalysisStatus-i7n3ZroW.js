import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { h as init_CurrentEntrypointPath, l as compactPresentationForMcpInputSchemaProfile, m as CURRENT_ENTRYPOINT_PATH, u as init_mcpInputSchemaProfile } from "./toolSchemaMetadata-Lk-MnT2m.js";
import { n as init_logger, r as silentLogger } from "./logger-A6Md-u0U.js";
import { n as projectAnalysisError, t as init_analysisErrorProjection } from "./analysisErrorProjection-DWZ-Gw1s.js";
import { n as init_jsonValue, r as jsonObjectSchema } from "./jsonValue-D6WMzy_r.js";
import { mr as providerCapabilitySet, pr as init_toolOutputSchemaPrimitives } from "./toolOutputSchemaGroups-Sg-EAusY.js";
import { Ar as createServerIdentity, Dr as sqliteDatabaseCapability, Er as init_SqliteDatabaseCapability, Tr as init_catalogIdentity, jr as init_serverIdentity, wr as createCatalogIdentity } from "./createServer-BuDysDIa.js";
import { n as init_BinarySessionStatus, r as providerCapabilitySets } from "./BinarySessionStatus-C11xHzAf.js";

//#region dist/application/DirectAnalysisStatus.js
var runSessionStatus;
function init_DirectAnalysisStatus() {
	return (init_DirectAnalysisStatus = __esmMin((() => {
		init_analysisErrorProjection();
		init_jsonValue();
		init_serverIdentity();
		init_logger();
		init_toolOutputSchemaPrimitives();
		init_BinarySessionStatus();
		init_SqliteDatabaseCapability();
		init_CurrentEntrypointPath();
		init_catalogIdentity();
		init_mcpInputSchemaProfile();
		runSessionStatus = async (dependencies, logger = silentLogger) => {
			const config = dependencies.readConfiguration();
			if (!config.ok) return { error: projectAnalysisError(config.error) };
			const session = await dependencies.createBinarySession(config.value, logger);
			try {
				const status = jsonObjectSchema.parse(await session.status());
				return {
					...status,
					capabilities: [...providerCapabilitySet.array().parse(status.capabilities), ...providerCapabilitySets([sqliteDatabaseCapability(process.versions.node)])],
					server_identity: createServerIdentity({
						startedAt: new Date().toISOString(),
						commandPath: CURRENT_ENTRYPOINT_PATH,
						catalog: createCatalogIdentity(compactPresentationForMcpInputSchemaProfile(config.value.mcpInputSchemaProfile), config.value.mcpOutputSchemaProfile ?? "full")
					})
				};
			} finally {
				await session.close();
			}
		};
	})))();
}

//#endregion
init_DirectAnalysisStatus();
export { runSessionStatus };