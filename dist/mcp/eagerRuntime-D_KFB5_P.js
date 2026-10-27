import { n as __exportAll, t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { n as snapshotEnvironment, t as init_snapshotEnvironment } from "./snapshotEnvironment-CH6esxCR.js";
import { a as init_result, i as err, o as ok } from "./analysisErrorBase-C1inc3JA.js";
import { d as parseConfig, u as init_parseConfig } from "./promptArguments-FxBaIMrw.js";
import { n as init_logger, t as createLogger } from "./logger-A6Md-u0U.js";
import { n as projectAnalysisError, t as init_analysisErrorProjection } from "./analysisErrorProjection-DWZ-Gw1s.js";
import { c as MCP_HTTP_LISTEN_FAILED, i as init_shutdown, n as init_OwnedMcpServers, o as MCP_CONNECTION_LOST, r as createShutdown, s as MCP_CONNECTION_START_FAILED, t as OwnedMcpServers, u as init_messages } from "./OwnedMcpServers-hH8goR3i.js";
import { _ as PLAYWRIGHT_ELECTRON_ACTIVE_PROVIDER_IDENTITY, a as init_toolResult, g as PLAYWRIGHT_BROWSER_SCENARIO_PROVIDER_IDENTITY, h as CDP_ELECTRON_PROVIDER_IDENTITY, i as createToolResultDelivery, m as CDP_BROWSER_PROVIDER_IDENTITY, o as createAndroidAnalysisProvider, r as init_createServer, s as init_android, t as createServer, v as init_providerIdentities } from "./createServer-bOP6Odqx.js";
import { n as createBinarySession, r as init_binary } from "./binary-VHJzsafy.js";
import { n as init_streamableHttpListenError, t as StreamableHttpListenError } from "./streamableHttpListenError-BXVhHhYb.js";

//#region dist/inspector/providerIdentity.js
var V8_INSPECTOR_PROVIDER_IDENTITY;
function init_providerIdentity() {
	return (init_providerIdentity = __esmMin((() => {
		V8_INSPECTOR_PROVIDER_IDENTITY = Object.freeze({
			id: "rea-v8-inspector",
			name: "REA passive Node/Electron V8 Inspector provider",
			version: "1"
		});
	})))();
}

//#endregion
//#region dist/main/startup.js
var openInitialTarget;
function init_startup() {
	return (init_startup = __esmMin((() => {
		init_analysisErrorProjection();
		openInitialTarget = async (session, config, serverLogger, writeStderr) => {
			if (config.hopperTargetPath === undefined) return { ok: true };
			const opened = await session.open(config.hopperTargetPath, { targetKind: config.hopperTargetKind });
			if (opened.ok) return { ok: true };
			const closed = await session.close();
			serverLogger.error({
				error: projectAnalysisError(opened.error),
				...closed.ok ? {} : { cleanup_error: projectAnalysisError(closed.error) }
			}, "Initial target failed to open");
			writeStderr(`${projectAnalysisError(opened.error).message}\n`);
			if (!closed.ok) writeStderr(`${projectAnalysisError(closed.error).message}\n`);
			return {
				ok: false,
				exitCode: 1
			};
		};
	})))();
}

//#endregion
//#region dist/main/transport.js
var startMcpTransport;
function init_transport() {
	return (init_transport = __esmMin((() => {
		init_android();
		init_createServer();
		init_streamableHttpListenError();
		init_OwnedMcpServers();
		init_analysisErrorProjection();
		init_messages();
		startMcpTransport = async (dependencies, session, serverContext) => {
			const { serverLogger } = serverContext;
			let optionalProviders = {};
			try {
				optionalProviders = await serverContext.loadOptionalProviders();
			} catch (cause) {
				serverLogger.warn({ error: cause instanceof Error ? cause.message : String(cause) }, "Optional MCP providers could not load; affected tools remain unavailable");
			}
			const { optionalProviderLoadFailures, ...observationProviders } = optionalProviders;
			for (const failure of Object.values(optionalProviderLoadFailures ?? {})) {
				serverLogger.warn({
					providerId: failure.providerId,
					error: failure.reason
				}, "Optional MCP adapter could not load; its peers remain available");
			}
			const androidProviders = [];
			const servers = new OwnedMcpServers();
			const closeServers = async () => {
				const results = await servers.closeAll();
				const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
				if (failures.length > 0) throw new AggregateError(failures, "REA server cleanup failed");
			};
			const closeAndroid = async () => {
				const results = await Promise.allSettled(androidProviders.map((provider) => provider.close()));
				for (const result of results) if (result.status === "rejected") throw result.reason;
			};
			const optionalProvidersToClose = new Set(Object.values(observationProviders).filter((provider) => provider !== undefined));
			let optionalProviderClose;
			const closeOptionalProviders = async () => {
				optionalProviderClose ??= (async () => {
					const results = await Promise.allSettled([...optionalProvidersToClose].map(async (provider) => {
						await provider.close?.();
						optionalProvidersToClose.delete(provider);
					}));
					const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
					if (failures.length > 0) throw new AggregateError(failures, "Optional provider cleanup failed");
				})().catch((cause) => {
					optionalProviderClose = undefined;
					throw cause;
				});
				await optionalProviderClose;
			};
			let handle;
			try {
				handle = await dependencies.serve(() => servers.create(() => {
					const android = createAndroidAnalysisProvider(serverContext.environment);
					androidProviders.push(android);
					const server = (dependencies.createServer ?? createServer)({
						kind: "session",
						session
					}, {
						logger: serverContext.logger,
						environment: serverContext.environment,
						delivery: serverContext.delivery,
						...optionalProviders,
						optionalObservationProviderOwner: "caller",
						androidAnalysis: android
					});
					return server;
				}), {
					onerror: () => {
						serverLogger.error(MCP_CONNECTION_LOST);
						dependencies.writeStderr(`${MCP_CONNECTION_LOST}\n`);
					},
					logger: serverLogger
				});
			} catch (cause) {
				const [binaryCleanup, androidCleanup, serverCleanup, optionalProviderCleanup] = await Promise.allSettled([
					session.close(),
					closeAndroid(),
					closeServers(),
					closeOptionalProviders()
				]);
				const startFailure = cause instanceof StreamableHttpListenError ? MCP_HTTP_LISTEN_FAILED : MCP_CONNECTION_START_FAILED;
				serverLogger.error({ error: cause instanceof Error ? cause.message : String(cause) }, startFailure);
				dependencies.writeStderr(`${startFailure}\n`);
				if (binaryCleanup.status === "fulfilled" && !binaryCleanup.value.ok) {
					const cleanupError = projectAnalysisError(binaryCleanup.value.error);
					serverLogger.error({ cleanup_error: cleanupError }, "Binary provider cleanup failed after MCP startup");
					dependencies.writeStderr(`${cleanupError.message}\n`);
				}
				for (const cleanup of [
					binaryCleanup,
					androidCleanup,
					serverCleanup,
					optionalProviderCleanup
				]) {
					if (cleanup.status === "rejected") {
						const reason = cleanup.reason instanceof Error ? cleanup.reason.message : String(cleanup.reason);
						serverLogger.error({ cleanup_error: reason }, "Provider cleanup rejected after MCP startup");
						dependencies.writeStderr(`Provider cleanup failed: ${reason}\n`);
					}
				}
				return { ok: false };
			}
			return {
				ok: true,
				handle: {
					...handle.prepareShutdown === undefined ? {} : { prepareShutdown: handle.prepareShutdown },
					close: async () => {
						await handle.prepareShutdown?.();
						const results = await Promise.allSettled([handle.close(), closeServers()]);
						const failures = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
						if (failures.length === 1) throw failures[0];
						if (failures.length > 1) throw new AggregateError(failures, "REA transport cleanup failed");
					}
				},
				closeAndroid,
				closeOptionalProviders
			};
		};
	})))();
}

//#endregion
//#region dist/composition/optionalObservationProviders.js
var createOptionalObservationFactories, loadPort, loadOptionalObservationProviders;
function init_optionalObservationProviders() {
	return (init_optionalObservationProviders = __esmMin((() => {
		init_snapshotEnvironment();
		init_providerIdentities();
		init_providerIdentity();
		init_result();
		createOptionalObservationFactories = (selectedEnvironment) => {
			const environment = snapshotEnvironment(selectedEnvironment);
			return {
				browserObservation: async () => (await import("./browserObservation-DPgYrUx3.js")).createBrowserObservationProvider(),
				browserScenarioCapture: async () => (await import("./browserScenario-DjzIE1VR.js")).createBrowserScenarioProvider(environment),
				electronObservation: async () => (await import("./electronObservation-PNhdwG3d.js")).createElectronObservationProvider(environment),
				electronActiveObservation: async () => (await import("./electronScenario-CL9wyokT.js")).createElectronScenarioProvider(environment),
				javascriptRuntimeObservation: async () => (await import("./javascriptRuntimeObservation-De7KjLNf.js")).createJavaScriptRuntimeObservationProvider(environment)
			};
		};
		loadPort = async (factory, providerId) => {
			try {
				return ok(await factory());
			} catch (cause) {
				return err({
					providerId,
					reason: cause instanceof Error ? cause.message : String(cause)
				});
			}
		};
		loadOptionalObservationProviders = async (factories) => {
			const [browser, scenario, electron, electronActive, runtime] = await Promise.all([
				loadPort(factories.browserObservation, CDP_BROWSER_PROVIDER_IDENTITY.id),
				loadPort(factories.browserScenarioCapture, PLAYWRIGHT_BROWSER_SCENARIO_PROVIDER_IDENTITY.id),
				loadPort(factories.electronObservation, CDP_ELECTRON_PROVIDER_IDENTITY.id),
				loadPort(factories.electronActiveObservation, PLAYWRIGHT_ELECTRON_ACTIVE_PROVIDER_IDENTITY.id),
				loadPort(factories.javascriptRuntimeObservation, V8_INSPECTOR_PROVIDER_IDENTITY.id)
			]);
			return {
				...browser.ok ? { browserObservation: browser.value } : {},
				...scenario.ok ? { browserScenarioCapture: scenario.value } : {},
				...electron.ok ? { electronObservation: electron.value } : {},
				...electronActive.ok ? { electronActiveObservation: electronActive.value } : {},
				...runtime.ok ? { javascriptRuntimeObservation: runtime.value } : {},
				optionalProviderLoadFailures: {
					...browser.ok ? {} : { browserObservation: browser.error },
					...scenario.ok ? {} : { browserScenarioCapture: scenario.error },
					...electron.ok ? {} : { electronObservation: electron.error },
					...electronActive.ok ? {} : { electronActiveObservation: electronActive.error },
					...runtime.ok ? {} : { javascriptRuntimeObservation: runtime.error }
				}
			};
		};
	})))();
}

//#endregion
//#region dist/main/eagerRuntime.js
var eagerRuntime_exports = /* @__PURE__ */ __exportAll({ runEager: () => runEager });
var runEager;
function init_eagerRuntime() {
	return (init_eagerRuntime = __esmMin((() => {
		init_snapshotEnvironment();
		init_result();
		init_parseConfig();
		init_binary();
		init_logger();
		init_analysisErrorProjection();
		init_startup();
		init_transport();
		init_optionalObservationProviders();
		init_toolResult();
		init_shutdown();
		runEager = async (dependencies, selectedConfig) => {
			const environment = snapshotEnvironment(dependencies.env);
			const config = selectedConfig === undefined ? parseConfig(environment) : ok(selectedConfig);
			if (!config.ok) {
				dependencies.writeStderr(`${projectAnalysisError(config.error).message}\n`);
				return 1;
			}
			const logger = createLogger("mcp", config.value.logLevel);
			const serverLogger = logger.child({ layer: "server" });
			const session = createBinarySession(config.value, logger, environment);
			const opened = await openInitialTarget(session, config.value, serverLogger, dependencies.writeStderr);
			if (!opened.ok) return opened.exitCode;
			const transport = await startMcpTransport(dependencies, session, {
				logger,
				serverLogger,
				environment,
				delivery: createToolResultDelivery(config.value.mcpMaxResponseBytes),
				loadOptionalProviders: dependencies.loadOptionalProviders ?? (() => loadOptionalObservationProviders(createOptionalObservationFactories(environment)))
			});
			if (!transport.ok) return 1;
			const shutdown = createShutdown({
				handle: transport.handle,
				closeAndroid: transport.closeAndroid,
				closeOptionalProviders: transport.closeOptionalProviders,
				session,
				dependencies,
				serverLogger
			});
			dependencies.captureShutdown?.(shutdown.shutdown);
			return 0;
		};
	})))();
}

//#endregion
export { init_providerIdentity as i, init_eagerRuntime as n, V8_INSPECTOR_PROVIDER_IDENTITY as r, eagerRuntime_exports as t };