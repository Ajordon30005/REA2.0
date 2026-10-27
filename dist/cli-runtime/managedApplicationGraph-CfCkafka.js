import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { digestCanonicalValue, digestSchema, evidenceSchema, init_canonicalDigest, init_digests, init_evidence, init_managedArtifact, managedArtifactInspectionSchema, managedMemberInspectionSchema, managedNativeBoundaryInspectionSchema, parseEvidence, prefixedDigestSchema } from "./reconstructionObligationLedgerSchemas-DY5ovcSC.js";
import { createJavaScriptApplicationEdge, createJavaScriptApplicationGraph, createJavaScriptApplicationNode, init_javascriptApplicationGraph, javascriptApplicationGraphSchema } from "./javascriptApplicationAnalysis--Uc3LVFc.js";
import { basename } from "node:path";
import { z } from "zod";

//#region dist/domain/managed/managedInspectionEvidence.js
var managedTokenScopesMatch, parseManagedInspectionEvidence;
function init_managedInspectionEvidence() {
	return (init_managedInspectionEvidence = __esmMin((() => {
		init_evidence();
		managedTokenScopesMatch = (leftMvid, rightMvid) => leftMvid !== null && rightMvid !== null && leftMvid.toLowerCase() === rightMvid.toLowerCase();
		parseManagedInspectionEvidence = (rawEvidence, operation, schema) => {
			const evidence = parseEvidence(rawEvidence);
			if (evidence.operation !== operation) throw new TypeError(`Evidence operation is not ${operation}`);
			const result = schema.parse(evidence.normalized_result);
			const artifactSha256 = result.artifact.sha256;
			const subjectSha256 = evidence.subject?.digest.sha256;
			if (subjectSha256 !== undefined && artifactSha256 !== subjectSha256) throw new TypeError(`Managed Evidence ${operation} (${evidence.evidence_id}) subject SHA-256 ${subjectSha256} does not match normalized artifact SHA-256 ${artifactSha256}`);
			const scope = result.identity_scope;
			if (scope !== undefined && scope.requires_artifact_sha256 !== artifactSha256) throw new TypeError(`Managed Evidence ${operation} (${evidence.evidence_id}) token scope SHA-256 ${scope.requires_artifact_sha256} does not match normalized artifact SHA-256 ${artifactSha256}`);
			const moduleMvid = result.module?.mvid ?? null;
			const scopedMvid = scope?.requires_mvid;
			if (scopedMvid !== undefined && scopedMvid?.toLowerCase() !== moduleMvid?.toLowerCase()) throw new TypeError(`Managed Evidence ${operation} (${evidence.evidence_id}) token scope MVID ${String(scopedMvid)} does not match module MVID ${String(moduleMvid)}`);
			return {
				evidence,
				result
			};
		};
	})))();
}

//#endregion
//#region dist/domain/managed/managedApplicationGraphCoverage.js
var omitsAny, completeCoverage, managedSourceCoverage, assessManagedGraphOmissions, managedGraphEvidenceCoverage, managedGraphResultCoverage;
function init_managedApplicationGraphCoverage() {
	return (init_managedApplicationGraphCoverage = __esmMin((() => {
		init_managedInspectionEvidence();
		omitsAny = (omissions) => omissions.partialInput || omissions.unscopedTokenRelationships || omissions.selectedTypes !== null;
		completeCoverage = () => ({
			status: "complete",
			truncated: false,
			omitted_count: 0,
			limits: []
		});
		managedSourceCoverage = (state) => state === "complete" ? completeCoverage() : {
			status: state,
			truncated: false,
			omitted_count: null,
			limits: []
		};
		assessManagedGraphOmissions = (sources) => ({
			unscopedTokenRelationships: sources.members !== null && sources.boundaries !== null && (sources.boundaries.pinvoke_imports.some(({ member_token }) => member_token !== null) || sources.boundaries.native_implementations.length > 0) && !managedTokenScopesMatch(sources.members.identity_scope.requires_mvid, sources.boundaries.identity_scope.requires_mvid),
			partialInput: [
				sources.members?.coverage.state,
				sources.boundaries?.coverage.state,
				sources.artifact?.coverage.state
			].some((state) => state !== undefined && state !== "complete"),
			selectedTypes: sources.members?.selection?.type_names ?? null
		});
		managedGraphEvidenceCoverage = (omissions) => omitsAny(omissions) ? {
			status: "partial",
			truncated: false,
			omitted_count: null,
			limits: []
		} : completeCoverage();
		managedGraphResultCoverage = (omissions) => ({ status: omitsAny(omissions) ? "partial" : "complete-within-inputs" });
	})))();
}

