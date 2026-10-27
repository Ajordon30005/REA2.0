import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { i as jsonValueSchema, n as init_jsonValue, r as jsonObjectSchema } from "./jsonValue-D6WMzy_r.js";
import { g as relationshipCoverageSchema, m as init_relationshipCoverage, s as init_evidence, t as createEvidence } from "./evidence-gY2e4uvs.js";

//#region dist/application/AnalysisProvider.js
function createAnalysisExecution(result, provider, options = {}) {
	return {
		result: jsonValueSchema.parse(result),
		rawResult: options.rawResult === undefined ? null : jsonValueSchema.parse(options.rawResult),
		provider,
		...options.cachePolicy === undefined ? {} : { cachePolicy: options.cachePolicy },
		...options.analysisProfile === undefined ? {} : { analysisProfile: structuredClone(options.analysisProfile) },
		limitations: [...options.limitations ?? []],
		...options.relationshipCoverage === undefined ? {} : { relationshipCoverage: relationshipCoverageSchema.parse(options.relationshipCoverage) },
		...options.referencesTruncated === undefined ? {} : { referencesTruncated: options.referencesTruncated },
		locations: [...options.locations ?? []],
		...options.subject === undefined ? {} : { subject: options.subject }
	};
}
var createAnalysisExecutionEvidence;
function init_AnalysisProvider() {
	return (init_AnalysisProvider = __esmMin((() => {
		init_evidence();
		init_jsonValue();
		init_relationshipCoverage();
		createAnalysisExecutionEvidence = (operation, input, execution, confidence, options) => createEvidence(execution.subject === undefined ? undefined : execution.subject ?? undefined, execution.provider, {
			operation,
			parameters: jsonObjectSchema.parse(input),
			result: execution.result,
			rawResult: execution.rawResult,
			limitations: execution.limitations,
			...execution.analysisProfile === undefined ? {} : { analysisProfile: execution.analysisProfile },
			...execution.relationshipCoverage === undefined ? {} : { relationshipCoverage: execution.relationshipCoverage },
			locations: execution.locations,
			confidence
		}, options);
	})))();
}

//#endregion
export { createAnalysisExecutionEvidence as n, init_AnalysisProvider as r, createAnalysisExecution as t };