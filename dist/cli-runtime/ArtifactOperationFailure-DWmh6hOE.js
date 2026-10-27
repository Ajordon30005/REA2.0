import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { AnalysisCancelledError, AnalysisInputError, AnalysisUnsupportedTargetError, BinaryTargetError, ConfigurationError, init_analysisErrorCore, init_configurationErrors } from "./jsonSerialization-BNsB4Jxk.js";
import { ArtifactOperationError, init_artifactOperationError } from "./cliResultOutput-BfQ9qNAk.js";
import { ArtifactReaderFailure, init_ArtifactReader } from "./OwnedRegularFile-BMiWbZCF.js";
import { artifactFileCancellationCause, bindArtifactFileCleanup, init_ArtifactFileOperation } from "./ArtifactFileOperation-QqQagiSx.js";

//#region dist/artifacts/ArtifactOperationFailure.js
var translateArtifactFailure;
function init_ArtifactOperationFailure() {
	return (init_ArtifactOperationFailure = __esmMin((() => {
		init_analysisErrorCore();
		init_artifactOperationError();
		init_configurationErrors();
		init_ArtifactReader();
		init_ArtifactFileOperation();
		translateArtifactFailure = (operation, cause) => {
			if (cause instanceof ArtifactReaderFailure) {
				const error = new ArtifactOperationError(operation, cause.reason, cause.details, cause.message, {
					cause: cause.reason === "cancelled" ? artifactFileCancellationCause(cause) : cause,
					...cause.cleanup === undefined ? {} : { cleanup: cause.cleanup },
					...cause.partialObservation === undefined ? {} : { partialObservation: cause.partialObservation },
					...cause.admission === undefined ? {} : { admission: cause.admission }
				});
				bindArtifactFileCleanup(cause, error);
				return error;
			}
			if (cause instanceof AnalysisInputError || cause instanceof AnalysisCancelledError || cause instanceof AnalysisUnsupportedTargetError || cause instanceof BinaryTargetError || cause instanceof ConfigurationError) return cause;
			return new ArtifactOperationError(operation, "io");
		};
	})))();
}

//#endregion
export { init_ArtifactOperationFailure, translateArtifactFailure };