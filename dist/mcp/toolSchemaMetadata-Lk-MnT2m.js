import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { a as init_result, i as err, o as ok } from "./analysisErrorBase-C1inc3JA.js";
import { i as init_configurationErrors, n as ConfigurationError } from "./configurationErrors-CUPdDkdb.js";
import { n as init_canonicalDigest, t as digestCanonicalValue } from "./canonicalDigest-Bi_0_zGi.js";
import { a as evidenceSchema, s as init_evidence } from "./evidence-gY2e4uvs.js";
import { resolve } from "node:path";
import { z } from "zod";
import { isDeepStrictEqual } from "node:util";

//#region dist/process/CurrentEntrypointPath.js
var normalizeEntrypointPath, CURRENT_ENTRYPOINT_PATH;
function init_CurrentEntrypointPath() {
	return (init_CurrentEntrypointPath = __esmMin((() => {
		normalizeEntrypointPath = (entrypoint) => entrypoint === undefined || entrypoint.length === 0 ? undefined : resolve(entrypoint);
		CURRENT_ENTRYPOINT_PATH = normalizeEntrypointPath(process.argv[1]);
	})))();
}

//#endregion
//#region dist/config/mcpInputSchemaProfile.js
var COMPACT_INPUT_SCHEMA_BUDGET_BYTES, mcpInputSchemaProfileSchema, resolveMcpInputSchemaProfile, compactPresentationForMcpInputSchemaProfile, profileConstraint, parseMcpInputSchemaProfile;
function init_mcpInputSchemaProfile() {
	return (init_mcpInputSchemaProfile = __esmMin((() => {
		init_configurationErrors();
		init_result();
		COMPACT_INPUT_SCHEMA_BUDGET_BYTES = 13 * 1024;
		mcpInputSchemaProfileSchema = z.enum(["full", "compact"]);
		resolveMcpInputSchemaProfile = (profile) => profile ?? "compact";
		compactPresentationForMcpInputSchemaProfile = (profile) => resolveMcpInputSchemaProfile(profile) === "full" ? undefined : { budgetBytes: COMPACT_INPUT_SCHEMA_BUDGET_BYTES };
		profileConstraint = "REA_MCP_INPUT_SCHEMA_PROFILE must be \"compact\" (default) or \"full\". The compact profile advertises bounded input schemas with fewer nested annotations; full preserves complete advertised input guidance.";
		parseMcpInputSchemaProfile = (value) => {
			if (value === undefined) return ok(undefined);
			const parsed = mcpInputSchemaProfileSchema.safeParse(value);
			return parsed.success ? ok(parsed.data) : err(new ConfigurationError(profileConstraint, { settings: [{
				setting: "REA_MCP_INPUT_SCHEMA_PROFILE",
				constraint: profileConstraint
			}] }));
		};
	})))();
}

//#endregion
//#region dist/contracts/jsonSchemaKeywords.js
var schemaMaps, schemaArrays, schemaChildren, schemaLiteralValues;
function init_jsonSchemaKeywords() {
	return (init_jsonSchemaKeywords = __esmMin((() => {
		schemaMaps = new Set([
			"$defs",
			"definitions",
			"properties",
			"patternProperties",
			"dependentSchemas",
			"dependencies"
		]);
		schemaArrays = new Set([
			"allOf",
			"anyOf",
			"oneOf",
			"prefixItems"
		]);
		schemaChildren = new Set([
			"items",
			"additionalItems",
			"contains",
			"additionalProperties",
			"unevaluatedProperties",
			"unevaluatedItems",
			"propertyNames",
			"not",
			"if",
			"then",
			"else"
		]);
		schemaLiteralValues = new Set([
			"const",
			"enum",
			"default",
			"examples"
		]);
	})))();
}

