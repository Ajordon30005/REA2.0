import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { AnalysisInputError, AnalysisResourceConstraintError, init_analysisErrorCore, init_jsonSerialization, init_jsonValue, jsonParts, jsonValueSchema, ownedJsonValueSchema } from "./jsonSerialization-BNsB4Jxk.js";
import { canonicalJson, compositeKey, err, init_comparisonSemantics, init_inputIssueProjection, init_recordedTransportUrl, init_result, init_unicodeCodePointOrder, iterateUrlQueryParameters, ok, projectInputIssues, recordedPathSegments } from "./reconstructionObligationLedgerSchemas-DY5ovcSC.js";
import { collectionPathOf, init_EnvironmentStateAccumulator, init_environmentStateRules, isParam, listItems, normalizedPath, renderStateEntity, renderStateList, replaceAt, same, scalarText, segmentsOf, stateBodyJson } from "./analysisView-CqIpzMmO.js";
import { ENVIRONMENT_SERVE_OPERATION, REPLAY_BODY_LIMIT_BYTES, init_environmentSource, replayedBody } from "./environmentSource-Dq5Uj_Ch.js";
import { REA_STATE_FORMAT, environmentToolArguments, init_environmentTools } from "./environmentState-pz45Mmd5.js";
import { z } from "zod";
import { types } from "node:util";