//#endregion
//#region dist/domain/managed/managedApplicationGraphNodes.js
var metadataLabel, addArtifactNode, addArtifactIdentityNodes, selectModuleSource, addMemberNodes, typeNode, methodNode, fieldNode, addBoundaryNodes, pinvokeNode, nativeImplementationNode, addContainsEdge, artifactLocalIdentity, sourceManagedEvidence, projectedManagedEvidence, pinvokeAssociationEvidence, createManagedEvidence, graphArtifactPath;
function init_managedApplicationGraphNodes() {
	return (init_managedApplicationGraphNodes = __esmMin((() => {
		init_javascriptApplicationGraph();
		init_managedApplicationGraphCoverage();
		init_managedInspectionEvidence();
		metadataLabel = (name) => name === "" ? null : name;
		addArtifactNode = (state) => {
			const node = createJavaScriptApplicationNode({
				kind: "artifact",
				identity: {
					strategy: "content-digest",
					stability: "global-exact",
					sha256: state.artifactSha256
				},
				observations: [{
					label: basename(state.artifactPath),
					properties: {
						format: "pe",
						source: "managed-application-graph"
					},
					evidence: projectedManagedEvidence(state, "project-managed-artifact")
				}]
			});
			state.nodes.push(node);
			return node;
		};
		addArtifactIdentityNodes = (state, artifactNode, parsed) => {
			const artifactInput = parsed.artifact;
			if (artifactInput !== null && artifactInput.result.assembly !== null) {
				const assemblyFacts = artifactInput.result.assembly;
				const artifactEvidence = sourceManagedEvidence(state, artifactInput.evidence, artifactInput.result.coverage.state);
				const assembly = createJavaScriptApplicationNode({
					kind: "managed-assembly",
					identity: artifactLocalIdentity(state.artifactSha256, "managed-assembly", assemblyFacts.token),
					observations: [{
						label: metadataLabel(assemblyFacts.name),
						properties: {
							name: assemblyFacts.name,
							version: assemblyFacts.version,
							culture: assemblyFacts.culture,
							public_key_kind: assemblyFacts.public_key.kind
						},
						evidence: artifactEvidence
					}]
				});
				state.nodes.push(assembly);
				addContainsEdge(state, artifactNode, assembly, {
					kind: "declares-managed-assembly",
					coverage: artifactEvidence.coverage
				});
			}
			const moduleSource = selectModuleSource(parsed);
			if (moduleSource !== null) {
				const { module } = moduleSource;
				const moduleEvidence = sourceManagedEvidence(state, moduleSource.evidence, moduleSource.coverageState);
				const moduleNode = createJavaScriptApplicationNode({
					kind: "managed-module",
					identity: artifactLocalIdentity(state.artifactSha256, "managed-module", module.mvid?.toLowerCase() ?? module.token),
					observations: [{
						label: metadataLabel(module.name),
						properties: {
							name: module.name,
							mvid: module.mvid,
							generation: module.generation,
							token: module.token
						},
						evidence: moduleEvidence
					}]
				});
				state.nodes.push(moduleNode);
				addContainsEdge(state, artifactNode, moduleNode, {
					kind: "declares-managed-module",
					coverage: moduleEvidence.coverage
				});
			}
		};
		selectModuleSource = (parsed) => {
			const sources = [
				parsed.artifact?.result.module == null ? null : {
					module: parsed.artifact.result.module,
					evidence: parsed.artifact.evidence,
					coverageState: parsed.artifact.result.coverage.state
				},
				parsed.members?.result.module == null ? null : {
					module: parsed.members.result.module,
					evidence: parsed.members.evidence,
					coverageState: parsed.members.result.coverage.state
				},
				parsed.boundaries?.result.module == null ? null : {
					module: parsed.boundaries.result.module,
					evidence: parsed.boundaries.evidence,
					coverageState: parsed.boundaries.result.coverage.state
				}
			].filter((source) => source !== null);
			return sources.find(({ module }) => module.mvid !== null) ?? sources[0] ?? null;
		};
		addMemberNodes = (state, artifactNode, parsed) => {
			const memberInput = parsed.members;
			if (memberInput === null) return;
			const members = memberInput.result;
			const { types, methods, fields } = members;
			const typeCoverage = managedSourceCoverage(members.coverage.state);
			const methodCoverage = managedSourceCoverage(members.coverage.state);
			const fieldCoverage = managedSourceCoverage(members.coverage.state);
			const sourceEvidence = sourceManagedEvidence(state, memberInput.evidence, members.coverage.state);
			for (const type of types) {
				const node = typeNode(state, type, sourceEvidence);
				state.nodes.push(node);
				state.typeNodes.set(type.token, node);
				addContainsEdge(state, artifactNode, node, {
					kind: "declares-managed-type",
					coverage: typeCoverage
				});
			}
			for (const method of methods) {
				const node = methodNode(state, method, sourceEvidence);
				state.nodes.push(node);
				state.methodNodes.set(method.token, node);
				const owner = method.declaring_type_token === null ? artifactNode : state.typeNodes.get(method.declaring_type_token) ?? artifactNode;
				addContainsEdge(state, owner, node, {
					kind: "declares-managed-method",
					coverage: methodCoverage
				});
			}
			for (const field of fields) {
				const node = fieldNode(state, field, sourceEvidence);
				state.nodes.push(node);
				state.fieldNodes.set(field.token, node);
				const owner = field.declaring_type_token === null ? artifactNode : state.typeNodes.get(field.declaring_type_token) ?? artifactNode;
				addContainsEdge(state, owner, node, {
					kind: "declares-managed-field",
					coverage: fieldCoverage
				});
			}
		};
		typeNode = (state, type, evidence) => createJavaScriptApplicationNode({
			kind: "managed-type",
			identity: artifactLocalIdentity(state.artifactSha256, "managed-type-token", type.token),
			observations: [{
				label: metadataLabel(type.full_name),
				properties: {
					token: type.token,
					namespace: type.namespace,
					name: type.name,
					full_name: type.full_name,
					flags: type.flags,
					extends_token: type.extends_token
				},
				evidence
			}]
		});
		methodNode = (state, method, evidence) => createJavaScriptApplicationNode({
			kind: "managed-method",
			identity: artifactLocalIdentity(state.artifactSha256, "managed-method-token", method.token),
			observations: [{
				label: metadataLabel(method.declaring_type === null ? method.name : `${method.declaring_type}.${method.name}`),
				properties: {
					token: method.token,
					declaring_type_token: method.declaring_type_token,
					declaring_type: method.declaring_type,
					name: method.name,
					rva: method.rva,
					signature_sha256: method.signature.raw_sha256,
					signature_status: method.signature.parse_status,
					body_status: method.body.status,
					normalized_il_sha256: method.body.normalized_il_sha256,
					il_size: method.body.il_size
				},
				evidence
			}]
		});
		fieldNode = (state, field, evidence) => createJavaScriptApplicationNode({
			kind: "managed-field",
			identity: artifactLocalIdentity(state.artifactSha256, "managed-field-token", field.token),
			observations: [{
				label: metadataLabel(field.declaring_type === null ? field.name : `${field.declaring_type}.${field.name}`),
				properties: {
					token: field.token,
					declaring_type_token: field.declaring_type_token,
					declaring_type: field.declaring_type,
					name: field.name,
					flags: field.flags,
					signature_sha256: field.signature.raw_sha256,
					signature_status: field.signature.parse_status
				},
				evidence
			}]
		});
		addBoundaryNodes = (state, artifactNode, parsed) => {
			const boundaryInput = parsed.boundaries;
			if (boundaryInput === null) return;
			const boundaries = boundaryInput.result;
			const { pinvoke_imports: pinvokes, native_implementations: implementations } = boundaries;
			const pinvokeCoverage = managedSourceCoverage(boundaries.coverage.state);
			const implementationCoverage = managedSourceCoverage(boundaries.coverage.state);
			const sourceEvidence = sourceManagedEvidence(state, boundaryInput.evidence, boundaries.coverage.state);
			const canJoinMemberTokens = parsed.members !== null && managedTokenScopesMatch(parsed.members.result.identity_scope.requires_mvid, boundaries.identity_scope.requires_mvid);
			for (const pinvoke of pinvokes) {
				const node = pinvokeNode(state, pinvoke, sourceEvidence);
				state.nodes.push(node);
				const method = pinvoke.member_token === null || !canJoinMemberTokens ? undefined : state.methodNodes.get(pinvoke.member_token);
				const memberEvidence = method === undefined || parsed.members === null ? undefined : parsed.members.evidence;
				const owner = method ?? artifactNode;
				state.edges.push(createJavaScriptApplicationEdge({
					source_node_id: owner.node_id,
					target_node_id: node.node_id,
					relation: "imports",
					properties: {
						kind: "managed-pinvoke",
						import_name: pinvoke.import_name,
						import_scope_name: pinvoke.import_scope_name
					},
					evidence: pinvokeAssociationEvidence(state, boundaryInput.evidence, pinvokeCoverage, memberEvidence)
				}));
			}
			for (const implementation of implementations) {
				const node = nativeImplementationNode(state, implementation, sourceEvidence);
				state.nodes.push(node);
				const owner = (canJoinMemberTokens ? state.methodNodes.get(implementation.token) : undefined) ?? artifactNode;
				addContainsEdge(state, owner, node, {
					kind: "declares-managed-native-implementation",
					coverage: implementationCoverage
				});
			}
		};
		pinvokeNode = (state, pinvoke, evidence) => createJavaScriptApplicationNode({
			kind: "managed-pinvoke-import",
			identity: artifactLocalIdentity(state.artifactSha256, "managed-pinvoke-token", pinvoke.token),
			observations: [{
				label: metadataLabel(pinvoke.import_name),
				properties: {
					token: pinvoke.token,
					member_token: pinvoke.member_token,
					member_name: pinvoke.member_name,
					import_name: pinvoke.import_name,
					import_scope_name: pinvoke.import_scope_name,
					char_set: pinvoke.char_set,
					call_convention: pinvoke.call_convention,
					verification: pinvoke.verification
				},
				evidence
			}]
		});
		nativeImplementationNode = (state, implementation, evidence) => createJavaScriptApplicationNode({
			kind: "managed-native-implementation",
			identity: artifactLocalIdentity(state.artifactSha256, "managed-native-implementation-token", implementation.token),
			observations: [{
				label: metadataLabel(implementation.name),
				properties: {
					token: implementation.token,
					name: implementation.name,
					rva: implementation.rva,
					code_type: implementation.code_type,
					managed_kind: implementation.managed_kind,
					pinvoke_declared: implementation.pinvoke_declared,
					boundary_kind: implementation.boundary_kind,
					body_interpretation: implementation.body_interpretation
				},
				evidence
			}]
		});
		addContainsEdge = (state, source, target, options) => {
			state.edges.push(createJavaScriptApplicationEdge({
				source_node_id: source.node_id,
				target_node_id: target.node_id,
				relation: "contains",
				properties: { kind: options.kind },
				evidence: projectedManagedEvidence(state, "project-managed-contains", options.coverage)
			}));
		};
		artifactLocalIdentity = (artifactSha256, namespace, key) => ({
			strategy: "artifact-local-key",
			stability: "artifact-version",
			artifact_sha256: artifactSha256,
			namespace,
			key
		});
		sourceManagedEvidence = (state, source, coverageState) => createManagedEvidence(state, source.operation, managedSourceCoverage(coverageState), [source.evidence_id]);
		projectedManagedEvidence = (state, operation, coverage = managedSourceCoverage("complete")) => createManagedEvidence(state, operation, coverage, state.evidenceLinks);
		pinvokeAssociationEvidence = (state, boundaryEvidence, coverage, memberEvidence) => createManagedEvidence(state, boundaryEvidence.operation, coverage, [boundaryEvidence.evidence_id, ...memberEvidence === undefined ? [] : [memberEvidence.evidence_id]]);
		createManagedEvidence = (state, operation, coverage, evidenceIds) => ({
			authority: "managed-static-analysis",
			state: "observed",
			confidence: "exact",
			artifact: {
				available: true,
				artifact_id: `art_${state.artifactSha256}`,
				sha256: state.artifactSha256
			},
			location: {
				available: true,
				value: {
					kind: "artifact-path",
					path: graphArtifactPath(state.artifactPath)
				}
			},
			extractor: {
				name: "rea-dotnet-static",
				version: "1",
				operation,
				executable_sha256: null
			},
			coverage,
			limitations: coverage.status === "complete" ? [] : ["The source managed Evidence slice is incomplete; unreturned or unavailable items remain unobserved."],
			evidence_ids: [...evidenceIds]
		});
		graphArtifactPath = (path) => {
			const name = basename(path).replaceAll(/[^A-Za-z0-9._-]/gu, "_");
			return `managed/${name.length === 0 ? "artifact.pe" : name}`;
		};
	})))();
}

