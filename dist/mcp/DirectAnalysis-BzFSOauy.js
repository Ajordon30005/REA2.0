import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { a as init_result, i as err, o as ok } from "./analysisErrorBase-C1inc3JA.js";
import { a as init_errorSchemas, i as analysisErrorProjectionSchema } from "./toolEffects-BFdgf6jc.js";
import { n as init_logger, r as silentLogger } from "./logger-A6Md-u0U.js";
import { n as ArtifactResourceScope, r as init_ArtifactResourceScope } from "./ArtifactResourceScope-27rw7tKT.js";
import { _ as init_evidenceErrors, h as EvidenceIntegrityError, l as ProviderAdapterError, m as EvidenceFileError, n as projectAnalysisError, t as init_analysisErrorProjection, u as init_providerAdapterError } from "./analysisErrorProjection-DWZ-Gw1s.js";
import { i as jsonValueSchema, n as init_jsonValue } from "./jsonValue-D6WMzy_r.js";
import { a as AnalysisCapabilityUnavailableError, f as init_analysisErrorCore, i as AnalysisCancelledError, o as AnalysisInputError, s as AnalysisOutputError } from "./analysisErrorCore-SE09yKhJ.js";
import { s as init_evidence, t as createEvidence } from "./evidence-gY2e4uvs.js";
import { $a as artifactInspectionResultSchema, K as compareBundles, on as init_evidenceBundle, q as init_bundleComparison, tn as createImmutableEvidenceBundle, to as init_artifactInspection } from "./toolOutputSchemaGroups-Sg-EAusY.js";
import { G as addressedValueSchema, K as init_nativeInventory } from "./nativeInstruction-Z37i_4K9.js";
import { o as init_artifactToolContracts, t as ARTIFACT_ANALYSIS_OPERATIONS } from "./artifactToolContracts-cdT0z1t4.js";
import { a as init_managedToolContracts, o as isManagedToolName } from "./dosCom-BdiYRGl6.js";
import { F as absoluteCallerPath, I as init_callerPath, b as workflowAnalysisProfile, h as REA_WORKFLOW_PROVIDER, y as init_InvestigationProviders } from "./InvestigationProviders-l_FYDS9j.js";
import { f as init_analysisSnapshot, h as snapshotEvidenceForQuery, n as readAnalysisSnapshot, t as init_AnalysisSnapshotFiles, v as snapshotMatchesTarget } from "./AnalysisSnapshotFiles-D0K56bQE.js";
import { a as init_BundleResourceSession, d as profilelessNativeDispatchProfile, h as requiresNativeSourceAdmissionBeforeReplay, l as init_ProfilelessNativeWorkflowSnapshot, p as init_AnalysisSnapshotCache, r as BUNDLE_RESOURCE_OPERATIONS } from "./BundleResourceSession-C1u8HFql.js";
import { n as init_BinaryTargetResolver, r as parseBinaryTarget, t as classifyBinaryTargetFilesystemFailure } from "./BinaryTargetResolver-2344A4oK.js";
import { n as createAnalysisExecutionEvidence, r as init_AnalysisProvider } from "./AnalysisProvider-vsPGI45F.js";
import { Br as createWorkflowEvidence, Fr as readEvidenceBundle, Hr as init_WorkflowEvidence, Ir as readImmutableEvidenceBundle, Lr as writeEvidenceBundle, Mr as init_AnalysisViewService, Nr as inspectAnalysisViewValidated, Pr as init_EvidenceBundleFiles, Rr as init_JsonAuthenticationHeadroom, Ur as recordWorkflowUnknowns, Vr as executeComposedWorkflow, Wr as workflowSnapshotRecord, zr as requireAuthenticationHeadroom } from "./createServer-BuDysDIa.js";
import { n as resolveProcedureAddress, t as init_ProcedureAddressResolution } from "./ProcedureAddressResolution-DCMXS995.js";
import { i as init_analysisErrorCleanup, r as analysisErrorWithCleanupFailure } from "./providerCleanupError-CVyTfSTH.js";
import { access, stat } from "node:fs/promises";
import { setImmediate } from "node:timers/promises";