//#region dist/application/environment/environmentReplay.js
var decodedPathSegment, pathValueMatches, scoreExchange, outranks, selectReplayExchange, selectsRecordedLine, utf8Prefix, BASE64_LIMIT_CHARS, replayBody, REPLAY_METADATA_LIMIT_BYTES, replayEnvironmentTool, replayAnswer;
function init_environmentReplay() {
	return (init_environmentReplay = __esmMin((() => {
		init_analysisErrorCore();
		init_recordedTransportUrl();
		init_result();
		init_environmentTools();
		init_environmentSource();
		decodedPathSegment = (segment) => {
			try {
				return decodeURIComponent(segment);
			} catch {
				return segment;
			}
		};
		pathValueMatches = (segment, value) => segment === value || decodedPathSegment(segment) === value;
		scoreExchange = (tool, pathArguments, queryArguments, exchange, args) => {
			const providedPaths = [];
			for (const param of tool.params) {
				const value = args[pathArguments.get(param.name) ?? param.name];
				if (typeof value === "string") providedPaths.push({
					index: param.index,
					value
				});
			}
			const segments = providedPaths.length === 0 ? new Map() : recordedPathSegments(exchange.path, providedPaths.map((param) => param.index));
			const pathProvided = providedPaths.length;
			let pathMatches = 0;
			let verbatimMatches = 0;
			for (const { index, value } of providedPaths) {
				const segment = segments.get(index);
				if (segment === value) verbatimMatches += 1;
				if (segment !== undefined && pathValueMatches(segment, value)) pathMatches += 1;
			}
			const supplied = new Map();
			for (const [name, argument] of queryArguments) {
				const value = args[argument];
				if (typeof value === "string") supplied.set(name, value);
			}
			const matched = new Set();
			if (supplied.size > 0) for (const [name, value] of iterateUrlQueryParameters(exchange.query ?? "")) {
				if (supplied.get(name) === value) matched.add(name);
				if (matched.size === supplied.size) break;
			}
			const queryProvided = supplied.size;
			const queryMatches = matched.size;
			return {
				pathMatches,
				verbatimMatches,
				queryMatches,
				exact: pathMatches === pathProvided && queryMatches === queryProvided
			};
		};
		outranks = (score, best) => score.pathMatches !== best.pathMatches ? score.pathMatches > best.pathMatches : score.verbatimMatches !== best.verbatimMatches ? score.verbatimMatches > best.verbatimMatches : score.queryMatches > best.queryMatches;
		selectReplayExchange = (tool, exchanges, args) => {
			let best;
			const argumentsMap = environmentToolArguments(tool);
			for (const ordinal of tool.record_ordinals) {
				const exchange = exchanges.get(ordinal);
				if (exchange === undefined) continue;
				const score = scoreExchange(tool, argumentsMap.path, argumentsMap.query, exchange, args);
				if (best === undefined || outranks(score, best.score)) best = {
					exchange,
					score
				};
			}
			return best === undefined ? undefined : {
				exchange: best.exchange,
				exact: best.score.exact
			};
		};
		selectsRecordedLine = (tool, exchange, args) => {
			const argumentsMap = environmentToolArguments(tool);
			if (!tool.params.every((param) => typeof args[argumentsMap.path.get(param.name) ?? param.name] === "string") || !scoreExchange(tool, argumentsMap.path, argumentsMap.query, exchange, args).exact) return false;
			for (const [name, value] of iterateUrlQueryParameters(exchange.query ?? "")) {
				const argument = argumentsMap.query.get(name);
				if (argument === undefined || args[argument] !== value) return false;
			}
			return true;
		};
		utf8Prefix = (text, maxBytes) => {
			const { read } = new TextEncoder().encodeInto(text, new Uint8Array(maxBytes));
			return text.slice(0, read);
		};
		BASE64_LIMIT_CHARS = Math.floor(REPLAY_BODY_LIMIT_BYTES / 3) * 4;
		replayBody = (exchange) => {
			const body = replayedBody(exchange);
			switch (body.kind) {
				case "none": return {
					body: null,
					truncated: false
				};
				case "base64": return body.whole ? {
					body: body.encoded,
					truncated: false
				} : {
					body: body.encoded.slice(0, BASE64_LIMIT_CHARS),
					truncated: true
				};
				case "cut": return {
					body: utf8Prefix(body.text, REPLAY_BODY_LIMIT_BYTES),
					truncated: true
				};
				case "json": return {
					body: body.value,
					truncated: false
				};
				case "text": return {
					body: body.text,
					truncated: false
				};
			}
		};
		REPLAY_METADATA_LIMIT_BYTES = 1024;
		replayEnvironmentTool = (source, tool, args) => {
			const selected = selectReplayExchange(tool, source.exchanges, args);
			if (selected === undefined) return err(new AnalysisInputError(ENVIRONMENT_SERVE_OPERATION, { userMessage: `Tool ${tool.name} cites no retained record to replay.` }, [{
				path: ["tool"],
				reason: "invalid_value",
				expected: tool.name
			}]));
			return ok(replayAnswer(source, selected.exchange, selected.exact));
		};
		replayAnswer = (source, exchange, exact, { body, truncated } = replayBody(exchange)) => {
			const recordedPath = utf8Prefix(exchange.path, REPLAY_METADATA_LIMIT_BYTES);
			const recordedQuery = exchange.query === null ? null : utf8Prefix(exchange.query, REPLAY_METADATA_LIMIT_BYTES);
			const contentType = exchange.contentType === null ? null : utf8Prefix(exchange.contentType, REPLAY_METADATA_LIMIT_BYTES);
			return {
				status: exchange.status,
				content_type: contentType,
				body,
				replay: {
					record_ordinal: exchange.ordinal,
					evidence_id: source.evidenceId,
					exact_match: exact,
					recorded_path: recordedPath,
					recorded_query: recordedQuery,
					recorded_line_truncated: recordedPath.length < exchange.path.length || (recordedQuery?.length ?? 0) < (exchange.query?.length ?? 0),
					content_type_truncated: contentType !== exchange.contentType,
					body_recorded: exchange.bodyText !== null,
					body_encoding: exchange.bodyEncoding ?? "utf-8",
					truncated
				}
			};
		};
	})))();
}