//#endregion
//#region dist/contracts/compactInputSchema.js
var annotationKeys, definitionKeys, jsonValueTypes, jsonValueSchema, isSchemaObject, serializedBytes, schemaDepth, COMPACT_SCHEMA_MAX_DEPTH, rebuildSchemaPositions, stripAnnotations, stripChildAnnotations, resolveLocalReference, inlineWithinBudget, detectedTypes, REDUCED_ANNOTATION, reduceToShallowProperties, compactAdvertisedInputSchema, presentAdvertisedInputSchema;
function init_compactInputSchema() {
	return (init_compactInputSchema = __esmMin((() => {
		init_jsonSchemaKeywords();
		annotationKeys = new Set([
			"description",
			"examples",
			"default",
			"title"
		]);
		definitionKeys = new Set(["$defs", "definitions"]);
		jsonValueTypes = [
			"null",
			"boolean",
			"object",
			"array",
			"number",
			"string"
		];
		jsonValueSchema = () => ({
			type: [...jsonValueTypes],
			items: {}
		});
		isSchemaObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
		serializedBytes = (value) => Buffer.byteLength(JSON.stringify(value), "utf8");
		schemaDepth = (value, depth = 0) => {
			if (Array.isArray(value)) return Math.max(depth, ...value.map((child) => schemaDepth(child, depth + 1)));
			if (!isSchemaObject(value)) return depth;
			return Math.max(depth, ...Object.values(value).map((child) => schemaDepth(child, depth + 1)));
		};
		COMPACT_SCHEMA_MAX_DEPTH = 10;
		rebuildSchemaPositions = (node, rebuild) => {
			if (Array.isArray(node)) return node.map((child) => rebuild(child));
			if (!isSchemaObject(node)) return node;
			const out = {};
			for (const [key, value] of Object.entries(node)) {
				if (schemaLiteralValues.has(key)) {
					out[key] = value;
					continue;
				}
				if (schemaMaps.has(key) && isSchemaObject(value)) {
					out[key] = Object.fromEntries(Object.entries(value).map(([name, child]) => [name, rebuild(child)]));
					continue;
				}
				if (schemaArrays.has(key) && Array.isArray(value)) {
					out[key] = value.map((child) => rebuild(child));
					continue;
				}
				if (schemaChildren.has(key)) {
					out[key] = Array.isArray(value) ? value.map((child) => rebuild(child)) : rebuild(value);
					continue;
				}
				out[key] = value;
			}
			return out;
		};
		stripAnnotations = (schema) => {
			const rebuilt = rebuildSchemaPositions(schema, stripChildAnnotations);
			const out = {};
			for (const [key, value] of Object.entries(rebuilt)) {
				if (annotationKeys.has(key) && key !== "description") continue;
				out[key] = value;
			}
			return out;
		};
		stripChildAnnotations = (child) => {
			const rebuilt = rebuildSchemaPositions(child, stripChildAnnotations);
			if (!isSchemaObject(rebuilt)) return rebuilt;
			const kept = {};
			for (const [key, value] of Object.entries(rebuilt)) if (!annotationKeys.has(key)) kept[key] = value;
			return kept;
		};
		resolveLocalReference = (root, reference) => {
			if (reference === "#") return root;
			if (!reference.startsWith("#/")) return undefined;
			let value = root;
			for (const token of reference.slice(2).split("/")) {
				const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
				if (!isSchemaObject(value) || !Object.hasOwn(value, key)) return undefined;
				value = value[key];
			}
			return value;
		};
		inlineWithinBudget = (root, budgetBytes) => {
			let resolved = true;
			function* serialize(value, position, active) {
				if (Array.isArray(value)) {
					yield "[";
					for (const [index, child] of value.entries()) {
						if (index > 0) yield ",";
						yield* serialize(child, position, active);
					}
					yield "]";
				} else if (isSchemaObject(value)) {
					if (position === "schema" && Object.keys(value).length === 0) {
						yield JSON.stringify(jsonValueSchema());
						return;
					}
					if (position === "schema" && typeof value.$ref === "string") {
						const target = resolveLocalReference(root, value.$ref);
						if (target === undefined || active.has(value.$ref)) {
							resolved = false;
							return;
						}
						const { $ref, ...siblings } = value;
						yield* serialize(Object.keys(siblings).length === 0 ? target : { allOf: [target, siblings] }, "schema", new Set([...active, $ref]));
						return;
					}
					yield "{";
					let first = true;
					for (const [key, child] of Object.entries(value)) {
						if (position === "schema" && definitionKeys.has(key)) continue;
						if (!first) yield ",";
						first = false;
						yield JSON.stringify(key) + ":";
						const childPosition = position === "map" ? "schema" : position === "schema" && schemaMaps.has(key) ? "map" : position === "schema" && (schemaArrays.has(key) || schemaChildren.has(key)) ? "schema" : "data";
						yield* serialize(child, childPosition, active);
					}
					yield "}";
				} else {
					yield JSON.stringify(value);
				}
			}
			const chunks = [];
			let bytes = 0;
			for (const chunk of serialize(root, "schema", new Set())) {
				bytes += Buffer.byteLength(chunk, "utf8");
				if (bytes > budgetBytes || !resolved) return undefined;
				chunks.push(chunk);
			}
			return resolved ? JSON.parse(chunks.join("")) : undefined;
		};
		detectedTypes = (schema, root, active = new Set()) => {
			if (!isSchemaObject(schema)) return undefined;
			if (typeof schema.$ref === "string") {
				if (active.has(schema.$ref)) return undefined;
				return detectedTypes(resolveLocalReference(root, schema.$ref), root, new Set([...active, schema.$ref]));
			}
			if (typeof schema.type === "string") return [schema.type];
			if (Array.isArray(schema.type) && schema.type.every((type) => typeof type === "string")) return schema.type;
			const alternatives = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : [];
			if (alternatives.length === 0) return undefined;
			const types = alternatives.map((branch) => detectedTypes(branch, root, active));
			if (types.some((type) => type === undefined)) return undefined;
			return [...new Set(types.flatMap((type) => type ?? []))];
		};
		REDUCED_ANNOTATION = "Advertised in reduced form by the compact input schema profile; the server still validates complete canonical inputs.";
		reduceToShallowProperties = (schema) => {
			const properties = isSchemaObject(schema.properties) ? schema.properties : {};
			const description = [
				typeof schema.description === "string" ? schema.description : undefined,
				...Object.entries(isSchemaObject(schema.dependentRequired) ? schema.dependentRequired : isSchemaObject(schema.dependencies) ? schema.dependencies : {}).flatMap(([property, partners]) => Array.isArray(partners) && partners.every((partner) => typeof partner === "string") ? [`When ${property} is provided, also provide ${partners.join(" and ")}.`] : []),
				REDUCED_ANNOTATION
			].filter((text) => text !== undefined).join(" ");
			const shallow = Object.fromEntries(Object.entries(properties).map(([name, value]) => {
				const types = detectedTypes(value, schema);
				const type = types?.length === 1 ? types[0] : types;
				const description = isSchemaObject(value) && typeof value.description === "string" ? { description: value.description } : {};
				return [name, {
					...type === undefined ? {} : { type },
					...types?.includes("array") ? { items: jsonValueSchema() } : {},
					...description
				}];
			}));
			return {
				...typeof schema.$schema === "string" ? { $schema: schema.$schema } : {},
				type: "object",
				description,
				properties: shallow,
				...Array.isArray(schema.required) ? { required: [...schema.required] } : {},
				...typeof schema.minProperties === "number" ? { minProperties: schema.minProperties } : {},
				...schema.additionalProperties === false ? { additionalProperties: false } : {}
			};
		};
		compactAdvertisedInputSchema = (schema, budgetBytes) => {
			const inline = inlineWithinBudget(stripAnnotations(schema), budgetBytes);
			if (inline !== undefined && schemaDepth(inline) <= COMPACT_SCHEMA_MAX_DEPTH) return {
				schema: inline,
				presentation: "inline"
			};
			const reduced = reduceToShallowProperties(schema);
			if (serializedBytes(reduced) <= budgetBytes) return {
				schema: reduced,
				presentation: "reduced"
			};
			return {
				schema: reduceToShallowProperties({
					type: "object",
					description: (typeof schema.description === "string" ? `${schema.description} ` : "") + REDUCED_ANNOTATION
				}),
				presentation: "reduced"
			};
		};
		presentAdvertisedInputSchema = (schema, compactPresentation) => compactPresentation === undefined ? schema : compactAdvertisedInputSchema(schema, compactPresentation.budgetBytes).schema;
	})))();
}

