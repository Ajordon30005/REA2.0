import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { l as ProviderAdapterError, n as projectAnalysisError, r as projectAnalysisErrorWithoutCapturedOutput, t as init_analysisErrorProjection, u as init_providerAdapterError } from "./analysisErrorProjection-DWZ-Gw1s.js";

//#region dist/domain/analysisErrorCleanup.js
var analysisErrorWithCleanupFailure;
function init_analysisErrorCleanup() {
	return (init_analysisErrorCleanup = __esmMin((() => {
		init_providerAdapterError();
		init_analysisErrorProjection();
		analysisErrorWithCleanupFailure = (primary, cleanup, operation = "close_binary") => {
			const projected = projectAnalysisError(cleanup);
			return new ProviderAdapterError(cleanup instanceof ProviderAdapterError ? cleanup.providerId : "rea", operation, {
				cleanupPrimary: primary,
				cause: new AggregateError([primary, cleanup], "Analysis failed and cleanup remains incomplete.", { cause: primary }),
				userMessage: projectAnalysisError(primary).message,
				remediationAction: projected.remediation.action,
				...primary.capturedOutput === undefined ? {} : { capturedOutput: primary.capturedOutput },
				...primary.partialObservation === undefined ? {} : { partialObservation: primary.partialObservation },
				cleanup: {
					reason: projected.message,
					resources: [...new Set([...primary.cleanupIncomplete ? primary.cleanupResources : [], ...cleanup.cleanupResources])]
				},
				diagnostics: {
					primary_error: primary.capturedOutput === undefined ? projectAnalysisError(primary) : projectAnalysisErrorWithoutCapturedOutput(primary),
					cleanup_error: projected
				}
			});
		};
	})))();
}

//#endregion
//#region dist/domain/providerCleanupError.js
var ProviderCleanupError;
function init_providerCleanupError() {
	return (init_providerCleanupError = __esmMin((() => {
		init_providerAdapterError();
		ProviderCleanupError = class extends ProviderAdapterError {
			cleanupIncomplete = true;
			userMessage = "Provider cleanup could not be fully confirmed. Review the reported local resources before opening another target.";
			constructor(providerId, resources, diagnostics, options) {
				const { operation = "close_binary", ...errorOptions } = options ?? {};
				super(providerId, operation, {
					...errorOptions,
					diagnostics
				});
				this.setCleanupResources(resources);
			}
		};
	})))();
}

//#endregion
export { init_analysisErrorCleanup as i, init_providerCleanupError as n, analysisErrorWithCleanupFailure as r, ProviderCleanupError as t };