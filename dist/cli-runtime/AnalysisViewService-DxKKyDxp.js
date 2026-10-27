import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { AnalysisCancelledError, AnalysisCapabilityUnavailableError, immutableJsonSnapshotMember, init_analysisErrorCore, init_immutableJson, init_jsonValue, isImmutableJsonSnapshot, jsonValueSchema } from "./jsonSerialization-BNsB4Jxk.js";
import { EvidenceFileError, EvidenceIntegrityError, EvidenceReferenceError, init_evidenceErrors } from "./cliResultOutput-BfQ9qNAk.js";
import { analysisInputErrorFromIssues, createEvidence, err, init_evidence, init_inputIssueProjection, init_result, ok, parseEvidence, projectInputIssues } from "./reconstructionObligationLedgerSchemas-DY5ovcSC.js";
import { EnvironmentManifestAccumulator, EnvironmentStateAccumulator, INSPECT_ANALYSIS_VIEW_OPERATION, WebNetworkApiSurfaceAccumulator, admitAnalysisViewData, init_EnvironmentManifestAccumulator, init_EnvironmentStateAccumulator, init_WebNetworkApiSurfaceAccumulator, init_analysisView, init_analysisViewDataAdmission, init_analysisViewErrors, inspectAnalysisViewInputSchema, projectAnalysisView } from "./analysisView-CqIpzMmO.js";
import { ANALYSIS_VIEW_PROVIDER, init_InvestigationProviders } from "./InvestigationProviders-tnSNd7MQ.js";
import { init_JsonAuthenticationHeadroom, requireAuthenticationHeadroom } from "./JsonAuthenticationHeadroom-7YzbtnRu.js";
import { init_JsonFiles, readJsonFile } from "./JsonFiles-DABxEMVV.js";
import { z } from "zod";
import { setImmediate } from "node:timers/promises";

//#region dist/application/EvidenceInputResolver.js
var resolveEvidenceInput, resolveApplicationEvidenceRequest, resolvePairedEvidenceRequest;
function init_EvidenceInputResolver() {
	return (init_EvidenceInputResolver = __esmMin((() => {
		init_evidenceErrors();
		init_result();
		resolveEvidenceInput = (input, lookup) => {
			if (!("kind" in input)) return ok(input);
			const record = lookup?.(input.evidence_id);
			if (record === undefined) return err(new EvidenceReferenceError(input.evidence_id, "missing", "Evidence available to the selected source", null));
			if (record.evidence_id !== input.evidence_id) return err(new EvidenceReferenceError(input.evidence_id, "identity_mismatch", input.evidence_id, record.evidence_id));
			return ok(record);
		};
		resolveApplicationEvidenceRequest = (input, lookup) => {
			const application = resolveEvidenceInput(input.application, lookup);
			if (!application.ok) return application;
			return ok({
				...input,
				application: application.value
			});
		};
		resolvePairedEvidenceRequest = (input, lookup) => {
			const left = resolveEvidenceInput(input.left, lookup);
			if (!left.ok) return left;
			const right = resolveEvidenceInput(input.right, lookup);
			if (!right.ok) return right;
			return ok({
				...input,
				left: left.value,
				right: right.value
			});
		};
	})))();
}

//#endregion
//#region dist/application/analysisView/evidenceFileSource.js
var readEvidenceFileSource;
function init_evidenceFileSource() {
	return (init_evidenceFileSource = __esmMin((() => {
		init_JsonAuthenticationHeadroom();
		init_analysisErrorCore();
		init_analysisViewErrors();
		init_result();
		init_evidence();
		init_evidenceErrors();
		init_inputIssueProjection();
		init_JsonFiles();
		readEvidenceFileSource = async (path, options = {}) => {
			const { signal, resources } = options;
			if (signal?.aborted) return err(new AnalysisCancelledError(INSPECT_ANALYSIS_VIEW_OPERATION, { cause: signal.reason }));
			const loaded = await readJsonFile(path, signal, resources, INSPECT_ANALYSIS_VIEW_OPERATION);
			if (!loaded.ok) return loaded;
			if (signal?.aborted) return err(new AnalysisCancelledError(INSPECT_ANALYSIS_VIEW_OPERATION, { cause: signal.reason }));
			const headroom = requireAuthenticationHeadroom(loaded.value, {
				operation: INSPECT_ANALYSIS_VIEW_OPERATION,
				path,
				description: "Insufficient heap headroom to authenticate the Evidence file"
			});
			if (!headroom.ok) return headroom;
			try {
				return ok(parseEvidence(loaded.value));
			} catch (cause) {
				if (cause instanceof z.ZodError) return err(new EvidenceFileError("read", "wrong-kind", {
					path,
					cause,
					contentIssues: projectInputIssues(cause.issues, loaded.value),
					userMessage: "The selected file does not contain valid Evidence. Repair or recreate the file and try again."
				}));
				if (cause instanceof TypeError) return err(new EvidenceIntegrityError(cause.message, {
					cause,
					userMessage: cause.message
				}));
				throw cause;
			}
		};
	})))();
}

