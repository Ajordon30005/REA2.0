import { changesState, } from "../../domain/analysisView/environmentStateRules.js";
import { projectAnalysisError } from "../../domain/analysisErrorProjection.js";
import { err, ok } from "../../domain/result.js";
import { inspectAnalysisViewValidated } from "../analysisView/AnalysisViewService.js";
import { ENVIRONMENT_SERVE_OPERATION, inputError, parseEvidenceFile, parseViewEvidence, } from "./environmentSource.js";
import { environmentToolDefinitions, } from "./environmentTools.js";
/** Serving from the state is read-only: tools whose requests may change state are not served. */
const servedFromState = (tool) => !changesState(tool.method, tool.path_template);
/** The catalog an environment serves: every manifest tool for replay, the read tools and the data plane from a state. */
export const servedCatalog = (source, fromState, name, operation = ENVIRONMENT_SERVE_OPERATION) => {
    const dataPlane = fromState ? "state" : "none";
    const catalogSource = fromState
        ? {
            ...source,
            manifest: {
                ...source.manifest,
                tools: source.manifest.tools.filter(servedFromState),
            },
        }
        : source;
    const tools = environmentToolDefinitions(catalogSource, name, {
        operation,
        dataPlane,
    });
    return tools.ok ? ok({ tools: tools.value, dataPlane }) : tools;
};
const refusal = (operation, issue, userMessage) => inputError(operation, [{ ...issue, path: ["state", "normalized_result", ...issue.path] }], userMessage);
/** Why the state does not belong to the served manifest and capture, if it does not. */
const stateMismatch = (operation, view, source) => {
    if (view.parent_evidence_id !== source.evidenceId)
        return refusal(operation, {
            path: ["parent_evidence_id"],
            reason: "invalid_value",
            expected: source.evidenceId,
            message: `The state cites parent Evidence ${view.parent_evidence_id}; the evidence file is ${source.evidenceId}.`,
        }, "The state was extracted from a different capture than the supplied evidence file.");
    const rules = source.manifest.view.template_rules;
    if (view.view.template_rules.length !== rules.length ||
        view.view.template_rules.some((rule, index) => rule !== rules[index]))
        return refusal(operation, {
            path: ["view", "template_rules"],
            reason: "invalid_value",
            expected: [...rules],
            message: "The state must be extracted with the manifest's template_rules, in the same order, so its tool names are the manifest's.",
        }, "The state was extracted with different template rules than the manifest.");
    const tools = new Set(source.manifest.tools.map((tool) => tool.name));
    const index = view.views.findIndex((entry) => !tools.has(entry.tool));
    return index < 0
        ? undefined
        : refusal(operation, {
            path: ["views", index, "tool"],
            reason: "invalid_value",
            message: "Every state view must name a tool of the served manifest.",
        }, "The state names a tool the manifest does not have.");
};
/**
 * Load the environment-state Evidence for an already loaded manifest and
 * capture, refusing a state extracted from another capture or with other
 * template rules; refusals name the command that loaded it.
 */
export const loadEnvironmentState = (stateValue, source, operation = ENVIRONMENT_SERVE_OPERATION) => {
    const parsed = parseViewEvidence(operation, "state", stateValue, "environment-state");
    if (!parsed.ok)
        return parsed;
    const { view, evidenceId } = parsed.value;
    const mismatch = stateMismatch(operation, view, source);
    if (mismatch !== undefined)
        return err(mismatch);
    return ok({
        evidenceId,
        types: view.types,
        views: new Map(view.views.map((entry) => [entry.tool, entry])),
        entities: view.entities,
        documents: view.documents,
    });
};
/** Derive the state the capture observed with the manifest's rules, projected as retained Evidence, and check it as a supplied state. */
export const deriveEnvironmentState = (source, captureValue, operation = ENVIRONMENT_SERVE_OPERATION) => {
    const capture = parseEvidenceFile(operation, "evidence", captureValue);
    if (!capture.ok)
        return capture;
    const captureId = capture.value.evidence_id;
    const projected = inspectAnalysisViewValidated({
        source: { kind: "retained-evidence", evidence_id: captureId },
        view: {
            kind: "environment-state",
            template_rules: [...source.manifest.view.template_rules],
        },
    }, (evidenceId) => (evidenceId === captureId ? capture.value : undefined));
    return projected.ok
        ? loadEnvironmentState(projected.value, source, operation)
        : projected;
};
const unavailable = (error) => {
    const { code, message } = projectAnalysisError(error);
    return {
        state: undefined,
        report: { served: false, reason: "unavailable", code, message },
    };
};
/** Serve the derived state when its catalog fits under the served name; otherwise serve replay and report why. */
export const prepareServedState = (source, captureValue, options = {}) => {
    const operation = options.operation ?? ENVIRONMENT_SERVE_OPERATION;
    // The state catalog depends only on the manifest and name, so checking it first spares deriving a state that cannot be served.
    const catalog = servedCatalog(source, true, options.name ?? source.manifest.name, operation);
    if (!catalog.ok)
        return unavailable(catalog.error);
    const derived = deriveEnvironmentState(source, captureValue, operation);
    return derived.ok
        ? {
            state: derived.value,
            report: { served: true, evidence_id: derived.value.evidenceId },
        }
        : unavailable(derived.error);
};