//#endregion
//#region dist/application/environment/environmentStateAnswer.js
var refused, shownEntity, fromRecording, recordedJson, stateAnswer, itemCall, collectionMatch, namedEntity, answerItem, checkedLine, answerList, answerDocument, answerCheckedLine, answerFromState, environmentToolAnswer;
function init_environmentStateAnswer() {
	return (init_environmentStateAnswer = __esmMin((() => {
		init_EnvironmentStateAccumulator();
		init_environmentStateRules();
		init_analysisErrorCore();
		init_result();
		init_environmentReplay();
		init_environmentSource();
		init_environmentTools();
		refused = (tool, userMessage) => new AnalysisInputError(ENVIRONMENT_SERVE_OPERATION, { userMessage }, [{
			path: ["tool"],
			reason: "invalid_value",
			expected: tool.name
		}]);
		shownEntity = (tool, view, entity, volatile) => {
			const shown = renderStateEntity(entity, view, volatile);
			const missing = view.required_fields.filter((name) => !Object.hasOwn(shown, name));
			return missing.length === 0 ? ok(shown) : err(refused(tool, `The state holds no complete ${view.type} entity ${entity.id} in ${entity.collection}: it lacks fields this tool's responses always carried: ${missing.join(", ")}.`));
		};
		fromRecording = (source, tool, args, reason) => {
			const replayed = replayEnvironmentTool(source, tool, args);
			return replayed.ok ? ok({
				...replayed.value,
				state: {
					source: "recording",
					reason
				}
			}) : replayed;
		};
		recordedJson = (exchange) => stateBodyJson(exchange.contentType, exchange);
		stateAnswer = (serving, base, body, state) => {
			const bytes = Buffer.byteLength(JSON.stringify(body), "utf8");
			if (bytes > 262144) return err(new AnalysisResourceConstraintError(ENVIRONMENT_SERVE_OPERATION, "capacity", "The answer rendered from the state exceeds the reply body limit", {
				max_body_bytes: REPLAY_BODY_LIMIT_BYTES,
				body_bytes: bytes
			}, {
				retryable: false,
				remediationAction: "Load a smaller state with data/add; the state is not cut to fit."
			}));
			return ok({
				...replayAnswer(serving.source, base.exchange, base.exact, {
					body,
					truncated: false
				}),
				state
			});
		};
		itemCall = (tool, args) => {
			const names = environmentToolArguments(tool).path;
			const params = new Map(tool.params.map((param) => [param.index, param]));
			const segments = [];
			const template = tool.path_template.slice(tool.path_template.indexOf("/") + 1).split("/");
			for (const [index, text] of template.entries()) {
				const param = params.get(index);
				if (param === undefined) {
					if (text !== "") segments.push({
						text,
						supplied: false
					});
					continue;
				}
				const value = args[names.get(param.name) ?? param.name];
				if (typeof value !== "string") return undefined;
				segments.push({
					text: value,
					supplied: true
				});
			}
			const last = segments.pop();
			return last?.supplied === true ? {
				segments,
				id: last.text
			} : undefined;
		};
		collectionMatch = (collection, segments) => {
			const held = segmentsOf(collection);
			if (held.length !== segments.length) return undefined;
			let verbatim = 0;
			for (const [index, { text, supplied }] of segments.entries()) {
				const segment = held[index];
				if (supplied ? !pathValueMatches(segment, text) : segment !== text) return undefined;
				if (supplied && segment === text) verbatim += 1;
			}
			return verbatim;
		};
		namedEntity = (store, type, call) => {
			const ids = [...new Set([decodedPathSegment(call.id), call.id])];
			const candidates = store.collectionsOf(type).flatMap((collection) => {
				const verbatim = collectionMatch(collection, call.segments);
				return verbatim === undefined ? [] : [{
					collection,
					verbatim
				}];
			}).sort((left, right) => right.verbatim - left.verbatim);
			for (const { collection } of candidates) for (const id of ids) {
				const entity = store.entity(type, collection, id);
				if (entity !== undefined) return entity;
			}
			return undefined;
		};
		answerItem = (serving, tool, view, args) => {
			const { source, store } = serving;
			const call = itemCall(tool, args);
			if (call === undefined) return err(refused(tool, `Tool ${tool.name} needs every path argument.`));
			const entity = namedEntity(store, view.type, call);
			if (entity === undefined) return err(refused(tool, `The state holds no ${view.type} entity ${call.id} in /${call.segments.map(({ text }) => text).join("/")}.`));
			const shown = shownEntity(tool, view, entity, new Set(store.type(view.type)?.volatile_fields));
			if (!shown.ok) return shown;
			const base = source.exchanges.get(view.envelope_ordinal);
			const envelope = base === undefined ? undefined : recordedJson(base);
			if (base === undefined || envelope === undefined) return err(refused(tool, `Tool ${tool.name} has no usable recorded envelope.`));
			const exact = selectReplayExchange(tool, new Map([[base.ordinal, base]]), args)?.exact === true;
			return stateAnswer(serving, {
				exchange: base,
				exact
			}, replaceAt(envelope, view.pointer, shown.value), {
				source: "state",
				view: "item",
				type: view.type,
				collection: entity.collection,
				id: entity.id
			});
		};
		checkedLine = (source, tool, checked, args) => {
			const lines = new Map();
			for (const ordinal of checked) {
				const exchange = source.exchanges.get(ordinal);
				if (exchange !== undefined && selectsRecordedLine(tool, exchange, args)) lines.set(ordinal, exchange);
			}
			return selectReplayExchange(tool, lines, args)?.exchange;
		};
		answerList = (serving, { tool, args }, view, base) => {
			const { source, store } = serving;
			const envelope = recordedJson(base);
			const recorded = envelope === undefined ? undefined : listItems(envelope, view.pointer);
			if (envelope === undefined || recorded === undefined) return fromRecording(source, tool, args, "body-unusable");
			const collection = collectionPathOf(base, false);
			const type = store.type(view.type);
			const members = view.membership === "all" ? store.inCollection(view.type, collection) : recorded.flatMap((item) => {
				const id = scalarText(item[type?.id_field ?? ""]);
				const entity = id === undefined ? undefined : store.entity(view.type, collection, id);
				return entity === undefined ? [] : [entity];
			});
			const volatile = new Set(type?.volatile_fields);
			const items = [];
			for (const entity of members) {
				const shown = shownEntity(tool, view, entity, volatile);
				if (!shown.ok) return shown;
				items.push(shown.value);
			}
			return stateAnswer(serving, {
				exchange: base,
				exact: true
			}, renderStateList(view, envelope, items), {
				source: "state",
				view: "list",
				type: view.type,
				collection,
				membership: view.membership,
				listed: items.length
			});
		};
		answerDocument = (serving, tool, base) => {
			const current = serving.store.document(tool.name);
			if (current === undefined) return err(refused(tool, `The state holds no document for ${tool.name}.`));
			return stateAnswer(serving, {
				exchange: base,
				exact: true
			}, current.value, {
				source: "state",
				view: "document",
				path: current.path
			});
		};
		answerCheckedLine = (serving, tool, view, args) => {
			const base = checkedLine(serving.source, tool, view.checked_record_ordinals, args);
			if (base === undefined) return fromRecording(serving.source, tool, args, "unrecorded-request");
			return view.shape === "list" ? answerList(serving, {
				tool,
				args
			}, view, base) : answerDocument(serving, tool, base);
		};
		answerFromState = (serving, tool, args) => {
			const view = serving.store.state.views.get(tool.name);
			if (view === undefined) return fromRecording(serving.source, tool, args, "no-view");
			switch (view.shape) {
				case "recorded": return fromRecording(serving.source, tool, args, view.reason);
				case "item": return answerItem(serving, tool, view, args);
				case "list":
				case "document": return answerCheckedLine(serving, tool, view, args);
			}
		};
		environmentToolAnswer = (source, store) => store === undefined ? (tool, args) => replayEnvironmentTool(source, tool, args) : (tool, args) => answerFromState({
			source,
			store
		}, tool, args);
	})))();
}