//#endregion
//#region dist/contracts/advertisedInputExamples.js
var evidenceRecordId, referenceEmbeddedEvidence, advertisedInputExamples;
function init_advertisedInputExamples() {
	return (init_advertisedInputExamples = __esmMin((() => {
		init_evidence();
		evidenceRecordId = (value) => typeof value.evidence_id === "string" && Object.hasOwn(value, "normalized_result") && evidenceSchema.safeParse(value).success ? value.evidence_id : undefined;
		referenceEmbeddedEvidence = (value) => {
			if (Array.isArray(value)) {
				const items = value.map(referenceEmbeddedEvidence);
				return {
					value: items.map((item) => item.value),
					embedsEvidence: items.some((item) => item.embedsEvidence)
				};
			}
			if (value === null || typeof value !== "object") return {
				value,
				embedsEvidence: false
			};
			const evidenceId = evidenceRecordId(value);
			if (evidenceId !== undefined) return {
				value: {
					kind: "retained-evidence",
					evidence_id: evidenceId
				},
				embedsEvidence: true
			};
			const entries = Object.entries(value).map(([key, child]) => [key, referenceEmbeddedEvidence(child)]);
			return {
				value: Object.fromEntries(entries.map(([key, child]) => [key, child.value])),
				embedsEvidence: entries.some(([, child]) => child.embedsEvidence)
			};
		};
		advertisedInputExamples = (contract) => {
			const advertised = new Map();
			for (const { input } of contract.examples) {
				const projection = referenceEmbeddedEvidence(input);
				if (projection.embedsEvidence && !contract.inputSchema.safeParse(projection.value).success) continue;
				advertised.set(JSON.stringify(projection.value), projection.value);
			}
			return [...advertised.values()];
		};
	})))();
}