//#endregion
//#region dist/application/analysisView/AnalysisViewService.js
var inspectAnalysisView, inspectAnalysisViewWithFiles, inspectAnalysisViewValidatedWithFiles, inspectAnalysisViewValidated, requireAnalysisViewRetention, summarizeRetainedAnalysis, projectRetainedAnalysis, resolveAnalysisViewSource, authenticateEvidence, createAnalysisViewEvidence;
function init_AnalysisViewService() {
	return (init_AnalysisViewService = __esmMin((() => {
		init_analysisViewErrors();
		init_jsonValue();
		init_InvestigationProviders();
		init_EvidenceInputResolver();
		init_analysisErrorCore();
		init_inputIssueProjection();
		init_evidenceErrors();
		init_evidence();
		init_analysisView();
		init_immutableJson();
		init_result();
		init_WebNetworkApiSurfaceAccumulator();
		init_EnvironmentManifestAccumulator();
		init_EnvironmentStateAccumulator();
		init_analysisViewDataAdmission();
		init_evidenceFileSource();
		inspectAnalysisView = (rawInput, lookup) => {
			const parsed = inspectAnalysisViewInputSchema.safeParse(rawInput);
			if (!parsed.success) return err(analysisInputErrorFromIssues(INSPECT_ANALYSIS_VIEW_OPERATION, parsed.error.issues, rawInput, { cause: parsed.error }));
			return inspectAnalysisViewValidated(parsed.data, lookup);
		};
		inspectAnalysisViewWithFiles = async (rawInput, lookup, options = {}) => {
			const parsed = inspectAnalysisViewInputSchema.safeParse(rawInput);
			if (!parsed.success) return err(analysisInputErrorFromIssues(INSPECT_ANALYSIS_VIEW_OPERATION, parsed.error.issues, rawInput, { cause: parsed.error }));
			return inspectAnalysisViewValidatedWithFiles(parsed.data, lookup, options);
		};
		inspectAnalysisViewValidatedWithFiles = async (input, lookup, options = {}) => {
			if (input.source.kind !== "evidence-file") return inspectAnalysisViewValidated(input, lookup);
			const loaded = await readEvidenceFileSource(input.source.path, options);
			const cancelled = async () => {
				await setImmediate();
				return options.signal?.aborted === true;
			};
			if (await cancelled()) return err(new AnalysisCancelledError(INSPECT_ANALYSIS_VIEW_OPERATION, { cause: options.signal?.reason }));
			if (!loaded.ok) return loaded;
			const id = loaded.value.evidence_id;
			const projected = inspectAnalysisViewValidated({
				...input,
				source: {
					kind: "retained-evidence",
					evidence_id: id
				}
			}, (evidenceId) => evidenceId === id ? loaded.value : lookup?.(evidenceId));
			if (await cancelled()) return err(new AnalysisCancelledError(INSPECT_ANALYSIS_VIEW_OPERATION, { cause: options.signal?.reason }));
			return projected;
		};
		inspectAnalysisViewValidated = (input, lookup) => {
			const apiSurfaceAccumulator = input.view.kind === "api-surface" ? new WebNetworkApiSurfaceAccumulator(undefined, input.view.include_query_parameter_names === true) : undefined;
			const manifestAccumulator = input.view.kind === "environment-manifest" ? new EnvironmentManifestAccumulator(undefined, input.view.include_query_parameter_names, input.view.template_rules) : undefined;
			const stateAccumulator = input.view.kind === "environment-state" ? new EnvironmentStateAccumulator(undefined, input.view.template_rules) : undefined;
			const accumulator = apiSurfaceAccumulator ?? manifestAccumulator ?? stateAccumulator;
			if (input.source.kind === "inline") {
				const admitted = accumulator === undefined ? admitAnalysisViewData(input.source.evidence, true) : accumulator.admitInlineEvidence(input.source.evidence);
				if (!admitted.ok) return admitted;
			}
			const resolved = resolveAnalysisViewSource(input.source, lookup);
			if (!resolved.ok) return resolved;
			const parent = resolved.value;
			const projected = projectAnalysisView({
				evidenceId: parent.evidence_id,
				operation: parent.operation,
				provider: parent.provider,
				analysisProfileDigest: parent.analysis_profile?.digest ?? null,
				normalizedResult: immutableJsonSnapshotMember(parent, "normalized_result") ?? parent.normalized_result,
				sealedResult: isImmutableJsonSnapshot(parent),
				subject: parent.subject,
				limitations: parent.limitations,
				parameters: parent.parameters,
				artifact: parent.subject === null ? null : {
					path: parent.subject.local_path,
					sha256: parent.subject.digest.sha256
				}
			}, input.view, {
				apiSurface: apiSurfaceAccumulator,
				manifest: manifestAccumulator,
				state: stateAccumulator
			});
			if (!projected.ok) return projected;
			if (parent.subject !== null && parent.subject.digest.sha256 !== projected.value.artifact?.sha256) return err(new EvidenceIntegrityError(`Parent subject SHA-256 ${parent.subject.digest.sha256} differs from analysis artifact SHA-256 ${projected.value.artifact?.sha256 ?? "unknown"}.`));
			return ok(createAnalysisViewEvidence(input, parent, projected.value));
		};
		requireAnalysisViewRetention = (operation, retention) => {
			if (retention.recordEvidence === undefined || retention.evidenceById === undefined) return err(new AnalysisCapabilityUnavailableError(ANALYSIS_VIEW_PROVIDER.id, operation, "summary detail requires a server session that retains Evidence for later views", { userMessage: "This server does not retain Evidence. Select detail complete to receive the complete analysis inline." }));
			return ok({
				evidenceById: retention.evidenceById,
				recordEvidence: retention.recordEvidence
			});
		};
		summarizeRetainedAnalysis = (evidence, retention) => projectRetainedAnalysis(evidence, retention, { kind: "summary" });
		projectRetainedAnalysis = (evidence, retention, view) => {
			const ready = requireAnalysisViewRetention(evidence.operation, retention);
			if (!ready.ok) return ready;
			const recorded = ready.value.recordEvidence(evidence);
			if (!recorded.ok) return recorded;
			return inspectAnalysisViewValidated({
				source: {
					kind: "retained-evidence",
					evidence_id: evidence.evidence_id
				},
				view
			}, ready.value.evidenceById);
		};
		resolveAnalysisViewSource = (source, lookup) => {
			if (source.kind === "retained-evidence") return resolveEvidenceInput(source, lookup);
			if (source.kind === "evidence-file") return err(new AnalysisCapabilityUnavailableError(ANALYSIS_VIEW_PROVIDER.id, INSPECT_ANALYSIS_VIEW_OPERATION, "evidence-file sources are read before projection"));
			return authenticateEvidence(source.evidence, ["source", "evidence"], { source });
		};
		authenticateEvidence = (value, path, input) => {
			try {
				return ok(parseEvidence(value));
			} catch (cause) {
				if (cause instanceof z.ZodError) return err(analysisInputErrorFromIssues(INSPECT_ANALYSIS_VIEW_OPERATION, cause.issues.map((issue) => ({
					...issue,
					path: [...path, ...issue.path]
				})), input, { cause }));
				if (cause instanceof TypeError) return err(new EvidenceIntegrityError(cause.message, cause.message.length > 0 ? { userMessage: cause.message } : undefined));
				throw cause;
			}
		};
		createAnalysisViewEvidence = (input, parent, result) => {
			const target = parent.subject === null ? undefined : {
				path: parent.subject.local_path,
				sha256: parent.subject.digest.sha256,
				format: parent.subject.format,
				...parent.subject.architecture === null ? {} : { architecture: parent.subject.architecture }
			};
			return createEvidence(target, ANALYSIS_VIEW_PROVIDER, {
				predicateType: "rea.analysis-view",
				operation: INSPECT_ANALYSIS_VIEW_OPERATION,
				parameters: {
					parent_evidence_id: parent.evidence_id,
					view: jsonValueSchema.parse(input.view)
				},
				result: jsonValueSchema.parse(result),
				rawResult: null,
				confidence: result.kind === "environment-state" || (result.kind === "api-surface" || result.kind === "environment-manifest") && result.templated_groups > 0 ? "inferred" : "derived",
				authority: parent.authority,
				limitations: result.limitations,
				...result.kind === "native" && parent.relationship_coverage !== null ? { relationshipCoverage: parent.relationship_coverage } : {},
				locations: [...result.artifact != null && result.artifact.path.length > 0 ? [{
					kind: "artifact-path",
					path: result.artifact.path
				}] : [], ...result.kind === "native" && result.procedure_address !== null && result.procedure_address.length > 0 ? [{
					kind: "address",
					address: result.procedure_address
				}] : []],
				evidenceLinks: [parent.evidence_id]
			}, { immutable: true });
		};
	})))();
}

//#endregion
export { init_AnalysisViewService, init_EvidenceInputResolver, inspectAnalysisView, inspectAnalysisViewValidated, inspectAnalysisViewValidatedWithFiles, projectRetainedAnalysis, requireAnalysisViewRetention, resolveEvidenceInput, resolvePairedEvidenceRequest, summarizeRetainedAnalysis };