//#endregion
//#region dist/application/environment/environmentStateDocument.js
var STATE_INTAKE_LIMIT_BYTES, stateDocumentSchemaFor, stateDocumentSchema, ownedStateDocumentSchema, problem, CONTENT_MEMBERS, contentIndex, memberProblem, prototypeMemberPath, schemaProblem, instantiates, entityKey, viewFieldsProblem, entityProblem, documentsProblem, sameTypes, contentProblem, heldContent, parseStateDocument;
function init_environmentStateDocument() {
	return (init_environmentStateDocument = __esmMin((() => {
		init_environmentStateRules();
		init_analysisErrorCore();
		init_comparisonSemantics();
		init_inputIssueProjection();
		init_jsonValue();
		init_result();
		init_unicodeCodePointOrder();
		init_environmentSource();
		init_environmentTools();
		STATE_INTAKE_LIMIT_BYTES = 32 * 1024 * 1024;
		stateDocumentSchemaFor = (jsonValue) => {
			const fieldsSchema = z.record(z.string(), jsonValue);
			const ordinalSchema = z.number().int().nonnegative();
			return z.strictObject({ rea_state: z.strictObject({
				version: z.literal(1),
				state_evidence_id: z.string().optional(),
				types: z.array(jsonValue).optional(),
				entities: z.array(z.strictObject({
					type: z.string(),
					collection: z.string(),
					id: z.string(),
					fields: fieldsSchema,
					view_fields: z.array(z.strictObject({
						tool: z.string(),
						fields: fieldsSchema
					})).optional(),
					record_ordinals: z.array(ordinalSchema).optional()
				})),
				documents: z.array(z.strictObject({
					tool: z.string(),
					path: z.string(),
					value: jsonValue,
					record_ordinal: ordinalSchema.optional()
				}))
			}) });
		};
		stateDocumentSchema = stateDocumentSchemaFor(jsonValueSchema);
		ownedStateDocumentSchema = stateDocumentSchemaFor(ownedJsonValueSchema);
		problem = (path, message) => ({
			path,
			reason: "invalid_value",
			message
		});
		CONTENT_MEMBERS = new Set([
			"fields",
			"value",
			"types"
		]);
		contentIndex = (path) => path.findIndex((segment) => CONTENT_MEMBERS.has(segment));
		memberProblem = (path) => {
			const content = contentIndex(path);
			return content >= 0 && content < path.length - 1 ? problem(path.slice(0, content + 1), "holds a value that is not exactly representable JSON") : problem(path.slice(0, -1), `has a member ${REA_STATE_FORMAT} does not define`);
		};
		prototypeMemberPath = (root) => {
			const pathOf = (node) => {
				const path = [];
				for (let at = node; at.parent !== undefined; at = at.parent) path.push(at.key);
				return path.reverse();
			};
			function* ownKeys(value) {
				for (const key in value) if (Object.hasOwn(value, key)) yield key;
			}
			const cursor = (value, parent, key) => ({
				value,
				parent,
				key,
				index: 0,
				...!Array.isArray(value) && typeof value === "object" && value !== null ? { entries: ownKeys(value) } : {}
			});
			const pending = [cursor(root, undefined, "")];
			while (pending.length > 0) {
				const node = pending[pending.length - 1];
				const { value } = node;
				if (typeof value !== "object" || value === null) {
					pending.pop();
					continue;
				}
				if (types.isProxy(value)) {
					pending.pop();
					continue;
				}
				const array = Array.isArray(value);
				if (!array && Object.hasOwn(value, "__proto__")) return [...pathOf(node), "__proto__"];
				if (array) {
					if (node.index >= value.length) {
						pending.pop();
						continue;
					}
					const index = node.index++;
					const descriptor = Object.getOwnPropertyDescriptor(value, index);
					if (descriptor?.enumerable !== true || !Object.hasOwn(descriptor, "value")) continue;
					const child = descriptor.value;
					if (typeof child === "object" && child !== null) pending.push(cursor(child, node, index));
					continue;
				}
				const next = node.entries?.next();
				if (next === undefined || next.done) {
					pending.pop();
					continue;
				}
				const key = next.value;
				const descriptor = Object.getOwnPropertyDescriptor(value, key);
				if (descriptor?.enumerable !== true || !Object.hasOwn(descriptor, "value")) continue;
				const child = descriptor.value;
				if (typeof child === "object" && child !== null) pending.push(cursor(child, node, key));
			}
			return undefined;
		};
		schemaProblem = (issues, value) => {
			const first = projectInputIssues(issues, value)[0];
			if (first === undefined) return problem([], `is not a ${REA_STATE_FORMAT} document`);
			const content = contentIndex(first.path);
			if (content >= 0 && content < first.path.length - 1 || first.reason === "unknown_argument") return memberProblem(first.path);
			if (first.reason === "missing_argument") return {
				...first,
				message: "is required"
			};
			return {
				...first,
				message: content >= 0 && first.reason !== "invalid_type" ? "is not exactly representable JSON" : `is not a valid ${REA_STATE_FORMAT} value for this member`
			};
		};
		instantiates = (collection, template) => {
			const concrete = segmentsOf(collection);
			const pattern = segmentsOf(template);
			return normalizedPath(collection) === collection && concrete.length === pattern.length && pattern.every((segment, index) => isParam(segment) || segment === concrete[index]);
		};
		entityKey = (entity) => compositeKey([
			entity.type,
			entity.collection,
			entity.id
		]);
		viewFieldsProblem = (state, type, entity, path) => {
			const tools = new Set();
			for (const [index, view] of (entity.view_fields ?? []).entries()) {
				const plan = state.views.get(view.tool);
				if (plan?.shape !== "item" && plan?.shape !== "list" || plan.type !== entity.type || tools.has(view.tool)) return problem([
					...path,
					"view_fields",
					index,
					"tool"
				], "is not an item or list view of the entity's type, or repeats one");
				tools.add(view.tool);
				if (Object.hasOwn(view.fields, type.id_field) && scalarText(view.fields[type.id_field]) !== entity.id) return problem([
					...path,
					"view_fields",
					index,
					"fields"
				], `sets the type's ${type.id_field} field to a value other than the entity's id`);
			}
			return undefined;
		};
		entityProblem = ({ state, initial, seen }, entity, path) => {
			const type = state.types.find((candidate) => candidate.collection_template === entity.type);
			if (type === undefined) return problem([...path, "type"], "is not a type of the served state");
			if (!instantiates(entity.collection, type.collection_template)) return problem([...path, "collection"], `does not match its type's collection_template ${type.collection_template}`);
			if (scalarText(entity.fields[type.id_field]) !== entity.id) return problem([...path, "id"], `does not equal the entity's ${type.id_field} field`);
			const key = entityKey(entity);
			if (seen.has(key)) return problem([...path, "id"], "repeats an earlier entity's key");
			seen.add(key);
			const cited = entity.record_ordinals ?? [];
			if (cited.length > 0 && !same(cited, initial.get(key)?.record_ordinals ?? [])) return problem([...path, "record_ordinals"], "cites records the served Evidence does not cite for this entity");
			return viewFieldsProblem(state, type, entity, path);
		};
		documentsProblem = (state, documents) => {
			const tools = new Set();
			for (const [index, document] of documents.entries()) {
				const initial = state.documents.find((candidate) => candidate.tool === document.tool);
				if (state.views.get(document.tool)?.shape !== "document" || initial === undefined || tools.has(document.tool)) return problem([
					"rea_state",
					"documents",
					index,
					"tool"
				], "is not a document view of the served state, or repeats one");
				tools.add(document.tool);
				if (document.path !== initial.path) return problem([
					"rea_state",
					"documents",
					index,
					"path"
				], `differs from the initial document's path ${initial.path}`);
				if (document.record_ordinal !== undefined && document.record_ordinal !== initial.record_ordinal) return problem([
					"rea_state",
					"documents",
					index,
					"record_ordinal"
				], `is not the initial document's record ${String(initial.record_ordinal)}`);
			}
			return undefined;
		};
		sameTypes = (supplied, types) => canonicalJson(supplied, "State types") === canonicalJson(types, "State types");
		contentProblem = (state, document, initial) => {
			if (document.state_evidence_id !== undefined && document.state_evidence_id !== state.evidenceId) return problem(["rea_state", "state_evidence_id"], `is not the served state's Evidence ${state.evidenceId}`);
			if (document.types !== undefined && !sameTypes(document.types, state.types)) return problem(["rea_state", "types"], "differs from the served types");
			const check = {
				state,
				initial,
				seen: new Set()
			};
			for (const [index, entity] of document.entities.entries()) {
				const found = entityProblem(check, entity, [
					"rea_state",
					"entities",
					index
				]);
				if (found !== undefined) return found;
			}
			return documentsProblem(state, document.documents);
		};
		heldContent = (state, document, initial) => ({
			entities: document.entities.map((entity) => {
				const view_fields = entity.view_fields ?? [];
				const recorded = initial.get(entityKey(entity));
				const unchanged = recorded !== undefined && same(entity.fields, recorded.fields) && same(view_fields, recorded.view_fields);
				return {
					type: entity.type,
					collection: entity.collection,
					id: entity.id,
					fields: entity.fields,
					view_fields,
					record_ordinals: unchanged ? recorded.record_ordinals : []
				};
			}),
			documents: document.documents.map(({ tool, path, value }) => {
				const recorded = state.documents.find((candidate) => candidate.tool === tool);
				return {
					tool,
					path,
					value,
					...recorded !== undefined && same(value, recorded.value) ? { record_ordinal: recorded.record_ordinal } : {}
				};
			})
		});
		parseStateDocument = (state, value, owned = false) => {
			const prototype = prototypeMemberPath(value);
			const parsed = (owned ? ownedStateDocumentSchema : stateDocumentSchema).safeParse(value);
			const initial = new Map(state.entities.map((entity) => [entityKey(entity), entity]));
			const issue = prototype !== undefined ? memberProblem(prototype) : parsed.success ? contentProblem(state, parsed.data.rea_state, initial) : schemaProblem(parsed.error.issues, value);
			if (issue !== undefined || !parsed.success) return err(new AnalysisInputError(ENVIRONMENT_SERVE_OPERATION, { userMessage: `The document is not a valid ${REA_STATE_FORMAT} state.` }, issue === undefined ? [] : [issue]));
			return ok(heldContent(state, parsed.data.rea_state, initial));
		};
	})))();
}