//#endregion
//#region dist/contracts/inputSchemaPresentation.js
var isObject, resolveReference, referencedDescription, describeSchema, objectBranch, requiredProperties, sharedRequiredProperties, inputGroup, isBooleanLiteralSchema, isBooleanSchema, preserveSharedDefault, normalizeAdvertisedSchema, flattenRootObjectUnion, presentInputJsonSchema;
function init_inputSchemaPresentation() {
	return (init_inputSchemaPresentation = __esmMin((() => {
		init_jsonSchemaKeywords();
		isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
		resolveReference = (root, reference) => {
			if (reference === "#") return root;
			if (!reference.startsWith("#/")) return undefined;
			let value = root;
			for (const token of reference.slice(2).split("/")) {
				const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
				if (!isObject(value) || !Object.hasOwn(value, key)) return undefined;
				value = value[key];
			}
			return value;
		};
		referencedDescription = (root, schema) => {
			let value = schema;
			const active = new Set();
			while (isObject(value)) {
				if (typeof value.description === "string") return value.description;
				if (typeof value.$ref !== "string" || active.has(value.$ref)) return undefined;
				active.add(value.$ref);
				value = resolveReference(root, value.$ref);
			}
			return undefined;
		};
		describeSchema = (schema, root, describeProperty) => {
			if (!isObject(schema)) return schema;
			return Object.fromEntries(Object.entries(schema).map(([key, value]) => {
				if (schemaMaps.has(key) && isObject(value)) return [key, Object.fromEntries(Object.entries(value).map(([name, child]) => {
					const described = describeSchema(child, root, describeProperty);
					if (key !== "properties" || !isObject(described)) return [name, described];
					const description = referencedDescription(root, described) ?? describeProperty(name);
					return [name, description === undefined ? described : {
						...described,
						description
					}];
				}))];
				if (schemaArrays.has(key) && Array.isArray(value)) return [key, value.map((child) => describeSchema(child, root, describeProperty))];
				if (schemaChildren.has(key)) return [key, Array.isArray(value) ? value.map((child) => describeSchema(child, root, describeProperty)) : describeSchema(value, root, describeProperty)];
				return [key, value];
			}));
		};
		objectBranch = (root, branch) => {
			const resolved = isObject(branch) && typeof branch.$ref === "string" ? Object.keys(branch).length === 1 ? resolveReference(root, branch.$ref) : undefined : branch;
			return isObject(resolved) && resolved.type === "object" && isObject(resolved.properties) ? resolved : undefined;
		};
		requiredProperties = (branch) => Array.isArray(branch.required) ? branch.required.filter((name) => typeof name === "string") : [];
		sharedRequiredProperties = (branches) => {
			const [first = [], ...others] = branches.map(requiredProperties);
			return first.filter((name) => others.every((names) => names.includes(name)));
		};
		inputGroup = (branch) => {
			const required = requiredProperties(branch);
			const optional = Object.keys(branch.properties ?? {}).filter((name) => !required.includes(name)).map((name) => `[${name}]`);
			return [...required, ...optional].join(" + ");
		};
		isBooleanLiteralSchema = (schema) => isObject(schema) && (typeof schema.const === "boolean" || Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.every((value) => typeof value === "boolean"));
		isBooleanSchema = (schema) => isObject(schema) && (schema.type === "boolean" || isBooleanLiteralSchema(schema));
		preserveSharedDefault = (schema, branches) => {
			if (schema.default !== undefined) return;
			const defaults = branches.filter(isObject).map((branch) => branch.default).filter((value) => value !== undefined);
			if (defaults.length > 0 && defaults.every((value) => isDeepStrictEqual(value, defaults[0]))) schema.default = defaults[0];
		};
		normalizeAdvertisedSchema = (value) => {
			if (!isObject(value)) return {
				schema: value,
				changed: false
			};
			const node = { ...value };
			let changed = false;
			const normalizeMap = (map) => Object.fromEntries(Object.entries(map).map(([name, child]) => {
				const result = normalizeAdvertisedSchema(child);
				changed ||= result.changed;
				return [name, result.schema];
			}));
			const normalizeList = (list) => list.map((child) => {
				const result = normalizeAdvertisedSchema(child);
				changed ||= result.changed;
				return result;
			});
			for (const [key, child] of Object.entries(value)) {
				if (schemaMaps.has(key) && isObject(child)) {
					node[key] = normalizeMap(child);
				} else if (schemaArrays.has(key) && key !== "anyOf" && key !== "oneOf" && Array.isArray(child)) {
					node[key] = normalizeList(child).map((result) => result.schema);
				} else if (schemaChildren.has(key) && key !== "not" && key !== "if" && key !== "then" && key !== "else") {
					const results = Array.isArray(child) ? normalizeList(child) : [normalizeAdvertisedSchema(child)];
					const nestedChanged = results.some((result) => result.changed);
					if (key === "contains" && nestedChanged && value.maxContains !== undefined) {
						delete node.contains;
						delete node.minContains;
						delete node.maxContains;
						changed = true;
					} else {
						node[key] = Array.isArray(child) ? results.map((result) => result.schema) : results[0]?.schema;
						changed ||= nestedChanged;
					}
				}
			}
			if (typeof node.const === "boolean") {
				delete node.const;
				if (node.type === undefined) node.type = "boolean";
				changed = true;
			}
			if (Array.isArray(node.enum) && node.enum.length > 0 && node.enum.every((item) => typeof item === "boolean")) {
				delete node.enum;
				if (node.type === undefined) node.type = "boolean";
				changed = true;
			}
			const negated = Object.hasOwn(value, "not") ? normalizeAdvertisedSchema(value.not) : undefined;
			if (negated?.changed) {
				changed = true;
				delete node.not;
			} else if (negated !== undefined) {
				node.not = negated.schema;
			}
			const conditional = Object.hasOwn(value, "if") ? normalizeAdvertisedSchema(value.if) : undefined;
			const thenBranch = Object.hasOwn(value, "then") ? normalizeAdvertisedSchema(value.then) : undefined;
			const elseBranch = Object.hasOwn(value, "else") ? normalizeAdvertisedSchema(value.else) : undefined;
			if (conditional?.changed) {
				changed = true;
				delete node.if;
				delete node.then;
				delete node.else;
			} else {
				if (conditional !== undefined) node.if = conditional.schema;
				if (thenBranch !== undefined) {
					node.then = thenBranch.schema;
					changed ||= thenBranch.changed;
				}
				if (elseBranch !== undefined) {
					node.else = elseBranch.schema;
					changed ||= elseBranch.changed;
				}
			}
			for (const combinator of ["anyOf", "oneOf"]) {
				const branches = value[combinator];
				if (!Array.isArray(branches)) continue;
				const normalized = normalizeList(branches);
				const schemas = normalized.map((result) => result.schema);
				const branchesChanged = normalized.some((result) => result.changed);
				if (combinator === "oneOf" && branchesChanged) {
					const booleanLiteralsOnly = branches.every(isBooleanLiteralSchema);
					if (booleanLiteralsOnly) {
						node.type = "boolean";
						preserveSharedDefault(node, schemas);
						delete node.oneOf;
						changed = true;
						continue;
					}
					delete node.oneOf;
					if (Array.isArray(node.anyOf)) {
						const existingAllOf = Array.isArray(node.allOf) ? node.allOf : [];
						node.allOf = [...existingAllOf, { anyOf: schemas }];
					} else {
						node.anyOf = schemas;
					}
					changed = true;
					continue;
				}
				if (branchesChanged && schemas.length > 0 && schemas.every(isBooleanSchema)) {
					node.type = "boolean";
					preserveSharedDefault(node, schemas);
					delete node[combinator];
					changed = true;
					continue;
				}
				node[combinator] = schemas;
				changed ||= branchesChanged;
			}
			return {
				schema: node,
				changed
			};
		};
		flattenRootObjectUnion = (root) => {
			const { anyOf, oneOf, ...rest } = root;
			const alternatives = Array.isArray(anyOf) ? anyOf : oneOf;
			if (!Array.isArray(alternatives) || alternatives.length === 0 || root.properties !== undefined) return root;
			const branches = alternatives.map((branch) => objectBranch(root, branch));
			if (!branches.every((branch) => branch !== undefined)) return root;
			const variants = new Map();
			for (const branch of branches) for (const [name, schema] of Object.entries(branch.properties ?? {})) {
				const known = variants.get(name) ?? [];
				if (!known.some((seen) => isDeepStrictEqual(seen, schema))) known.push(schema);
				variants.set(name, known);
			}
			const required = sharedRequiredProperties(branches);
			const fewestRequired = Math.min(...branches.map((branch) => requiredProperties(branch).length));
			const groups = [...new Set(branches.map(inputGroup))];
			const description = [typeof rest.description === "string" ? rest.description : undefined, groups.length > 1 ? `Provide a complete input group: ${groups.join("; ")}.` : undefined].filter((text) => text !== undefined);
			const { dependencies: _dependencies, dependentRequired: _dependentRequired, ...presentation } = rest;
			return {
				...presentation,
				type: "object",
				...description.length > 0 ? { description: description.join(" ") } : {},
				properties: Object.fromEntries([...variants].map(([name, schemas]) => [name, schemas.length === 1 ? schemas[0] : { anyOf: schemas }])),
				...required.length > 0 ? { required } : {},
				...fewestRequired > 0 ? { minProperties: fewestRequired } : {},
				...branches.every((branch) => branch.additionalProperties === false) ? { additionalProperties: false } : {}
			};
		};
		presentInputJsonSchema = (root, describeProperty) => {
			const flattened = flattenRootObjectUnion(root);
			const described = describeSchema(flattened, flattened, describeProperty);
			if (!isObject(described)) return normalizeAdvertisedSchema(flattened).schema;
			const { dependencies: _dependencies, dependentRequired: _dependentRequired, ...presentation } = described;
			const rootDependencies = isObject(described.dependentRequired) ? described.dependentRequired : isObject(described.dependencies) ? described.dependencies : undefined;
			const dependencyGuidance = rootDependencies === undefined ? [] : Object.entries(rootDependencies).flatMap(([property, partners]) => Array.isArray(partners) && partners.every((partner) => typeof partner === "string") ? [`When ${property} is provided, also provide ${partners.join(" and ")}.`] : []);
			if (dependencyGuidance.length === 0) return normalizeAdvertisedSchema(presentation).schema;
			const description = [typeof presentation.description === "string" ? presentation.description : undefined, ...dependencyGuidance].filter((text) => text !== undefined);
			return normalizeAdvertisedSchema({
				...presentation,
				description: description.join(" ")
			}).schema;
		};
	})))();
}