//#region dist/process/queuedInterrupts.js
var dispatchQueuedInterrupts;
function init_queuedInterrupts() {
	return (init_queuedInterrupts = __esmMin((() => {
		dispatchQueuedInterrupts = async () => {
			await setImmediate();
			await setImmediate();
		};
	})))();
}

//#endregion
//#region dist/application/XrefsAddressResolution.js
var resolveXrefsAddress;
function init_XrefsAddressResolution() {
	return (init_XrefsAddressResolution = __esmMin((() => {
		init_nativeInventory();
		init_analysisErrorCore();
		init_result();
		init_ProcedureAddressResolution();
		resolveXrefsAddress = async (analysis, selector, signal) => {
			if (selector.length === 0 || /^[0-9a-f]+$/iu.test(selector) || /^0x/iu.test(selector) || /:0x/iu.test(selector)) return ok(selector);
			const inventory = await analysis.execute("list_names", {}, { signal });
			if (!inventory.ok) {
				if (inventory.error instanceof AnalysisCapabilityUnavailableError && inventory.error.operation === "list_names" && !inventory.error.cleanupIncomplete) return resolveProcedureAddress(async (operation, parameters, signal) => {
					const result = await analysis.execute(operation, parameters, signal === undefined ? {} : { signal });
					return result.ok ? ok(result.value.result) : result;
				}, selector, signal);
				return inventory;
			}
			if (!Array.isArray(inventory.value.result)) return err(new AnalysisOutputError("list_names", "Expected a symbol inventory array"));
			const addresses = new Set();
			for (const [index, item] of inventory.value.result.entries()) {
				const parsed = addressedValueSchema.safeParse(item);
				if (!parsed.success || parsed.data.address.length === 0) return err(new AnalysisOutputError("list_names", `Invalid symbol inventory entry at index ${index}`));
				if (parsed.data.value === selector) addresses.add(parsed.data.address);
			}
			const [address] = addresses;
			if (addresses.size === 1 && address !== undefined) return ok(address);
			return err(new AnalysisInputError("xrefs", undefined, [{
				path: ["address"],
				reason: "invalid_value",
				message: addresses.size === 0 ? `Unknown analyzed symbol name ${JSON.stringify(selector)}. Use an exact analyzed name or a hexadecimal address.` : `Analyzed symbol name ${JSON.stringify(selector)} is ambiguous at ${[...addresses].join(", ")}. Select an exact address.`
			}]));
		};
	})))();
}

