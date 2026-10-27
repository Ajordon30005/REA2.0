import { canonicalJson } from "../comparisonSemantics.js";
import { javaScriptSemanticGraphSchema, } from "./javascriptSemanticGraph.js";
/** Parse a stored semantic graph and reject stale IDs. */
export const parseJavaScriptSemanticGraph = (input) => javaScriptSemanticGraphSchema.parse(input);
/** Serialize a verified semantic graph as canonical JSON. */
export const serializeJavaScriptSemanticGraph = (input) => canonicalJson(parseJavaScriptSemanticGraph(input), "JavaScript semantic graph");