//#endregion
//#region dist/contracts/toolSchemaMetadata.js
var PROPERTY_DESCRIPTIONS, toolInputSchemaWithMetadata, advertisedInputJsonSchema, toolOutputSchemaWithMetadata, transformAdvertisedInputJsonSchema, hasRelativeSchemaReference, localSchemaReference, withAdvertisedJsonSchema, memoizeByTarget, isSchemaRecord, fallbackPropertyDescription;
function init_toolSchemaMetadata() {
	return (init_toolSchemaMetadata = __esmMin((() => {
		init_advertisedInputExamples();
		init_inputSchemaPresentation();
		init_jsonSchemaKeywords();
		init_canonicalDigest();
		PROPERTY_DESCRIPTIONS = {
			addresses: "Ordered provider-normalized procedure addresses to analyze.",
			after: "The later or right-hand observation to compare.",
			before: "The earlier or left-hand observation to compare.",
			boundary_id: "Exact reconstruction boundary identifier to evaluate.",
			case_sensitive: "Whether text matching distinguishes uppercase and lowercase.",
			cdp_endpoint: "Literal loopback Chrome DevTools Protocol endpoint.",
			comment: "Exact analyst comment text to write.",
			comparisons: "Validated comparison Evidence records to aggregate.",
			coverage: "Exact reconstruction-coverage commitment to verify.",
			direction: "Direction in which to traverse or compare relationships.",
			document: "Exact provider document or program identity.",
			error: "Structured, caller-actionable error when the operation fails.",
			evidence: "Evidence record produced by this operation.",
			evidence_id: "Stable identifier of the recorded Evidence observation.",
			executable: "Command name or executable path to run.",
			format: "Declared input artifact format.",
			name: "Exact name used by this operation.",
			pattern: "Literal text or regular expression used to filter matching results.",
			phase: "Current plan or execution phase of the operation.",
			plan: "Content-bound execution plan and its digest commitment.",
			query: "Non-empty feature or text query to investigate.",
			question: "Concrete unresolved question to retain for later investigation.",
			result: "Primary structured result returned by this operation.",
			left: "Left-hand input used for comparison or differential execution.",
			limits: "Resource budgets that bound execution and retained output for this operation.",
			mode: "Operation mode that selects the requested behavior.",
			overwrite: "Whether an existing destination may be replaced.",
			path: "Local filesystem path used by this operation.",
			provider_id: "Exact deep-analysis provider ID, or automatic selection when omitted.",
			right: "Right-hand input used for comparison or differential execution.",
			source_evidence: "Evidence records supporting the prepared source transformation.",
			status: "Current lifecycle or verification status.",
			summary: "Concise evidence-backed summary of the result.",
			symbols: "Ordered Swift symbols to demangle.",
			target_id: "Exact CDP target identifier selected from the endpoint's target listing.",
			unknown_id: "Exact residual-unknown identifier."
		};
		toolInputSchemaWithMetadata = (contract) => withAdvertisedJsonSchema(contract.inputSchema, "input", (project) => (options) => {
			const inline = project({
				...options,
				libraryOptions: {
					...options.libraryOptions,
					reused: "inline"
				}
			});
			const examples = advertisedInputExamples(contract);
			return {
				...presentInputJsonSchema(inline, fallbackPropertyDescription),
				...examples.length === 0 ? {} : { examples }
			};
		});
		advertisedInputJsonSchema = (contract) => toolInputSchemaWithMetadata(contract)["~standard"].jsonSchema.input({ target: "draft-2020-12" });
		toolOutputSchemaWithMetadata = (contract) => withAdvertisedJsonSchema(contract.outputSchema, "output", (project) => (options) => {
			const shared = project({
				...options,
				libraryOptions: {
					reused: "ref",
					...options.libraryOptions
				}
			});
			if ("$id" in shared || hasRelativeSchemaReference(shared)) return shared;
			return {
				...shared,
				$id: `urn:rea:tool-output:sha256:${digestCanonicalValue({
					target: options.target,
					schema: shared
				}, "Tool output schema")}`
			};
		});
		transformAdvertisedInputJsonSchema = (schema, transform) => {
			const standard = Reflect.get(schema, "~standard");
			if (!isSchemaRecord(standard)) return schema;
			const jsonSchema = Reflect.get(standard, "jsonSchema");
			if (!isSchemaRecord(jsonSchema)) return schema;
			const project = Reflect.get(jsonSchema, "input");
			if (typeof project !== "function") return schema;
			const byTarget = new Map();
			const transformedInput = (options) => {
				const target = Reflect.get(options, "target");
				const cacheable = typeof target === "string" && Reflect.get(options, "libraryOptions") === undefined;
				if (cacheable) {
					const cached = byTarget.get(target);
					if (cached !== undefined) return cached;
				}
				const projected = project(options);
				const transformed = isSchemaRecord(projected) ? transform(projected) : projected;
				if (cacheable && isSchemaRecord(transformed)) byTarget.set(target, transformed);
				return transformed;
			};
			return {
				...schema,
				"~standard": {
					...standard,
					jsonSchema: {
						...jsonSchema,
						input: transformedInput
					}
				}
			};
		};
		hasRelativeSchemaReference = (schema) => {
			const pending = [{
				value: schema,
				root: schema,
				position: "schema"
			}];
			const visited = new WeakMap();
			while (pending.length > 0) {
				const entry = pending.pop();
				const current = entry.value;
				if (current === null || typeof current !== "object") continue;
				const { position } = entry;
				const root = position !== "map" && isSchemaRecord(current) && typeof current.$id === "string" && URL.canParse(current.$id) ? current : entry.root;
				let positions = visited.get(root);
				if (positions === undefined) {
					positions = {
						schema: new WeakSet(),
						map: new WeakSet(),
						unknown: new WeakSet()
					};
					visited.set(root, positions);
				}
				if (positions[position].has(current)) continue;
				positions[position].add(current);
				if (Array.isArray(current)) {
					for (const value of current) pending.push({
						value,
						root,
						position
					});
					continue;
				}
				for (const [key, value] of Object.entries(current)) {
					if (position !== "map" && [
						"$id",
						"$ref",
						"$dynamicRef",
						"$recursiveRef"
					].includes(key) && typeof value === "string") {
						if (!value.startsWith("#") && !URL.canParse(value)) return true;
						if (key !== "$id" && value.startsWith("#")) {
							const target = localSchemaReference(root, value);
							if (target === undefined) return true;
							if (target.kind === "target") pending.push({
								value: target.value,
								root,
								position: "schema"
							});
						}
					}
					if (position === "schema" && schemaLiteralValues.has(key)) continue;
					const childPosition = position === "map" ? "schema" : position === "schema" && schemaMaps.has(key) ? "map" : position === "schema" && (schemaArrays.has(key) || schemaChildren.has(key)) ? "schema" : "unknown";
					if (value !== null && typeof value === "object") pending.push({
						value,
						root,
						position: childPosition
					});
				}
			}
			return false;
		};
		localSchemaReference = (root, reference) => {
			let fragment;
			try {
				fragment = decodeURIComponent(reference.slice(1));
			} catch {
				return undefined;
			}
			if (fragment === "") return {
				kind: "target",
				value: root
			};
			if (!fragment.startsWith("/")) return { kind: "anchor" };
			let value = root;
			for (const token of fragment.slice(1).split("/")) {
				if (/~(?:[^01]|$)/u.test(token)) return undefined;
				const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
				if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return undefined;
				if (value !== root && isSchemaRecord(value) && "$id" in value) return undefined;
				value = Reflect.get(value, key);
			}
			return {
				kind: "target",
				value
			};
		};
		withAdvertisedJsonSchema = (canonical, io, advertise = (project) => project) => {
			const schema = canonical.meta(z.globalRegistry.get(canonical) ?? {});
			const standard = schema["~standard"];
			const project = standard.jsonSchema?.[io];
			if (project === undefined) throw new TypeError(`Tool ${io} schema does not expose Standard JSON Schema`);
			Object.defineProperty(schema, "~standard", { value: {
				...standard,
				jsonSchema: {
					...standard.jsonSchema,
					[io]: memoizeByTarget(advertise(project))
				}
			} });
			return schema;
		};
		memoizeByTarget = (project) => {
			const byTarget = new Map();
			return (options) => {
				if (options.libraryOptions !== undefined) return project(options);
				const cached = byTarget.get(options.target);
				if (cached !== undefined) return cached;
				const projected = project(options);
				byTarget.set(options.target, projected);
				return projected;
			};
		};
		isSchemaRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
		fallbackPropertyDescription = (property) => {
			const explicit = Object.hasOwn(PROPERTY_DESCRIPTIONS, property) ? PROPERTY_DESCRIPTIONS[property] : undefined;
			if (explicit !== undefined) return explicit;
			const words = property.replaceAll("_", " ");
			if (property.startsWith("max_")) return `Maximum permitted ${words.slice(4)} for this operation.`;
			if (property.startsWith("include_")) return `Whether to include ${words.slice(8)} in the result.`;
			if (property.startsWith("expected_")) return `Expected ${words.slice(9)} used to reject stale or mismatched input.`;
			if (property.endsWith("_sha256")) return `Exact SHA-256 digest of ${words.slice(0, -7)}.`;
			if (property.endsWith("_evidence_id")) return `Exact Evidence identifier for the ${words.slice(0, -12)} observation.`;
			if (property.endsWith("_evidence_ids")) return `Ordered Evidence identifiers for the ${words.slice(0, -13)} observations.`;
			if (property.endsWith("_path")) return `Local filesystem path for ${words.slice(0, -5)}.`;
			if (property.endsWith("_uri")) return `Canonical URI for ${words.slice(0, -4)}.`;
			if (property.endsWith("_bytes")) return `Byte count for ${words.slice(0, -6)}.`;
			if (property.endsWith("_root") || property.endsWith("_roots")) return `Local filesystem ${words} selected for this operation.`;
			if (property.startsWith("is_") || property.startsWith("has_")) return `Whether ${words}.`;
			return undefined;
		};
	})))();
}

//#endregion
export { transformAdvertisedInputJsonSchema as a, COMPACT_INPUT_SCHEMA_BUDGET_BYTES as c, mcpInputSchemaProfileSchema as d, parseMcpInputSchemaProfile as f, init_CurrentEntrypointPath as h, toolOutputSchemaWithMetadata as i, compactPresentationForMcpInputSchemaProfile as l, CURRENT_ENTRYPOINT_PATH as m, init_toolSchemaMetadata as n, init_compactInputSchema as o, resolveMcpInputSchemaProfile as p, toolInputSchemaWithMetadata as r, presentAdvertisedInputSchema as s, advertisedInputJsonSchema as t, init_mcpInputSchemaProfile as u };