//#endregion
//#region dist/domain/managed/managedApplicationGraph.js
var evidenceIdSchema, textSchema, projectManagedApplicationGraphInputSchema, managedApplicationGraphResultSchema, projectManagedApplicationGraph, countNodes, parseManagedInputs, chooseArtifact, assertSameArtifact, assertConsistentModuleIdentity, omittedCounts, projectionLimitations;
function init_managedApplicationGraph() {
	return (init_managedApplicationGraph = __esmMin((() => {
		init_evidence();
		init_javascriptApplicationGraph();
		init_managedArtifact();
		init_canonicalDigest();
		init_managedApplicationGraphCoverage();
		init_managedApplicationGraphNodes();
		init_digests();
		init_managedInspectionEvidence();
		evidenceIdSchema = prefixedDigestSchema("ev");
		textSchema = z.string().min(1);
		projectManagedApplicationGraphInputSchema = z.strictObject({
			managed_artifact: evidenceSchema.optional(),
			managed_members: evidenceSchema.optional(),
			managed_native_boundaries: evidenceSchema.optional()
		}).superRefine((input, context) => {
			if (input.managed_artifact === undefined && input.managed_members === undefined && input.managed_native_boundaries === undefined) context.addIssue({
				code: "custom",
				message: "At least one managed artifact, member, or native-boundary Evidence record is required"
			});
		});
		managedApplicationGraphResultSchema = z.strictObject({
			projection_id: prefixedDigestSchema("magp"),
			root_artifact_sha256: digestSchema,
			source_evidence: z.strictObject({
				managed_artifact_evidence_id: evidenceIdSchema.nullable(),
				managed_members_evidence_id: evidenceIdSchema.nullable(),
				managed_native_boundaries_evidence_id: evidenceIdSchema.nullable()
			}),
			summary: z.strictObject({
				graph_nodes: z.number().int().min(0),
				graph_edges: z.number().int().min(0),
				assemblies: z.number().int().min(0),
				modules: z.number().int().min(0),
				types: z.number().int().min(0),
				methods: z.number().int().min(0),
				fields: z.number().int().min(0),
				pinvoke_imports: z.number().int().min(0),
				native_implementations: z.number().int().min(0)
			}),
			graph: javascriptApplicationGraphSchema,
			coverage: z.strictObject({ status: z.enum(["complete-within-inputs", "partial"]) }),
			evidence_links: z.array(evidenceIdSchema).min(1).max(3),
			limitations: z.array(textSchema)
		});
		projectManagedApplicationGraph = (input) => {
			const parsed = parseManagedInputs(input);
			const artifactIdentity = chooseArtifact(parsed);
			assertSameArtifact(parsed, artifactIdentity.sha256);
			assertConsistentModuleIdentity(parsed);
			const evidenceLinks = [
				parsed.artifact?.evidence.evidence_id,
				parsed.members?.evidence.evidence_id,
				parsed.boundaries?.evidence.evidence_id
			].filter((id) => id !== undefined);
			const state = {
				nodes: [],
				edges: [],
				artifactSha256: artifactIdentity.sha256,
				artifactPath: artifactIdentity.path,
				evidenceLinks,
				typeNodes: new Map(),
				methodNodes: new Map(),
				fieldNodes: new Map()
			};
			const artifactNode = addArtifactNode(state);
			addArtifactIdentityNodes(state, artifactNode, parsed);
			addMemberNodes(state, artifactNode, parsed);
			addBoundaryNodes(state, artifactNode, parsed);
			const omissions = omittedCounts(parsed);
			const limitations = projectionLimitations(parsed, omissions);
			const graph = createJavaScriptApplicationGraph({
				schema: "JavaScriptApplicationGraph",
				root_node_ids: [artifactNode.node_id],
				nodes: state.nodes,
				edges: state.edges,
				coverage: managedGraphEvidenceCoverage(omissions),
				limitations
			});
			const withoutId = {
				root_artifact_sha256: state.artifactSha256,
				source_evidence: {
					managed_artifact_evidence_id: parsed.artifact?.evidence.evidence_id ?? null,
					managed_members_evidence_id: parsed.members?.evidence.evidence_id ?? null,
					managed_native_boundaries_evidence_id: parsed.boundaries?.evidence.evidence_id ?? null
				},
				summary: {
					graph_nodes: graph.nodes.length,
					graph_edges: graph.edges.length,
					assemblies: countNodes(graph.nodes, "managed-assembly"),
					modules: countNodes(graph.nodes, "managed-module"),
					types: countNodes(graph.nodes, "managed-type"),
					methods: countNodes(graph.nodes, "managed-method"),
					fields: countNodes(graph.nodes, "managed-field"),
					pinvoke_imports: countNodes(graph.nodes, "managed-pinvoke-import"),
					native_implementations: countNodes(graph.nodes, "managed-native-implementation")
				},
				graph,
				coverage: managedGraphResultCoverage(omissions),
				evidence_links: evidenceLinks,
				limitations
			};
			return managedApplicationGraphResultSchema.parse({
				...withoutId,
				projection_id: `magp_${digestCanonicalValue(withoutId, "Managed application graph")}`
			});
		};
		countNodes = (nodes, kind) => nodes.filter((node) => node.kind === kind).length;
		parseManagedInputs = (input) => ({
			artifact: input.managed_artifact === undefined ? null : parseManagedInspectionEvidence(input.managed_artifact, "inspect_managed_artifact", managedArtifactInspectionSchema),
			members: input.managed_members === undefined ? null : parseManagedInspectionEvidence(input.managed_members, "inspect_managed_members", managedMemberInspectionSchema),
			boundaries: input.managed_native_boundaries === undefined ? null : parseManagedInspectionEvidence(input.managed_native_boundaries, "inspect_managed_native_boundaries", managedNativeBoundaryInspectionSchema)
		});
		chooseArtifact = (parsed) => {
			const result = parsed.artifact?.result ?? parsed.members?.result ?? parsed.boundaries?.result;
			if (result === undefined) throw new TypeError("Managed graph projection requires managed Evidence");
			return {
				sha256: result.artifact.sha256,
				path: result.artifact.path
			};
		};
		assertSameArtifact = (parsed, sha256Value) => {
			for (const result of [
				parsed.artifact?.result,
				parsed.members?.result,
				parsed.boundaries?.result
			]) if (result !== undefined && result.artifact.sha256 !== sha256Value) throw new TypeError("Managed graph projection inputs must describe the same artifact SHA-256");
		};
		assertConsistentModuleIdentity = (parsed) => {
			const mvidClaims = [
				parsed.artifact?.result.module?.mvid,
				parsed.members?.result.module?.mvid,
				parsed.members?.result.identity_scope.requires_mvid,
				parsed.boundaries?.result.module?.mvid,
				parsed.boundaries?.result.identity_scope.requires_mvid
			].filter((mvid) => mvid !== undefined && mvid !== null).map((mvid) => mvid.toLowerCase());
			if (new Set(mvidClaims).size > 1) throw new TypeError("Managed graph inputs report conflicting known module MVIDs or token scopes");
			const modules = [
				parsed.artifact?.result.module,
				parsed.members?.result.module,
				parsed.boundaries?.result.module
			].filter((module) => module !== undefined && module !== null);
			for (const field of [
				"name",
				"generation",
				"token",
				"row_offset"
			]) {
				const values = new Set(modules.map((module) => module[field]));
				if (values.size > 1) throw new TypeError(`Managed graph inputs report conflicting module ${field} values`);
			}
			for (const field of ["enc_id", "enc_base_id"]) {
				const values = new Set(modules.map((module) => module[field]?.toLowerCase()).filter((value) => value !== undefined));
				if (values.size > 1) throw new TypeError(`Managed graph inputs report conflicting module ${field} values`);
			}
		};
		omittedCounts = (parsed) => assessManagedGraphOmissions({
			artifact: parsed.artifact?.result ?? null,
			members: parsed.members?.result ?? null,
			boundaries: parsed.boundaries?.result ?? null
		});
		projectionLimitations = (parsed, omissions) => [
			"Managed graph projection preserves static metadata observations only; it does not execute managed code, load assemblies, or map managed tokens to native addresses.",
			...parsed.members === null ? ["Managed member Evidence was not supplied; type, method, and field nodes are absent."] : [],
			...parsed.artifact === null ? ["Managed artifact Evidence was not supplied; assembly identity observations are absent."] : [],
			...parsed.boundaries === null ? ["Managed native-boundary Evidence was not supplied; P/Invoke and native-implementation nodes are absent."] : [],
			...omissions.partialInput ? ["At least one supplied managed Evidence record has partial coverage."] : [],
			...omissions.selectedTypes === null ? [] : [`Managed member Evidence selected only these declaring types: ${omissions.selectedTypes.join(", ")}; type, method, and field nodes of other types are omitted, not absent.`],
			...omissions.unscopedTokenRelationships ? ["Managed boundary tokens were not linked to member nodes because matching module MVID scope was not established."] : []
		];
	})))();
}

//#endregion
export { init_managedApplicationGraph, init_managedInspectionEvidence, managedApplicationGraphResultSchema, parseManagedInspectionEvidence, projectManagedApplicationGraph, projectManagedApplicationGraphInputSchema };