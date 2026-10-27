import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { a as init_result, i as err, o as ok } from "./analysisErrorBase-C1inc3JA.js";
import { i as localPathStringSchema, n as init_localPath } from "./localPath-BCKW5wEI.js";
import { n as safeParseJson, t as init_safeJson } from "./safeJson-VSrHWOIY.js";
import { b as init_OwnedFileHandle, d as NonRegularFileReadError, g as init_RegularFile, h as assertRegularFileActive, o as RegularFileCleanupFailure, p as RegularFileChangedError, s as init_OwnedRegularFile, w as init_ArtifactReader, x as ArtifactReaderFailure, y as OwnedFileHandle } from "./ArtifactResourceScope-27rw7tKT.js";
import { n as AnalysisCleanupLeaseGroup, r as init_AnalysisCleanupLease } from "./AnalysisCleanupLease-Dw4q6-cP.js";
import { _ as init_evidenceErrors, h as EvidenceIntegrityError, m as EvidenceFileError } from "./analysisErrorProjection-DWZ-Gw1s.js";
import { a as withRegularFile, n as init_RegularFileRead, t as RegularFileReadFailure } from "./RegularFileRead-B_5d-TRZ.js";
import { i as prefixedDigestSchema, n as init_digests, t as digestSchema } from "./digests-D7B1dpH1.js";
import { c as freezeJsonSnapshot, f as init_immutableJson, i as jsonValueSchema, l as freezeOwnedJsonSnapshotSteps, n as init_jsonValue, o as jsonValueValidationSteps, r as jsonObjectSchema } from "./jsonValue-D6WMzy_r.js";
import { f as init_analysisErrorCore, i as AnalysisCancelledError, l as AnalysisResourceConstraintError, o as AnalysisInputError } from "./analysisErrorCore-SE09yKhJ.js";
import { A as init_canonicalJsonDigestSteps, E as committedProviderSchema, O as init_analysisProfile, T as analysisProfilesEqual, b as RAW_ONLY_ARCHITECTURES, f as rebindEvidenceToTargetPath, g as relationshipCoverageSchema, i as evidenceLocationSchema, k as canonicalJsonDigestSteps, m as init_relationshipCoverage, s as init_evidence, w as analysisProfileSchema, x as init_binaryTargetTypes, y as BINARY_ARCHITECTURES } from "./evidence-gY2e4uvs.js";
import { Jn as binaryArchitectureSchema, Xn as rawBinaryEntryPointSchema, Yn as init_rawBinary, an as evidenceBundleSchema, cn as parseImmutableEvidenceBundle, in as evidenceBundleForTarget, on as init_evidenceBundle, sn as parseEvidenceBundle } from "./toolOutputSchemaGroups-Sg-EAusY.js";
import { n as compositeKey, r as init_unicodeCodePointOrder, t as compareUnicodeCodePoints } from "./unicodeCodePointOrder-BezCbTpg.js";
import { F as absoluteCallerPath, I as init_callerPath } from "./InvestigationProviders-l_FYDS9j.js";
import { o as bindArtifactFileCleanup, s as init_ArtifactFileOperation } from "./ArtifactFileOperation-CQ4Q1TnJ.js";
import { basename, dirname, resolve } from "node:path";
import { z } from "zod";
import { link, lstat, mkdtemp, open, readdir, realpath, rename, rmdir, unlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { setImmediate } from "node:timers/promises";
import { constants } from "node:buffer";
import canonicalize from "canonicalize";
import { pipeline } from "node:stream/promises";
import { getHeapStatistics } from "node:v8";
import { asStream, none } from "stream-chain";
import fun from "stream-chain/fun.js";
import parser from "stream-json/parser.js";
import streamValues from "stream-json/streamers/stream-values.js";
import streamArray from "stream-json/streamers/stream-array.js";

//#region dist/domain/analysisSnapshot.js
var architectureSchema, formatSchema, kindSchema, subjectBaseSchema, subjectFormatSchema, subjectSchema, targetIdentitySchema, targetSchema, bindingSchema, entrySchema, workflowEntrySchema, analysisSnapshotSchema, preparedEntryBrand, preparedEntries, prepareSnapshotEntry, snapshotFileHeaderSchema, parsePreparedAnalysisSnapshot, contentDigest, snapshotContentDigest, evidenceContentDigest, snapshotExecutionProjection, canonicalJson, snapshotTarget, snapshotBinding, snapshotMatchesTarget, snapshotMatchesProfile, snapshotMatchesBinding, snapshotEvidenceForQuery, createAnalysisSnapshotWorkflowEntry, evidenceMatchesEntry, analysisQueryId, createAnalysisSnapshotEntry, validatedSnapshots, parseAnalysisSnapshot, immutableAnalysisSnapshot, sealSnapshot, restoreSnapshot, hasCanonicalQueryOrder, isCorrespondingEvidence, evidenceQueryKey, entryQueryKey, entryEvidenceKey, workflowEntryQueryKey, workflowEntryEvidenceKey, isWorkflowEvidence, evidenceMatchesWorkflowEntry, evidenceContentMetadata, serializeAnalysisSnapshot;
function init_analysisSnapshot() {
	return (init_analysisSnapshot = __esmMin((() => {
		init_unicodeCodePointOrder();
		init_localPath();
		init_analysisProfile();
		init_binaryTargetTypes();
		init_evidenceBundle();
		init_evidence();
		init_jsonValue();
		init_digests();
		init_canonicalJsonDigestSteps();
		init_immutableJson();
		init_rawBinary();
		init_relationshipCoverage();
		architectureSchema = z.enum(BINARY_ARCHITECTURES);
		formatSchema = z.enum([
			"analysis-database",
			"mach-o",
			"mach-o-universal",
			"elf",
			"pe",
			"dos-mz",
			"dos-com",
			"raw-binary",
			"zip",
			"ipa",
			"apk",
			"msix",
			"appx",
			"hap",
			"hsp",
			"app-pack",
			"asar",
			"godot-pck",
			"dmg",
			"pkg",
			"plist",
			"javascript",
			"source-map"
		]);
		kindSchema = z.enum([
			"executable",
			"database",
			"archive",
			"artifact"
		]);
		subjectBaseSchema = z.object({
			path: localPathStringSchema,
			sha256: digestSchema
		});
		subjectFormatSchema = z.enum([
			...formatSchema.options,
			"hopper",
			"directory",
			"file",
			"unknown",
			"javascript-bundle",
			"entitlements",
			"pyinstaller"
		]);
		subjectSchema = z.discriminatedUnion("format", [subjectBaseSchema.extend({
			format: subjectFormatSchema.exclude(["raw-binary"]),
			architecture: architectureSchema.exclude([...RAW_ONLY_ARCHITECTURES]).nullable()
		}), subjectBaseSchema.extend({
			format: z.literal("raw-binary"),
			architecture: architectureSchema.nullable()
		})]);
		targetIdentitySchema = z.object({
			sha256: digestSchema,
			kind: kindSchema,
			architecture: architectureSchema.nullable()
		});
		targetSchema = z.discriminatedUnion("format", [targetIdentitySchema.extend({
			format: z.enum(formatSchema.options.filter((format) => format !== "raw-binary")),
			architecture: architectureSchema.exclude([...RAW_ONLY_ARCHITECTURES]).nullable()
		}), targetIdentitySchema.extend({
			format: z.literal("raw-binary"),
			kind: z.literal("executable"),
			architecture: binaryArchitectureSchema,
			entry_point: rawBinaryEntryPointSchema
		})]);
		bindingSchema = z.object({
			provider: committedProviderSchema,
			analysis_profile: analysisProfileSchema
		}).superRefine((binding, context) => {
			if (binding.provider.id !== binding.analysis_profile.provider.id || binding.provider.name !== binding.analysis_profile.provider.name || binding.provider.version !== binding.analysis_profile.provider.version) context.addIssue({
				code: "custom",
				path: ["provider"],
				message: "Snapshot binding provider does not match analysis profile"
			});
		});
		entrySchema = z.object({
			query_id: prefixedDigestSchema("query"),
			operation: z.string().min(1),
			parameters: jsonObjectSchema,
			execution: z.object({
				result: jsonValueSchema,
				raw_result: jsonValueSchema.nullable(),
				provider: committedProviderSchema,
				limitations: z.array(z.string()),
				relationship_coverage: relationshipCoverageSchema.nullable(),
				locations: z.array(evidenceLocationSchema),
				subject: subjectSchema.nullable()
			})
		});
		workflowEntrySchema = z.object({
			query_id: prefixedDigestSchema("query"),
			operation: z.string().min(1),
			parameters: jsonObjectSchema,
			execution: z.object({
				result: jsonValueSchema,
				raw_result: jsonValueSchema.nullable(),
				provider: committedProviderSchema,
				analysis_profile: analysisProfileSchema,
				limitations: z.array(z.string()),
				relationship_coverage: relationshipCoverageSchema.nullable(),
				locations: z.array(evidenceLocationSchema),
				subject: subjectSchema.nullable()
			})
		});
		analysisSnapshotSchema = z.object({
			target: targetSchema,
			binding: bindingSchema,
			entries: z.array(entrySchema),
			workflow_entries: z.array(workflowEntrySchema),
			evidence_bundle: evidenceBundleSchema
		});
		preparedEntryBrand = Symbol("prepared-snapshot-entry");
		preparedEntries = new WeakMap();
		prepareSnapshotEntry = (input, kind) => {
			const handle = Object.freeze({ [preparedEntryBrand]: true });
			if (kind === "provider") {
				const entry = entrySchema.parse(input);
				const { result, raw_result, ...execution } = entry.execution;
				preparedEntries.set(handle, {
					kind,
					entry: {
						...entry,
						execution
					},
					digest: snapshotContentDigest(result, raw_result, execution)
				});
			} else {
				const entry = workflowEntrySchema.parse(input);
				const { result, raw_result, ...execution } = entry.execution;
				preparedEntries.set(handle, {
					kind,
					entry: {
						...entry,
						execution
					},
					digest: snapshotContentDigest(result, raw_result, execution)
				});
			}
			return handle;
		};
		snapshotFileHeaderSchema = z.object({
			target: targetSchema,
			binding: bindingSchema,
			evidence_bundle: z.unknown()
		});
		parsePreparedAnalysisSnapshot = (input, entries, workflowEntries) => {
			const header = snapshotFileHeaderSchema.parse(input);
			const bundle = parseImmutableEvidenceBundle(header.evidence_bundle);
			const providerRows = entries.map((handle) => {
				const row = preparedEntries.get(handle);
				if (row?.kind !== "provider") throw new TypeError("Analysis snapshot entry was not parsed in this realm");
				return row;
			});
			const workflowRows = workflowEntries.map((handle) => {
				const row = preparedEntries.get(handle);
				if (row?.kind !== "workflow") throw new TypeError("Analysis snapshot workflow entry was not parsed in this realm");
				return row;
			});
			const restored = sealSnapshot(restoreSnapshot(header, bundle, providerRows, workflowRows));
			for (const handle of [...entries, ...workflowEntries]) preparedEntries.delete(handle);
			return restored;
		};
		contentDigest = (value) => {
			const steps = canonicalJsonDigestSteps(value);
			let step = steps.next();
			while (!step.done) step = steps.next();
			return step.value;
		};
		snapshotContentDigest = (result, rawResult, execution) => {
			const metadata = jsonObjectSchema.parse({
				limitations: execution.limitations,
				locations: execution.locations,
				subject: execution.subject === null ? null : {
					local_path: execution.subject.path,
					sha256: execution.subject.sha256,
					format: execution.subject.format,
					architecture: execution.subject.architecture
				},
				relationship_coverage: execution.relationship_coverage
			});
			return contentDigest({
				...metadata,
				normalized_result: result,
				raw_result: rawResult
			});
		};
		evidenceContentDigest = (evidence) => {
			return contentDigest({
				...jsonObjectSchema.parse(evidenceContentMetadata(evidence)),
				normalized_result: evidence.normalized_result,
				raw_result: evidence.raw_result
			});
		};
		snapshotExecutionProjection = (execution, provider) => ({
			result: execution.result,
			raw_result: execution.rawResult,
			provider,
			limitations: [...execution.limitations],
			relationship_coverage: execution.relationshipCoverage ?? null,
			locations: [...execution.locations],
			subject: execution.subject === null ? null : subjectSchema.parse({
				...execution.subject,
				architecture: execution.subject.architecture ?? null
			})
		});
		canonicalJson = (value) => {
			const json = jsonValueSchema.parse(value);
			const encoded = canonicalize(json);
			if (encoded === undefined) throw new TypeError("RFC 8785 canonicalization rejected snapshot data");
			return encoded;
		};
		snapshotTarget = (target) => target.format === "raw-binary" ? {
			sha256: target.sha256,
			kind: target.kind,
			architecture: target.architecture,
			format: target.format,
			entry_point: target.entryPoint
		} : {
			sha256: target.sha256,
			kind: target.kind,
			architecture: target.architecture ?? null,
			format: target.format
		};
		snapshotBinding = (profile) => bindingSchema.parse({
			provider: profile.provider,
			analysis_profile: profile
		});
		snapshotMatchesTarget = (snapshot, target) => snapshot.sha256 === target.sha256 && snapshot.kind === target.kind && snapshot.format === target.format && snapshot.architecture === (target.architecture ?? null) && (snapshot.format !== "raw-binary" || target.format === "raw-binary" && snapshot.entry_point === target.entryPoint);
		snapshotMatchesProfile = (binding, profile) => binding.provider.id === profile.provider.id && binding.provider.name === profile.provider.name && binding.provider.version === profile.provider.version && analysisProfilesEqual(binding.analysis_profile, profile);
		snapshotMatchesBinding = (snapshot, target, profile) => snapshotMatchesTarget(snapshot.target, target) && snapshotMatchesProfile(snapshot.binding, profile);
		snapshotEvidenceForQuery = (snapshot, query) => {
			const { target, bindingProfile, operation, parameters, provider, evidenceProfile } = query;
			if (!snapshotMatchesBinding(snapshot, target, bindingProfile)) return undefined;
			const encodedParameters = canonicalJson(parameters);
			const queryId = analysisQueryId(snapshot.target, snapshot.binding, operation, parameters);
			const entry = snapshot.entries.find((candidate) => candidate.query_id === queryId);
			const workflowEntry = snapshot.workflow_entries.find((candidate) => candidate.query_id === queryId);
			if (entry === undefined && workflowEntry === undefined) return undefined;
			const evidence = snapshot.evidence_bundle.records.find((record) => record.subject?.digest.sha256 === target.sha256 && record.operation === operation && record.provider.id === provider.id && record.provider.name === provider.name && record.provider.version === provider.version && record.analysis_profile !== null && analysisProfilesEqual(record.analysis_profile, evidenceProfile) && canonicalJson(record.parameters) === encodedParameters && (entry !== undefined && evidenceMatchesEntry(record, entry, snapshot) || workflowEntry !== undefined && evidenceMatchesWorkflowEntry(record, workflowEntry, snapshot)));
			return evidence === undefined ? undefined : rebindEvidenceToTargetPath(evidence, target);
		};
		createAnalysisSnapshotWorkflowEntry = (input) => {
			const { target, binding, operation, parameters, execution } = input;
			if (execution.provider.id !== execution.analysisProfile.provider.id || execution.provider.name !== execution.analysisProfile.provider.name || execution.provider.version !== execution.analysisProfile.provider.version) throw new TypeError("Workflow snapshot execution provider does not match its profile");
			return {
				query_id: analysisQueryId(target, binding, operation, parameters),
				operation,
				parameters: jsonObjectSchema.parse(parameters),
				execution: {
					...snapshotExecutionProjection(execution, execution.analysisProfile.provider),
					analysis_profile: execution.analysisProfile
				}
			};
		};
		evidenceMatchesEntry = (evidence, entry, snapshot) => isCorrespondingEvidence(evidence, snapshot) && compositeKey([evidenceQueryKey(evidence), evidenceContentDigest(evidence)]) === entryEvidenceKey(entry, snapshot.binding);
		analysisQueryId = (target, binding, operation, parameters) => `query_${createHash("sha256").update(canonicalJson({
			target,
			binding,
			operation,
			parameters
		})).digest("hex")}`;
		createAnalysisSnapshotEntry = (input) => {
			const { target, binding, operation, parameters, execution } = input;
			if (execution.analysisProfile === undefined || !snapshotMatchesProfile(binding, execution.analysisProfile) || execution.provider.id !== binding.provider.id || execution.provider.name !== binding.provider.name || execution.provider.version !== binding.provider.version) throw new TypeError("Snapshot execution does not match its provider/profile binding");
			return {
				query_id: analysisQueryId(target, binding, operation, parameters),
				operation,
				parameters: jsonObjectSchema.parse(parameters),
				execution: snapshotExecutionProjection(execution, binding.provider)
			};
		};
		validatedSnapshots = new WeakMap();
		parseAnalysisSnapshot = (input) => {
			if (typeof input === "object" && input !== null) {
				const owned = validatedSnapshots.get(input);
				if (owned !== undefined) return owned;
			}
			const parsed = analysisSnapshotSchema.parse(input);
			restoreSnapshot(parsed, parseEvidenceBundle(parsed.evidence_bundle), parsed.entries.map((entry) => ({
				kind: "provider",
				entry,
				digest: snapshotContentDigest(entry.execution.result, entry.execution.raw_result, entry.execution)
			})), parsed.workflow_entries.map((entry) => ({
				kind: "workflow",
				entry,
				digest: snapshotContentDigest(entry.execution.result, entry.execution.raw_result, entry.execution)
			})));
			return parsed;
		};
		immutableAnalysisSnapshot = (input) => sealSnapshot(parseAnalysisSnapshot(input));
		sealSnapshot = (snapshot) => {
			for (const entry of [...snapshot.entries, ...snapshot.workflow_entries]) {
				freezeJsonSnapshot(entry.execution.result);
				freezeJsonSnapshot(entry.execution.raw_result);
			}
			freezeJsonSnapshot(snapshot);
			validatedSnapshots.set(snapshot, snapshot);
			return snapshot;
		};
		restoreSnapshot = (header, bundle, providerRows, workflowRows) => {
			const scopedEvidence = evidenceBundleForTarget(bundle, header.target.sha256);
			if (scopedEvidence.records.length !== bundle.records.length || scopedEvidence.unknowns.length !== bundle.unknowns.length) throw new TypeError("Analysis snapshot evidence contains records for another target");
			if (!hasCanonicalQueryOrder(providerRows.map(({ entry }) => entry))) throw new TypeError("Analysis snapshot entries are not canonical");
			if (!hasCanonicalQueryOrder(workflowRows.map(({ entry }) => entry))) throw new TypeError("Analysis snapshot workflow entries are not canonical");
			const ids = new Set();
			const corresponding = new Set();
			const matching = new Map();
			for (const evidence of bundle.records) {
				if (evidence.predicate_type !== "rea.analysis" || evidence.authority !== "shipped-artifact" || evidence.subject?.digest.sha256 !== header.target.sha256 || evidence.analysis_profile === null || evidence.confidence !== "observed" && evidence.confidence !== "derived") continue;
				if (evidence.confidence === "observed" && !isCorrespondingEvidence(evidence, header)) continue;
				const query = compositeKey([evidence.confidence, evidenceQueryKey(evidence)]);
				corresponding.add(query);
				matching.set(compositeKey([query, evidenceContentDigest(evidence)]), evidence);
			}
			const find = (query, digest, label, operation) => {
				const evidence = matching.get(compositeKey([query, digest]));
				if (evidence !== undefined) return evidence;
				throw new TypeError(corresponding.has(query) ? `Analysis snapshot ${label} ${operation} differs from its Evidence record` : `Analysis snapshot ${label} ${operation} has no profile-bound Evidence record`);
			};
			const checkId = (entry, workflow) => {
				const expected = analysisQueryId(header.target, header.binding, entry.operation, entry.parameters);
				if (entry.query_id !== expected) throw new TypeError(workflow ? "Analysis snapshot workflow query identifier does not match" : "Analysis snapshot query identifier does not match");
				if (ids.has(entry.query_id)) throw new TypeError("Analysis snapshot contains duplicate queries");
				ids.add(entry.query_id);
			};
			const entries = providerRows.map(({ entry, digest }) => {
				if (entry.execution.provider.id !== header.binding.provider.id || entry.execution.provider.name !== header.binding.provider.name || entry.execution.provider.version !== header.binding.provider.version) throw new TypeError("Analysis snapshot entry provider does not match");
				checkId(entry, false);
				const evidence = find(compositeKey(["observed", entryQueryKey(entry, header.binding)]), digest, "entry", entry.operation);
				return {
					...entry,
					execution: {
						...entry.execution,
						result: evidence.normalized_result,
						raw_result: evidence.raw_result
					}
				};
			});
			const workflow_entries = workflowRows.map(({ entry, digest }) => {
				const provider = entry.execution.analysis_profile.provider;
				if (entry.execution.provider.id !== provider.id || entry.execution.provider.name !== provider.name || entry.execution.provider.version !== provider.version) throw new TypeError("Analysis snapshot workflow entry provider does not match its profile");
				checkId(entry, true);
				const evidence = find(compositeKey(["derived", workflowEntryQueryKey(entry)]), digest, "workflow entry", entry.operation);
				return {
					...entry,
					execution: {
						...entry.execution,
						result: evidence.normalized_result,
						raw_result: evidence.raw_result
					}
				};
			});
			return {
				target: header.target,
				binding: header.binding,
				entries,
				workflow_entries,
				evidence_bundle: bundle
			};
		};
		hasCanonicalQueryOrder = (entries) => {
			let previous;
			for (const { query_id: queryId } of entries) {
				if (previous !== undefined && compareUnicodeCodePoints(previous, queryId) > 0) return false;
				previous = queryId;
			}
			return true;
		};
		isCorrespondingEvidence = (evidence, snapshot) => evidence.predicate_type === "rea.analysis" && evidence.confidence === "observed" && evidence.authority === "shipped-artifact" && evidence.subject?.digest.sha256 === snapshot.target.sha256 && evidence.analysis_profile !== null && analysisProfilesEqual(evidence.analysis_profile, snapshot.binding.analysis_profile);
		evidenceQueryKey = (evidence) => contentDigest({
			operation: evidence.operation,
			parameters: evidence.parameters,
			provider: evidence.provider,
			analysis_profile: evidence.analysis_profile
		});
		entryQueryKey = (entry, binding) => contentDigest({
			operation: entry.operation,
			parameters: entry.parameters,
			provider: entry.execution.provider,
			analysis_profile: binding.analysis_profile
		});
		entryEvidenceKey = (entry, binding) => compositeKey([entryQueryKey(entry, binding), snapshotContentDigest(entry.execution.result, entry.execution.raw_result, entry.execution)]);
		workflowEntryQueryKey = (entry) => contentDigest({
			operation: entry.operation,
			parameters: entry.parameters,
			provider: entry.execution.provider,
			analysis_profile: entry.execution.analysis_profile
		});
		workflowEntryEvidenceKey = (entry) => compositeKey([workflowEntryQueryKey(entry), snapshotContentDigest(entry.execution.result, entry.execution.raw_result, entry.execution)]);
		isWorkflowEvidence = (evidence, snapshot, entry) => evidence.predicate_type === "rea.analysis" && evidence.confidence === "derived" && evidence.authority === "shipped-artifact" && evidence.subject?.digest.sha256 === snapshot.target.sha256 && evidence.analysis_profile !== null && analysisProfilesEqual(evidence.analysis_profile, entry.execution.analysis_profile) && evidence.provider.id === entry.execution.provider.id && evidence.provider.name === entry.execution.provider.name && evidence.provider.version === entry.execution.provider.version;
		evidenceMatchesWorkflowEntry = (evidence, entry, snapshot) => isWorkflowEvidence(evidence, snapshot, entry) && compositeKey([evidenceQueryKey(evidence), evidenceContentDigest(evidence)]) === workflowEntryEvidenceKey(entry);
		evidenceContentMetadata = (evidence) => {
			return {
				limitations: evidence.limitations,
				relationship_coverage: evidence.relationship_coverage,
				locations: evidence.locations,
				subject: evidence.subject === null ? null : {
					local_path: evidence.subject.local_path,
					sha256: evidence.subject.digest.sha256,
					format: evidence.subject.format,
					architecture: evidence.subject.architecture
				}
			};
		};
		serializeAnalysisSnapshot = (snapshot) => `${canonicalJson(parseAnalysisSnapshot(snapshot))}\n`;
	})))();
}

//#endregion
//#region dist/application/OwnedJsonInput.js
var finish, sealOwnedJsonInput;
function init_OwnedJsonInput() {
	return (init_OwnedJsonInput = __esmMin((() => {
		init_analysisErrorCore();
		init_immutableJson();
		init_jsonValue();
		init_result();
		finish = async (steps, signal) => {
			let completed = false;
			try {
				for (;;) {
					signal?.throwIfAborted();
					const step = steps.next();
					if (step.done) {
						completed = true;
						return step.value;
					}
					await setImmediate(undefined, signal === undefined ? {} : { signal });
				}
			} finally {
				if (!completed) steps.return(undefined);
			}
		};
		sealOwnedJsonInput = async (value, operation, signal) => {
			const issue = await finish(jsonValueValidationSteps(value), signal);
			if (issue !== undefined) return err(new AnalysisInputError(operation, { userMessage: issue }, [{
				path: [],
				reason: "invalid_value",
				expected: "bounded JSON-safe input",
				message: issue
			}]));
			return ok(await finish(freezeOwnedJsonSnapshotSteps(value), signal));
		};
	})))();
}

//#endregion
//#region dist/application/Utf8JsonInput.js
var JSON_INPUT_RESOURCE_REMEDIATION, JSON_BYTE_ORDER_MARK_MESSAGE, parseUtf8Json;
function init_Utf8JsonInput() {
	return (init_Utf8JsonInput = __esmMin((() => {
		init_analysisErrorCore();
		init_safeJson();
		JSON_INPUT_RESOURCE_REMEDIATION = "Provide a smaller valid JSON value. For Evidence workflows, re-analyze a smaller selection of the original target and use its complete Evidence; splitting JSON text or trimming Evidence fields does not produce valid workflow input.";
		JSON_BYTE_ORDER_MARK_MESSAGE = "JSON input begins with a UTF-8 byte-order mark (EF BB BF), which strict JSON input does not accept. Save the file as UTF-8 without a byte-order mark.";
		parseUtf8Json = (bytes, operation, path, boundary = "json-input") => {
			const stringLimitFailure = (cause, decodedUnits) => new AnalysisResourceConstraintError(operation, "memory", "JSON input exceeds the runtime's maximum decoded string length", {
				boundary,
				input_path: path,
				input_bytes: bytes.byteLength,
				max_string_code_units: constants.MAX_STRING_LENGTH,
				...decodedUnits === undefined ? {} : { decoded_string_code_units_at_least: decodedUnits }
			}, {
				...cause === undefined ? {} : { cause },
				remediationAction: JSON_INPUT_RESOURCE_REMEDIATION
			});
			let text;
			try {
				const decoder = new TextDecoder("utf-8", {
					fatal: true,
					ignoreBOM: true
				});
				if (bytes.byteLength <= constants.MAX_STRING_LENGTH) {
					text = decoder.decode(bytes);
				} else {
					const parts = [];
					let decodedUnits = 0;
					const append = (part) => {
						decodedUnits += part.length;
						if (decodedUnits > constants.MAX_STRING_LENGTH) throw stringLimitFailure(undefined, decodedUnits);
						parts.push(part);
					};
					const chunkBytes = 1024 * 1024;
					for (let offset = 0; offset < bytes.byteLength; offset += chunkBytes) append(decoder.decode(bytes.subarray(offset, offset + chunkBytes), { stream: true }));
					append(decoder.decode());
					text = parts.join("");
				}
			} catch (cause) {
				if (cause instanceof AnalysisResourceConstraintError) throw cause;
				const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
				if (code === "ERR_STRING_TOO_LONG") throw stringLimitFailure(cause);
				if (code !== "ERR_ENCODING_INVALID_ENCODED_DATA") throw cause;
				return {
					ok: false,
					error: "JSON input is not valid UTF-8",
					cause
				};
			}
			if (text.startsWith("﻿")) return {
				ok: false,
				error: JSON_BYTE_ORDER_MARK_MESSAGE,
				cause: undefined
			};
			return safeParseJson(text);
		};
	})))();
}

//#endregion
//#region dist/application/JsonInputFile.js
async function* decodedChunks(handle, admittedBytes, path, signal, observe, physicalRead = {}) {
	const decoder = new TextDecoder("utf-8", {
		fatal: true,
		ignoreBOM: true
	});
	let leading = true;
	const checked = (text) => {
		if (leading && text.length > 0) {
			leading = false;
			if (text.startsWith("﻿")) throw new JsonByteOrderMarkError();
		}
		return text;
	};
	const bytes = Buffer.allocUnsafe(READ_CHUNK_BYTES);
	let observedBytes = 0;
	while (true) {
		assertRegularFileActive(signal);
		const read = await readPhysicalJsonInput(physicalRead, () => handle.read(bytes, 0, Math.min(bytes.length, admittedBytes - observedBytes + 1), observedBytes));
		assertRegularFileActive(signal);
		if (read.bytesRead === 0) break;
		observedBytes += read.bytesRead;
		if (observedBytes > admittedBytes) throw new RegularFileChangedError(path);
		const chunk = bytes.subarray(0, read.bytesRead);
		observe?.(chunk);
		yield checked(decoder.decode(chunk, { stream: true }));
	}
	if (observedBytes !== admittedBytes) throw new RegularFileChangedError(path);
	yield checked(decoder.decode());
}
var READ_CHUNK_BYTES, PACKED_TOKEN_PART_CODE_UNITS, NATIVE_PARSE_READ_BUDGET, JsonInputPhysicalReadFailure, JsonInputCancellationFailure, readPhysicalJsonInput, withJsonInputFile, withJsonInputPipeline, nativeJsonParseRequiredBytes, nativeParseFits, readJsonObjectFile, memberConsumer, readJsonInputFile, jsonReadFailure, packJsonScalars, admitJsonAssembly, requireStringAssemblyHeadroom, JsonByteOrderMarkError, readPrefix, readNativeJson, invalidJson;
function init_JsonInputFile() {
	return (init_JsonInputFile = __esmMin((() => {
		init_RegularFile();
		init_OwnedJsonInput();
		init_RegularFileRead();
		init_Utf8JsonInput();
		init_analysisErrorCore();
		init_result();
		READ_CHUNK_BYTES = 64 * 1024;
		PACKED_TOKEN_PART_CODE_UNITS = 64 * 1024;
		NATIVE_PARSE_READ_BUDGET = 8 * 1024 * 1024;
		JsonInputPhysicalReadFailure = class extends Error {
			_tag = "JsonInputPhysicalReadFailure";
			physicalCause;
			constructor(physicalCause) {
				super("JSON input descriptor read failed");
				this.physicalCause = physicalCause;
			}
		};
		JsonInputCancellationFailure = class extends Error {
			reason;
			_tag = "JsonInputCancellationFailure";
			constructor(reason) {
				super(reason instanceof Error ? reason.message : "JSON input read cancelled");
				this.reason = reason;
			}
		};
		readPhysicalJsonInput = async (observation, read) => {
			try {
				return await read();
			} catch (physicalCause) {
				const failure = new JsonInputPhysicalReadFailure(physicalCause);
				observation.failure = failure;
				throw failure;
			}
		};
		withJsonInputFile = (path, read, options) => withRegularFile(path, read, {
			...options,
			cancellationFailure: (reason) => new JsonInputCancellationFailure(reason)
		}).catch((cause) => {
			if (cause instanceof RegularFileReadFailure) throw cause.operationCause;
			throw cause;
		});
		withJsonInputPipeline = async (signal, run) => {
			if (signal === undefined) return run();
			const controller = new AbortController();
			const cancel = () => {
				controller.abort(new JsonInputCancellationFailure(signal.reason));
			};
			if (signal.aborted) cancel();
			else signal.addEventListener("abort", cancel, { once: true });
			try {
				return await run(controller.signal);
			} finally {
				signal.removeEventListener("abort", cancel);
			}
		};
		nativeJsonParseRequiredBytes = (inputBytes, snapshot = false) => (inputBytes * 72 + READ_CHUNK_BYTES) * (snapshot ? 2 : 1);
		nativeParseFits = (inputBytes, snapshot = false) => inputBytes <= NATIVE_PARSE_READ_BUDGET && nativeJsonParseRequiredBytes(inputBytes, snapshot) <= getHeapStatistics().total_available_size;
		readJsonObjectFile = (path, operation, scans, signal, resources) => withJsonInputFile(path, async (handle, stats) => {
			let previousDigest;
			const physicalRead = {};
			try {
				const native = await readNativeJson(handle, stats.size, path, operation, signal, false, physicalRead);
				if (native !== undefined) {
					if (!native.ok) return native;
					const value = native.value;
					if (typeof value !== "object" || value === null || Array.isArray(value)) return err(invalidJson(operation, "JSON document root must be an object"));
					for (const members of scans) for (const [key, member] of members) {
						if (!Object.hasOwn(value, key)) continue;
						assertRegularFileActive(signal);
						member.begin();
						const selected = Reflect.get(value, key);
						if (member.mode === "array" && !Array.isArray(selected)) {
							member.reject(new TypeError(`JSON member ${key} must be an array`));
							continue;
						}
						for (const item of member.mode === "array" && Array.isArray(selected) ? selected : [selected]) {
							assertRegularFileActive(signal);
							try {
								await member.accept(item);
							} catch (cause) {
								member.reject(cause);
							}
						}
					}
					return ok(undefined);
				}
				for (const members of scans) {
					const hash = createHash("sha256");
					let rootObject = false;
					let depth = 0;
					let key;
					let consume;
					await withJsonInputPipeline(signal, (pipelineSignal) => pipeline(decodedChunks(handle, stats.size, path, signal, (bytes) => {
						hash.update(bytes);
					}, physicalRead), asStream(fun(parser({
						jsonStreaming: false,
						streamValues: false,
						packKeys: false,
						packStrings: false,
						packNumbers: false
					}), packJsonScalars(operation, stats.size, path), (token) => {
						const opens = token.name === "startObject" || token.name === "startArray";
						const closes = token.name === "endObject" || token.name === "endArray";
						if (depth === 0) {
							rootObject = token.name === "startObject";
						} else if (rootObject && depth === 1 && token.name === "keyValue") {
							key = token.value;
						} else if (rootObject && depth === 1 && !closes) {
							const member = key === undefined ? undefined : members.get(key);
							consume = undefined;
							if (member !== undefined) {
								member.begin();
								if (member.mode === "array" && token.name !== "startArray") {
									member.reject(new TypeError(`JSON member ${key} must be an array`));
								} else {
									consume = memberConsumer(member, operation, stats.size, path);
								}
							}
							key = undefined;
						}
						const selected = consume;
						if (opens) depth += 1;
						if (closes) depth -= 1;
						if (rootObject && depth === 1 && token.name !== "keyValue") consume = undefined;
						if (selected === undefined) return none;
						return selected(token);
					})), pipelineSignal === undefined ? {} : { signal: pipelineSignal }));
					if (!rootObject) return err(invalidJson(operation, "JSON document root must be an object"));
					const digest = hash.digest("hex");
					if (previousDigest !== undefined && digest !== previousDigest) throw new RegularFileChangedError(path);
					previousDigest = digest;
				}
				return ok(undefined);
			} catch (cause) {
				if (physicalRead.failure !== undefined) throw physicalRead.failure;
				const failure = jsonReadFailure(cause, operation, stats.size, path);
				if (failure !== undefined) return err(failure);
				throw cause;
			}
		}, {
			signal,
			...resources === undefined ? {} : { resources }
		});
		memberConsumer = (member, operation, size, path) => {
			let admit = admitJsonAssembly(operation, size, path);
			const streamer = member.mode === "array" ? streamArray() : streamValues();
			const consume = fun((token) => admit(token), streamer, (row) => {
				if (typeof row !== "object" || row === null || !("value" in row)) throw new Error("Unexpected JSON member parser result");
				admit = admitJsonAssembly(operation, size, path);
				try {
					const accepted = member.accept(row.value);
					if (accepted instanceof Promise) return accepted.then(() => none, (cause) => {
						member.reject(cause);
						return none;
					});
				} catch (cause) {
					member.reject(cause);
				}
				return none;
			});
			return (token) => {
				const consumed = consume(token);
				return consumed instanceof Promise ? consumed.then(() => none) : none;
			};
		};
		readJsonInputFile = (path, operation, signal, resources, snapshot = false) => withJsonInputFile(path, async (handle, stats) => {
			let found = false;
			let value;
			const physicalRead = {};
			try {
				const native = await readNativeJson(handle, stats.size, path, operation, signal, snapshot, physicalRead);
				if (native !== undefined) return native.ok && snapshot ? await sealOwnedJsonInput(native.value, operation, signal) : native;
				await withJsonInputPipeline(signal, (pipelineSignal) => pipeline(decodedChunks(handle, stats.size, path, signal, undefined, physicalRead), asStream(fun(parser({
					jsonStreaming: false,
					streamValues: false,
					packKeys: false,
					packStrings: false,
					packNumbers: false
				}), packJsonScalars(operation, stats.size, path), admitJsonAssembly(operation, stats.size, path, snapshot ? 2 : 1), streamValues(), (row) => {
					if (found || typeof row !== "object" || row === null || !("key" in row) || row.key !== 0 || !("value" in row)) throw new Error("Unexpected JSON parser result");
					found = true;
					value = row.value;
					return none;
				})), pipelineSignal === undefined ? {} : { signal: pipelineSignal }));
				return found ? snapshot ? await sealOwnedJsonInput(value, operation, signal) : ok(value) : err(invalidJson(operation, "JSON document is empty"));
			} catch (cause) {
				if (physicalRead.failure !== undefined) throw physicalRead.failure;
				const failure = jsonReadFailure(cause, operation, stats.size, path);
				if (failure !== undefined) return err(failure);
				throw cause;
			}
		}, {
			signal,
			...resources === undefined ? {} : { resources }
		});
		jsonReadFailure = (cause, operation, size, path) => {
			if (cause instanceof AnalysisResourceConstraintError) return cause;
			if (cause instanceof TypeError && "code" in cause && cause.code === "ERR_ENCODING_INVALID_ENCODED_DATA") return invalidJson(operation, "JSON input is not valid UTF-8", cause);
			if (cause instanceof SyntaxError || cause instanceof Error && cause.message.startsWith("Parser ")) return invalidJson(operation, cause.message, cause);
			if (cause instanceof Error && (cause instanceof RangeError && cause.message === "Invalid string length" || "code" in cause && cause.code === "ERR_STRING_TOO_LONG")) return new AnalysisResourceConstraintError(operation, "memory", "An individual JSON string or number token exceeds the runtime string limit", {
				input_path: path,
				input_file_bytes: size,
				max_string_code_units: constants.MAX_STRING_LENGTH
			}, {
				cause,
				remediationAction: JSON_INPUT_RESOURCE_REMEDIATION
			});
			return undefined;
		};
		packJsonScalars = (operation, inputFileBytes, path) => {
			let kind;
			let length = 0;
			let value = "";
			let parts = [];
			let partLength = 0;
			return (token) => {
				if (typeof token !== "object" || token === null || !("name" in token)) throw new Error("Unexpected JSON parser token");
				switch (token.name) {
					case "startKey":
					case "startString":
						kind = token.name === "startKey" ? "keyValue" : "stringValue";
						break;
					case "startNumber":
						kind = "numberValue";
						break;
					case "numberChunk":
					case "stringChunk":
						if (kind === undefined || !("value" in token) || typeof token.value !== "string") throw new Error("Unexpected JSON scalar fragment");
						length += token.value.length;
						if (length > constants.MAX_STRING_LENGTH) throw new RangeError("Invalid string length");
						parts.push(token.value);
						partLength += token.value.length;
						if (partLength >= PACKED_TOKEN_PART_CODE_UNITS) {
							requireStringAssemblyHeadroom(operation, inputFileBytes, path, length);
							value += parts.join("");
							parts = [];
							partLength = 0;
						}
						break;
					case "endKey":
					case "endString":
					case "endNumber": {
						if (kind === undefined) throw new Error("Unexpected JSON scalar end");
						requireStringAssemblyHeadroom(operation, inputFileBytes, path, length);
						const packed = {
							name: kind,
							value: value + parts.join("")
						};
						kind = undefined;
						length = 0;
						value = "";
						parts = [];
						partLength = 0;
						return packed;
					}
					default: return token;
				}
				return none;
			};
		};
		admitJsonAssembly = (operation, inputFileBytes, path, retainedMultiplier = 1) => {
			let projectedBytes = 0;
			let nextCheck = 0;
			return (token) => {
				if (typeof token !== "object" || token === null || !("name" in token)) throw new Error("Unexpected JSON assembly token");
				if (token.name === "startObject" || token.name === "startArray") {
					projectedBytes += 128;
				} else if (token.name === "keyValue" || token.name === "stringValue") {
					if (!("value" in token) || typeof token.value !== "string") throw new Error("Unexpected packed JSON string");
					projectedBytes += 64 + token.value.length * 2;
				} else if (token.name === "numberValue" || token.name === "nullValue" || token.name === "trueValue" || token.name === "falseValue") {
					projectedBytes += 64;
				}
				if (projectedBytes >= nextCheck) {
					const heap = getHeapStatistics();
					const requiredBytes = projectedBytes * retainedMultiplier + READ_CHUNK_BYTES;
					if (requiredBytes > heap.total_available_size) throw new AnalysisResourceConstraintError(operation, "memory", "Insufficient heap headroom to materialize the complete JSON value", {
						input_path: path,
						input_file_bytes: inputFileBytes,
						projected_value_bytes: projectedBytes,
						assembly_headroom_bytes: requiredBytes,
						available_heap_bytes: heap.total_available_size,
						heap_size_limit_bytes: heap.heap_size_limit
					}, { remediationAction: JSON_INPUT_RESOURCE_REMEDIATION });
					nextCheck = projectedBytes + READ_CHUNK_BYTES;
				}
				return token;
			};
		};
		requireStringAssemblyHeadroom = (operation, inputFileBytes, path, stringCodeUnits) => {
			if (stringCodeUnits < PACKED_TOKEN_PART_CODE_UNITS) return;
			const heap = getHeapStatistics();
			const requiredBytes = 2 * (stringCodeUnits + PACKED_TOKEN_PART_CODE_UNITS);
			if (requiredBytes > heap.total_available_size) throw new AnalysisResourceConstraintError(operation, "memory", "Insufficient heap headroom to assemble a complete JSON string", {
				input_path: path,
				input_file_bytes: inputFileBytes,
				string_code_units: stringCodeUnits,
				string_assembly_headroom_bytes: requiredBytes,
				available_heap_bytes: heap.total_available_size,
				heap_size_limit_bytes: heap.heap_size_limit
			}, { remediationAction: JSON_INPUT_RESOURCE_REMEDIATION });
		};
		JsonByteOrderMarkError = class extends SyntaxError {
			constructor() {
				super(JSON_BYTE_ORDER_MARK_MESSAGE);
			}
		};
		readPrefix = async (handle, size, signal, physicalRead) => {
			const bytes = Buffer.allocUnsafe(size);
			let offset = 0;
			while (offset < bytes.length) {
				assertRegularFileActive(signal);
				const read = await readPhysicalJsonInput(physicalRead, () => handle.read(bytes, offset, bytes.length - offset, null));
				assertRegularFileActive(signal);
				if (read.bytesRead === 0) return {
					bytes: bytes.subarray(0, offset),
					complete: true
				};
				offset += read.bytesRead;
			}
			return {
				bytes,
				complete: false
			};
		};
		readNativeJson = async (handle, size, path, operation, signal, snapshot = false, physicalRead = {}) => {
			if (!nativeParseFits(size, snapshot)) return undefined;
			const prefix = await readPrefix(handle, size + 1, signal, physicalRead);
			if (!prefix.complete || prefix.bytes.length !== size) throw new RegularFileChangedError(path);
			const parsed = parseUtf8Json(prefix.bytes, operation, path, "json-file-input");
			return parsed.ok ? ok(parsed.value) : err(invalidJson(operation, parsed.error, parsed.cause));
		};
		invalidJson = (operation, message, cause) => new AnalysisInputError(operation, cause === undefined ? undefined : { cause }, [{
			path: [],
			reason: "invalid_format",
			expected: "JSON",
			message
		}]);
	})))();
}

//#endregion
//#region dist/filesystem/OwnedStagedOutput.js
var identityOf, sameIdentity, OwnedStagedOutput, errorCode;
function init_OwnedStagedOutput() {
	return (init_OwnedStagedOutput = __esmMin((() => {
		init_OwnedFileHandle();
		identityOf = (stats) => ({
			dev: stats.dev,
			ino: stats.ino
		});
		sameIdentity = (stats, identity) => stats.dev === identity.dev && stats.ino === identity.ino;
		OwnedStagedOutput = class OwnedStagedOutput {
			directory;
			directoryIdentity;
			#file;
			#fileIdentity;
			#fileClosed = false;
			#fileRemovedByOwner = false;
			#publishedRename = false;
			#closeAttempt;
			#closed = false;
			#identityFailure;
			constructor(directory, directoryIdentity) {
				this.directory = directory;
				this.directoryIdentity = directoryIdentity;
			}
			static async create(directory) {
				try {
					const stats = await lstat(directory);
					if (!stats.isDirectory() || stats.isSymbolicLink()) return new OwnedStagedOutput(directory, undefined);
					return new OwnedStagedOutput(directory, identityOf(stats));
				} catch (cause) {
					const owner = new OwnedStagedOutput(directory, undefined);
					owner.#identityFailure = cause;
					return owner;
				}
			}
			setFile(file) {
				if (this.#file !== undefined) throw new Error("Staged output already owns a file handle");
				this.#file = file;
			}
			/** Verify the staged name against its descriptor after the last write. */
			async assertReadyForPublication(content) {
				await this.#verifiedDirectory();
				if (this.#file !== undefined && !this.#fileClosed) await this.#observeFileIdentity();
				if (this.#fileIdentity === undefined) throw new Error("Cannot verify staged file identity", { cause: this.#identityFailure });
				const stagedFile = await lstat(content);
				if (!stagedFile.isFile() || stagedFile.isSymbolicLink() || !sameIdentity(stagedFile, this.#fileIdentity)) throw new Error(`Staged file identity changed: ${content}`);
			}
			/** Observe the descriptor's identity after its last write, then close it. */
			async closeFile() {
				const file = this.#file;
				if (file === undefined || this.#fileClosed) return;
				await this.#observeFileIdentity();
				await file.close();
				this.#fileClosed = true;
			}
			async #observeFileIdentity() {
				const file = this.#file;
				if (file === undefined) return;
				try {
					this.#fileIdentity = identityOf(await file.handle.stat());
				} catch (cause) {
					this.#fileIdentity = undefined;
					this.#identityFailure = cause;
				}
			}
			/** Record that the staged file moved to the published destination by rename. */
			recordPublishedRename() {
				this.#publishedRename = true;
			}
			/** Close the owned descriptor and remove only the exact staged entries. */
			close() {
				if (this.#closed) return Promise.resolve();
				if (this.#closeAttempt !== undefined) return this.#closeAttempt;
				const attempt = Promise.resolve().then(() => this.#cleanup());
				this.#closeAttempt = attempt;
				void attempt.then(() => {
					this.#closed = true;
					this.#closeAttempt = undefined;
				}, () => {
					this.#closeAttempt = undefined;
				});
				return attempt;
			}
			async #cleanup() {
				await this.closeFile();
				await this.#verifiedDirectory();
				const content = `${this.directory}/content`;
				let stagedFile;
				try {
					stagedFile = await lstat(content);
				} catch (cause) {
					if (errorCode(cause) === "ENOENT" && (this.#file === undefined || this.#fileRemovedByOwner || this.#publishedRename)) {
						stagedFile = undefined;
					} else if (errorCode(cause) === "ENOENT") {
						throw new Error(`Owned staged file disappeared: ${content}`, { cause });
					} else {
						throw cause;
					}
				}
				if (stagedFile !== undefined) {
					if (!stagedFile.isFile() || stagedFile.isSymbolicLink() || this.#fileIdentity === undefined || !sameIdentity(stagedFile, this.#fileIdentity)) throw new Error(`Staged file identity changed: ${content}`);
					await unlink(content);
					this.#fileRemovedByOwner = true;
				}
				const remaining = await readdir(this.directory);
				if (remaining.length > 0) throw new Error(`Unexpected staging entries remain in ${this.directory}: ${remaining.join(", ")}`);
				await this.#verifiedDirectory();
				await rmdir(this.directory);
			}
			async #verifiedDirectory() {
				if (this.directoryIdentity === undefined) throw new Error(`Cannot verify staging directory ownership: ${this.directory}`, { cause: this.#identityFailure });
				const directory = await lstat(this.directory);
				if (!directory.isDirectory() || directory.isSymbolicLink() || !sameIdentity(directory, this.directoryIdentity)) throw new Error(`Staging directory identity changed: ${this.directory}`);
			}
		};
		errorCode = (cause) => typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
	})))();
}

//#endregion
//#region dist/application/JsonFiles.js
function writeTextParts(parts, path, overwrite, resources, cancellation) {
	return resources.run(() => writeTextPartsOwned(parts, path, overwrite, resources, cancellation)).catch((cause) => {
		const cleanup = cause instanceof ArtifactReaderFailure && cause.cleanup !== undefined ? cause.cleanup : undefined;
		const error = new EvidenceFileError("write", "io", {
			cause,
			path: absoluteCallerPath(path),
			...cleanup === undefined ? {} : { cleanup }
		});
		bindArtifactFileCleanup(cause, error);
		return err(error);
	});
}
var readJsonFile, readJsonFileWithSource, readJsonObjectMembersFile, readJsonFileInput, isJsonReadCancellation, writeTextFile, writeTextPartsOwned, stagedCleanupFailure, missingOrIo, publishFile, StagedOutputCleanupFailure, failureMessage, writeStagedParts, assertWriteActive, fileErrorCode;
function init_JsonFiles() {
	return (init_JsonFiles = __esmMin((() => {
		init_evidenceErrors();
		init_analysisErrorCore();
		init_result();
		init_JsonInputFile();
		init_RegularFile();
		init_RegularFileRead();
		init_ArtifactReader();
		init_ArtifactFileOperation();
		init_AnalysisCleanupLease();
		init_OwnedFileHandle();
		init_OwnedStagedOutput();
		init_callerPath();
		readJsonFile = async (path, signal, resources, operation = "read_evidence_file") => {
			const read = await readJsonFileWithSource(path, signal, resources, operation);
			return read.ok ? ok(read.value.data) : read;
		};
		readJsonFileWithSource = (path, signal, resources, operation = "read_evidence_file") => readJsonFileInput(path, async (selected) => {
			const read = await readJsonInputFile(selected, operation, signal, resources);
			return read.ok ? ok({
				data: read.value,
				path: selected
			}) : read;
		}, signal, operation);
		readJsonObjectMembersFile = (path, scans, signal, resources) => readJsonFileInput(path, (selected) => readJsonObjectFile(selected, "read_evidence_file", scans, signal, resources), signal);
		readJsonFileInput = async (path, read, signal, operation = "read_evidence_file") => {
			const requestedPath = absoluteCallerPath(path);
			try {
				const decoded = await read(requestedPath);
				if (!decoded.ok) {
					if (decoded.error instanceof AnalysisResourceConstraintError) return err(decoded.error);
					return err(new EvidenceFileError("read", "invalid-json", {
						cause: decoded.error.cause ?? new SyntaxError(decoded.error.issues[0]?.message ?? decoded.error.message),
						path: requestedPath
					}));
				}
				return ok(decoded.value);
			} catch (cause) {
				if (cause instanceof RegularFileCleanupFailure) throw cause;
				if (cause instanceof AnalysisResourceConstraintError) return err(cause);
				if (cause instanceof JsonInputCancellationFailure) return err(new AnalysisCancelledError(operation, { cause: cause.reason }));
				if (cause instanceof JsonInputPhysicalReadFailure) return err(new EvidenceFileError("read", "io", {
					cause: cause.physicalCause,
					path: requestedPath
				}));
				if (isJsonReadCancellation(cause, signal)) return err(new AnalysisCancelledError(operation, { cause: signal?.reason }));
				return err(new EvidenceFileError("read", cause instanceof NonRegularFileReadError ? "not-file" : missingOrIo(cause), {
					cause,
					path: requestedPath
				}));
			}
		};
		isJsonReadCancellation = (cause, signal) => {
			if (signal?.aborted !== true) return false;
			if (cause === signal.reason) return true;
			return cause instanceof Error && cause.name === "AbortError" && "code" in cause && cause.code === "ABORT_ERR" && cause.cause === signal.reason;
		};
		writeTextFile = async (encoded, path, overwrite, resources) => writeTextParts([encoded], path, overwrite, resources);
		writeTextPartsOwned = async (parts, path, overwrite, resources, cancellation) => {
			const requestedPath = absoluteCallerPath(path);
			try {
				assertWriteActive(cancellation);
				if (process.platform !== "win32" && requestedPath.endsWith("/")) return err(new EvidenceFileError("write", "not-file", { path: requestedPath }));
				const canonicalParent = await realpath(dirname(requestedPath));
				const destination = resolve(canonicalParent, basename(requestedPath));
				const existing = await lstat(destination).catch((cause) => {
					if (fileErrorCode(cause) === "ENOENT") return undefined;
					throw cause;
				});
				if (existing !== undefined) {
					if (!overwrite) return err(new EvidenceFileError("write", "exists", { path: requestedPath }));
					if (!existing.isFile() || existing.isSymbolicLink()) return err(new EvidenceFileError("write", "not-file", { path: requestedPath }));
				}
				assertWriteActive(cancellation);
				const bytes = await publishFile(destination, parts, overwrite, resources, cancellation);
				return ok({
					path: requestedPath,
					bytes
				});
			} catch (cause) {
				if (cause instanceof StagedOutputCleanupFailure) {
					const cleanup = {
						reason: failureMessage(cause.cleanupCause),
						resources: [cause.owner.directory]
					};
					if (cause.outcome.ok) return stagedCleanupFailure(new EvidenceFileError("write", "io", {
						cause,
						path: requestedPath,
						cleanup,
						published: {
							...cause.outcome.value,
							path: requestedPath
						}
					}), cause.lease);
					if (cause.outcome.error instanceof AnalysisCancelledError) return stagedCleanupFailure(new AnalysisCancelledError(cause.outcome.error.operation, {
						cause: cause.outcome.error.cause,
						cleanupPrimary: cause.outcome.error,
						cleanup
					}), cause.lease);
					return stagedCleanupFailure(new EvidenceFileError("write", missingOrIo(cause.outcome.error), {
						cause,
						path: requestedPath,
						cleanup
					}), cause.lease);
				}
				if (cancellation?.signal.aborted === true && cause instanceof AnalysisCancelledError && cause.operation === cancellation.operation) return err(cause);
				if (!overwrite && fileErrorCode(cause) === "EEXIST") return err(new EvidenceFileError("write", "exists", {
					cause,
					path: requestedPath
				}));
				return err(new EvidenceFileError("write", missingOrIo(cause), {
					cause,
					path: requestedPath
				}));
			}
		};
		stagedCleanupFailure = (error, lease) => {
			new AnalysisCleanupLeaseGroup(error, [lease]);
			return err(error);
		};
		missingOrIo = (cause) => {
			const code = fileErrorCode(cause);
			return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "io";
		};
		publishFile = async (destination, parts, overwrite, resources, cancellation) => {
			const stagingDirectory = await mkdtemp(resolve(dirname(destination), ".rea-write-"));
			const owner = await OwnedStagedOutput.create(stagingDirectory);
			let outcome;
			const staged = resolve(stagingDirectory, "content");
			try {
				const file = await open(staged, "wx", 384);
				owner.setFile(new OwnedFileHandle(file));
				let written;
				try {
					const bytes = await writeStagedParts(file, parts, cancellation);
					assertWriteActive(cancellation);
					await file.sync();
					written = ok(bytes);
				} catch (cause) {
					written = err(cause);
				}
				try {
					await owner.closeFile();
				} catch (cause) {
					if (written.ok) written = err(cause);
				}
				if (!written.ok) throw written.error;
				assertWriteActive(cancellation);
				await owner.assertReadyForPublication(staged);
				assertWriteActive(cancellation);
				if (overwrite) {
					await rename(staged, destination);
					owner.recordPublishedRename();
				} else await link(staged, destination);
				outcome = ok({
					path: destination,
					bytes: written.value
				});
			} catch (cause) {
				outcome = err(cause);
			}
			const released = await resources.release({
				kind: "staged-output",
				resource: owner.directory,
				output: owner
			});
			if (released.kind === "failed") throw new StagedOutputCleanupFailure(outcome, released.cause, owner, released.lease);
			if (!outcome.ok) throw outcome.error;
			return outcome.value.bytes;
		};
		StagedOutputCleanupFailure = class extends Error {
			outcome;
			cleanupCause;
			owner;
			lease;
			constructor(outcome, cleanupCause, owner, lease) {
				super("Staged output cleanup failed", { cause: outcome.ok ? cleanupCause : outcome.error });
				this.outcome = outcome;
				this.cleanupCause = cleanupCause;
				this.owner = owner;
				this.lease = lease;
			}
		};
		failureMessage = (cause) => cause instanceof Error ? cause.message || cause.name : String(cause);
		writeStagedParts = async (file, parts, cancellation) => {
			assertWriteActive(cancellation);
			const iterator = parts[Symbol.iterator]();
			let exhausted = false;
			let bytes = 0;
			try {
				for (;;) {
					assertWriteActive(cancellation);
					const part = iterator.next();
					if (part.done) exhausted = true;
					assertWriteActive(cancellation);
					if (part.done) return bytes;
					await file.writeFile(part.value, { encoding: "utf8" });
					bytes += Buffer.byteLength(part.value, "utf8");
				}
			} finally {
				if (!exhausted) iterator.return?.();
			}
		};
		assertWriteActive = (cancellation) => {
			if (cancellation?.signal.aborted === true) throw new AnalysisCancelledError(cancellation.operation, { cause: cancellation.signal.reason });
		};
		fileErrorCode = (cause) => typeof cause === "object" && cause !== null && "code" in cause ? cause.code : undefined;
	})))();
}

//#endregion
//#region dist/application/binary/AnalysisSnapshotFiles.js
var readAnalysisSnapshot, snapshotEntryReader, writeAnalysisSnapshot, snapshotValidationMessage;
function init_AnalysisSnapshotFiles() {
	return (init_AnalysisSnapshotFiles = __esmMin((() => {
		init_analysisSnapshot();
		init_evidenceErrors();
		init_result();
		init_analysisErrorCore();
		init_JsonFiles();
		init_RegularFileRead();
		readAnalysisSnapshot = async (path, signal, resources) => {
			const entries = snapshotEntryReader("provider");
			const workflows = snapshotEntryReader("workflow");
			const header = {};
			const metadata = new Map([
				"target",
				"binding",
				"evidence_bundle"
			].map((name) => [name, {
				mode: "value",
				begin: () => {
					delete header[name];
				},
				accept: (value) => {
					header[name] = value;
				},
				reject: (cause) => {
					throw cause;
				}
			}]));
			try {
				const loaded = await readJsonObjectMembersFile(path, [new Map([["entries", entries.reader], ["workflow_entries", workflows.reader]]), metadata], signal, resources);
				if (!loaded.ok) return loaded;
				signal?.throwIfAborted();
				const snapshot = parsePreparedAnalysisSnapshot(header, entries.finish(), workflows.finish());
				await setImmediate();
				signal?.throwIfAborted();
				return ok(snapshot);
			} catch (cause) {
				if (cause instanceof RegularFileCleanupFailure) throw cause;
				if (signal?.aborted === true) return err(new AnalysisCancelledError("read_evidence_file", { cause }));
				return err(new EvidenceIntegrityError(snapshotValidationMessage(cause), { cause }));
			}
		};
		snapshotEntryReader = (kind) => {
			let seen = false;
			let entries = [];
			let failure;
			const reader = {
				mode: "array",
				begin: () => {
					seen = true;
					entries = [];
					failure = undefined;
				},
				accept: (value) => {
					if (failure === undefined) entries.push(prepareSnapshotEntry(value, kind));
				},
				reject: (cause) => {
					failure ??= { cause };
				}
			};
			return {
				reader,
				finish: () => {
					if (!seen) throw new TypeError(`Analysis snapshot ${kind === "provider" ? "entries" : "workflow_entries"} is missing`);
					if (failure !== undefined) throw failure.cause;
					return entries;
				}
			};
		};
		writeAnalysisSnapshot = async (snapshot, path, overwrite, resources) => {
			let encoded;
			try {
				encoded = serializeAnalysisSnapshot(snapshot);
			} catch (cause) {
				return err(new EvidenceIntegrityError(snapshotValidationMessage(cause), { cause }));
			}
			return writeTextFile(encoded, path, overwrite, resources);
		};
		snapshotValidationMessage = (cause) => cause instanceof TypeError ? cause.message : "Analysis snapshot validation failed";
	})))();
}

//#endregion
export { snapshotMatchesProfile as _, readJsonFile as a, analysisQueryId as c, immutableAnalysisSnapshot as d, init_analysisSnapshot as f, snapshotMatchesBinding as g, snapshotEvidenceForQuery as h, init_JsonFiles as i, createAnalysisSnapshotEntry as l, snapshotBinding as m, readAnalysisSnapshot as n, readJsonFileWithSource as o, parseAnalysisSnapshot as p, writeAnalysisSnapshot as r, writeTextParts as s, init_AnalysisSnapshotFiles as t, createAnalysisSnapshotWorkflowEntry as u, snapshotMatchesTarget as v, snapshotTarget as y };