//#endregion
//#region dist/application/EvidenceBundleCommands.js
var importEvidenceBundleCommand, exportEvidenceBundleCommand, deliverAnalysisEvidence, publishEvidenceDelivery, inspectAnalysisViewFromBundle, persistEvidenceBundleCommand, compareEvidenceBundlesCommand, projectWrite;
function init_EvidenceBundleCommands() {
	return (init_EvidenceBundleCommands = __esmMin((() => {
		init_queuedInterrupts();
		init_callerPath();
		init_JsonAuthenticationHeadroom();
		init_evidenceErrors();
		init_analysisErrorCore();
		init_evidenceBundle();
		init_jsonValue();
		init_result();
		init_bundleComparison();
		init_ArtifactResourceScope();
		init_EvidenceBundleFiles();
		init_AnalysisViewService();
		importEvidenceBundleCommand = async (path) => {
			const loaded = await readEvidenceBundle(path, undefined, undefined, "import_evidence_bundle");
			if (!loaded.ok) return loaded;
			return ok({
				imported: loaded.value.records.length,
				unknowns_added: loaded.value.unknowns.length,
				total: loaded.value.records.length
			});
		};
		exportEvidenceBundleCommand = async (sourcePath, outputPath, overwrite) => {
			const loaded = await readImmutableEvidenceBundle(sourcePath, undefined, undefined, "export_evidence_bundle");
			if (!loaded.ok) return loaded;
			return projectWrite(loaded.value, await persistEvidenceBundleCommand(loaded.value, outputPath, overwrite));
		};
		deliverAnalysisEvidence = async (evidence, outputPath, detail = "complete", signal) => {
			const headroom = requireAuthenticationHeadroom(evidence, {
				operation: evidence.operation,
				path: absoluteCallerPath(outputPath),
				description: "Insufficient heap headroom to authenticate the complete parent Evidence"
			});
			if (!headroom.ok) return err(headroom.error.retainPartialObservation(evidence));
			const bundle = createImmutableEvidenceBundle([evidence]);
			const delivered = detail === "summary" ? inspectAnalysisViewValidated({
				source: {
					kind: "retained-evidence",
					evidence_id: evidence.evidence_id
				},
				view: { kind: "summary" }
			}, (id) => bundle.records.find((record) => record.evidence_id === id)) : ok(evidence);
			if (!delivered.ok) return delivered;
			const published = await publishEvidenceDelivery({
				bundle,
				complete: evidence,
				delivered: delivered.value,
				outputPath,
				operation: evidence.operation,
				signal
			});
			return published.ok ? ok(published.value.delivered) : published;
		};
		publishEvidenceDelivery = async (input) => {
			const { signal, operation } = input;
			const written = await persistEvidenceBundleCommand(input.bundle, input.outputPath, false, signal, operation);
			await dispatchQueuedInterrupts();
			if (!written.ok) return err(written.error.retainPartialObservation(input.complete));
			if (signal?.aborted) return err(new AnalysisCancelledError(operation, {
				cause: signal.reason,
				partialObservation: input.delivered,
				diagnostics: { evidence_bundle: { ...written.value } }
			}));
			return ok({
				delivered: input.delivered,
				evidenceBundle: written.value
			});
		};
		inspectAnalysisViewFromBundle = async (input, bundlePath, resources, signal) => {
			if (input.source.kind !== "retained-evidence") return err(new AnalysisInputError("inspect_analysis_view", undefined, [{
				path: ["source", "kind"],
				reason: "invalid_value",
				message: "--evidence-bundle requires a retained-evidence source with the exact parent evidence_id; inline Evidence already supplies its source"
			}]));
			const loaded = await readImmutableEvidenceBundle(bundlePath, signal, resources, "inspect_analysis_view");
			await dispatchQueuedInterrupts();
			if (!loaded.ok) return loaded;
			if (signal?.aborted) return err(new AnalysisCancelledError("inspect_analysis_view", { cause: signal.reason }));
			const projected = inspectAnalysisViewValidated(input, (id) => loaded.value.records.find((record) => record.evidence_id === id));
			await dispatchQueuedInterrupts();
			if (projected.ok && signal?.aborted) return err(new AnalysisCancelledError("inspect_analysis_view", {
				cause: signal.reason,
				partialObservation: projected.value
			}));
			return projected;
		};
		persistEvidenceBundleCommand = async (bundle, outputPath, overwrite, signal, operation) => {
			const resources = new ArtifactResourceScope();
			const written = await writeEvidenceBundle(bundle, outputPath, overwrite, resources, signal, operation);
			if (written.ok) return written;
			await resources.close().catch(() => undefined);
			if (!written.error.cleanupIncomplete && written.error instanceof EvidenceFileError && written.error.published) {
				return ok(written.error.published);
			}
			return written;
		};
		compareEvidenceBundlesCommand = async (input) => {
			const [left, right] = await Promise.all([readImmutableEvidenceBundle(input.leftPath, undefined, undefined, "compare_bundles"), readImmutableEvidenceBundle(input.rightPath, undefined, undefined, "compare_bundles")]);
			if (!left.ok) return left;
			if (!right.ok) return right;
			try {
				return ok(jsonValueSchema.parse(compareBundles(left.value, right.value)));
			} catch (cause) {
				return err(new EvidenceIntegrityError("Evidence bundle comparison failed", { cause }));
			}
		};
		projectWrite = (bundle, written) => written.ok ? ok({
			path: written.value.path,
			bytes: written.value.bytes,
			records: bundle.records.length
		}) : err(written.error);
	})))();
}