//#endregion
//#region dist/application/environment/environmentStateStore.js
var jsonBytes, EnvironmentStateStore;
function init_environmentStateStore() {
	return (init_environmentStateStore = __esmMin((() => {
		init_analysisErrorCore();
		init_jsonSerialization();
		init_result();
		init_unicodeCodePointOrder();
		init_environmentSource();
		init_environmentStateDocument();
		jsonBytes = (value) => {
			let bytes = 0;
			for (const part of jsonParts(value)) bytes += Buffer.byteLength(part, "utf8");
			return bytes;
		};
		EnvironmentStateStore = class {
			state;
			#entities = new Map();
			#collections = new Map();
			#typeCollections = new Map();
			#documents = new Map();
			#content = {
				entities: [],
				documents: []
			};
			#types;
			constructor(state) {
				this.state = state;
				this.#types = new Map(state.types.map((type) => [type.collection_template, type]));
				this.reset();
			}
			/** Restore the initial state the Evidence holds. */
			reset() {
				this.#install(this.state);
			}
			/** Validate a caller-owned document and copy its JSON values before retaining them. */
			replace(document) {
				return this.#replace(document, false);
			}
			/** Validate and retain a JSON document created exclusively by the serving boundary. */
			replaceOwnedDocument(document) {
				return this.#replace(document, true);
			}
			#replace(document, owned) {
				const content = parseStateDocument(this.state, document, owned);
				if (!content.ok) return content;
				if (jsonBytes(this.#snapshotOf(content.value)) > 33554432) return err(new AnalysisInputError(ENVIRONMENT_SERVE_OPERATION, { userMessage: `The state would exceed ${String(STATE_INTAKE_LIMIT_BYTES)} bytes as data/get writes it.` }, [{
					path: [],
					reason: "out_of_range",
					message: `would exceed ${String(STATE_INTAKE_LIMIT_BYTES)} bytes as data/get writes it`,
					maximum: STATE_INTAKE_LIMIT_BYTES
				}]));
				this.#install(content.value);
				return ok(undefined);
			}
			type(collectionTemplate) {
				return this.#types.get(collectionTemplate);
			}
			entity(type, collection, id) {
				return this.#entities.get(compositeKey([
					type,
					collection,
					id
				]));
			}
			/** One collection's entities in state order. */
			inCollection(type, collection) {
				return this.#collections.get(compositeKey([type, collection])) ?? [];
			}
			/** The collections holding entities of one type, in state order of their first entity. */
			collectionsOf(type) {
				return this.#typeCollections.get(type) ?? [];
			}
			document(tool) {
				return this.#documents.get(tool);
			}
			snapshot() {
				return this.#snapshotOf(this.#content);
			}
			#snapshotOf(content) {
				return { rea_state: {
					version: 1,
					state_evidence_id: this.state.evidenceId,
					types: this.state.types,
					entities: content.entities,
					documents: content.documents
				} };
			}
			/** Build every index before assigning any, so a reader never sees half a state. */
			#install(content) {
				const entities = new Map();
				const collections = new Map();
				const typeCollections = new Map();
				for (const entity of content.entities) {
					entities.set(compositeKey([
						entity.type,
						entity.collection,
						entity.id
					]), entity);
					const key = compositeKey([entity.type, entity.collection]);
					const members = collections.get(key);
					if (members !== undefined) {
						members.push(entity);
						continue;
					}
					collections.set(key, [entity]);
					const named = typeCollections.get(entity.type);
					if (named === undefined) typeCollections.set(entity.type, [entity.collection]);
					else named.push(entity.collection);
				}
				this.#entities = entities;
				this.#collections = collections;
				this.#typeCollections = typeCollections;
				this.#documents = new Map(content.documents.map((document) => [document.tool, document]));
				this.#content = content;
			}
		};
	})))();
}

//#endregion
export { EnvironmentStateStore, STATE_INTAKE_LIMIT_BYTES, environmentToolAnswer, init_environmentStateAnswer, init_environmentStateDocument, init_environmentStateStore };