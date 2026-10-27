import { digestCanonicalValue } from "../canonicalDigest.js";
import { uniqueSorted } from "../canonicalOrdering.js";
import { compareUnicodeCodePoints } from "../unicodeCodePointOrder.js";
/** Derive the stable identity for one graph-bound query. */
export const javaScriptSemanticQueryIdentifier = (graph, input) => {
    const semantic = input;
    return `jsrq_${digestCanonicalValue({
        source_graph_id: graph.graph_id,
        ...semantic,
        allowed_relations: semantic.allowed_relations === undefined
            ? undefined
            : uniqueSorted(semantic.allowed_relations),
        expected: semantic.expected === null
            ? null
            : {
                ...semantic.expected,
                classes: uniqueSorted(semantic.expected.classes),
            },
    }, "JavaScript semantic query")}`;
};
/** Resolve deterministic seed candidates without applying traversal limits. */
export const resolveJavaScriptSemanticQuerySeeds = (graph, input) => {
    const fingerprintFunctions = new Set(input.seed.kind === "function"
        ? graph.fingerprints
            .filter(({ fingerprint_sha256 }) => input.seed.kind === "function" &&
            fingerprint_sha256 === input.seed.fingerprint_sha256)
            .map(({ function_node_id }) => function_node_id)
        : []);
    return graph.nodes
        .filter((node) => seedMatches(node, input, fingerprintFunctions))
        .map(({ node_id }) => node_id)
        .sort(compareUnicodeCodePoints);
};
const seedMatches = (node, input, fingerprintFunctions) => {
    const seed = input.seed;
    if (seed.kind === "semantic-node")
        return node.node_id === seed.node_id;
    if (seed.kind === "application-node")
        return node.application_node_ids.includes(seed.node_id);
    if (seed.kind === "function")
        return fingerprintFunctions.has(node.node_id);
    if (seed.kind === "literal")
        return node.kind === "literal" && node.properties.value === seed.value;
    if (seed.kind === "property")
        return node.kind === "property-slot" && node.properties.name === seed.name;
    if (seed.kind === "endpoint")
        return ((node.kind === "request" || node.kind === "response") &&
            node.properties.endpoint === seed.value);
    if (seed.kind === "event")
        return (["event", "listener"].includes(node.kind) &&
            node.properties.event_name === seed.name);
    return node.kind === "boundary" && node.properties.field === seed.field;
};