//#endregion
//#region dist/application/DirectAnalysisCleanup.js
var withSessionCleanup, directAnalysisCleanupFailure, managedAnalysisCleanupFailure;
function init_DirectAnalysisCleanup() {
	return (init_DirectAnalysisCleanup = __esmMin((() => {
		init_errorSchemas();
		init_analysisErrorProjection();
		init_jsonValue();
		init_providerAdapterError();
		init_result();
		init_analysisErrorCleanup();
		withSessionCleanup = async (session, operation, onCleanupFailure) => {
			let value;
			try {
				value = await operation();
			} catch (cause) {
				const closed = await session.close();
				if (!closed.ok) throw new AggregateError([cause, closed.error], "Analysis and provider cleanup both failed", { cause });
				throw cause;
			}
			const closed = await session.close();
			return closed.ok ? value : onCleanupFailure(value, closed.error);
		};
		directAnalysisCleanupFailure = (output, error) => {
			const cleanup = projectAnalysisError(error);
			if (typeof output === "object" && output !== null && !Array.isArray(output)) {
				const { error: label, ...projection } = output;
				const primary = analysisErrorProjectionSchema.safeParse(projection);
				if (typeof label === "string" && primary.success) return {
					error: label,
					...primary.data,
					code: "cleanup_incomplete",
					retryable: false,
					remediation: cleanup.remediation,
					details: {
						resources: error.cleanupResources.slice(),
						...primary.data.details,
						cleanup: "incomplete",
						execution_failure: primary.data.details !== undefined && "execution_failure" in primary.data.details ? primary.data.details.execution_failure ?? primary.data.code : primary.data.code,
						cleanup_error: cleanup
					}
				};
			}
			return {
				error: "Analysis failed",
				...cleanup,
				code: "cleanup_incomplete",
				retryable: false,
				details: {
					...cleanup.details,
					cleanup: "incomplete",
					partial_observation: output
				}
			};
		};
		managedAnalysisCleanupFailure = (result, error) => {
			if (!result.ok) return err(analysisErrorWithCleanupFailure(result.error, error));
			const cleanup = projectAnalysisError(error);
			return err(new ProviderAdapterError(error instanceof ProviderAdapterError ? error.providerId : "rea", "close_binary", {
				cause: error,
				remediationAction: cleanup.remediation.action,
				cleanup: {
					reason: cleanup.message,
					resources: error.cleanupResources
				},
				diagnostics: {
					cleanup_error: cleanup,
					partial_observation: jsonValueSchema.parse(result.value)
				}
			}));
		};
	})))();
}

//#endregion
//#region dist/application/DirectAnalysis.js
var NATIVE_INSPECTION_OPERATIONS, ARTIFACT_ANALYSIS_OPERATION_SET, runDirectAnalysis, runProviderAnalysis, runManagedProviderExecution, runManagedProviderAnalysis, runAnalysis, executeAnalysisTool, withProcessCancellation, prepareSnapshot, inspectBundleResourceInput, allowsSnapshotReplay, analysisProfileForRoute, nativeDispatchBindingProfile, providerIdentityForRoute, analysisProfileForEvidence, isWorkflowEvidenceTool, fileExists, cliError;
function init_DirectAnalysis() {
	return (init_DirectAnalysis = __esmMin((() => {
		init_queuedInterrupts();
		init_logger();
		init_evidence();
		init_artifactToolContracts();
		init_managedToolContracts();
		init_evidenceErrors();
		init_analysisErrorProjection();
		init_callerPath();
		init_AnalysisSnapshotFiles();
		init_AnalysisSnapshotCache();
		init_BinaryTargetResolver();
		init_analysisSnapshot();
		init_ProfilelessNativeWorkflowSnapshot();
		init_result();
		init_AnalysisProvider();
		init_InvestigationProviders();
		init_WorkflowEvidence();
		init_artifactInspection();
		init_XrefsAddressResolution();
		init_analysisErrorCore();
		init_EvidenceBundleCommands();
		init_DirectAnalysisCleanup();
		init_BundleResourceSession();
		NATIVE_INSPECTION_OPERATIONS = new Set([
			"inspect_macho",
			"inspect_signature",
			"list_architectures",
			"inspect_plist",
			"demangle_swift"
		]);
		ARTIFACT_ANALYSIS_OPERATION_SET = new Set(ARTIFACT_ANALYSIS_OPERATIONS);
		runDirectAnalysis = async (dependencies, path, tool, arguments_, options = {}) => withProcessCancellation(options.signal, (signal) => runAnalysis(dependencies, path, tool, arguments_, {
			logger: options.logger ?? silentLogger,
			snapshotPath: options.snapshotPath,
			signal,
			...options.formatHint === undefined ? {} : { formatHint: options.formatHint },
			...options.architecture === undefined ? {} : { architecture: options.architecture },
			...options.entryPoint === undefined ? {} : { entryPoint: options.entryPoint },
			...options.providerId === undefined ? {} : { providerId: options.providerId }
		}));
		runProviderAnalysis = async (dependencies, ...[path, tool, arguments_, logger = silentLogger, signal, delivery]) => {
			if (delivery !== undefined && tool !== "inspect_managed_members") return cliError(new AnalysisInputError(tool, undefined, [{
				path: ["delivery"],
				reason: "invalid_value",
				message: "Evidence delivery options are only supported by inspect_managed_members"
			}]));
			if (delivery?.detail === "summary" && delivery.evidenceBundlePath === undefined) return cliError(new AnalysisInputError(tool, undefined, [{
				path: ["evidence_bundle"],
				reason: "missing_argument",
				message: "summary detail requires --evidence-bundle so complete Evidence remains available to later CLI commands"
			}]));
			return withProcessCancellation(signal, async (operationSignal) => {
				if (isManagedToolName(tool)) {
					const original = await runManagedProviderAnalysis(dependencies, path, tool, arguments_, operationSignal);
					await dispatchQueuedInterrupts();
					if (!original.ok) return cliError(original.error);
					if (operationSignal.aborted) return cliError(new AnalysisCancelledError(tool, {
						cause: operationSignal.reason,
						partialObservation: original.value
					}));
					const result = delivery?.evidenceBundlePath === undefined ? original : await deliverAnalysisEvidence(original.value, delivery.evidenceBundlePath, delivery.detail, operationSignal);
					return result.ok ? result.value : cliError(result.error);
				}
				return runAnalysis(dependencies, path, tool, arguments_, {
					logger,
					snapshotPath: undefined,
					signal: operationSignal,
					...ARTIFACT_ANALYSIS_OPERATION_SET.has(tool) ? { createSession: dependencies.createArtifactBinarySession } : NATIVE_INSPECTION_OPERATIONS.has(tool) ? { createSession: dependencies.createNativeBinarySession } : {}
				});
			});
		};
		runManagedProviderExecution = async (dependencies, path, tool, signal, parameters = {}) => withProcessCancellation(signal, async (operationSignal) => {
			const session = await dependencies.createManagedBinarySession();
			return withSessionCleanup(session, async () => {
				const opened = await session.open(path, { signal: operationSignal });
				if (!opened.ok) return opened;
				return await session.execute(tool, parameters, { signal: operationSignal });
			}, managedAnalysisCleanupFailure);
		});
		runManagedProviderAnalysis = async (dependencies, path, tool, arguments_, signal) => {
			const execution = await runManagedProviderExecution(dependencies, path, tool, signal, arguments_);
			if (!execution.ok) return execution;
			const value = execution.value;
			return ok(createAnalysisExecutionEvidence(tool, arguments_, value, "observed", { immutable: true }));
		};
		runAnalysis = async (dependencies, path, tool, arguments_, options) => {
			const { logger, signal, snapshotPath } = options;
			let session;
			if (options.createSession !== undefined) {
				session = await options.createSession();
			} else {
				const config = dependencies.readConfiguration();
				if (!config.ok) return cliError(config.error);
				session = await (tool === "inspect_native_dispatch_metadata" && snapshotPath === undefined ? dependencies.createNativeDispatchBinarySession : dependencies.createBinarySession)(config.value, logger);
			}
			return withSessionCleanup(session, async () => {
				let isDirectory = false;
				if (BUNDLE_RESOURCE_OPERATIONS.has(tool)) {
					const inspected = await inspectBundleResourceInput(path);
					if (!inspected.ok) return cliError(inspected.error);
					isDirectory = inspected.value;
				}
				if (BUNDLE_RESOURCE_OPERATIONS.has(tool) && isDirectory) {
					const opened = await session.openBundleResources(path, { signal });
					if (!opened.ok) return cliError(opened.error);
					const execution = await session.execute(tool, arguments_, { signal });
					if (!execution.ok) return cliError(execution.error);
					return createAnalysisExecutionEvidence(tool, arguments_, execution.value, "observed");
				}
				const prepared = await prepareSnapshot({
					path,
					snapshotPath,
					signal,
					...options.formatHint === undefined ? {} : { formatHint: options.formatHint },
					...options.architecture === undefined ? {} : { architecture: options.architecture },
					...options.entryPoint === undefined ? {} : { entryPoint: options.entryPoint }
				});
				if (!prepared.ok) return cliError(prepared.error);
				const { snapshot } = prepared.value;
				let resolvedTarget;
				if (snapshot !== undefined && prepared.value.target !== undefined) {
					const preview = await session.previewTarget(prepared.value.target, {
						signal,
						snapshot,
						...options.formatHint === undefined ? {} : { formatHint: options.formatHint },
						...options.architecture === undefined ? {} : { architecture: options.architecture },
						...options.entryPoint === undefined ? {} : { entryPoint: options.entryPoint },
						...options.providerId === undefined ? {} : { providerId: options.providerId }
					});
					if (!preview.ok) return cliError(preview.error);
					resolvedTarget = preview.value;
					const route = preview.value.route;
					const bindingProfile = route.profile ?? nativeDispatchBindingProfile(route, tool);
					const evidenceProfile = analysisProfileForRoute(route, tool);
					if (bindingProfile !== undefined && evidenceProfile !== undefined && !requiresNativeSourceAdmissionBeforeReplay(route.binding?.identity.id) && allowsSnapshotReplay(route, tool)) {
						const cached = snapshotEvidenceForQuery(snapshot, {
							target: preview.value.target,
							bindingProfile,
							operation: tool,
							parameters: arguments_,
							provider: isWorkflowEvidenceTool(tool) ? REA_WORKFLOW_PROVIDER : providerIdentityForRoute(route, tool),
							evidenceProfile
						});
						if (cached !== undefined) return cached;
					}
				}
				const openOptions = {
					signal,
					...options.formatHint === undefined ? {} : { formatHint: options.formatHint },
					...options.architecture === undefined ? {} : { architecture: options.architecture },
					...options.entryPoint === undefined ? {} : { entryPoint: options.entryPoint },
					...snapshot === undefined ? {} : { snapshot },
					...options.providerId === undefined ? {} : { providerId: options.providerId }
				};
				const opened = resolvedTarget === undefined ? await session.open(path, openOptions) : await session.openResolvedTarget(resolvedTarget, openOptions);
				if (!opened.ok) return cliError(opened.error);
				const evidenceProfile = analysisProfileForEvidence(session, tool);
				const { output, evidence, cachePolicy } = await executeAnalysisTool({
					session,
					openedTarget: opened.value,
					tool,
					arguments: arguments_,
					signal,
					evidenceProfile
				});
				if (evidence !== undefined) {
					const recorded = session.recordEvidence(evidence);
					if (!recorded.ok) return cliError(recorded.error.retainPartialObservation(evidence));
					if (isWorkflowEvidenceTool(tool)) {
						const unknowns = recordWorkflowUnknowns({
							name: tool,
							result: evidence.normalized_result,
							evidenceId: evidence.evidence_id,
							recordUnknown: (unknown) => session.recordUnknown(unknown)
						});
						if (!unknowns.ok) return cliError(unknowns.error.retainPartialObservation(evidence));
					}
				}
				if (isWorkflowEvidenceTool(tool) && tool !== "trace_native_ui_action" && snapshotPath !== undefined && evidence !== undefined && session.allowsSnapshotReplay(tool)) {
					const workflowRecord = workflowSnapshotRecord(evidence, tool, evidenceProfile, cachePolicy);
					if (workflowRecord !== undefined) {
						const recorded = session.recordWorkflowSnapshot(workflowRecord);
						if (!recorded.ok) return cliError(recorded.error.retainPartialObservation(evidence));
					}
				}
				if (tool !== "trace_native_ui_action" && snapshotPath !== undefined && evidence !== undefined) {
					const snapshot = session.exportAnalysisSnapshot();
					if (!snapshot.ok) return cliError(snapshot.error.retainPartialObservation(evidence));
					const written = await session.writeAnalysisSnapshot(snapshot.value, snapshotPath, true);
					if (!written.ok) {
						const recovered = written.error instanceof EvidenceFileError && written.error.published !== undefined && (await session.closeWriteResources()).ok;
						if (!recovered) return cliError(written.error.retainPartialObservation(evidence));
					}
				}
				return output;
			}, directAnalysisCleanupFailure);
		};
		executeAnalysisTool = async (input) => {
			const { session, tool, signal, evidenceProfile } = input;
			if (tool === "analyze_function") {
				const { executeFunctionAnalysisEvidence } = await import("./createServer-BuDysDIa.js").then((n) => (n.xr(), n.br));
				const result = await executeFunctionAnalysisEvidence(session, input.arguments, input.openedTarget, { signal });
				return result.ok ? {
					output: result.value,
					evidence: result.value
				} : { output: cliError(result.error) };
			}
			if (tool === "binary_overview" || tool === "inspect_native_api" || tool === "inspect_native_dispatch_metadata" || tool === "trace_feature" || tool === "trace_native_values" || tool === "trace_native_ui_action") {
				const { EnhancedTools } = await import("./createServer-BuDysDIa.js").then((n) => (n.Cr(), n.Sr));
				const result = await executeComposedWorkflow(session, (observed) => new EnhancedTools(observed).execute(tool, input.arguments, signal));
				if (!result.ok) return { output: cliError(result.error) };
				const evidence = createWorkflowEvidence({
					target: input.openedTarget,
					operation: tool,
					parameters: input.arguments,
					result: result.value.result,
					upstreamProfile: evidenceProfile,
					upstreamLimitations: result.value.limitations
				});
				return {
					output: evidence,
					evidence,
					...result.value.cachePolicy === undefined ? {} : { cachePolicy: result.value.cachePolicy }
				};
			}
			let result = await session.execute(tool, input.arguments, { signal });
			if (tool === "xrefs" && typeof input.arguments.address === "string" && !result.ok && result.error instanceof AnalysisInputError && !result.error.cleanupIncomplete && result.error.issues.length > 0 && result.error.issues.every(({ path, reason }) => path.length === 1 && path[0] === "address" && reason === "invalid_format")) {
				const address = await resolveXrefsAddress(session, input.arguments.address, signal);
				if (!address.ok) return { output: cliError(address.error) };
				if (address.value !== input.arguments.address) result = await session.execute(tool, {
					...input.arguments,
					address: address.value
				}, { signal });
			}
			if (!result.ok) return { output: cliError(result.error) };
			const evidence = createEvidence(result.value.subject === undefined ? input.openedTarget : result.value.subject ?? undefined, result.value.provider, {
				operation: tool,
				parameters: input.arguments,
				result: result.value.result,
				...result.value.analysisProfile === undefined ? {} : { analysisProfile: result.value.analysisProfile },
				rawResult: result.value.rawResult,
				limitations: result.value.limitations,
				...result.value.relationshipCoverage === undefined ? {} : { relationshipCoverage: result.value.relationshipCoverage },
				locations: result.value.locations,
				evidenceLinks: tool === "inspect_artifact" ? artifactInspectionResultSchema.parse(result.value.result).evidence_links : []
			});
			return {
				output: evidence,
				evidence
			};
		};
		withProcessCancellation = async (suppliedSignal, operation) => {
			if (suppliedSignal !== undefined) return operation(suppliedSignal);
			const controller = new AbortController();
			const cancel = () => controller.abort();
			process.on("SIGINT", cancel);
			process.on("SIGTERM", cancel);
			try {
				return await operation(controller.signal);
			} finally {
				process.off("SIGINT", cancel);
				process.off("SIGTERM", cancel);
			}
		};
		prepareSnapshot = async (options) => {
			const { path, snapshotPath } = options;
			if (snapshotPath === undefined || !await fileExists(snapshotPath)) return ok({});
			const loaded = await readAnalysisSnapshot(snapshotPath, options.signal);
			if (!loaded.ok) return loaded;
			const target = await parseBinaryTarget(path, {
				signal: options.signal,
				...options.formatHint === undefined ? {} : { formatHint: options.formatHint },
				...options.architecture === undefined ? {} : { architecture: options.architecture },
				...options.entryPoint === undefined ? {} : { entryPoint: options.entryPoint }
			});
			if (!target.ok) return target;
			if (!snapshotMatchesTarget(loaded.value.target, target.value)) return err(new EvidenceIntegrityError("Analysis snapshot target does not match the requested binary"));
			return ok({
				snapshot: loaded.value,
				target: target.value
			});
		};
		inspectBundleResourceInput = async (path) => {
			const callerPath = absoluteCallerPath(path);
			try {
				return ok((await stat(callerPath)).isDirectory());
			} catch (cause) {
				const failure = classifyBinaryTargetFilesystemFailure(callerPath, cause);
				if (failure !== undefined) return err(failure);
				throw cause;
			}
		};
		allowsSnapshotReplay = (route, tool) => {
			if (tool === "trace_native_ui_action") return false;
			const descriptor = route.capabilities?.get(tool);
			return descriptor === undefined ? ![...route.capabilities?.values() ?? []].some(({ cachePolicy }) => cachePolicy === "live") : descriptor.cachePolicy !== "live";
		};
		analysisProfileForRoute = (route, tool) => {
			const profile = route.profile;
			const nativeDispatchProfile = profile === null || profile === undefined ? nativeDispatchBindingProfile(route, tool) : undefined;
			if (profile === null || profile === undefined) {
				if (nativeDispatchProfile === undefined) return undefined;
				return isWorkflowEvidenceTool(tool) ? workflowAnalysisProfile(nativeDispatchProfile, tool) : nativeDispatchProfile;
			}
			if (isWorkflowEvidenceTool(tool)) return workflowAnalysisProfile(profile, tool);
			const provider = providerIdentityForRoute(route, tool);
			return provider.id === profile.provider.id ? profile : undefined;
		};
		nativeDispatchBindingProfile = (route, operation) => {
			if (operation !== "inspect_native_dispatch_metadata") return undefined;
			return profilelessNativeDispatchProfile(route);
		};
		providerIdentityForRoute = (route, operation) => route.capabilities?.get(operation)?.provider ?? route.identity;
		analysisProfileForEvidence = (session, tool) => {
			if (!isWorkflowEvidenceTool(tool)) return session.analysisProfile(tool);
			return session.analysisProfile() ?? session.analysisProfile(tool);
		};
		isWorkflowEvidenceTool = (tool) => tool === "binary_overview" || tool === "inspect_native_api" || tool === "inspect_native_dispatch_metadata" || tool === "trace_feature" || tool === "trace_native_values" || tool === "trace_native_ui_action";
		fileExists = async (path) => {
			try {
				await access(path);
				return true;
			} catch (cause) {
				if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT") return false;
				throw cause;
			}
		};
		cliError = (error) => ({
			error: "Analysis failed",
			...projectAnalysisError(error)
		});
	})))();
}

//#endregion
init_DirectAnalysis();
export { runDirectAnalysis, runManagedProviderExecution, runProviderAnalysis };