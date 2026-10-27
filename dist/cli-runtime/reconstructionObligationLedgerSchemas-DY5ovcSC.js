import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { AnalysisInputError, AnalysisOutputError, ConfigurationError, artifactIntegrityClaimSchema, artifactIntegrityPairOf, artifactMd5PairSchema, artifactSha256PairSchema, canBorrowParsedJsonSnapshot, equalJsonText, fixedAllowanceRemediation, freezeJsonSnapshot, freezeOwnedJsonTreeSnapshot, immutableJsonSnapshotMember, init_analysisErrorCore, init_artifactIntegrity, init_configurationErrors, init_fixedAllowanceRemediation, init_immutableJson, init_jsonSerialization, init_jsonValue, isImmutableJsonSnapshot, jsonObjectSchema, jsonValueSchema, jsonValueValidationIssue, jsonValueValidationSteps } from "./jsonSerialization-BNsB4Jxk.js";
import { createHash } from "node:crypto";
import { basename, isAbsolute, posix, relative, sep } from "node:path";
import { z } from "zod";
import { PACKAGE_METADATA } from "../generatedPackageMetadata.js";
import canonicalize from "canonicalize";

//#region dist/domain/result.js
var ok, err;
function init_result() {
	return (init_result = __esmMin((() => {
		ok = (value) => ({
			ok: true,
			value
		});
		err = (error) => ({
			ok: false,
			error
		});
	})))();
}

//#endregion
//#region dist/domain/safeJson.js
var safeParseJson;
function init_safeJson() {
	return (init_safeJson = __esmMin((() => {
		safeParseJson = (value, reviver) => {
			try {
				return {
					ok: true,
					value: JSON.parse(value, reviver)
				};
			} catch (cause) {
				return {
					ok: false,
					error: cause instanceof Error ? cause.message : String(cause),
					cause
				};
			}
		};
	})))();
}

//#endregion
//#region dist/domain/unicodeCodePointOrder.js
var compareUnicodeCodePoints, compositeKey;
function init_unicodeCodePointOrder() {
	return (init_unicodeCodePointOrder = __esmMin((() => {
		compareUnicodeCodePoints = (left, right) => {
			let leftIndex = 0;
			let rightIndex = 0;
			while (leftIndex < left.length && rightIndex < right.length) {
				const leftPoint = left.codePointAt(leftIndex) ?? 0;
				const rightPoint = right.codePointAt(rightIndex) ?? 0;
				const difference = leftPoint - rightPoint;
				if (difference !== 0) return difference;
				leftIndex += leftPoint > 65535 ? 2 : 1;
				rightIndex += rightPoint > 65535 ? 2 : 1;
			}
			if (leftIndex === left.length && rightIndex === right.length) return 0;
			return leftIndex === left.length ? -1 : 1;
		};
		compositeKey = (parts) => JSON.stringify(parts);
	})))();
}

//#endregion
//#region dist/domain/canonicalDigest.js
var digestCanonicalValue, emitCanonical;
function init_canonicalDigest() {
	return (init_canonicalDigest = __esmMin((() => {
		digestCanonicalValue = (value, context = "Comparison") => {
			const hash = createHash("sha256");
			let buffered = "";
			const emit = (part) => {
				buffered += part;
				if (buffered.length >= 8192) {
					hash.update(buffered);
					buffered = "";
				}
			};
			const encoded = emitCanonical(value, emit, new Set());
			if (!encoded) throw new TypeError(`${context} could not canonicalize data`);
			if (buffered) hash.update(buffered);
			return hash.digest("hex");
		};
		emitCanonical = (value, emit, ancestors) => {
			if (typeof value === "number" && !Number.isFinite(value)) throw new Error(Number.isNaN(value) ? "NaN is not allowed" : "Infinity is not allowed");
			if (value === null || typeof value !== "object") {
				const encoded = JSON.stringify(value);
				if (encoded === undefined) return false;
				emit(encoded);
				return true;
			}
			if (ancestors.has(value)) throw new Error("Circular reference detected");
			ancestors.add(value);
			try {
				if ("toJSON" in value && typeof value.toJSON === "function") {
					const normalized = value.toJSON();
					return emitCanonical(normalized, emit, ancestors);
				}
				if (Array.isArray(value)) {
					emit("[");
					const length = value.length;
					for (let index = 0; index < length; index += 1) {
						if (index > 0) emit(",");
						if (!(index in value)) continue;
						const item = value[index];
						emitCanonical(item === undefined || typeof item === "symbol" ? null : item, emit, ancestors);
					}
					emit("]");
				} else {
					emit("{");
					let first = true;
					for (const key of Object.keys(value).sort()) {
						if (Reflect.get(value, key) === undefined || typeof Reflect.get(value, key) === "symbol") continue;
						const item = Reflect.get(value, key);
						if (!first) emit(",");
						first = false;
						emit(JSON.stringify(key));
						emit(":");
						if (!emitCanonical(item, emit, ancestors)) emit("undefined");
					}
					emit("}");
				}
				return true;
			} finally {
				ancestors.delete(value);
			}
		};
	})))();
}

//#endregion
//#region dist/domain/canonicalJsonDigestSteps.js
/** Hash owned, validated JSON in bounded steps without a document-sized string. */
function* canonicalJsonDigestSteps(value) {
	const hash = createHash("sha256");
	const ancestors = new Set();
	const stack = [{
		kind: "value",
		value
	}];
	const encodedKeys = new Map();
	let remainingKeyCodeUnits = 8192;
	let buffered = "";
	let flushed = false;
	const emit = (part) => {
		buffered += part;
		if (buffered.length >= 8192) {
			hash.update(buffered);
			buffered = "";
			flushed = true;
		}
	};
	try {
		while (stack.length > 0) {
			if (flushed) {
				flushed = false;
				yield;
			}
			const frame = stack.pop();
			if (frame === undefined) break;
			if (frame.kind === "separator") {
				emit(":");
				continue;
			}
			if (frame.kind === "string") {
				if (frame.index === frame.value.length) {
					emit("\"");
					continue;
				}
				let end = Math.min(frame.index + 8192, frame.value.length);
				const last = frame.value.charCodeAt(end - 1);
				const next = frame.value.charCodeAt(end);
				if (end < frame.value.length && last >= 55296 && last <= 56319 && next >= 56320 && next <= 57343) end -= 1;
				emit(JSON.stringify(frame.value.slice(frame.index, end)).slice(1, -1));
				frame.index = end;
				stack.push(frame);
				continue;
			}
			let item;
			if (frame.kind === "array") {
				if (frame.index === frame.length) {
					emit("]");
					ancestors.delete(frame.value);
					continue;
				}
				const element = frame.value[frame.index];
				if (element === undefined) throw new TypeError("Canonical JSON digest requires dense JSON arrays");
				if (frame.index++ > 0) emit(",");
				stack.push(frame);
				item = element;
			} else if (frame.kind === "object") {
				if (frame.index === frame.keys.length) {
					emit("}");
					ancestors.delete(frame.value);
					continue;
				}
				const key = frame.keys[frame.index++];
				if (key === undefined) throw new TypeError("Canonical JSON object changed during hashing");
				const property = frame.value[key];
				if (property === undefined) {
					stack.push(frame);
					continue;
				}
				if (frame.written++ > 0) emit(",");
				if (key.length > 8192) {
					emit("\"");
					stack.push(frame, {
						kind: "value",
						value: property
					}, { kind: "separator" }, {
						kind: "string",
						value: key,
						index: 0
					});
					continue;
				}
				let encodedKey = encodedKeys.get(key);
				if (encodedKey === undefined) {
					encodedKey = JSON.stringify(key);
					if (encodedKey.length <= remainingKeyCodeUnits) {
						encodedKeys.set(key, encodedKey);
						remainingKeyCodeUnits -= encodedKey.length;
					}
				}
				emit(encodedKey);
				emit(":");
				stack.push(frame);
				item = property;
			} else {
				item = frame.value;
			}
			if (flushed) {
				flushed = false;
				yield;
			}
			if (typeof item === "string" && item.length > 8192) {
				emit("\"");
				stack.push({
					kind: "string",
					value: item,
					index: 0
				});
			} else if (item === null || typeof item !== "object") {
				if (typeof item === "number" && !Number.isFinite(item)) throw new Error(Number.isNaN(item) ? "NaN is not allowed" : "Infinity is not allowed");
				emit(JSON.stringify(item));
			} else {
				if (ancestors.has(item)) throw new Error("Circular reference detected");
				ancestors.add(item);
				if (Array.isArray(item)) {
					emit("[");
					stack.push({
						kind: "array",
						value: item,
						length: item.length,
						index: 0
					});
				} else {
					emit("{");
					stack.push({
						kind: "object",
						value: item,
						keys: Object.keys(item).sort(),
						index: 0,
						written: 0
					});
				}
			}
		}
		if (buffered !== "") hash.update(buffered);
		return hash.digest("hex");
	} finally {
		stack.length = 0;
		ancestors.clear();
		encodedKeys.clear();
		buffered = "";
	}
}
function init_canonicalJsonDigestSteps() {
	return (init_canonicalJsonDigestSteps = __esmMin((() => {})))();
}

//#endregion
//#region dist/domain/localPath.js
var nulFreeStringSchema, localPathStringSchema, absoluteLocalPathStringSchema, isPathWithinRoot;
function init_localPath() {
	return (init_localPath = __esmMin((() => {
		nulFreeStringSchema = z.string().regex(/^[^\x00]*$/u, "Local filesystem paths cannot contain NUL");
		localPathStringSchema = nulFreeStringSchema.min(1);
		absoluteLocalPathStringSchema = localPathStringSchema.regex(process.platform === "win32" ? /^(?:[\\/]|[A-Za-z]:[\\/])/u : /^\//u, "must be an absolute local filesystem path");
		isPathWithinRoot = (root, path) => {
			const value = relative(root, path);
			return value === "" || value !== ".." && !value.startsWith(`..${sep}`) && !isAbsolute(value);
		};
	})))();
}

//#endregion
//#region dist/domain/digests.js
var SHA256_PATTERN, digestSchema, prefixedDigestSchema, isDigest;
function init_digests() {
	return (init_digests = __esmMin((() => {
		SHA256_PATTERN = /^[a-f0-9]{64}$/u;
		digestSchema = z.string().regex(SHA256_PATTERN);
		prefixedDigestSchema = (prefix) => z.string().regex(new RegExp(`^${prefix}_[a-f0-9]{64}$`, "u"), `Expected a ${prefix}_ prefixed lowercase sha256 digest`);
		isDigest = (value) => typeof value === "string" && SHA256_PATTERN.test(value);
	})))();
}

//#endregion
//#region dist/domain/analysisProfile.js
var committedProviderSchema, unsignedAnalysisProfileSchema, analysisProfileSchema, createAnalysisProfile, analysisProfilesEqual, profileDigest;
function init_analysisProfile() {
	return (init_analysisProfile = __esmMin((() => {
		init_canonicalDigest();
		init_jsonValue();
		init_digests();
		committedProviderSchema = z.strictObject({
			id: z.string().min(1),
			name: z.string().min(1),
			version: z.string().min(1)
		});
		unsignedAnalysisProfileSchema = z.strictObject({
			provider: committedProviderSchema,
			parameters: jsonObjectSchema
		});
		analysisProfileSchema = unsignedAnalysisProfileSchema.extend({ digest: digestSchema }).superRefine((profile, context) => {
			const { digest: _digest, ...unsigned } = profile;
			if (profileDigest(unsigned) !== profile.digest) context.addIssue({
				code: "custom",
				path: ["digest"],
				message: "Analysis profile digest does not match its parameters"
			});
		});
		createAnalysisProfile = (provider, parameters) => {
			const unsigned = unsignedAnalysisProfileSchema.parse({
				provider: {
					id: provider.id,
					name: provider.name,
					version: provider.version
				},
				parameters
			});
			return analysisProfileSchema.parse({
				...unsigned,
				digest: profileDigest(unsigned)
			});
		};
		analysisProfilesEqual = (left, right) => left.digest === right.digest && left.provider.id === right.provider.id && left.provider.name === right.provider.name && left.provider.version === right.provider.version;
		profileDigest = (profile) => digestCanonicalValue(profile, "Analysis profile");
	})))();
}

//#endregion
//#region dist/domain/binaryTargetTypes.js
var BINARY_ARCHITECTURES, RAW_ONLY_ARCHITECTURES, ELF_METADATA_ARCHITECTURES, isElfMetadataArchitecture, isMachOFormat$1;
function init_binaryTargetTypes() {
	return (init_binaryTargetTypes = __esmMin((() => {
		BINARY_ARCHITECTURES = [
			"x86",
			"x86_64",
			"arm",
			"arm64",
			"mips",
			"6502",
			"riscv",
			"powerpc",
			"m68k",
			"hexagon"
		];
		RAW_ONLY_ARCHITECTURES = ["6502", "m68k"];
		ELF_METADATA_ARCHITECTURES = [
			"mips",
			"riscv",
			"powerpc"
		];
		isElfMetadataArchitecture = (architecture) => ELF_METADATA_ARCHITECTURES.includes(architecture);
		isMachOFormat$1 = (format) => format === "mach-o" || format === "mach-o-universal";
	})))();
}

//#endregion
//#region dist/domain/fixedTupleSchema.js
var fixedTupleSchema;
function init_fixedTupleSchema() {
	return (init_fixedTupleSchema = __esmMin((() => {
		fixedTupleSchema = (items) => z.tuple(items, z.union(items)).check(z.minLength(items.length), z.maxLength(items.length));
	})))();
}

//#endregion
//#region dist/domain/relationshipCoverage.js
var diagnostics, completeCoverage, limitedDirections, partialCoverage, unknownCoverage, relationshipCoverageSchema, relationshipCoverageLimitations;
function init_relationshipCoverage() {
	return (init_relationshipCoverage = __esmMin((() => {
		init_fixedTupleSchema();
		diagnostics = z.array(z.string().min(1)).min(1).exactOptional();
		completeCoverage = z.strictObject({
			status: z.literal("complete"),
			diagnostics
		});
		limitedDirections = z.union([
			fixedTupleSchema([z.literal("callers")]),
			fixedTupleSchema([z.literal("callees")]),
			fixedTupleSchema([z.literal("callers"), z.literal("callees")])
		]);
		partialCoverage = z.strictObject({
			status: z.literal("partial"),
			limitations: z.array(z.string().min(1)).min(1),
			limited_directions: limitedDirections.exactOptional(),
			diagnostics
		});
		unknownCoverage = z.strictObject({
			status: z.literal("unknown"),
			reason: z.string().min(1),
			limited_directions: limitedDirections.exactOptional(),
			diagnostics
		});
		relationshipCoverageSchema = z.discriminatedUnion("status", [
			completeCoverage,
			partialCoverage,
			unknownCoverage
		]);
		relationshipCoverageLimitations = (coverage) => {
			switch (coverage?.status) {
				case undefined: return ["Provider did not report relationship coverage."];
				case "complete": return [];
				case "partial": return coverage.limitations;
				case "unknown": return [coverage.reason];
			}
		};
	})))();
}

//#endregion
//#region dist/domain/evidence.js
/** Create Evidence from owned immutable JSON while exposing cooperative computation steps. */
function* createImmutableEvidenceSteps(target, provider, observation) {
	if (!isImmutableJsonSnapshot(observation.result)) throw new TypeError("Cooperative Evidence requires an authenticated immutable result");
	yield* jsonValueValidationSteps(observation.result);
	const { normalized } = normalizeEvidenceObservation(target, provider, observation);
	const digest = yield* canonicalJsonDigestSteps(semanticProjection(normalized));
	return rememberImmutableEvidence({
		...normalized,
		evidence_id: `ev_${digest}`
	});
}
var providerSchema, subjectFormatSchema, subjectBaseSchema, subjectSchema, evidenceLocationSchema, evidenceAuthoritySchema, executionEnvironmentSchema, evidenceBaseSchema, validateAnalysisProfileProvider, evidenceSchema, authenticatedEvidenceSchema, immutableEvidenceSnapshots, immutableResultSchema, rebindEvidenceSubjectTargetPath, semanticProjection, computeEvidenceId, parseEvidence, immutableEvidence, rebindEvidenceToTargetPath, isImmutableEvidence, rememberImmutableEvidence, createEvidence, normalizeEvidenceObservation;
function init_evidence() {
	return (init_evidence = __esmMin((() => {
		init_canonicalDigest();
		init_canonicalJsonDigestSteps();
		init_localPath();
		init_analysisProfile();
		init_binaryTargetTypes();
		init_jsonValue();
		init_immutableJson();
		init_digests();
		init_relationshipCoverage();
		providerSchema = z.strictObject({
			id: z.string().min(1),
			name: z.string().min(1),
			version: z.string().nullable()
		});
		subjectFormatSchema = z.enum([
			"hopper",
			"analysis-database",
			"mach-o",
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
			"source-map",
			"directory",
			"file",
			"unknown",
			"mach-o-universal",
			"javascript-bundle",
			"entitlements",
			"pyinstaller"
		]);
		subjectBaseSchema = z.strictObject({
			name: z.string().min(1),
			digest: z.strictObject({ sha256: digestSchema }),
			local_path: nulFreeStringSchema
		});
		subjectSchema = z.discriminatedUnion("format", [subjectBaseSchema.extend({
			format: subjectFormatSchema.exclude(["raw-binary"]),
			architecture: z.enum(BINARY_ARCHITECTURES).exclude([...RAW_ONLY_ARCHITECTURES]).nullable()
		}), subjectBaseSchema.extend({
			format: z.literal("raw-binary"),
			architecture: z.enum(BINARY_ARCHITECTURES).nullable()
		})]);
		evidenceLocationSchema = z.discriminatedUnion("kind", [
			z.strictObject({
				kind: z.literal("address"),
				address: z.string().min(1)
			}),
			z.strictObject({
				kind: z.literal("address-range"),
				start: z.string().min(1),
				end: z.string().min(1)
			}),
			z.strictObject({
				kind: z.literal("artifact-path"),
				path: z.string().min(1)
			}),
			z.strictObject({
				kind: z.literal("file-offset"),
				offset: z.number().int().min(0)
			}),
			z.strictObject({
				kind: z.literal("file-offset-range"),
				start: z.number().int().min(0),
				end: z.number().int().min(0)
			})
		]);
		evidenceAuthoritySchema = z.enum([
			"shipped-artifact",
			"controlled-replay",
			"historical-reference",
			"external-service",
			"analyst-inference"
		]);
		executionEnvironmentSchema = z.strictObject({
			id: z.string().min(1),
			platform: z.string().min(1),
			architecture: z.string().min(1),
			isolation: z.enum([
				"none",
				"process",
				"container",
				"virtual-machine"
			])
		});
		evidenceBaseSchema = z.object({
			evidence_id: prefixedDigestSchema("ev"),
			subject: subjectSchema.nullable(),
			provider: providerSchema,
			analysis_profile: analysisProfileSchema.nullable(),
			predicate_type: z.string().min(1),
			operation: z.string().min(1),
			parameters: jsonObjectSchema,
			raw_result: jsonValueSchema.nullable(),
			normalized_result: jsonValueSchema,
			confidence: z.enum([
				"observed",
				"derived",
				"inferred"
			]),
			authority: evidenceAuthoritySchema,
			environment: executionEnvironmentSchema.nullable(),
			limitations: z.array(z.string()),
			relationship_coverage: relationshipCoverageSchema.nullable(),
			locations: z.array(evidenceLocationSchema),
			evidence_links: z.array(prefixedDigestSchema("ev"))
		}).strict();
		validateAnalysisProfileProvider = (evidence, context) => {
			const profile = evidence.analysis_profile;
			if (profile !== null && (profile.provider.id !== evidence.provider.id || profile.provider.name !== evidence.provider.name || profile.provider.version !== evidence.provider.version)) context.addIssue({
				code: "custom",
				path: ["analysis_profile", "provider"],
				message: "Analysis profile provider does not match Evidence provider"
			});
		};
		evidenceSchema = evidenceBaseSchema.superRefine(validateAnalysisProfileProvider);
		authenticatedEvidenceSchema = evidenceSchema.superRefine((evidence, context) => {
			const { evidence_id: evidenceId, ...withoutId } = evidence;
			if (computeEvidenceId(withoutId) !== evidenceId) context.addIssue({
				code: "custom",
				path: ["evidence_id"],
				message: "Evidence semantic identifier does not match its record"
			});
		});
		immutableEvidenceSnapshots = new WeakMap();
		immutableResultSchema = z.custom(isImmutableJsonSnapshot).superRefine((value, context) => {
			const issue = jsonValueValidationIssue(value);
			if (issue !== undefined) context.addIssue({
				code: "custom",
				message: issue
			});
		});
		rebindEvidenceSubjectTargetPath = (subject, target) => subject.sha256 === target.sha256 && subject.format === target.format && (subject.architecture ?? null) === (target.architecture ?? null) ? {
			...subject,
			path: target.path
		} : subject;
		semanticProjection = (evidence) => ({
			subject: evidence.subject === null ? null : {
				digest: evidence.subject.digest,
				format: evidence.subject.format,
				architecture: evidence.subject.architecture
			},
			provider: evidence.provider,
			analysis_profile: evidence.analysis_profile,
			predicate_type: evidence.predicate_type,
			operation: evidence.operation,
			parameters: evidence.parameters,
			raw_result: evidence.raw_result,
			normalized_result: evidence.normalized_result,
			confidence: evidence.confidence,
			authority: evidence.authority,
			environment: evidence.environment,
			limitations: evidence.limitations,
			relationship_coverage: evidence.relationship_coverage,
			locations: evidence.locations,
			evidence_links: evidence.evidence_links
		});
		computeEvidenceId = (evidence) => `ev_${digestCanonicalValue(semanticProjection(evidence), "Evidence")}`;
		parseEvidence = (input) => {
			const immutable = typeof input === "object" && input !== null ? immutableEvidenceSnapshots.get(input) : undefined;
			if (immutable !== undefined) return immutable;
			return authenticatedEvidenceSchema.parse(input);
		};
		immutableEvidence = (input) => {
			const parsed = parseEvidence(input);
			return rememberImmutableEvidence(canBorrowParsedJsonSnapshot(input, parsed) ? input : parsed);
		};
		rebindEvidenceToTargetPath = (evidence, target) => {
			const subject = evidence.subject;
			if (subject === null) return evidence;
			const rebound = rebindEvidenceSubjectTargetPath({
				path: subject.local_path,
				sha256: subject.digest.sha256,
				format: subject.format,
				...subject.architecture === null ? {} : { architecture: subject.architecture }
			}, target);
			if (rebound.path === subject.local_path) return evidence;
			const reboundSubject = subjectSchema.parse({
				...subject,
				name: basename(target.path) || "artifact",
				local_path: target.path
			});
			const reboundEvidence = {
				...evidence,
				subject: reboundSubject
			};
			if (!isImmutableEvidence(evidence)) return immutableEvidence(reboundEvidence);
			Object.freeze(reboundSubject.digest);
			Object.freeze(reboundSubject);
			Object.freeze(reboundEvidence);
			immutableEvidenceSnapshots.set(reboundEvidence, reboundEvidence);
			return reboundEvidence;
		};
		isImmutableEvidence = (evidence) => immutableEvidenceSnapshots.has(evidence);
		rememberImmutableEvidence = (evidence) => {
			freezeJsonSnapshot(evidence);
			immutableEvidenceSnapshots.set(evidence, evidence);
			return evidence;
		};
		createEvidence = (target, provider, observation, options) => {
			const { normalized, sharedResult } = normalizeEvidenceObservation(target, provider, observation);
			const evidence = {
				...normalized,
				evidence_id: computeEvidenceId(normalized)
			};
			if (sharedResult || options?.immutable === true) {
				freezeOwnedJsonTreeSnapshot(evidence);
				immutableEvidenceSnapshots.set(evidence, evidence);
			}
			return evidence;
		};
		normalizeEvidenceObservation = (target, provider, observation) => {
			const subject = target === undefined ? null : {
				name: basename(target.path) || "artifact",
				digest: { sha256: target.sha256 },
				format: target.format,
				architecture: target.architecture ?? null,
				local_path: target.path
			};
			const semantic = {
				subject: subject === null ? null : {
					digest: subject.digest,
					format: subject.format,
					architecture: subject.architecture
				},
				provider: {
					id: provider.id,
					name: provider.name,
					version: provider.version
				},
				analysis_profile: observation.analysisProfile ?? null,
				predicate_type: observation.predicateType ?? "rea.analysis",
				operation: observation.operation,
				parameters: observation.parameters,
				raw_result: observation.rawResult ?? null,
				normalized_result: observation.result,
				confidence: observation.confidence ?? "observed",
				authority: observation.authority ?? "shipped-artifact",
				environment: observation.environment ?? null,
				limitations: [...target === undefined ? [observation.subjectUnavailableReason ?? "Artifact identity is unavailable for this observation."] : [], ...observation.limitations ?? []],
				...observation.relationshipCoverage === undefined ? { relationship_coverage: null } : { relationship_coverage: observation.relationshipCoverage },
				locations: [...observation.locations ?? []],
				evidence_links: [...observation.evidenceLinks ?? []]
			};
			const sharedResult = typeof observation.result === "object" && observation.result !== null && isImmutableJsonSnapshot(observation.result);
			const selectedSchema = sharedResult ? evidenceSchema.safeExtend({ normalized_result: immutableResultSchema }) : evidenceSchema;
			const normalized = selectedSchema.parse({
				...semantic,
				evidence_id: `ev_${"0".repeat(64)}`,
				subject
			});
			return {
				normalized,
				sharedResult
			};
		};
	})))();
}

//#endregion
//#region dist/domain/inputIssueProjection.js
var analysisInputErrorFromIssues, projectInputIssues, projectIssue, uniqueIssues, valueAtPath, numericBound, isSafeExpected, safeExpected, boundedIssue;
function init_inputIssueProjection() {
	return (init_inputIssueProjection = __esmMin((() => {
		init_analysisErrorCore();
		analysisInputErrorFromIssues = (operation, issues, input, options = {}) => new AnalysisInputError(operation, options.cause === undefined ? undefined : { cause: options.cause }, [...projectInputIssues(issues, input), ...options.additionalIssues ?? []]);
		projectInputIssues = (issues, input) => issues.flatMap((issue) => projectIssue(issue, input));
		projectIssue = (issue, input) => {
			const path = issue.path.flatMap((part) => typeof part === "string" || typeof part === "number" ? [part] : []);
			if (issue.code === "invalid_union") {
				if (issue.errors.length === 0) {
					const expected = "options" in issue ? issue.options?.filter(isSafeExpected) : undefined;
					return [{
						path,
						reason: valueAtPath(input, path) === undefined ? "missing_argument" : "invalid_value",
						...expected === undefined ? {} : { expected }
					}];
				}
				return uniqueIssues(issue.errors.flatMap((branch) => branch.flatMap((branchIssue) => projectIssue({
					...branchIssue,
					path: [...issue.path, ...branchIssue.path]
				}, input))));
			}
			if (issue.code === "invalid_key") return issue.issues.flatMap((keyIssue) => projectIssue({
				...keyIssue,
				path: [...issue.path, ...keyIssue.path]
			}, input));
			if (issue.code === "unrecognized_keys") return issue.keys.map((key) => ({
				path: [...path, key],
				reason: "unknown_argument"
			}));
			if (issue.code === "invalid_type") return [{
				path,
				reason: valueAtPath(input, path) === undefined ? "missing_argument" : "invalid_type",
				expected: safeExpected(issue.expected)
			}];
			if (issue.code === "too_small") return [boundedIssue(path, "minimum", numericBound(issue.minimum))];
			if (issue.code === "too_big") return [boundedIssue(path, "maximum", numericBound(issue.maximum))];
			if (issue.code === "invalid_format") return [{
				path,
				reason: "invalid_format",
				expected: issue.format,
				...issue.format === "regex" && issue.message.length > 0 ? { message: issue.message } : {}
			}];
			if (issue.code === "invalid_value") return [{
				path,
				reason: "invalid_value",
				expected: issue.values.filter(isSafeExpected)
			}];
			return [{
				path,
				reason: "invalid_value",
				...issue.message.length > 0 ? { message: issue.message } : {}
			}];
		};
		uniqueIssues = (issues) => [...new Map(issues.map((issue) => [JSON.stringify(issue), issue])).values()];
		valueAtPath = (input, path) => {
			let current = input;
			for (const part of path) {
				if (typeof current !== "object" || current === null) return undefined;
				const next = Reflect.get(current, part);
				current = next;
			}
			return current;
		};
		numericBound = (value) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
		isSafeExpected = (value) => value === null || [
			"string",
			"number",
			"boolean"
		].includes(typeof value);
		safeExpected = (value) => isSafeExpected(value) ? value : "schema-defined value";
		boundedIssue = (path, key, value) => ({
			path,
			reason: "out_of_range",
			...value === undefined ? {} : { [key]: value }
		});
	})))();
}

//#endregion
//#region dist/cliCommandNames.js
var CLI_COMMANDS, CLI_COMMAND_NAMES, CLI_COMMAND_ALIASES, CLI_COMMAND_TOOL_ALIASES, MCP_TOOLS_WITHOUT_DEDICATED_CLI;
function init_cliCommandNames() {
	return (init_cliCommandNames = __esmMin((() => {
		CLI_COMMANDS = Object.freeze({
			hclTranscribe: "hcl-transcribe",
			hclRun: "hcl-run",
			hclCalculate: "hcl-calculate",
			hclRememberEvidence: "hcl-remember-evidence",
			hclRecallEvidence: "hcl-recall-evidence",
			hclGetEvidence: "hcl-get-evidence",
			hclInspectCase: "hcl-inspect-case",
			hclVerifyCase: "hcl-verify-case",
			hclCompareCases: "hcl-compare-cases",
			inspectPacketFields: "inspect-packet-fields",
			inspectPacketCapture: "inspect-packet-capture",
			inspectSignalDecoders: "inspect-signal-decoders",
			decodeSignalRecording: "decode-signal-recording",
			matchNativeFunctions: "match-native-functions",
			compareWasmInterfaces: "compare-wasm-interfaces",
			inspectWasmArtifact: "inspect-wasm-artifact",
			inspectSqliteDatabase: "inspect-sqlite-database",
			inspectEvmInterface: "inspect-evm-interface",
			inspectWebNetworkCapture: "inspect-web-network-capture",
			observeWebExecution: "observe-web-execution",
			inspectWebEventListeners: "inspect-web-event-listeners",
			traceWebSourceLocation: "trace-web-source-location",
			traceWebModuleImports: "trace-web-module-imports",
			analyze: "analyze",
			inspect: "inspect",
			decompile: "decompile",
			setup: "setup",
			doctor: "doctor",
			uninstall: "uninstall",
			update: "update",
			xrefs: "xrefs",
			trace: "trace",
			traceNativeUiAction: "trace-native-ui-action",
			inspectNativeDispatchMetadata: "inspect-native-dispatch-metadata",
			capabilities: "capabilities",
			providers: "providers",
			function: "function",
			annotateNativeFunction: "annotate-native-function",
			inspectNativeApi: "inspect-native-api",
			instructions: "instructions",
			search: "search",
			importReferenceSource: "import-reference-source",
			inspectArtifact: "inspect-artifact",
			extractArtifact: "extract-artifact",
			decodeInterfaceBuilder: "decode-interface-builder",
			inspectKeyedArchive: "inspect-keyed-archive",
			traceDylibResolution: "trace-dylib-resolution",
			inspectNativeDataType: "inspect-native-data-type",
			inspectNativeLoadImage: "inspect-native-load-image",
			readBytes: "read-bytes",
			searchBytes: "search-bytes",
			addressToFileOffset: "address-to-file-offset",
			traceNativeValues: "trace-native-values",
			inspectNativeInstruction: "inspect-native-instruction",
			resolveNativeCallTargets: "resolve-native-call-targets",
			inspectAssetCatalog: "inspect-asset-catalog",
			inspectManagedArtifact: "inspect-managed-artifact",
			inspectRecordedCrash: "inspect-recorded-crash",
			inspectBinaryLayout: "inspect-binary-layout",
			listCutterSessions: "list-cutter-sessions",
			cutterCommand: "cutter-command",
			inspectWithObjdump: "inspect-with-objdump",
			listObjdumpArchitectures: "list-objdump-architectures",
			executeRizinCommand: "execute-rizin-command",
			debugWithGdb: "debug-with-gdb",
			debugWithRizin: "debug-with-rizin",
			inspectDesktopApplication: "inspect-desktop-application",
			inspectGoBinary: "inspect-go-binary",
			inspectIl2cppMetadata: "inspect-il2cpp-metadata",
			inspectModelArtifact: "inspect-model-artifact",
			inspectGpuCodeObjects: "inspect-gpu-code-objects",
			inspectRustBinary: "inspect-rust-binary",
			inspectPeResources: "inspect-pe-resources",
			inspectAnalysisView: "inspect-analysis-view",
			listFridaDevices: "list-frida-devices",
			listFridaProcesses: "list-frida-processes",
			instrumentWithFrida: "instrument-with-frida",
			inspectEvidenceBundle: "inspect-evidence-bundle",
			inspectFirmwareRegions: "inspect-firmware-regions",
			extractFirmware: "extract-firmware",
			inspectAndroidPackage: "inspect-android-package",
			inspectPcapClient: "inspect-pcap-client",
			inspectPcapCapture: "inspect-pcap-capture",
			identifyFlutterBuild: "identify-flutter-build",
			inspectDartAot: "inspect-dart-aot",
			inspectApktoolClient: "inspect-apktool-client",
			decodeAndroidResources: "decode-android-resources",
			inspectAdbClient: "inspect-adb-client",
			listAdbDevices: "list-adb-devices",
			inspectAdbDevice: "inspect-adb-device",
			listAdbPackages: "list-adb-packages",
			pullAdbPackage: "pull-adb-package",
			readAdbLogcat: "read-adb-logcat",
			inspectAdbPackage: "inspect-adb-package",
			pullAdbFile: "pull-adb-file",
			pushAdbFile: "push-adb-file",
			captureAdbScreen: "capture-adb-screen",
			listAdbProcesses: "list-adb-processes",
			listAdbDirectory: "list-adb-directory",
			listAdbFeatures: "list-adb-features",
			listAdbServices: "list-adb-services",
			inspectAdbDisplay: "inspect-adb-display",
			inspectAdbWindow: "inspect-adb-window",
			readAdbSetting: "read-adb-setting",
			collectAdbBugreport: "collect-adb-bugreport",
			resolveAdbPackages: "resolve-adb-packages",
			installAdbPackage: "install-adb-package",
			uninstallAdbPackage: "uninstall-adb-package",
			startAdbApp: "start-adb-app",
			startAdbActivity: "start-adb-activity",
			stopAdbApp: "stop-adb-app",
			searchAndroidClasses: "search-android-classes",
			inspectAndroidClass: "inspect-android-class",
			inspectAndroidMethod: "inspect-android-method",
			traceAndroidReferences: "trace-android-references",
			inspectJebClient: "inspect-jeb-client",
			openJebProject: "open-jeb-project",
			listJebUnits: "list-jeb-units",
			decompileJebItem: "decompile-jeb-item",
			inspectManagedMembers: "inspect-managed-members",
			inspectManagedNativeBoundaries: "inspect-managed-native-boundaries",
			compareManagedMembers: "compare-managed-members",
			verifyManagedNativeBoundaries: "verify-managed-native-boundaries",
			importManagedReconstruction: "import-managed-reconstruction",
			projectManagedApplicationGraph: "project-managed-application-graph",
			observeNativeUi: "observe-native-ui",
			observeNativeCalls: "observe-native-calls",
			captureNativeUiScenario: "capture-native-ui-scenario",
			inspectMacho: "inspect-macho",
			inspectSignature: "inspect-signature",
			listArchitectures: "list-architectures",
			inspectPlist: "inspect-plist",
			demangleSwift: "demangle-swift",
			evidenceImport: "evidence-import",
			evidenceExport: "evidence-export",
			environmentServe: "environment-serve",
			environmentExport: "environment-export",
			compare: "compare",
			captureProcess: "capture-process",
			compareProcessCaptures: "compare-process-captures",
			listBrowserTargets: "list-browser-targets",
			inspectWebPage: "inspect-web-page",
			analyzeWebBundle: "analyze-web-bundle",
			exportWebScripts: "export-web-scripts",
			recoverJavaScriptSources: "recover-javascript-sources",
			observeWebSession: "observe-web-session",
			discoverWebMcpTools: "discover-webmcp-tools",
			compareWebCaptures: "compare-web-captures",
			captureWebScreenshot: "capture-web-screenshot",
			compareWebScreenshots: "compare-web-screenshots",
			captureBrowserScenario: "capture-browser-scenario",
			listElectronTargets: "list-electron-targets",
			inspectElectronPage: "inspect-electron-page",
			inspectElectronFuses: "inspect-electron-fuses",
			captureElectronScenario: "capture-electron-scenario",
			listJavaScriptRuntimeTargets: "list-javascript-runtime-targets",
			observeJavaScriptRuntime: "observe-javascript-runtime",
			analyzeJavaScriptApplication: "analyze-javascript-application",
			reconcileJavaScriptRuntime: "reconcile-javascript-runtime",
			traceApplicationFeature: "trace-application-feature",
			traceJavaScriptSemantics: "trace-javascript-semantics",
			compareApplicationVersions: "compare-application-versions",
			compareSourceToBundle: "compare-source-to-bundle",
			compareJavaScriptExportShapes: "compare-javascript-export-shapes",
			buildReconstructionObligationLedger: "build-reconstruction-obligation-ledger",
			evaluateReconstructionCoverage: "evaluate-reconstruction-coverage",
			projectAndroidApplicationGraph: "project-android-application-graph",
			projectAppleApplicationGraph: "project-apple-application-graph",
			projectHarmonyApplicationGraph: "project-harmony-application-graph"
		});
		CLI_COMMAND_NAMES = Object.freeze(Object.values(CLI_COMMANDS));
		CLI_COMMAND_ALIASES = Object.freeze(["compare-bundles"]);
		CLI_COMMAND_TOOL_ALIASES = Object.freeze({
			analyze: ["binary_overview"],
			inspect: ["binary_overview"],
			decompile: ["procedure_pseudo_code"],
			function: ["analyze_function"],
			instructions: ["read_function_instructions"],
			trace: ["trace_feature"],
			search: ["search_strings", "search_procedures"],
			"capture-process": ["capture_process_scenario"],
			"compare-bundles": ["compare_bundles"],
			"list-cutter-sessions": ["list_cutter_sessions"],
			"cutter-command": ["cutter_command"],
			"inspect-with-objdump": ["inspect_with_objdump"],
			"list-objdump-architectures": ["inspect_with_objdump"],
			"execute-rizin-command": ["execute_rizin_command"],
			"debug-with-gdb": ["gdb_console"],
			"debug-with-rizin": ["rizin_debug_command"],
			"list-frida-devices": ["list_frida_devices"],
			"list-frida-processes": ["list_frida_processes"],
			"instrument-with-frida": ["instrument_with_frida"]
		});
		MCP_TOOLS_WITHOUT_DEDICATED_CLI = Object.freeze([
			"open_bundle_resources",
			"address_name",
			"comment",
			"current_address",
			"current_procedure",
			"current_document",
			"goto_address",
			"inline_comment",
			"list_bookmarks",
			"list_documents",
			"list_names",
			"list_procedures",
			"list_segments",
			"list_strings",
			"next_address",
			"prev_address",
			"procedure_address",
			"procedure_assembly",
			"procedure_callees",
			"procedure_callers",
			"procedure_info",
			"procedure_references",
			"resolve_containing_procedure",
			"set_address_name",
			"set_addresses_names",
			"set_bookmark",
			"set_comment",
			"set_inline_comment",
			"unset_bookmark",
			"get_objc_classes",
			"get_objc_protocols",
			"batch_decompile",
			"get_call_graph",
			"analyze_swift_types",
			"find_xrefs_to_name",
			"trace_call_path",
			"open_binary",
			"close_binary",
			"binary_session",
			"export_evidence_bundle",
			"import_evidence_bundle",
			"compare_artifacts",
			"compare_functions",
			"find_changed_behavior",
			"build_call_path",
			"correlate_static_and_runtime",
			"verify_reconstruction",
			"list_unknowns",
			"record_unknown",
			"update_unknown",
			"verify_unknown_resolution",
			"get_evidence_bundle",
			"get_navigation_context",
			"inspect_address_context",
			"start_gdb_session",
			"gdb_session_status",
			"close_gdb_session",
			"start_rizin_debug_session",
			"rizin_debug_session_status",
			"close_rizin_debug_session",
			"start_frida_session",
			"load_frida_script",
			"resume_frida_session",
			"unload_frida_script",
			"frida_session_status",
			"close_frida_session"
		]);
	})))();
}

//#endregion
//#region dist/domain/comparisonSemantics.js
var absenceClaimable, canonicalJson;
function init_comparisonSemantics() {
	return (init_comparisonSemantics = __esmMin((() => {
		absenceClaimable = (coverage) => coverage.status === "complete" && coverage.truncated !== true && (coverage.omitted_count === undefined || coverage.omitted_count === 0);
		canonicalJson = (value, context = "Comparison") => {
			const encoded = canonicalize(value);
			if (encoded === undefined) throw new TypeError(`${context} could not canonicalize data`);
			return encoded;
		};
	})))();
}

//#endregion
//#region dist/domain/referenceSourcePathIdentity.js
var createReferenceSourcePathLookup, isPortableAbsoluteReferenceTarget;
function init_referenceSourcePathIdentity() {
	return (init_referenceSourcePathIdentity = __esmMin((() => {
		createReferenceSourcePathLookup = (paths) => {
			const exact = new Set(paths);
			const canonical = new Map();
			for (const path of exact) {
				const key = path.normalize("NFC");
				canonical.set(key, canonical.has(key) ? null : path);
			}
			const equivalent = (path) => canonical.get(path.normalize("NFC")) ?? undefined;
			const has = (path) => exact.has(path) || canonical.has(path.normalize("NFC"));
			const resolve = (path) => exact.has(path) ? path : equivalent(path);
			return {
				has,
				resolve,
				resolveCandidates: (candidates) => candidates.find((path) => exact.has(path)) ?? candidates.map(equivalent).find((path) => path !== undefined),
				resolveAncestor: (path) => {
					for (let candidate = path; candidate !== "." && candidate !== "/"; candidate = posix.dirname(candidate)) {
						const found = resolve(candidate);
						if (found !== undefined) return found;
					}
					return undefined;
				}
			};
		};
		isPortableAbsoluteReferenceTarget = (target) => target.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(target) || /^\\\\[^\\/]+[\\/][^\\/]+/u.test(target);
	})))();
}

//#endregion
//#region dist/domain/referenceSourceGraph.js
function checkGraphInvariants(graph, context) {
	checkSortedUnique(graph.entries.map(({ path }) => path), "entries", context);
	for (const [index, entry] of graph.entries.entries()) checkSortedUnique(entry.classifications, `entries.${index}.classifications`, context);
	checkSortedUnique(graph.languages, "languages", context);
	checkSortedUnique(graph.manifests, "manifests", context);
	checkSortedUnique(graph.relationships.map(historicalSourceRelationshipKey), "relationships", context);
	checkSortedUnique(graph.parse_failures.map(historicalSourceParseFailureKey), "parse_failures", context);
	checkSortedUnique(graph.exclusions.map((exclusion) => `${exclusion.path}\u0000${exclusion.reason}\u0000${"pattern" in exclusion ? exclusion.pattern : ""}`), "exclusions", context);
	if (canonicalJson(graph.languages, "Reference source graph") !== canonicalJson(historicalSourceLanguages(graph.entries), "Reference source graph")) context.addIssue({
		code: "custom",
		message: "languages must be derived from file entries",
		path: ["languages"]
	});
	if (canonicalJson(graph.manifests, "Reference source graph") !== canonicalJson(historicalSourceManifests(graph.entries), "Reference source graph")) context.addIssue({
		code: "custom",
		message: "manifests must be derived from classified file entries",
		path: ["manifests"]
	});
	const paths = new Set(graph.entries.map(({ path }) => path));
	checkRelationships(graph, paths, context);
	checkSymlinks(graph, paths, context);
	checkCompleteInventory(graph, context);
}
var boundedTextSchema$1, relativePathSchema, classificationSchema, entryBaseShape, sourceFileBaseShape, sourceFileSchema, sourceDirectorySchema, symlinkTargetSchema, sourceSymlinkSchema, sourceEntrySchema, sourceRelationshipSchema, parseFailureSchema, exclusionSchema, vcsSchema, graphShape, historicalSourceGraphStructureSchema, historicalSourceGraphSchema, historicalSourceGraphInputSchema, historicalSourceManifestBaseSchema, historicalSourceInventoryHasPartialFacts, historicalSourceParseFailureKey, historicalSourceRelationshipKey, checkSortedUnique, historicalSourceLanguages, historicalSourceManifests, checkRelationships, checkSymlinks, checkCompleteInventory, rootCommitment, computeRootSha256, createHistoricalSourceGraph, parseHistoricalSourceGraph, computeHistoricalSourceGraphSha256, createHistoricalSourceManifest, parseHistoricalSourceManifest;
function init_referenceSourceGraph() {
	return (init_referenceSourceGraph = __esmMin((() => {
		init_comparisonSemantics();
		init_canonicalDigest();
		init_referenceSourcePathIdentity();
		init_unicodeCodePointOrder();
		init_digests();
		boundedTextSchema$1 = z.string().min(1);
		relativePathSchema = z.string().min(1).refine((path) => !path.startsWith("/") && !path.includes("\0") && path.split("/").every((part) => part !== "" && part !== "." && part !== ".."), "Expected a normalized relative POSIX path without traversal");
		classificationSchema = z.enum([
			"source",
			"test",
			"config",
			"manifest",
			"generated",
			"vendor",
			"documentation",
			"unknown"
		]);
		entryBaseShape = {
			path: relativePathSchema,
			classifications: z.array(classificationSchema).min(1),
			limitations: z.array(boundedTextSchema$1)
		};
		sourceFileBaseShape = {
			...entryBaseShape,
			kind: z.literal("file"),
			language: z.string().min(1).nullable()
		};
		sourceFileSchema = z.union([z.strictObject({
			...sourceFileBaseShape,
			sha256: digestSchema,
			size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
			content_state: z.literal("hashed")
		}), z.strictObject({
			...sourceFileBaseShape,
			sha256: z.null(),
			size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
			content_state: z.enum([
				"redacted-secret",
				"excluded",
				"unreadable",
				"unknown"
			])
		})]);
		sourceDirectorySchema = z.strictObject({
			...entryBaseShape,
			kind: z.literal("directory"),
			tree_state: z.enum([
				"enumerated",
				"partial",
				"excluded",
				"unreadable",
				"unknown"
			])
		});
		symlinkTargetSchema = z.string().min(1).refine((target) => !target.includes("\0") && (isPortableAbsoluteReferenceTarget(target) || !target.startsWith("/") && posix.normalize(target) === target), "Expected a normalized POSIX symlink target");
		sourceSymlinkSchema = z.union([z.strictObject({
			...entryBaseShape,
			kind: z.literal("symlink"),
			target: symlinkTargetSchema,
			target_state: z.enum([
				"internal",
				"external",
				"missing"
			])
		}), z.strictObject({
			...entryBaseShape,
			kind: z.literal("symlink"),
			target: z.null(),
			target_state: z.enum(["unreadable", "unknown"])
		})]);
		sourceEntrySchema = z.union([
			sourceFileSchema,
			sourceDirectorySchema,
			sourceSymlinkSchema,
			z.strictObject({
				...entryBaseShape,
				kind: z.literal("unknown")
			})
		]);
		sourceRelationshipSchema = z.strictObject({
			from_path: relativePathSchema,
			to: z.string().min(1),
			kind: z.enum([
				"imports",
				"requires",
				"references",
				"declares-module"
			]),
			resolution: z.enum([
				"internal",
				"external",
				"unresolved",
				"unknown"
			]),
			parse_state: z.enum([
				"parsed",
				"partial",
				"unknown"
			])
		});
		parseFailureSchema = z.strictObject({
			path: relativePathSchema,
			parser: z.string().min(1),
			reason: boundedTextSchema$1
		});
		exclusionSchema = z.discriminatedUnion("reason", [z.strictObject({
			path: relativePathSchema,
			entry_kind: z.enum([
				"file",
				"directory",
				"symlink",
				"other",
				"unknown"
			]).exactOptional(),
			reason: z.enum([
				"configured-secret",
				"project-ignored",
				"default-ignored",
				"caller-excluded"
			]),
			pattern: boundedTextSchema$1
		}), z.strictObject({
			path: relativePathSchema,
			entry_kind: z.enum([
				"file",
				"directory",
				"symlink",
				"other",
				"unknown"
			]).exactOptional(),
			reason: z.enum(["symlink-escape", "unreadable"])
		})]);
		vcsSchema = z.discriminatedUnion("kind", [
			z.strictObject({
				kind: z.literal("git"),
				head: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u),
				dirty: z.boolean().nullable()
			}),
			z.strictObject({
				kind: z.literal("none"),
				head: z.null(),
				dirty: z.null()
			}),
			z.strictObject({
				kind: z.literal("unknown"),
				head: z.null(),
				dirty: z.null()
			})
		]).nullable();
		graphShape = {
			schema: z.literal("HistoricalSourceGraph"),
			authority: z.literal("historical-reference"),
			root_alias: z.literal("$REFERENCE_ROOT"),
			root_sha256: digestSchema,
			inventory_state: z.enum([
				"complete",
				"partial",
				"unknown"
			]),
			entries: z.array(sourceEntrySchema),
			relationships: z.array(sourceRelationshipSchema),
			parse_failures: z.array(parseFailureSchema),
			exclusions: z.array(exclusionSchema),
			languages: z.array(z.string().min(1)),
			manifests: z.array(relativePathSchema),
			vcs: vcsSchema,
			provenance: z.strictObject({
				importer: z.string().min(1),
				importer_version: z.string().min(1).nullable(),
				caller: z.string().min(1).regex(/^[\w .:@\x2f+\x2d]+$/u)
			}),
			limitations: z.array(boundedTextSchema$1)
		};
		historicalSourceGraphStructureSchema = z.strictObject(graphShape).superRefine(checkGraphInvariants);
		historicalSourceGraphSchema = historicalSourceGraphStructureSchema.superRefine((graph, context) => {
			if (computeRootSha256(graph.entries, graph.exclusions) !== graph.root_sha256) context.addIssue({
				code: "custom",
				message: "Historical source root commitment does not match entries",
				path: ["root_sha256"]
			});
		});
		historicalSourceGraphInputSchema = z.strictObject({
			...graphShape,
			root_sha256: z.never().optional()
		});
		historicalSourceManifestBaseSchema = z.strictObject({
			schema: z.literal("HistoricalSourceManifest"),
			authority: z.literal("historical-reference"),
			manifest_id: prefixedDigestSchema("hsm"),
			graph_sha256: digestSchema,
			root_sha256: digestSchema,
			inventory_state: z.enum([
				"complete",
				"partial",
				"unknown"
			]),
			entry_count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
			relationship_count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER)
		});
		historicalSourceInventoryHasPartialFacts = (input) => input.limitations.length > 0 || input.exclusions.length > 0 || input.parse_failures.length > 0 || input.entries.some((entry) => entry.limitations.length > 0 || entry.kind === "file" && entry.content_state !== "hashed" || entry.kind === "directory" && entry.tree_state !== "enumerated" || entry.kind === "symlink" && entry.target_state !== "internal" || entry.kind === "unknown") || input.relationships.some(({ parse_state, resolution }) => parse_state !== "parsed" || resolution === "unresolved" || resolution === "unknown");
		historicalSourceParseFailureKey = (failure) => `${failure.path}\u0000${failure.parser}\u0000${failure.reason}`;
		historicalSourceRelationshipKey = (relationship) => `${relationship.from_path}\u0000${relationship.to}\u0000${relationship.kind}\u0000${relationship.resolution}\u0000${relationship.parse_state}`;
		checkSortedUnique = (values, field, context) => {
			for (let index = 1; index < values.length; index += 1) if (compareUnicodeCodePoints(values[index - 1] ?? "", values[index] ?? "") >= 0) {
				context.addIssue({
					code: "custom",
					message: `${field} must be sorted and unique by Unicode code point`,
					path: [field, index]
				});
				return;
			}
		};
		historicalSourceLanguages = (entries) => [...new Set(entries.flatMap((entry) => entry.kind === "file" && entry.language !== null ? [entry.language] : []))].sort(compareUnicodeCodePoints);
		historicalSourceManifests = (entries) => entries.flatMap((entry) => entry.kind === "file" && entry.classifications.includes("manifest") ? [entry.path] : []).sort(compareUnicodeCodePoints);
		checkRelationships = (graph, paths, context) => {
			const files = new Set(graph.entries.flatMap((entry) => entry.kind === "file" ? [entry.path] : []));
			for (const [index, relationship] of graph.relationships.entries()) {
				if (!files.has(relationship.from_path)) context.addIssue({
					code: "custom",
					message: "Relationship source must name an inventoried file",
					path: [
						"relationships",
						index,
						"from_path"
					]
				});
				if (relationship.resolution !== "internal") continue;
				const parsed = relativePathSchema.safeParse(relationship.to);
				if (!parsed.success || !paths.has(parsed.data)) context.addIssue({
					code: "custom",
					message: "Internal relationship target must be normalized and inventoried",
					path: [
						"relationships",
						index,
						"to"
					]
				});
			}
		};
		checkSymlinks = (graph, paths, context) => {
			const lookupPath = createReferenceSourcePathLookup(paths);
			const excludedPaths = createReferenceSourcePathLookup(graph.exclusions.map(({ path }) => path));
			const excludedKinds = new Map();
			for (const { path, entry_kind } of graph.exclusions) {
				const kinds = excludedKinds.get(path) ?? new Set();
				kinds.add(entry_kind);
				excludedKinds.set(path, kinds);
			}
			for (const [index, entry] of graph.entries.entries()) {
				if (entry.kind !== "symlink") continue;
				if (entry.target === null) continue;
				const resolved = posix.normalize(posix.join(posix.dirname(entry.path), entry.target));
				const escapesRoot = resolved.startsWith("../") || resolved === "..";
				const inventoried = resolved === "." || lookupPath.resolve(resolved) !== undefined;
				const exactExcluded = excludedPaths.resolve(resolved);
				let excluded = exactExcluded !== undefined;
				for (let candidate = posix.dirname(resolved); candidate !== "." && candidate !== "/"; candidate = posix.dirname(candidate)) {
					const excludedAncestor = excludedPaths.resolve(candidate);
					if (excludedAncestor === undefined) continue;
					const kinds = excludedKinds.get(excludedAncestor);
					if (kinds?.size !== 1 || !kinds.has("directory")) {
						excluded = false;
						break;
					}
					excluded = true;
				}
				const ownedRelativeTarget = !entry.target.startsWith("/") && !escapesRoot && inventoried;
				const absolute = isPortableAbsoluteReferenceTarget(entry.target) && !(entry.target_state === "internal" && ownedRelativeTarget);
				if (entry.target_state === "external" && !absolute || entry.target_state === "internal" && absolute) context.addIssue({
					code: "custom",
					message: "Symlink target path does not match its target state",
					path: [
						"entries",
						index,
						"target"
					]
				});
				if (entry.target_state !== "internal") continue;
				if (escapesRoot || !inventoried && !excluded) context.addIssue({
					code: "custom",
					message: "Internal symlink target must resolve to an inventoried entry or a recorded exclusion",
					path: [
						"entries",
						index,
						"target"
					]
				});
			}
		};
		checkCompleteInventory = (graph, context) => {
			if (graph.inventory_state !== "complete" || !historicalSourceInventoryHasPartialFacts(graph)) return;
			context.addIssue({
				code: "custom",
				message: "Complete inventory cannot contain partial states, exclusions, failures, or limitations",
				path: ["inventory_state"]
			});
		};
		rootCommitment = (entries, exclusions) => ({
			entries: entries.map((entry) => {
				switch (entry.kind) {
					case "file": return {
						kind: entry.kind,
						path: entry.path,
						sha256: entry.sha256,
						size: entry.size,
						content_state: entry.content_state
					};
					case "directory": return {
						kind: entry.kind,
						path: entry.path,
						tree_state: entry.tree_state
					};
					case "symlink": return {
						kind: entry.kind,
						path: entry.path,
						target: entry.target,
						target_state: entry.target_state
					};
					case "unknown": return {
						kind: entry.kind,
						path: entry.path
					};
				}
			}),
			exclusions
		});
		computeRootSha256 = (entries, exclusions) => digestCanonicalValue(rootCommitment(entries, exclusions), "Reference source graph");
		createHistoricalSourceGraph = (input) => {
			const parsed = historicalSourceGraphInputSchema.parse(input);
			return historicalSourceGraphSchema.parse({
				...parsed,
				root_sha256: computeRootSha256(parsed.entries, parsed.exclusions)
			});
		};
		parseHistoricalSourceGraph = (input) => historicalSourceGraphSchema.parse(input);
		computeHistoricalSourceGraphSha256 = (input) => digestCanonicalValue(parseHistoricalSourceGraph(input), "Reference source graph");
		createHistoricalSourceManifest = (input) => {
			const graph = parseHistoricalSourceGraph(input);
			const semantic = {
				schema: "HistoricalSourceManifest",
				authority: "historical-reference",
				graph_sha256: computeHistoricalSourceGraphSha256(graph),
				root_sha256: graph.root_sha256,
				inventory_state: graph.inventory_state,
				entry_count: graph.entries.length,
				relationship_count: graph.relationships.length
			};
			return historicalSourceManifestBaseSchema.parse({
				...semantic,
				manifest_id: `hsm_${digestCanonicalValue(semantic, "Reference source graph")}`
			});
		};
		parseHistoricalSourceManifest = (input) => {
			const manifest = historicalSourceManifestBaseSchema.parse(input);
			const { manifest_id: manifestId, ...semantic } = manifest;
			if (`hsm_${digestCanonicalValue(semantic, "Reference source graph")}` !== manifestId) throw new TypeError("Historical source manifest identifier does not match");
			return manifest;
		};
	})))();
}

//#endregion
//#region dist/domain/canonicalOrdering.js
var uniqueSorted$1, compareAsciiStrings, isSortedUniqueAscii;
function init_canonicalOrdering() {
	return (init_canonicalOrdering = __esmMin((() => {
		init_unicodeCodePointOrder();
		uniqueSorted$1 = (values) => [...new Set(values)].sort(compareUnicodeCodePoints);
		compareAsciiStrings = (left, right) => left < right ? -1 : left > right ? 1 : 0;
		isSortedUniqueAscii = (values) => values.every((value, index) => index === 0 || compareAsciiStrings(values[index - 1] ?? "", value) < 0);
	})))();
}

//#endregion
//#region dist/domain/jsonStringByteLength.js
var jsonStringByteLength;
function init_jsonStringByteLength() {
	return (init_jsonStringByteLength = __esmMin((() => {
		jsonStringByteLength = (value, budget = Number.POSITIVE_INFINITY) => {
			let bytes = 2;
			for (let index = 0; index < value.length && bytes <= budget; index++) {
				const unit = value.charCodeAt(index);
				if (unit === 34 || unit === 92) bytes += 2;
				else if (unit < 32) bytes += unit === 8 || unit === 9 || unit === 10 || unit === 12 || unit === 13 ? 2 : 6;
				else if (unit < 128) bytes += 1;
				else if (unit < 2048) bytes += 2;
				else if (unit >= 55296 && unit <= 56319) {
					const next = value.charCodeAt(index + 1);
					if (next >= 56320 && next <= 57343) {
						bytes += 4;
						index++;
					} else bytes += 6;
				} else if (unit >= 56320 && unit <= 57343) bytes += 6;
				else bytes += 3;
			}
			return bytes;
		};
	})))();
}

//#endregion
//#region dist/domain/jsonValueByteLength.js
var jsonValueByteLength;
function init_jsonValueByteLength() {
	return (init_jsonValueByteLength = __esmMin((() => {
		init_jsonStringByteLength();
		jsonValueByteLength = (value, budget = Number.POSITIVE_INFINITY) => {
			if (typeof value === "string") return jsonStringByteLength(value, budget);
			if (Array.isArray(value)) {
				let bytes = 2 + Math.max(0, value.length - 1);
				for (const child of value) {
					if (bytes > budget) break;
					bytes += jsonValueByteLength(child, budget - bytes);
				}
				return bytes;
			}
			if (value !== null && typeof value === "object") {
				const keys = Object.keys(value);
				let bytes = 2 + Math.max(0, keys.length - 1);
				for (const key of keys) {
					if (bytes > budget) break;
					bytes += jsonStringByteLength(key, budget - bytes) + 1;
					if (bytes <= budget) bytes += jsonValueByteLength(value[key], budget - bytes);
				}
				return bytes;
			}
			return typeof value === "number" && !Number.isFinite(value) ? 4 : String(value).length;
		};
	})))();
}

//#endregion
//#region dist/domain/apple/machoTargetSelection.js
var machoTargetSelectionSchema, profileMachoTargetSelection, MACHO_CPU_TYPES, machoSliceArchitectureSchema, machoTargetSelectionMatchesArchitecture, machoSelectionContainsRange, machoTargetSelectionMatchesFormat, sameMachoTargetSelection, metadataReportSubjectFormat, selectedSliceAgreesWithReport;
function init_machoTargetSelection() {
	return (init_machoTargetSelection = __esmMin((() => {
		machoTargetSelectionSchema = z.strictObject({
			kind: z.literal("macho-selected-image-v1"),
			container: z.enum(["thin", "fat"]),
			offset: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
			byte_length: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
			cpu_type: z.number().int().nonnegative().max(4294967295),
			/** Keep the complete raw subtype, including capability bits. */
			cpu_subtype: z.number().int().nonnegative().max(4294967295),
			container_table_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable()
		}).superRefine((selection, context) => {
			if (selection.container === "thin" && (selection.offset !== 0 || selection.container_table_sha256 !== null) || selection.container === "fat" && selection.container_table_sha256 === null) context.addIssue({
				code: "custom",
				message: "Invalid Mach-O container identity"
			});
		});
		profileMachoTargetSelection = (profile) => {
			const raw = profile?.parameters.target_selection;
			if (raw === undefined) return undefined;
			const parsed = machoTargetSelectionSchema.safeParse(raw);
			return parsed.success ? parsed.data : undefined;
		};
		MACHO_CPU_TYPES = {
			x86: 7,
			x86_64: 16777223,
			arm: 12,
			arm64: 16777228
		};
		machoSliceArchitectureSchema = z.enum([
			"x86",
			"x86_64",
			"arm",
			"arm64"
		]).describe("CPU family of the slice to read from a universal (FAT) Mach-O. Required for universal files and rejected for every other image.");
		machoTargetSelectionMatchesArchitecture = (selection, architecture) => {
			const cpuTypes = MACHO_CPU_TYPES;
			return cpuTypes[architecture] === selection.cpu_type;
		};
		machoSelectionContainsRange = (selection, fileBytes, offset, bytes) => selection.offset + selection.byte_length <= fileBytes && offset >= selection.offset && bytes <= selection.offset + selection.byte_length - offset;
		machoTargetSelectionMatchesFormat = (selection, format) => selection.container === (format === "mach-o" ? "thin" : "fat");
		sameMachoTargetSelection = (left, right) => left !== undefined && right !== undefined && left.container === right.container && left.offset === right.offset && left.byte_length === right.byte_length && left.cpu_type === right.cpu_type && left.cpu_subtype === right.cpu_subtype && left.container_table_sha256 === right.container_table_sha256;
		metadataReportSubjectFormat = (report) => report.format !== "macho" ? report.format : report.selected_slice === undefined ? "mach-o" : "mach-o-universal";
		selectedSliceAgreesWithReport = (selection, format, architecture) => selection.container === "fat" && format === "macho" && architecture !== undefined && machoTargetSelectionMatchesArchitecture(selection, architecture);
	})))();
}

//#endregion
//#region dist/domain/stringPatterns.js
var IDENTIFIER_PATTERN, STABLE_IDENTIFIER_PATTERN, BASE64_QUARTET_LENGTH_PATTERN, INVALID_BASE64_CHARACTER_PATTERN, INVALID_BASE64_PADDING_PATTERN, INVALID_CANONICAL_BASE64_PAD_BITS_PATTERN, isPaddedBase64, isCanonicalBase64, paddedBase64SchemaRules, canonicalBase64Schema;
function init_stringPatterns() {
	return (init_stringPatterns = __esmMin((() => {
		IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9._\x2d]*$/u;
		STABLE_IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9._:\x2f\x2d]*$/u;
		BASE64_QUARTET_LENGTH_PATTERN = /^(?:....)*$/;
		INVALID_BASE64_CHARACTER_PATTERN = /[^A-Za-z0-9+\x2f=]/;
		INVALID_BASE64_PADDING_PATTERN = /(?:=[^=]|===)/;
		INVALID_CANONICAL_BASE64_PAD_BITS_PATTERN = /(?:[^AQgw]==$|[BCDFGHJKLNOPRSTVWXZabdefhijlmnpqrtuvxyz1235679+\x2f]=$)/;
		isPaddedBase64 = (value) => value.length % 4 === 0 && !INVALID_BASE64_CHARACTER_PATTERN.test(value) && !INVALID_BASE64_PADDING_PATTERN.test(value);
		isCanonicalBase64 = (value) => isPaddedBase64(value) && !INVALID_CANONICAL_BASE64_PAD_BITS_PATTERN.test(value);
		paddedBase64SchemaRules = [
			{ pattern: BASE64_QUARTET_LENGTH_PATTERN.source },
			{ not: { pattern: INVALID_BASE64_CHARACTER_PATTERN.source } },
			{ not: { pattern: INVALID_BASE64_PADDING_PATTERN.source } }
		];
		canonicalBase64Schema = z.string().refine(isCanonicalBase64, "Expected canonical padded base64").meta({ allOf: [...paddedBase64SchemaRules, { not: { pattern: INVALID_CANONICAL_BASE64_PAD_BITS_PATTERN.source } }] });
	})))();
}

//#endregion
//#region dist/domain/evidenceReference.js
var retainedEvidenceReferenceSchema, evidenceInputSchema;
function init_evidenceReference() {
	return (init_evidenceReference = __esmMin((() => {
		init_digests();
		init_evidence();
		retainedEvidenceReferenceSchema = z.strictObject({
			kind: z.literal("retained-evidence"),
			evidence_id: prefixedDigestSchema("ev")
		});
		evidenceInputSchema = z.union([evidenceSchema, retainedEvidenceReferenceSchema]);
	})))();
}

//#endregion
//#region dist/domain/protobufWire.js
var protobufOptionsSchema, index, issueSchema, protobufFieldSchema, protobufFrameSchema, protobufDecodingObjectSchema, protobufDecodingSchema;
function init_protobufWire() {
	return (init_protobufWire = __esmMin((() => {
		init_localPath();
		protobufOptionsSchema = z.strictObject({
			framing: z.enum([
				"auto",
				"raw",
				"grpc",
				"grpc-web",
				"grpc-web-text"
			]).default("auto"),
			body_pointers: z.array(z.string()).optional(),
			schema: z.strictObject({
				descriptor_set_path: absoluteLocalPathStringSchema,
				message_type: z.string().min(1)
			}).optional()
		});
		index = z.number().int().nonnegative();
		issueSchema = z.strictObject({
			offset: index,
			reason: z.string()
		});
		protobufFieldSchema = z.strictObject({
			index,
			frame_index: index,
			field_id: z.string(),
			parent_field_id: z.string().nullable(),
			parent_index: index.nullable(),
			number: z.number().int().positive().max(536870911),
			wire_type: z.enum([
				"varint",
				"i64",
				"len",
				"i32",
				"group"
			]),
			offset: index,
			bytes: index,
			payload_offset: index,
			payload_bytes: index,
			value: z.string().exactOptional(),
			text: z.string().exactOptional(),
			interpretations: z.array(z.enum([
				"utf8-string",
				"nested-message",
				"packed-varint",
				"packed-fixed32",
				"packed-fixed64",
				"bytes"
			])).exactOptional(),
			schema_name: z.string().exactOptional(),
			schema_type: z.string().exactOptional(),
			schema_value: z.string().exactOptional(),
			schema_enum_values: z.array(z.strictObject({
				number: z.string(),
				names: z.array(z.string())
			})).exactOptional(),
			schema_status: z.enum([
				"decoded",
				"unknown-field",
				"wire-type-mismatch",
				"invalid-message",
				"unsupported"
			]).exactOptional(),
			schema_error: issueSchema.exactOptional()
		});
		protobufFrameSchema = z.strictObject({
			index,
			kind: z.enum(["data", "trailer"]),
			offset: index,
			payload_offset: index,
			bytes: index,
			compressed: z.boolean(),
			status: z.enum([
				"complete",
				"partial",
				"unknown"
			]),
			examined_bytes: index,
			error: issueSchema.exactOptional(),
			trailers: z.array(z.strictObject({
				name: z.string(),
				value: z.string()
			})).exactOptional()
		});
		protobufDecodingObjectSchema = z.strictObject({
			pointer: z.string(),
			content_type: z.string().nullable(),
			decoder: z.literal("rea-protobuf-wire-v1"),
			body_sha256: z.string().regex(/^[0-9a-f]{64}$/),
			framing: z.enum([
				"raw",
				"grpc",
				"grpc-web",
				"grpc-web-text"
			]),
			offset_basis: z.enum(["retained-body", "base64-decoded-body"]),
			decoded_bytes: index,
			status: z.enum([
				"complete",
				"partial",
				"unknown"
			]),
			examined_bytes: index,
			frames: z.array(protobufFrameSchema),
			fields: z.array(protobufFieldSchema),
			error: issueSchema.exactOptional(),
			limitations: z.array(z.string()),
			schema: z.strictObject({
				decoder: z.literal("protobuf-es-2.16.0"),
				descriptor_set_path: z.string(),
				descriptor_set_sha256: z.string().regex(/^[0-9a-f]{64}$/),
				descriptor_set_bytes: index,
				message_type: z.string()
			}).exactOptional()
		});
		protobufDecodingSchema = protobufDecodingObjectSchema.superRefine((body, context) => {
			const issue = (path, message) => context.addIssue({
				code: "custom",
				path,
				message
			});
			if (body.examined_bytes > body.decoded_bytes) issue(["examined_bytes"], "Examined bytes exceed the decoded body");
			if (body.status === "complete" && (body.error !== undefined || body.frames.some((frame) => frame.status !== "complete"))) issue(["status"], "Complete body contradicts frame coverage");
			let expectedOffset = 0;
			for (const [index, frame] of body.frames.entries()) {
				if (frame.offset !== expectedOffset || frame.payload_offset !== frame.offset + (body.framing === "raw" ? 0 : 5)) issue([
					"frames",
					index,
					"offset"
				], "Frames must preserve contiguous protocol ranges");
				expectedOffset = frame.payload_offset + frame.bytes;
				if (frame.index !== index || frame.payload_offset < frame.offset || frame.payload_offset + frame.bytes > body.decoded_bytes || frame.examined_bytes > frame.bytes) issue(["frames", index], "Frame identity or range contradicts the body");
				if (frame.status === "complete" && (frame.error !== undefined || frame.examined_bytes !== frame.bytes || frame.compressed)) issue([
					"frames",
					index,
					"status"
				], "Complete frame contradicts decoding coverage");
				if (body.framing === "grpc" && frame.kind === "trailer") issue([
					"frames",
					index,
					"kind"
				], "Native gRPC has no in-body trailer frame");
			}
			if (body.status === "complete" && (body.examined_bytes !== body.decoded_bytes || expectedOffset !== body.decoded_bytes)) issue(["status"], "Complete decoding must cover the whole decoded body");
			const ids = new Set();
			for (const [index, field] of body.fields.entries()) {
				const frame = body.frames[field.frame_index];
				if (field.index !== index || field.field_id !== `offset:${field.offset}` || ids.has(field.field_id)) issue(["fields", index], "Field occurrence identity is inconsistent");
				ids.add(field.field_id);
				if (frame === undefined || frame.kind !== "data" || field.offset < frame.payload_offset || field.offset + field.bytes > frame.payload_offset + frame.bytes || field.payload_offset < field.offset || field.payload_offset + field.payload_bytes > field.offset + field.bytes) issue(["fields", index], "Field range contradicts its frame");
				const parent = field.parent_index === null ? undefined : body.fields[field.parent_index];
				if (field.parent_index === null ? field.parent_field_id !== null : parent === undefined || parent.index >= index || parent.field_id !== field.parent_field_id || parent.frame_index !== field.frame_index || field.offset < parent.payload_offset || field.offset + field.bytes > parent.payload_offset + parent.payload_bytes) issue([
					"fields",
					index,
					"parent_field_id"
				], "Field parent contradicts its source range");
			}
		});
	})))();
}

//#endregion
//#region dist/domain/native/addressCoordinate.js
var addressCoordinate;
function init_addressCoordinate() {
	return (init_addressCoordinate = __esmMin((() => {
		addressCoordinate = (value) => {
			const separator = value.lastIndexOf(":0x");
			if (separator === 0) return null;
			const space = separator < 0 ? null : value.slice(0, separator);
			const offset = separator < 0 ? value : value.slice(separator + 1);
			if (!/^0x[0-9a-f]+$/u.test(offset)) return null;
			return {
				space,
				offset: BigInt(offset)
			};
		};
	})))();
}

//#endregion
//#region dist/domain/native/nativeApiBoundary.js
var inferenceConfidenceSchema, inferenceEvidenceSchema, inferredBoundaryTypeFacts, inferredReturnTypeSchema, inferredParameterTypeSchema, jumpTableDataSourceSchema, jumpTableMappingSchema, jumpTableDefaultTargetSchema, inferredJumpTableSchema, availableNativeApiBoundarySchema, unavailableNativeApiBoundarySchema, nativeApiBoundarySchema, nativeApiInspectionSubstepSchema, nativeApiInspectionResultSchema;
function init_nativeApiBoundary() {
	return (init_nativeApiBoundary = __esmMin((() => {
		inferenceConfidenceSchema = z.enum([
			"low",
			"medium",
			"high"
		]);
		inferenceEvidenceSchema = z.object({
			kind: z.enum([
				"signature-source",
				"decompiler-type",
				"type-lock",
				"calling-convention",
				"jump-table"
			]),
			source: z.string().min(1),
			detail: z.string().min(1)
		}).strict();
		inferredBoundaryTypeFacts = {
			ordinal: z.number().int().min(0).nullable(),
			name: z.string().min(1).nullable(),
			data_type: z.string().min(1),
			size_bytes: z.number().int().min(0).nullable(),
			storage: z.string().min(1).nullable(),
			confidence: inferenceConfidenceSchema,
			evidence: z.array(inferenceEvidenceSchema).min(1),
			decompiler_artifacts: z.array(z.enum([
				"recovered-signature",
				"register-or-stack-storage",
				"compiler-generated-variable"
			]))
		};
		inferredReturnTypeSchema = z.strictObject({
			...inferredBoundaryTypeFacts,
			role: z.literal("return"),
			ordinal: z.null(),
			name: z.null()
		});
		inferredParameterTypeSchema = z.strictObject({
			...inferredBoundaryTypeFacts,
			role: z.literal("parameter"),
			ordinal: z.number().int().min(0)
		});
		jumpTableDataSourceSchema = z.object({
			address: z.string().min(1),
			provenance: z.enum([
				"ghidra-decompiler-load-table",
				"ghidra-dispatch-block-data-reference",
				"ghidra-aarch64-byte-table",
				"ghidra-aarch64-halfword-table"
			]),
			entry_size_bytes: z.number().int().min(1).nullable(),
			entry_count: z.number().int().min(0).nullable(),
			confidence: inferenceConfidenceSchema,
			evidence: z.array(inferenceEvidenceSchema).min(1)
		}).strict();
		jumpTableMappingSchema = z.object({
			case_value: z.number().int().nullable(),
			target_address: z.string().min(1),
			confidence: inferenceConfidenceSchema,
			evidence: z.array(inferenceEvidenceSchema).min(1)
		}).strict();
		jumpTableDefaultTargetSchema = z.strictObject({
			target_address: z.string().min(1),
			confidence: inferenceConfidenceSchema,
			evidence: z.array(inferenceEvidenceSchema).min(1)
		});
		inferredJumpTableSchema = z.object({
			dispatch_address: z.string().min(1),
			data_sources: z.array(jumpTableDataSourceSchema),
			mappings: z.array(jumpTableMappingSchema),
			default_targets: z.array(jumpTableDefaultTargetSchema),
			limitations: z.array(z.string())
		}).strict();
		availableNativeApiBoundarySchema = z.object({
			available: z.literal(true),
			provenance: z.string().min(1),
			signature_source: z.string().min(1),
			calling_convention: z.string().min(1),
			return_type: inferredReturnTypeSchema,
			parameters: z.array(inferredParameterTypeSchema),
			jump_tables: z.array(inferredJumpTableSchema),
			pseudocode: z.object({
				classification: z.literal("decompiler-generated-non-source"),
				compilable: z.literal(false)
			}).strict(),
			decompiler_artifacts: z.array(z.enum([
				"recovered-signature",
				"register-and-stack-variables",
				"compiler-generated-control-flow",
				"pointer-arithmetic",
				"pseudocode"
			])),
			limitations: z.array(z.string())
		}).strict();
		unavailableNativeApiBoundarySchema = z.object({
			available: z.literal(false),
			reason: z.string().min(1),
			residual_unknowns: z.array(z.string().min(1)).min(1)
		}).strict();
		nativeApiBoundarySchema = z.discriminatedUnion("available", [unavailableNativeApiBoundarySchema, availableNativeApiBoundarySchema]);
		nativeApiInspectionSubstepSchema = z.object({
			operation: z.enum([
				"analyze_function",
				"project_native_api_boundary",
				"preserve_residual_unknowns"
			]),
			status: z.enum(["completed", "unsupported"]),
			observations: z.array(z.string().min(1))
		}).strict();
		nativeApiInspectionResultSchema = z.object({
			procedure: z.object({
				address: z.string().min(1),
				name: z.string().min(1)
			}).strict(),
			boundary: nativeApiBoundarySchema,
			substeps: z.array(nativeApiInspectionSubstepSchema).length(3),
			unsupported_branches: z.array(z.string().min(1)),
			residual_unknowns: z.array(z.string().min(1))
		}).strict();
	})))();
}

//#endregion
//#region dist/domain/native/nativeValueFlow.js
var nativeVarnodeSchema, nativePcodeOperationSchema, nativePcodeDefUseSchema, nativePcodeEffectSchema, nativeValueFlowSchema;
function init_nativeValueFlow() {
	return (init_nativeValueFlow = __esmMin((() => {
		nativeVarnodeSchema = z.strictObject({
			kind: z.enum([
				"constant",
				"address",
				"register",
				"unique",
				"other"
			]),
			size_bytes: z.number().int().nonnegative(),
			location: z.string().nullable(),
			constant_hex: z.string().regex(/^[0-9a-f]+$/u).nullable()
		});
		nativePcodeOperationSchema = z.strictObject({
			id: z.string().min(1),
			address: z.string().min(1),
			sequence: z.number().int().nonnegative(),
			opcode: z.string().min(1),
			is_dead: z.boolean(),
			block_membership: z.enum([
				"member",
				"detached",
				"unavailable"
			]),
			inputs: z.array(nativeVarnodeSchema),
			output: nativeVarnodeSchema.nullable()
		});
		nativePcodeDefUseSchema = z.strictObject({
			definition: z.string().min(1),
			use: z.string().min(1),
			input_index: z.number().int().nonnegative()
		});
		nativePcodeEffectSchema = z.strictObject({
			operation: z.string().min(1),
			kind: z.enum([
				"memory_read",
				"memory_write",
				"conditional_branch",
				"indirect_branch",
				"direct_call",
				"indirect_call"
			]),
			operand_input: z.number().int().nonnegative().nullable(),
			value_input: z.number().int().nonnegative().nullable()
		});
		nativeValueFlowSchema = z.discriminatedUnion("available", [z.strictObject({
			available: z.literal(true),
			provenance: z.literal("ghidra-high-pcode"),
			operations: z.array(nativePcodeOperationSchema),
			def_use: z.array(nativePcodeDefUseSchema),
			effects: z.array(nativePcodeEffectSchema),
			parameters: z.array(z.strictObject({
				ordinal: z.number().int().nonnegative(),
				name: z.string(),
				data_type: z.string()
			})),
			parameter_uses: z.array(z.strictObject({
				ordinal: z.number().int().nonnegative(),
				use: z.string(),
				input_index: z.number().int().nonnegative()
			})),
			truncated: z.boolean(),
			omitted_operations_lower_bound: z.number().int().nonnegative(),
			known_omitted_inputs: z.number().int().nonnegative(),
			known_omitted_edges: z.number().int().nonnegative(),
			limitations: z.array(z.string().min(1))
		}), z.strictObject({
			available: z.literal(false),
			reason: z.string().min(1),
			limitations: z.array(z.string().min(1))
		})]);
	})))();
}

//#endregion
//#region dist/domain/native/nativeCallReference.js
var nativeCallClassificationSchema, nativeCallReferenceSchema;
function init_nativeCallReference() {
	return (init_nativeCallReference = __esmMin((() => {
		nativeCallClassificationSchema = z.strictObject({
			classification: z.enum([
				"none",
				"unknown",
				"direct",
				"objective_c"
			]),
			provider_type: z.number().int(),
			provenance: z.string().min(1)
		});
		nativeCallReferenceSchema = nativeCallClassificationSchema.extend({
			source_address: z.string(),
			target_address: z.string()
		});
	})))();
}

//#endregion
//#region dist/domain/hopperValues.js
var addressDistance, procedureMapSchema, addressedNamesSchema, addressedNameMapSchema, segmentSchema, unavailableAnalysisFactSchema, analysisStringSchema, analysisBookmarkSchema, functionBodySchema, functionBodyEntryAgrees, procedureClassificationSchema, procedureIdentitySchema, localVariableSchema, functionInstructionWindowSchema, availableReferenceKindSchema, referenceKindSchema, unresolvedCallSchema, swiftStringLiteralFields, swiftStringLiteralSchema, swiftStringLiteralOmissionFields, swiftStringLiteralOmissionSchema, referenceEdgeSchema, facetAvailabilitySchema, functionDossierSchema, parseFunctionDossier, parseProcedures, parseNames, parseRelatedAddresses, parseSegments, parseSegmentImageBase, projectBinaryOverview, parseDocuments, parseListCount, unwrapProperty, invalid;
function init_hopperValues() {
	return (init_hopperValues = __esmMin((() => {
		init_fixedTupleSchema();
		init_addressCoordinate();
		init_result();
		init_nativeApiBoundary();
		init_nativeValueFlow();
		init_nativeCallReference();
		init_analysisErrorCore();
		addressDistance = (start, end) => {
			const left = addressCoordinate(start);
			const right = addressCoordinate(end);
			if (left === null || right === null || left.space !== right.space) return null;
			const distance = right.offset - left.offset;
			if (distance < 0n || distance > BigInt(Number.MAX_SAFE_INTEGER)) return null;
			return Number(distance);
		};
		procedureMapSchema = z.record(z.string(), z.string());
		addressedNamesSchema = z.array(z.object({
			address: z.string(),
			name: z.string()
		}));
		addressedNameMapSchema = z.record(z.string(), z.string());
		segmentSchema = z.object({
			name: z.string(),
			start: z.string(),
			end: z.string(),
			readable: z.boolean().nullable(),
			writable: z.boolean().nullable(),
			executable: z.boolean().nullable(),
			image_base: z.string().min(1).exactOptional(),
			address_space: z.string().min(1).exactOptional()
		});
		unavailableAnalysisFactSchema = z.object({
			available: z.literal(false),
			reason: z.string()
		}).strict();
		analysisStringSchema = z.object({
			address: z.string(),
			value: z.string(),
			provider_value: z.string().exactOptional().describe("Original provider display text, which may shorten the typed object."),
			decoding: unavailableAnalysisFactSchema.exactOptional().describe("When present, value retains native display text because typed bytes could not be decoded."),
			string: z.object({
				encoding: z.string().min(1),
				encoding_status: z.enum(["observed", "inferred"]).exactOptional().describe("Whether the provider declares the encoding or REA infers it from the typed bytes and native display. This does not establish the original source's intended encoding."),
				termination: z.enum(["missing", "present_or_not_required"]),
				byte_length: z.number().int().min(0)
			}).exactOptional()
		});
		analysisBookmarkSchema = z.strictObject({
			address: z.string(),
			name: z.string().nullable()
		});
		functionBodySchema = z.discriminatedUnion("available", [unavailableAnalysisFactSchema, z.strictObject({
			available: z.literal(true),
			provenance: z.string().min(1),
			ranges: z.array(z.strictObject({
				start: z.string(),
				end: z.string().describe("Inclusive last address of this observed body range.")
			})),
			total_bytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
			span_bytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
			non_contiguous: z.boolean(),
			contains_entry: z.boolean()
		}).superRefine((body, context) => {
			let total = 0n;
			const bounds = new Map();
			const closedSpaces = new Set();
			let previousSpace;
			for (const range of body.ranges) {
				const start = addressCoordinate(range.start);
				const end = addressCoordinate(range.end);
				if (start === null || end === null || start.space !== end.space || end.offset < start.offset) {
					context.addIssue({
						code: "custom",
						message: "Function body range has invalid inclusive endpoints"
					});
					return;
				}
				if (previousSpace !== undefined && previousSpace !== start.space) closedSpaces.add(previousSpace);
				const previous = bounds.get(start.space);
				if (closedSpaces.has(start.space) || previous !== undefined && start.offset <= previous.end + 1n) {
					context.addIssue({
						code: "custom",
						message: "Function body ranges must be ordered, disjoint and maximal within each address space"
					});
					return;
				}
				bounds.set(start.space, {
					start: previous?.start ?? start.offset,
					end: end.offset
				});
				previousSpace = start.space;
				total += end.offset - start.offset + 1n;
			}
			const onlyBounds = bounds.size === 1 ? [...bounds.values()][0] : undefined;
			const span = bounds.size === 0 ? 0n : onlyBounds === undefined ? null : onlyBounds.end - onlyBounds.start + 1n;
			const reportedSpan = body.span_bytes === null ? null : BigInt(body.span_bytes);
			if (total !== BigInt(body.total_bytes) || span !== reportedSpan || body.non_contiguous !== body.ranges.length > 1) context.addIssue({
				code: "custom",
				message: "Function body counts, enclosing span or contiguity disagree with inclusive ranges"
			});
		})]);
		functionBodyEntryAgrees = (body, address) => {
			if (!body.available) return true;
			const entry = addressCoordinate(address);
			if (entry === null) return false;
			const contains = body.ranges.some((range) => {
				const start = addressCoordinate(range.start);
				const end = addressCoordinate(range.end);
				return start !== null && end !== null && start.space === entry.space && entry.offset >= start.offset && entry.offset <= end.offset;
			});
			return contains === body.contains_entry;
		};
		procedureClassificationSchema = z.object({
			external: z.boolean(),
			thunk: z.boolean(),
			thunk_target: z.string().nullable(),
			provenance: z.string().min(1)
		}).strict();
		procedureIdentitySchema = z.object({
			address: z.string(),
			name: z.string(),
			classification: procedureClassificationSchema.nullable(),
			body: functionBodySchema
		}).strict().superRefine((identity, context) => {
			if (!functionBodyEntryAgrees(identity.body, identity.address)) context.addIssue({
				code: "custom",
				message: "Function body entry membership disagrees with procedure identity"
			});
		});
		localVariableSchema = z.object({
			description: z.string(),
			provenance: z.string().min(1),
			name: z.string().nullable().exactOptional(),
			stack_displacement: z.string().regex(/^-?\d+$/u).nullable().exactOptional().describe("Observed signed stack byte displacement, encoded as decimal to preserve precision.")
		}).strict();
		functionInstructionWindowSchema = z.object({
			procedure: procedureIdentitySchema,
			instructions: z.array(z.string()),
			limitations: z.array(z.string())
		}).strict();
		availableReferenceKindSchema = z.object({
			available: z.literal(true),
			provenance: z.string().min(1),
			type: z.string(),
			flow: z.boolean(),
			call: z.boolean(),
			jump: z.boolean(),
			data: z.boolean(),
			read: z.boolean(),
			write: z.boolean(),
			indirect: z.boolean(),
			computed: z.boolean(),
			conditional: z.boolean(),
			terminal: z.boolean(),
			primary: z.boolean(),
			operand_index: z.number().int(),
			external: z.boolean()
		}).strict();
		referenceKindSchema = z.discriminatedUnion("available", [unavailableAnalysisFactSchema, availableReferenceKindSchema]);
		unresolvedCallSchema = z.strictObject({
			address: z.string(),
			reason: z.string()
		});
		swiftStringLiteralFields = {
			source_address: z.string().describe("Instruction that consumes both words: a call, tail call, return, or paired store."),
			value: z.string().describe("Decoded UTF-8 text, including the canonical empty string."),
			registers: fixedTupleSchema([z.string(), z.string()]),
			words: fixedTupleSchema([z.string(), z.string()]).describe("Observed constant register values, in register order.")
		};
		swiftStringLiteralSchema = z.discriminatedUnion("representation", [z.strictObject({
			...swiftStringLiteralFields,
			representation: z.literal("small").describe("The UTF-8 bytes are inside the two words."),
			address: z.null().describe("A small literal has no storage of its own.")
		}), z.strictObject({
			...swiftStringLiteralFields,
			representation: z.literal("large").describe("An immortal literal whose words hold its count and a pointer to its bytes."),
			address: z.string().describe("Address of a large literal's bytes.")
		})]);
		swiftStringLiteralOmissionFields = {
			source_address: swiftStringLiteralFields.source_address,
			byte_length: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
			reason: z.enum(["capacity", "unresolved_jump"]).describe("Why this candidate is omitted: capacity stopped decoding, or an unresolved jump left its use unknown."),
			registers: swiftStringLiteralFields.registers,
			words: swiftStringLiteralFields.words
		};
		swiftStringLiteralOmissionSchema = z.discriminatedUnion("representation", [z.strictObject({
			...swiftStringLiteralOmissionFields,
			representation: z.literal("small"),
			address: z.null()
		}), z.strictObject({
			...swiftStringLiteralOmissionFields,
			representation: z.literal("large"),
			address: z.string().describe("Address of the literal's bytes.")
		})]);
		referenceEdgeSchema = z.object({
			source_address: z.string(),
			target_address: z.string(),
			source_procedure: procedureIdentitySchema.nullable(),
			target_procedure: procedureIdentitySchema.nullable(),
			kind: referenceKindSchema,
			call: nativeCallClassificationSchema.exactOptional()
		}).strict();
		facetAvailabilitySchema = z.discriminatedUnion("available", [z.object({ available: z.literal(true) }).strict(), z.object({
			available: z.literal(false),
			reason: z.string().min(1)
		}).strict()]);
		functionDossierSchema = z.object({
			procedure: procedureIdentitySchema.safeExtend({
				signature: z.string().nullable(),
				locals: z.array(localVariableSchema)
			}),
			pseudocode: z.string(),
			assembly: z.array(z.string()),
			comments: z.array(z.object({
				address: z.string(),
				kind: z.enum(["comment", "inline"]),
				text: z.string()
			}).strict()),
			callers: z.array(procedureIdentitySchema),
			callees: z.array(procedureIdentitySchema),
			incoming_references: z.array(referenceEdgeSchema),
			outgoing_references: z.array(referenceEdgeSchema),
			unresolved_calls: z.array(unresolvedCallSchema).exactOptional(),
			referenced_strings: z.array(analysisStringSchema.extend({ source_address: z.string() })),
			referenced_names: z.array(z.object({
				address: z.string(),
				value: z.string(),
				source_address: z.string()
			}).strict()),
			swift_string_literals: z.array(swiftStringLiteralSchema).exactOptional().describe("Swift String literals decoded from constant register values. Absent when the provider does not decode them for this target."),
			swift_string_literal_omissions: z.array(swiftStringLiteralOmissionSchema).exactOptional().describe("Literal candidates omitted for capacity or unresolved control flow. Present exactly when swift_string_literals is present; empty when all examined use sites were classified."),
			basic_blocks: z.array(z.object({
				start: z.string(),
				end: z.string(),
				successors: z.array(z.string())
			}).strict()),
			native_api: nativeApiBoundarySchema.nullable(),
			native_value_flow: nativeValueFlowSchema.nullable(),
			facet_availability: z.object({
				pseudocode: facetAvailabilitySchema.exactOptional(),
				assembly: facetAvailabilitySchema.exactOptional(),
				comments: facetAvailabilitySchema.exactOptional(),
				callers: facetAvailabilitySchema.exactOptional(),
				callees: facetAvailabilitySchema.exactOptional(),
				references: facetAvailabilitySchema.exactOptional(),
				strings_names: facetAvailabilitySchema.exactOptional(),
				cfg: facetAvailabilitySchema.exactOptional()
			}).strict().exactOptional(),
			limitations: z.array(z.string())
		}).strict();
		parseFunctionDossier = (value) => {
			const parsed = functionDossierSchema.safeParse(value);
			return parsed.success ? ok(parsed.data) : err(new AnalysisOutputError("analyze_function", "provider output did not match the dossier contract", { cause: parsed.error }));
		};
		parseProcedures = (value, operation = "list_procedures") => {
			const parsed = procedureMapSchema.safeParse(unwrapProperty(value, "procedures"));
			return parsed.success ? ok(Object.entries(parsed.data).map(([address, name]) => ({
				address,
				name
			}))) : invalid(operation, "procedure map", parsed.error);
		};
		parseNames = (value, operation = "list_names") => {
			const unwrapped = unwrapProperty(value, "names");
			const records = addressedNamesSchema.safeParse(unwrapped);
			if (records.success) return ok(records.data);
			const map = addressedNameMapSchema.safeParse(unwrapped);
			return map.success ? ok(Object.entries(map.data).map(([address, name]) => ({
				address,
				name
			}))) : invalid(operation, "name list", map.error);
		};
		parseRelatedAddresses = (value, relation, operation = relation === "callees" ? "procedure_callees" : "procedure_callers") => {
			const parsed = z.array(z.string()).safeParse(unwrapProperty(value, relation));
			return parsed.success ? ok(parsed.data) : invalid(operation, `${relation} list`, parsed.error);
		};
		parseSegments = (value, operation = "list_segments") => {
			const parsed = z.array(segmentSchema).safeParse(unwrapProperty(value, "segments"));
			return parsed.success ? ok(parsed.data) : invalid(operation, "segment list", parsed.error);
		};
		parseSegmentImageBase = (segments) => {
			const base = segments[0]?.image_base;
			return base !== undefined && segments.every((segment) => segment.image_base === base) ? base : undefined;
		};
		projectBinaryOverview = (input) => {
			const { document, procedure_count, string_count, segments } = input;
			const imageBase = segments === undefined ? undefined : parseSegmentImageBase(segments);
			return {
				document,
				...imageBase === undefined ? {} : { image_base: imageBase },
				...segments === undefined ? {} : {
					segments: segments.map(({ name, start, end, image_base, address_space }) => ({
						name,
						start,
						end,
						length: addressDistance(start, end),
						...image_base === undefined ? {} : { image_base },
						...address_space === undefined ? {} : { address_space }
					})),
					segment_count: segments.length
				},
				procedure_count,
				string_count
			};
		};
		parseDocuments = (value, operation = "list_documents") => {
			const parsed = z.array(z.string()).safeParse(unwrapProperty(value, "documents"));
			return parsed.success ? ok(parsed.data) : invalid(operation, "document list", parsed.error);
		};
		parseListCount = (value, property, operation = property === "procedures" ? "list_procedures" : "list_strings") => {
			const unwrapped = unwrapProperty(value, property);
			const list = z.array(z.unknown()).safeParse(unwrapped);
			if (list.success) return ok(list.data.length);
			const map = z.record(z.string(), z.unknown()).safeParse(unwrapped);
			return map.success ? ok(Object.keys(map.data).length) : invalid(operation, `${property} list`, map.error);
		};
		unwrapProperty = (value, property) => {
			if (typeof value === "object" && value !== null && !Array.isArray(value) && property in value) {
				return value[property] ?? null;
			}
			return value;
		};
		invalid = (operation, expected, cause) => err(new AnalysisOutputError(operation, `Provider returned an invalid ${expected}`, { cause }));
	})))();
}

//#endregion
//#region dist/domain/native/nativeInventory.js
var addressedValueSchema, nativeInventoryRowsSchemas, NATIVE_INVENTORY_OPERATIONS, nativeInventoryOperationSchema, isNativeInventoryOperation;
function init_nativeInventory() {
	return (init_nativeInventory = __esmMin((() => {
		init_hopperValues();
		addressedValueSchema = z.object({
			address: z.string(),
			value: z.string(),
			symbol: z.object({
				primary: z.boolean(),
				dynamic: z.boolean(),
				external: z.boolean(),
				type: z.string(),
				source: z.enum([
					"default",
					"analysis",
					"ai",
					"imported",
					"user_defined"
				])
			}).exactOptional(),
			objc_class_label: z.literal("hopper_legacy_class_object").exactOptional(),
			procedure: z.object({
				external: z.boolean(),
				thunk: z.boolean(),
				thunk_target: z.string().nullable()
			}).exactOptional(),
			string: z.object({
				encoding: z.string(),
				termination: z.enum(["missing", "present_or_not_required"]),
				byte_length: z.number().int().min(0)
			}).exactOptional()
		});
		nativeInventoryRowsSchemas = {
			names: z.array(addressedValueSchema),
			strings: z.array(analysisStringSchema)
		};
		NATIVE_INVENTORY_OPERATIONS = [
			"list_procedures",
			"search_procedures",
			"list_strings",
			"search_strings",
			"list_names"
		];
		nativeInventoryOperationSchema = z.enum(NATIVE_INVENTORY_OPERATIONS);
		isNativeInventoryOperation = (operation) => NATIVE_INVENTORY_OPERATIONS.some((supported) => supported === operation);
	})))();
}

//#endregion
//#region dist/domain/artifactFormatMetadata.js
var offset, uint32, godotPckMetadataSchema, godotPckEntryMetadataSchema, pyInstallerMetadataSchema, pyInstallerEntryMetadataSchema, artifactFormatMetadataSchema;
function init_artifactFormatMetadata() {
	return (init_artifactFormatMetadata = __esmMin((() => {
		offset = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
		uint32 = z.number().int().min(0).max(4294967295);
		godotPckMetadataSchema = z.strictObject({
			kind: z.literal("godot-pck"),
			format_version: uint32,
			engine_major: uint32,
			engine_minor: uint32,
			engine_patch: uint32,
			pack_start: offset,
			pack_end: offset,
			embedded: z.boolean(),
			pack_flags: uint32,
			file_base: offset,
			directory_start: offset,
			declared_file_count: uint32,
			directory_status: z.enum([
				"available",
				"encrypted",
				"sparse-bundle"
			])
		});
		godotPckEntryMetadataSchema = z.strictObject({
			kind: z.literal("godot-pck-entry"),
			index: uint32,
			source_path: z.string(),
			declared_offset: offset,
			flags: uint32,
			md5_status: z.enum(["declared", "all-zero"])
		});
		pyInstallerMetadataSchema = z.strictObject({
			kind: z.literal("pyinstaller"),
			layout_version: z.enum(["2.0", "2.1"]),
			archive_start: offset,
			archive_size: offset,
			cookie_offset: offset,
			toc_offset: offset,
			toc_size: offset,
			entry_count: offset,
			runtime_option_count: offset,
			external_dependency_count: offset,
			python_version_raw: uint32,
			python_major: uint32.nullable(),
			python_minor: uint32.nullable(),
			python_library: z.string().nullable(),
			encryption_marker_present: z.boolean()
		});
		pyInstallerEntryMetadataSchema = z.strictObject({
			kind: z.literal("pyinstaller-entry"),
			container: z.enum(["carchive", "pyz"]),
			container_name: z.string().nullable(),
			index: offset,
			source_name: z.string(),
			type_code: z.union([z.string().length(1), uint32]),
			relative_offset: offset,
			directory_record_offset: offset.nullable(),
			directory_record_size: offset.nullable(),
			compression_flag: z.union([z.literal(0), z.literal(1)]),
			bytecode_header: z.enum([
				"not-bytecode",
				"unknown",
				"derived"
			]),
			bytecode_magic: z.string().regex(/^[0-9a-f]{8}$/u).nullable(),
			pyz_status: z.enum([
				"not-pyz",
				"decoded",
				"opaque"
			]),
			pyz_sha256: z.string().regex(/^[0-9a-f]{64}$/u).nullable(),
			pyz_python_magic: z.string().regex(/^[0-9a-f]{8}$/u).nullable(),
			pyz_python_version: z.string().nullable(),
			pyz_entry_count: offset.nullable(),
			encryption_source: z.literal("carchive-marker").nullable(),
			dependency_status: z.enum(["unresolved", "invalid-reference"]).exactOptional(),
			dependency_archive: z.string().nullable().exactOptional(),
			dependency_member: z.string().nullable().exactOptional()
		});
		artifactFormatMetadataSchema = z.discriminatedUnion("kind", [
			godotPckMetadataSchema,
			godotPckEntryMetadataSchema,
			pyInstallerMetadataSchema,
			pyInstallerEntryMetadataSchema
		]);
	})))();
}

//#endregion
//#region dist/domain/artifactGraph.js
var artifactTraversalOmissionKindSchema, sha256Schema, artifactIdSchema$1, occurrenceIdSchema, edgeIdSchema, manifestIdSchema, extractionIdSchema, contradictionIdSchema, boundedRelativePathSchema, artifactKindSchema, artifactFormatSchema, artifactContentFormatSchema, artifactByteRangeSchema, artifactCommandSchema, artifactNodeSchema, artifactOccurrenceSchema, integrityContradictionBaseSchema, integrityContradictionSchema, artifactEdgeSchema, artifactGraphManifestSchema, artifactInventoryCoverageSchema, artifactInventoryResultSchema, extractedArtifactSchema, artifactExtractionManifestSchema, artifactExtractionResultSchema;
function init_artifactGraph() {
	return (init_artifactGraph = __esmMin((() => {
		init_artifactIntegrity();
		init_artifactFormatMetadata();
		init_digests();
		artifactTraversalOmissionKindSchema = z.enum([
			"fifo",
			"socket",
			"block-device",
			"character-device",
			"unsupported",
			"directory-descendants"
		]);
		sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
		artifactIdSchema$1 = prefixedDigestSchema("art");
		occurrenceIdSchema = prefixedDigestSchema("occ");
		edgeIdSchema = prefixedDigestSchema("edge");
		manifestIdSchema = prefixedDigestSchema("agm");
		extractionIdSchema = prefixedDigestSchema("aex");
		contradictionIdSchema = prefixedDigestSchema("ic");
		boundedRelativePathSchema = z.string().min(1).refine((path) => !path.startsWith("/") && path.split("/").every((part) => part !== "" && part !== ".."), "Expected a normalized relative POSIX path without traversal");
		artifactKindSchema = z.enum([
			"container",
			"executable",
			"dynamic-library",
			"framework",
			"native-addon",
			"javascript",
			"source-map",
			"plist",
			"entitlements",
			"resource",
			"universal-slice",
			"package-metadata",
			"unknown"
		]);
		artifactFormatSchema = z.enum([
			"dmg",
			"zip",
			"pkg",
			"asar",
			"godot-pck",
			"javascript-bundle",
			"source-map",
			"mach-o-universal",
			"mach-o",
			"elf",
			"pe",
			"dos-mz",
			"dos-com",
			"raw-binary",
			"hopper",
			"analysis-database",
			"ipa",
			"apk",
			"msix",
			"appx",
			"hap",
			"hsp",
			"app-pack",
			"plist",
			"entitlements",
			"directory",
			"file",
			"pyinstaller",
			"unknown"
		]);
		artifactContentFormatSchema = artifactFormatSchema.extract([
			"zip",
			"godot-pck",
			"mach-o-universal",
			"mach-o",
			"elf",
			"pe",
			"dos-mz",
			"plist",
			"directory",
			"file",
			"unknown"
		]);
		artifactByteRangeSchema = z.object({
			offset: z.number().int().min(0),
			length: z.number().int().min(0)
		});
		artifactCommandSchema = z.object({
			tool: z.string().min(1),
			arguments: z.array(z.string()),
			tool_version: z.string().nullable(),
			executable_sha256: sha256Schema.nullable(),
			exit_code: z.number().int().nullable(),
			effects: z.array(z.enum([
				"read",
				"write",
				"mount"
			]))
		});
		artifactNodeSchema = z.object({
			artifact_id: artifactIdSchema$1,
			format: artifactContentFormatSchema,
			sha256: sha256Schema,
			size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
			media_type: z.string().min(1).nullable(),
			architecture: z.string().min(1).nullable(),
			content_state: z.enum([
				"materialized",
				"embedded",
				"virtual"
			]),
			limitations: z.array(z.string())
		});
		artifactOccurrenceSchema = z.object({
			occurrence_id: occurrenceIdSchema,
			artifact_id: artifactIdSchema$1.nullable(),
			parent_occurrence_id: occurrenceIdSchema.nullable(),
			logical_path: boundedRelativePathSchema,
			entry_kind: z.enum([
				"file",
				"directory",
				"symlink",
				"slice",
				"metadata"
			]),
			artifact_kind: artifactKindSchema,
			artifact_format: artifactFormatSchema,
			declared_size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
			compressed_size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
			executable: z.boolean(),
			encrypted: z.boolean(),
			hash_status: z.enum([
				"verified",
				"mismatched",
				"not-hashed",
				"unavailable"
			]),
			source_location: artifactByteRangeSchema.nullable(),
			declared_integrity: artifactIntegrityClaimSchema.exactOptional(),
			format_metadata: artifactFormatMetadataSchema.exactOptional(),
			limitations: z.array(z.string())
		});
		integrityContradictionBaseSchema = z.object({
			contradiction_id: contradictionIdSchema,
			occurrence_id: occurrenceIdSchema,
			parent_artifact_id: artifactIdSchema$1,
			logical_path: boundedRelativePathSchema,
			entry_kind: z.enum(["file", "slice"]),
			unpacked: z.boolean(),
			trust: z.literal("observed-untrusted"),
			provenance: z.literal("container-integrity-metadata-versus-observed-bytes"),
			limitations: z.array(z.string()).min(1)
		});
		integrityContradictionSchema = z.union([integrityContradictionBaseSchema.extend(artifactSha256PairSchema.shape), integrityContradictionBaseSchema.extend(artifactMd5PairSchema.shape)]);
		artifactEdgeSchema = z.object({
			edge_id: edgeIdSchema,
			ordinal: z.number().int().min(0),
			parent_artifact_id: artifactIdSchema$1,
			relation: z.enum([
				"contains",
				"extracts",
				"slice-of",
				"embeds",
				"loads",
				"maps-source",
				"derived-from"
			]),
			occurrence_id: occurrenceIdSchema,
			producer: artifactCommandSchema.nullable()
		});
		artifactGraphManifestSchema = z.object({
			manifest_id: manifestIdSchema,
			root_artifact_id: artifactIdSchema$1,
			root_sha256: sha256Schema,
			root_format: artifactFormatSchema,
			graph_sha256: sha256Schema,
			node_count: z.number().int().min(1),
			occurrence_count: z.number().int().min(1),
			edge_count: z.number().int().min(0)
		});
		artifactInventoryCoverageSchema = z.strictObject({
			scope: z.enum(["root", "container-entries"]),
			status: z.enum(["complete", "unknown"])
		});
		artifactInventoryResultSchema = z.strictObject({
			manifest: artifactGraphManifestSchema,
			nodes: z.array(artifactNodeSchema),
			occurrences: z.array(artifactOccurrenceSchema),
			edges: z.array(artifactEdgeSchema),
			provenance: z.array(artifactCommandSchema),
			integrity_contradictions: z.array(integrityContradictionSchema),
			coverage: artifactInventoryCoverageSchema,
			limitations: z.array(z.string())
		});
		extractedArtifactSchema = z.object({
			artifact_id: artifactIdSchema$1,
			relative_path: boundedRelativePathSchema,
			sha256: sha256Schema,
			bytes_written: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
			created: z.boolean()
		});
		artifactExtractionManifestSchema = z.object({
			extraction_id: extractionIdSchema,
			source_manifest_id: manifestIdSchema,
			selected_occurrence_ids: z.array(occurrenceIdSchema),
			files_sha256: sha256Schema,
			output_root_alias: z.literal("$OUTPUT_ROOT")
		});
		artifactExtractionResultSchema = z.object({
			manifest: artifactGraphManifestSchema,
			extraction_manifest: artifactExtractionManifestSchema,
			output_root: z.string().min(1),
			artifacts: z.array(extractedArtifactSchema),
			containment_verified: z.boolean(),
			cleanup: z.object({
				attempted: z.boolean(),
				verified: z.boolean(),
				residual_paths: z.array(boundedRelativePathSchema)
			}),
			provenance: z.array(artifactCommandSchema),
			integrity_contradictions: z.array(integrityContradictionSchema),
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
//#region dist/domain/native/nativeDeadlines.js
var MAX_NATIVE_TIMER_MS, DEFAULT_NATIVE_COMMAND_TIMEOUT_MS, DEFAULT_NATIVE_UI_DEADLINE_MS, DEFAULT_PWNTOOLS_TIMEOUT_MS, NATIVE_UI_WAIT_STEP_MAX_MS, nativeDeadlineMsSchema, deadlineField, nativeCommandTimeoutField, nativeUiDeadlineField, pwntoolsTimeoutField, readNativeDeadline, nativeDeadlineRecovery, fixedNativeAllowance;
function init_nativeDeadlines() {
	return (init_nativeDeadlines = __esmMin((() => {
		init_fixedAllowanceRemediation();
		MAX_NATIVE_TIMER_MS = 2147483647;
		DEFAULT_NATIVE_COMMAND_TIMEOUT_MS = 6e4;
		DEFAULT_NATIVE_UI_DEADLINE_MS = 18e4;
		DEFAULT_PWNTOOLS_TIMEOUT_MS = 3e4;
		NATIVE_UI_WAIT_STEP_MAX_MS = 18e4;
		nativeDeadlineMsSchema = z.number().int().min(1).max(MAX_NATIVE_TIMER_MS);
		deadlineField = (description) => nativeDeadlineMsSchema.optional().describe(description);
		nativeCommandTimeoutField = deadlineField("Wall-clock budget in milliseconds for each macOS native command in this call (otool, lipo, codesign, plutil, swift-demangle, and the other allowlisted Xcode tools). Omitted means 60000. Integer from 1 to 2147483647. Applies on the next call. Does not raise the fixed 67108864-byte output allowance or the 65536-byte failure-diagnostic excerpt. Named native_command_timeout_ms rather than command_timeout_ms because command_timeout_ms is the separate one-shot objdump and rizin deadline (default 120000).");
		nativeUiDeadlineField = deadlineField("Deadline in milliseconds for this UI observation or scenario, including helper preparation and captures. Omitted means 180000. Integer from 1 to 2147483647. Applies on the next call. Does not raise the fixed 67108864-byte scenario output allowance or the 180000 ms cap on one wait step. A partial observation may already be retained when this deadline expires.");
		pwntoolsTimeoutField = deadlineField("Deadline in milliseconds for each owned pwntools command in this call. Omitted means 30000. Integer from 1 to 2147483647. Applies on the next call. Does not raise cpuSeconds 30 or the output (67108864 bytes), diagnostic (1048576 bytes), or address-space (3221225472 bytes) allowances. Artifact admission stays REA_PWNTOOLS_MAX_INPUT_BYTES (default 33554432 bytes).");
		readNativeDeadline = (value, defaultMs) => {
			if (value === undefined) return {
				ok: true,
				timeoutMs: defaultMs
			};
			const parsed = nativeDeadlineMsSchema.safeParse(value);
			if (parsed.success) return {
				ok: true,
				timeoutMs: parsed.data
			};
			const invalidType = parsed.error.issues.some((issue) => issue.code === "invalid_type");
			return {
				ok: false,
				reason: invalidType ? "invalid_type" : "out_of_range",
				message: `Expected an integer from 1 to ${String(MAX_NATIVE_TIMER_MS)} milliseconds; received ${JSON.stringify(value)}. Omitted means ${String(defaultMs)}.`
			};
		};
		nativeDeadlineRecovery = (input) => {
			const atMaximum = input.timeoutMs >= MAX_NATIVE_TIMER_MS;
			const adjustment = atMaximum ? `${input.setting} (${input.cliFlag} on the CLI) is already at the maximum ${String(MAX_NATIVE_TIMER_MS)} ms; do not increase it.` : `Increase ${input.setting} above ${String(input.timeoutMs)} (integer milliseconds from 1 to ${String(MAX_NATIVE_TIMER_MS)}; omitted means ${String(input.defaultMs)}), or pass ${input.cliFlag} on the CLI. A change applies on the next call.`;
			return {
				userMessage: `This request reached REA's ${input.phase} of ${String(input.timeoutMs)} ms (${input.setting}). This is a server/provider deadline, not the MCP client deadline.${input.detail ?? ""}`,
				remediationAction: `${adjustment} ${input.unchanged} Allow execution, cleanup, and delivery headroom in the outer MCP client deadline. Confirm outstanding work and cleanup before retrying.`
			};
		};
		fixedNativeAllowance = (allowance, kind, valueWithUnits) => ({
			retryable: false,
			remediationAction: `${fixedAllowanceRemediation(allowance, kind)} This release has no runtime override. The allowance is ${valueWithUnits}.`
		});
	})))();
}

//#endregion
//#region dist/domain/apple/bundleResourceRoot.js
var bundleResourceRootSchema, bundleResourceBoundResultSchema;
function init_bundleResourceRoot() {
	return (init_bundleResourceRoot = __esmMin((() => {
		bundleResourceRootSchema = z.strictObject({
			caller_path: z.string().min(1),
			canonical_path: z.string().min(1),
			info_plist_path: z.string().min(1),
			layout: z.enum(["contents", "root"]),
			executable_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable()
		});
		bundleResourceBoundResultSchema = (executableSha256, fields) => z.union([z.strictObject({
			target_sha256: executableSha256,
			resource_root: bundleResourceRootSchema.optional(),
			...fields
		}), z.strictObject({
			target_sha256: z.null(),
			resource_root: bundleResourceRootSchema,
			...fields
		})]);
	})))();
}

//#endregion
//#region dist/domain/artifactInspection.js
var textSchema$1, evidenceIdSchema$7, artifactIdSchema, inspectionObservationSchema, inspectionHypothesisSchema, inspectionContradictionBaseSchema, inspectionContradictionSchema, nextProbeSchema, unexploredBranchSchema, artifactInspectionResultSchema, createArtifactInspection, parseInventoryEvidence, allObservations, observation, allHypotheses, contradictions, probesFor, DIRECTORY_MEMBER_FORMATS, directoryProbes, probesForFormat, allUnexploredBranches, branch, inspectionCoverage;
function init_artifactInspection() {
	return (init_artifactInspection = __esmMin((() => {
		init_artifactIntegrity();
		init_artifactGraph();
		init_canonicalDigest();
		init_canonicalOrdering();
		init_evidence();
		init_jsonValue();
		init_digests();
		textSchema$1 = z.string().min(1);
		evidenceIdSchema$7 = prefixedDigestSchema("ev");
		artifactIdSchema = prefixedDigestSchema("art");
		inspectionObservationSchema = z.strictObject({
			observation_id: prefixedDigestSchema("aio"),
			kind: z.enum(["root-manifest", "integrity"]),
			subject: textSchema$1,
			value: jsonValueSchema,
			evidence_id: evidenceIdSchema$7
		});
		inspectionHypothesisSchema = z.strictObject({
			hypothesis_id: prefixedDigestSchema("aih"),
			statement: textSchema$1,
			confidence: z.enum(["medium", "low"]),
			basis_evidence_ids: z.array(evidenceIdSchema$7).min(1),
			limitation: textSchema$1
		});
		inspectionContradictionBaseSchema = z.strictObject({
			contradiction_id: prefixedDigestSchema("aic"),
			statement: textSchema$1,
			occurrence_id: prefixedDigestSchema("occ"),
			evidence_id: evidenceIdSchema$7
		});
		inspectionContradictionSchema = z.union([inspectionContradictionBaseSchema.extend(artifactSha256PairSchema.shape), inspectionContradictionBaseSchema.extend(artifactMd5PairSchema.shape)]);
		nextProbeSchema = z.strictObject({
			operation: textSchema$1,
			rationale: textSchema$1,
			authority: z.enum([
				"artifact-bytes",
				"managed-static-analysis",
				"native-analysis-provider",
				"ast-static-analysis"
			])
		});
		unexploredBranchSchema = z.strictObject({
			branch_id: prefixedDigestSchema("aib"),
			reason: z.enum(["format-specific-analysis-required", "unknown-format"]),
			detail: textSchema$1,
			next_probe: nextProbeSchema.nullable(),
			evidence_id: evidenceIdSchema$7
		});
		artifactInspectionResultSchema = z.strictObject({
			inspection_id: prefixedDigestSchema("ai"),
			subject: z.strictObject({
				manifest_id: prefixedDigestSchema("agm"),
				root_artifact_id: artifactIdSchema,
				root_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
				root_format: textSchema$1
			}),
			substeps: z.array(z.strictObject({
				substep_id: prefixedDigestSchema("ais"),
				operation: z.literal("inventory_artifact"),
				status: z.literal("completed"),
				evidence_id: evidenceIdSchema$7,
				evidence: evidenceSchema.safeExtend({
					operation: z.literal("inventory_artifact"),
					normalized_result: artifactInventoryResultSchema
				})
			})).min(1),
			observations: z.array(inspectionObservationSchema),
			hypotheses: z.array(inspectionHypothesisSchema),
			contradictions: z.array(inspectionContradictionSchema),
			unexplored_branches: z.array(unexploredBranchSchema),
			next_probes: z.array(nextProbeSchema),
			coverage: z.strictObject({
				status: z.enum([
					"complete-within-substeps",
					"partial",
					"truncated"
				]),
				substeps_completed: z.number().int().min(1),
				observations_retained: z.number().int().min(0),
				observations_omitted: z.number().int().min(0),
				hypotheses_retained: z.number().int().min(0),
				hypotheses_omitted: z.number().int().min(0),
				unexplored_branches_retained: z.number().int().min(0),
				unexplored_branches_omitted: z.number().int().min(0),
				next_probes_retained: z.number().int().min(0),
				next_probes_omitted: z.number().int().min(0)
			}),
			evidence_links: z.array(evidenceIdSchema$7).min(1),
			limitations: z.array(textSchema$1)
		});
		createArtifactInspection = (inventoryInput) => {
			const inventoryEvidence = parseInventoryEvidence(inventoryInput);
			const inventory = artifactInventoryResultSchema.parse(inventoryEvidence.normalized_result);
			const observations = allObservations(inventory, inventoryEvidence.evidence_id);
			const hypotheses = allHypotheses(inventory, inventoryEvidence.evidence_id);
			const nextProbes = probesFor(inventory);
			const branches = allUnexploredBranches(inventory, inventoryEvidence.evidence_id, nextProbes);
			const retained = {
				observations,
				hypotheses,
				branches,
				probes: nextProbes
			};
			const omissions = {
				observations: 0,
				hypotheses: 0,
				branches: 0,
				probes: 0
			};
			const semantic = {
				subject: {
					manifest_id: inventory.manifest.manifest_id,
					root_artifact_id: inventory.manifest.root_artifact_id,
					root_sha256: inventory.manifest.root_sha256,
					root_format: inventory.manifest.root_format
				},
				substeps: [{
					substep_id: `ais_${digestCanonicalValue({
						operation: "inventory_artifact",
						evidence_id: inventoryEvidence.evidence_id
					}, "Artifact inspection")}`,
					operation: "inventory_artifact",
					status: "completed",
					evidence_id: inventoryEvidence.evidence_id,
					evidence: inventoryEvidence
				}],
				observations: retained.observations,
				hypotheses: retained.hypotheses,
				contradictions: contradictions(inventory, inventoryEvidence.evidence_id),
				unexplored_branches: retained.branches,
				next_probes: retained.probes,
				coverage: {
					status: inspectionCoverage(inventory, omissions),
					substeps_completed: 1,
					observations_retained: retained.observations.length,
					observations_omitted: omissions.observations,
					hypotheses_retained: retained.hypotheses.length,
					hypotheses_omitted: omissions.hypotheses,
					unexplored_branches_retained: retained.branches.length,
					unexplored_branches_omitted: omissions.branches,
					next_probes_retained: retained.probes.length,
					next_probes_omitted: omissions.probes
				},
				evidence_links: [inventoryEvidence.evidence_id],
				limitations: uniqueSorted$1([...inventory.limitations, "Inspection derives bounded static hypotheses and next probes; it does not execute the artifact or claim format-specific semantics."])
			};
			return artifactInspectionResultSchema.parse({
				...semantic,
				inspection_id: `ai_${digestCanonicalValue(semantic, "Artifact inspection")}`
			});
		};
		parseInventoryEvidence = (input) => {
			const evidence = parseEvidence(input);
			if (evidence.operation !== "inventory_artifact") throw new TypeError("Artifact inspection substep requires inventory_artifact Evidence");
			return evidence;
		};
		allObservations = (inventory, evidenceId) => [observation("root-manifest", inventory.manifest.root_artifact_id, inventory.manifest, evidenceId), ...inventory.integrity_contradictions.map((value) => observation("integrity", value.contradiction_id, value, evidenceId))];
		observation = (kind, subject, value, evidenceId) => {
			const semantic = {
				kind,
				subject,
				value: jsonValueSchema.parse(value),
				evidence_id: evidenceId
			};
			return {
				observation_id: `aio_${digestCanonicalValue(semantic, "Artifact inspection")}`,
				...semantic
			};
		};
		allHypotheses = (inventory, evidenceId) => {
			const statements = inventory.manifest.root_format === "pe" ? ["The PE artifact may contain managed CLI metadata or native code; inventory bytes alone do not distinguish them."] : ["asar", "javascript-bundle"].includes(inventory.manifest.root_format) ? ["The artifact may contain a recoverable JavaScript application graph."] : [];
			return statements.map((statement) => {
				const semantic = {
					statement,
					confidence: "low",
					basis_evidence_ids: [evidenceId],
					limitation: "Format classification proposes a bounded follow-up; it is not semantic proof."
				};
				return {
					hypothesis_id: `aih_${digestCanonicalValue(semantic, "Artifact inspection")}`,
					...semantic
				};
			});
		};
		contradictions = (inventory, evidenceId) => inventory.integrity_contradictions.map((value) => {
			const semantic = {
				statement: `Declared integrity for ${value.logical_path} contradicts observed bytes.`,
				occurrence_id: value.occurrence_id,
				...artifactIntegrityPairOf(value),
				evidence_id: evidenceId
			};
			return {
				contradiction_id: `aic_${digestCanonicalValue(semantic, "Artifact inspection")}`,
				...semantic
			};
		});
		probesFor = (inventory) => {
			const format = inventory.manifest.root_format;
			return format === "directory" ? directoryProbes(inventory) : probesForFormat(format);
		};
		DIRECTORY_MEMBER_FORMATS = [
			"asar",
			"javascript-bundle",
			"mach-o-universal",
			"mach-o",
			"elf",
			"pe",
			"plist"
		];
		directoryProbes = (inventory) => {
			const present = new Set(inventory.occurrences.filter(({ entry_kind, artifact_format }) => entry_kind !== "symlink" || artifact_format !== "javascript-bundle").map(({ artifact_format }) => artifact_format));
			const members = DIRECTORY_MEMBER_FORMATS.filter((memberFormat) => present.has(memberFormat));
			const probes = members.flatMap(probesForFormat);
			return probes.filter((probe, index) => probes.findIndex(({ operation }) => operation === probe.operation) === index);
		};
		probesForFormat = (format) => {
			if (["asar", "javascript-bundle"].includes(format)) return [{
				operation: "analyze_javascript_application",
				rationale: "Recover bounded JavaScript modules, source maps, Electron boundaries, and application relationships.",
				authority: "ast-static-analysis"
			}];
			if (format === "pe") return [{
				operation: "inspect_managed_artifact",
				rationale: "Check execution-free CLI metadata before choosing a deep native provider.",
				authority: "managed-static-analysis"
			}, {
				operation: "open_binary",
				rationale: "Open as native code only when managed inspection reports a native or mixed boundary.",
				authority: "native-analysis-provider"
			}];
			if ([
				"mach-o",
				"mach-o-universal",
				"elf"
			].includes(format)) return [{
				operation: "open_binary",
				rationale: "Bind one deep native provider before function-level analysis.",
				authority: "native-analysis-provider"
			}];
			if (format === "plist") return [{
				operation: "inspect_plist",
				rationale: "Parse property-list values without executing the artifact.",
				authority: "artifact-bytes"
			}];
			return [];
		};
		allUnexploredBranches = (inventory, evidenceId, nextProbes) => {
			const branches = [];
			branches.push(...nextProbes.map((probe) => branch("format-specific-analysis-required", `${probe.operation} was not run by provider-neutral artifact inspection.`, probe, evidenceId)));
			if (inventory.manifest.root_format === "unknown") branches.push(branch("unknown-format", "Artifact bytes did not match an admitted format classifier.", null, evidenceId));
			return branches;
		};
		branch = (reason, detail, nextProbe, evidenceId) => {
			const semantic = {
				reason,
				detail,
				next_probe: nextProbe,
				evidence_id: evidenceId
			};
			return {
				branch_id: `aib_${digestCanonicalValue(semantic, "Artifact inspection")}`,
				...semantic
			};
		};
		inspectionCoverage = (inventory, omissions) => {
			if (Object.values(omissions).some((count) => count > 0)) return "truncated";
			if (inventory.coverage.status !== "complete") return "partial";
			return "complete-within-substeps";
		};
	})))();
}

//#endregion
//#region dist/domain/browserDeadline.js
var MAX_BROWSER_DEADLINE_MS, DEFAULT_CDP_COMMAND_TIMEOUT_MS, CDP_DISCOVERY_RESPONSE_TIMEOUT_MS, CDP_CLEANUP_GRACE_MS, optionalBrowserDeadlineMs, selectedBrowserDeadlineMs, browserDeadlineIncrease, browserDeadlineRetry, noRuntimeOverrideSentence, webRuntimeCommandTimeoutSchema, COMMAND_TIMEOUT_OPERATIONS, cdpCommandTimeoutIsSelectable, cdpCommandTimeoutUnrelatedControl, cdpDeadlineSubject, cdpCommandDeadlineRecovery, cdpCleanupGraceExpired, selectedCdpCommandTimeoutMs;
function init_browserDeadline() {
	return (init_browserDeadline = __esmMin((() => {
		MAX_BROWSER_DEADLINE_MS = 2147483647;
		DEFAULT_CDP_COMMAND_TIMEOUT_MS = 2e4;
		CDP_DISCOVERY_RESPONSE_TIMEOUT_MS = 1e4;
		CDP_CLEANUP_GRACE_MS = 5e3;
		optionalBrowserDeadlineMs = (description) => z.number().int().min(1).max(MAX_BROWSER_DEADLINE_MS).optional().describe(description);
		selectedBrowserDeadlineMs = (selected, defaultMs) => selected ?? defaultMs;
		browserDeadlineIncrease = (key, timeoutMs, defaultMs, cli) => timeoutMs < 2147483647 ? `Increase ${key} above ${String(timeoutMs)} (integer milliseconds from 1 to ${String(MAX_BROWSER_DEADLINE_MS)}; omitted means ${String(defaultMs)}), or use ${cli} on the CLI.` : `${key} is already at the maximum ${String(MAX_BROWSER_DEADLINE_MS)} ms; do not increase it further.`;
		browserDeadlineRetry = "Applies on the next call. Allow execution, cleanup and delivery headroom in the outer MCP client deadline. Confirm outstanding work and cleanup before retrying.";
		noRuntimeOverrideSentence = (allowance, unrelatedControl) => `${allowance} This release has no runtime override.${unrelatedControl === undefined ? "" : ` ${unrelatedControl} does not raise it.`}`;
		webRuntimeCommandTimeoutSchema = optionalBrowserDeadlineMs(`CDP WebSocket handshake and per-command response deadline in milliseconds (default ${String(DEFAULT_CDP_COMMAND_TIMEOUT_MS)}). Omitted means ${String(DEFAULT_CDP_COMMAND_TIMEOUT_MS)} and applies on the next call. deadlineExpired for a handshake or command is not the caller observation window, not the ${String(CDP_DISCOVERY_RESPONSE_TIMEOUT_MS)} ms CDP discovery response deadline, and not the ${String(CDP_CLEANUP_GRACE_MS)} ms cleanup grace. It also bounds passive script-source collection and the inspection/source-join phase that share this deadline. Does not raise the fixed protocol, retained-event, or source byte budgets. CDP discovery and cleanup grace have no runtime override.`);
		COMMAND_TIMEOUT_OPERATIONS = new Set([
			"inspect_web_page",
			"analyze_web_bundle",
			"observe_web_session",
			"observe_web_execution",
			"inspect_web_event_listeners",
			"discover_webmcp_tools",
			"capture_web_screenshot",
			"inspect_electron_page",
			"capture_browser_scenario"
		]);
		cdpCommandTimeoutIsSelectable = (operation) => COMMAND_TIMEOUT_OPERATIONS.has(operation);
		cdpCommandTimeoutUnrelatedControl = (operation) => cdpCommandTimeoutIsSelectable(operation) ? "command_timeout_ms" : undefined;
		cdpDeadlineSubject = (timeoutMs, phase, method, selectable) => {
			const budget = selectable ? `${String(timeoutMs)} ms command_timeout_ms` : `fixed ${String(timeoutMs)} ms`;
			if (phase === "handshake") return `CDP WebSocket handshake exceeded its ${budget} deadline (deadlineExpired).`;
			if (phase === "source-join") return `The inspection/source-join phase exceeded its ${budget} deadline (deadlineExpired).`;
			return `CDP command ${method ?? "request"} exceeded its ${budget} response deadline (deadlineExpired).`;
		};
		cdpCommandDeadlineRecovery = (timeoutMs, phase, method, selectable = true) => {
			const subject = cdpDeadlineSubject(timeoutMs, phase, method, selectable);
			if (!selectable) {
				const fixed = noRuntimeOverrideSentence(`${subject} This is not the caller observation window and not the ${String(CDP_DISCOVERY_RESPONSE_TIMEOUT_MS)} ms CDP discovery deadline.`);
				return {
					userMessage: fixed,
					remediationAction: fixed
				};
			}
			return {
				userMessage: `${subject} This is not the caller observation window, not the ${String(CDP_DISCOVERY_RESPONSE_TIMEOUT_MS)} ms CDP discovery deadline, and not the ${String(CDP_CLEANUP_GRACE_MS)} ms cleanup grace.`,
				remediationAction: `${browserDeadlineIncrease("command_timeout_ms", timeoutMs, DEFAULT_CDP_COMMAND_TIMEOUT_MS, "--command-timeout-ms")} ${browserDeadlineRetry} command_timeout_ms does not raise the fixed protocol, retained-event, or source byte budgets, the ${String(CDP_DISCOVERY_RESPONSE_TIMEOUT_MS)} ms CDP discovery response deadline, or the ${String(CDP_CLEANUP_GRACE_MS)} ms cleanup grace. Those have no runtime override.`
			};
		};
		cdpCleanupGraceExpired = () => noRuntimeOverrideSentence(`CDP runtime cleanup exceeded its ${String(CDP_CLEANUP_GRACE_MS)} ms cleanup grace.`, "command_timeout_ms");
		selectedCdpCommandTimeoutMs = (selected) => selectedBrowserDeadlineMs(selected, DEFAULT_CDP_COMMAND_TIMEOUT_MS);
	})))();
}

//#endregion
//#region dist/domain/qlogCapture.js
var decimal, unsignedFact, traceLocation, qlogCaptureFactsSchema;
function init_qlogCapture() {
	return (init_qlogCapture = __esmMin((() => {
		decimal = z.string().regex(/^(0|[1-9][0-9]*)$/u);
		unsignedFact = z.discriminatedUnion("state", [z.strictObject({
			state: z.literal("reported"),
			value: decimal
		}), z.strictObject({
			state: z.literal("unknown"),
			reason: z.literal("omitted-null-or-redacted")
		})]);
		traceLocation = z.discriminatedUnion("kind", [z.strictObject({
			kind: z.literal("json-pointer"),
			pointer: z.string()
		}), z.strictObject({
			kind: z.literal("unknown"),
			reason: z.literal("explicit-sensitive-value")
		})]);
		qlogCaptureFactsSchema = z.strictObject({
			profile: z.literal("aioquic-1.5.0-json-0.3"),
			scope: z.literal("all-recorded-events-before-selection"),
			body_bytes: z.literal("not-reported"),
			clock: z.strictObject({
				unit: z.literal("milliseconds"),
				domain: z.literal("unix-epoch"),
				basis: z.literal("selected-aioquic-profile-not-producer-authentication")
			}),
			traces: z.array(z.strictObject({
				trace_index: z.number().int().nonnegative(),
				location: traceLocation,
				event_count: z.number().int().nonnegative(),
				odcid: z.string().nullable(),
				vantage_point: z.enum(["client", "server"]).nullable(),
				incomplete_fact_records: z.array(z.number().int().nonnegative()),
				loss_declarations: z.array(z.strictObject({
					record_ordinal: z.number().int().nonnegative(),
					confidence: z.literal("observed"),
					packet_number: unsignedFact,
					packet_type: z.string().nullable(),
					packet_number_space: z.enum([
						"initial",
						"handshake",
						"application"
					]).nullable()
				})),
				streams: z.array(z.strictObject({
					stream_id: decimal,
					direction: z.enum(["sent", "received"]),
					confidence: z.literal("derived"),
					scope: z.literal("observed-stream-frame-ranges"),
					contributions: z.array(z.strictObject({
						record_ordinal: z.number().int().nonnegative(),
						frame_index: z.number().int().nonnegative(),
						offset: decimal,
						length: decimal,
						fin: z.boolean().nullable()
					})),
					covered_ranges: z.array(z.strictObject({
						start: decimal,
						end: decimal
					})),
					unique_bytes: decimal,
					frame_length_sum: decimal,
					repeated_bytes: decimal,
					reported_final_sizes: z.array(decimal)
				}))
			}))
		});
	})))();
}

//#endregion
//#region dist/domain/webNetworkCapture.js
var WEB_NETWORK_CAPTURE_LIMITS, DEFAULT_WEB_NETWORK_CAPTURE_TIMEOUT_MS, selectedWebNetworkCaptureTimeoutMs, webNetworkCaptureTimeoutRecovery, WEB_NETWORK_CAPTURE_FORMATS, inspectWebNetworkCaptureInputSchema, captureSensitiveValues, pointerSchema, redactionSchema, binaryBase, retainedBinaryDescriptorSchema, redactedBinaryDescriptorSchema, webNetworkCaptureBinaryDescriptorSchema, binarySchema, numberSchema, webNetworkCaptureRecordSchema, webNetworkCaptureDecoderSchema, protobufCaptureCoverageSchema, payloadShape, refineCoverage, webNetworkCapturePayloadSchema, webNetworkCaptureArtifactSchema, artifactShape, webNetworkCaptureSchema, validatedImmutableCaptures, safeParseOwnedWebNetworkCapture;
function init_webNetworkCapture() {
	return (init_webNetworkCapture = __esmMin((() => {
		init_browserDeadline();
		init_jsonValue();
		init_localPath();
		init_protobufWire();
		init_qlogCapture();
		init_immutableJson();
		WEB_NETWORK_CAPTURE_LIMITS = {
			inputBytes: 32 * 1024 * 1024,
			outputBytes: 96 * 1024 * 1024,
			timeoutMs: 3e4,
			depth: 64
		};
		DEFAULT_WEB_NETWORK_CAPTURE_TIMEOUT_MS = WEB_NETWORK_CAPTURE_LIMITS.timeoutMs;
		selectedWebNetworkCaptureTimeoutMs = (selected) => selectedBrowserDeadlineMs(selected, DEFAULT_WEB_NETWORK_CAPTURE_TIMEOUT_MS);
		webNetworkCaptureTimeoutRecovery = (timeoutMs) => ({
			userMessage: `inspect_web_network_capture reached its ${String(timeoutMs)} ms capture deadline (deadlineExpired) for capture_timeout_ms. No partial capture is returned. This is not the MCP client deadline.`,
			remediationAction: `${browserDeadlineIncrease("capture_timeout_ms", timeoutMs, DEFAULT_WEB_NETWORK_CAPTURE_TIMEOUT_MS, "--capture-timeout-ms")} ${browserDeadlineRetry} ${noRuntimeOverrideSentence(`The ${String(WEB_NETWORK_CAPTURE_LIMITS.inputBytes)}-byte input budget, ${String(WEB_NETWORK_CAPTURE_LIMITS.outputBytes)}-byte reply budget, and ${String(WEB_NETWORK_CAPTURE_LIMITS.depth)}-level nesting cap stay fixed.`, "capture_timeout_ms")}`
		});
		WEB_NETWORK_CAPTURE_FORMATS = [
			"har",
			"mitmproxy",
			"saz",
			"qlog"
		];
		inspectWebNetworkCaptureInputSchema = z.strictObject({
			capture_path: absoluteLocalPathStringSchema.describe("Absolute local HAR, mitmproxy, Fiddler SAZ or aioquic qlog capture path."),
			format: z.enum(WEB_NETWORK_CAPTURE_FORMATS),
			record_ordinals: z.array(z.number().int().nonnegative()).min(1).optional().describe("Zero-based producer record ordinals, in caller-selected order. Omit to inspect every record."),
			protobuf: protobufOptionsSchema.optional(),
			sensitive_values: z.array(z.string().min(1)).default([]).describe("Literal text excluded from capture payloads, byte/numeric projections, producer coordinates, artifact paths/digests and diagnostic text. Declaration strings are never persisted in Evidence parameters. Canonical contract keys, enums and provider identities remain intact."),
			capture_timeout_ms: optionalBrowserDeadlineMs(`Capture wall-clock deadline in milliseconds (default ${String(DEFAULT_WEB_NETWORK_CAPTURE_TIMEOUT_MS)}), from decoder start through process exit. Omitted means ${String(DEFAULT_WEB_NETWORK_CAPTURE_TIMEOUT_MS)} and applies on the next capture. deadlineExpired returns no partial capture. Does not raise the fixed ${String(WEB_NETWORK_CAPTURE_LIMITS.inputBytes)}-byte input budget, ${String(WEB_NETWORK_CAPTURE_LIMITS.outputBytes)}-byte reply budget, or ${String(WEB_NETWORK_CAPTURE_LIMITS.depth)}-level nesting cap. Those have no runtime override.`)
		});
		captureSensitiveValues = (rawInput) => {
			const parsed = inspectWebNetworkCaptureInputSchema.shape.sensitive_values.safeParse(typeof rawInput === "object" && rawInput !== null && "sensitive_values" in rawInput ? rawInput.sensitive_values : undefined);
			return parsed.success ? parsed.data : [];
		};
		pointerSchema = z.string().describe("RFC 6901 pointer in the producer's reported object.");
		redactionSchema = z.union([z.strictObject({
			pointer: pointerSchema,
			reason: z.enum(["transport-credential", "explicit-sensitive-value"])
		}), z.strictObject({
			pointer: pointerSchema,
			reason: z.literal("explicit-sensitive-value"),
			scope: z.literal("property-name").describe("An omitted property name; pointer identifies its actual parent, not an invented child coordinate.")
		})]);
		binaryBase = {
			pointer: pointerSchema,
			representation: z.enum(["producer-bytes", "har-base64-content"])
		};
		retainedBinaryDescriptorSchema = z.strictObject({
			...binaryBase,
			state: z.literal("retained"),
			bytes: z.number().int().nonnegative(),
			sha256: z.string().regex(/^[0-9a-f]{64}$/)
		});
		redactedBinaryDescriptorSchema = z.strictObject({
			...binaryBase,
			state: z.literal("redacted"),
			bytes: z.null(),
			sha256: z.null()
		});
		webNetworkCaptureBinaryDescriptorSchema = z.discriminatedUnion("state", [retainedBinaryDescriptorSchema, redactedBinaryDescriptorSchema]);
		binarySchema = z.discriminatedUnion("state", [retainedBinaryDescriptorSchema.extend({ content_base64: z.string() }), redactedBinaryDescriptorSchema.extend({ content_base64: z.null() })]);
		numberSchema = z.strictObject({
			pointer: pointerSchema,
			producer_type: z.enum([
				"json-number",
				"integer",
				"float"
			]),
			literal: z.string()
		});
		webNetworkCaptureRecordSchema = z.strictObject({
			ordinal: z.number().int().nonnegative(),
			location: z.discriminatedUnion("kind", [
				z.strictObject({
					kind: z.literal("unknown"),
					reason: z.literal("explicit-sensitive-value")
				}),
				z.strictObject({
					kind: z.literal("json-pointer"),
					pointer: pointerSchema
				}),
				z.strictObject({
					kind: z.literal("archive-members"),
					members: z.array(z.string()).min(1)
				}),
				z.strictObject({
					kind: z.literal("byte-range"),
					offset: z.number().int().nonnegative(),
					bytes: z.number().int().positive()
				})
			]),
			reported: jsonValueSchema,
			binary_fields: z.array(binarySchema),
			numeric_literals: z.array(numberSchema),
			redactions: z.array(redactionSchema),
			limitations: z.array(z.string()),
			protobuf: z.array(protobufDecodingSchema).exactOptional().describe("Flat decoding facts for explicitly selected records. Field indices are local to a body; offset_basis states whether ranges refer to retained or base64-decoded bytes. Interpretations without a caller-supplied schema are candidates.")
		});
		webNetworkCaptureDecoderSchema = z.strictObject({
			id: z.string().min(1),
			name: z.string().min(1),
			version: z.string().min(1)
		});
		protobufCaptureCoverageSchema = z.strictObject({
			status: z.enum(["complete", "partial"]),
			selected_records: z.number().int().nonnegative(),
			inspected_records: z.number().int().nonnegative()
		}).superRefine((coverage, context) => {
			if (coverage.inspected_records > coverage.selected_records || coverage.status === "complete" && coverage.inspected_records !== coverage.selected_records) context.addIssue({
				code: "custom",
				path: ["status"],
				message: "Protobuf coverage contradicts its inspected selection."
			});
		});
		payloadShape = {
			protobuf_coverage: protobufCaptureCoverageSchema.exactOptional(),
			decoder: webNetworkCaptureDecoderSchema,
			container: z.strictObject({
				reported: jsonValueSchema,
				numeric_literals: z.array(numberSchema),
				redactions: z.array(redactionSchema),
				records_pointer: pointerSchema.nullable()
			}),
			total_records: z.number().int().nonnegative(),
			records: z.array(webNetworkCaptureRecordSchema)
		};
		refineCoverage = (capture, context) => {
			const seen = new Set();
			for (const [index, record] of capture.records.entries()) {
				if (record.ordinal >= capture.total_records || seen.has(record.ordinal)) {
					context.addIssue({
						code: "custom",
						path: [
							"records",
							index,
							"ordinal"
						],
						message: "Retained ordinals must be unique and within the declared capture total."
					});
					return;
				}
				seen.add(record.ordinal);
			}
		};
		webNetworkCapturePayloadSchema = z.union([z.strictObject({
			...payloadShape,
			qlog: qlogCaptureFactsSchema
		}), z.strictObject(payloadShape)]).superRefine(refineCoverage);
		webNetworkCaptureArtifactSchema = z.strictObject({
			path: z.string().describe("Selected artifact path; empty when explicitly excluded from Evidence."),
			sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable().describe("Observed SHA-256; null only when explicitly excluded."),
			bytes: z.number().int().nonnegative()
		});
		artifactShape = {
			artifact: webNetworkCaptureArtifactSchema,
			runtime_attribution: z.literal("unknown"),
			limitations: z.array(z.string())
		};
		webNetworkCaptureSchema = z.discriminatedUnion("format", [z.strictObject({
			...payloadShape,
			...artifactShape,
			format: z.enum([
				"har",
				"mitmproxy",
				"saz"
			])
		}), z.strictObject({
			...payloadShape,
			...artifactShape,
			format: z.literal("qlog"),
			qlog: qlogCaptureFactsSchema
		})]).superRefine(refineCoverage);
		validatedImmutableCaptures = new WeakSet();
		safeParseOwnedWebNetworkCapture = (input) => {
			if (typeof input === "object" && input !== null && validatedImmutableCaptures.has(input)) return {
				success: true,
				data: input
			};
			const parsed = webNetworkCaptureSchema.safeParse(input);
			if (parsed.success && canBorrowParsedJsonSnapshot(input, parsed.data)) {
				validatedImmutableCaptures.add(input);
				return {
					success: true,
					data: input
				};
			}
			return parsed;
		};
	})))();
}

//#endregion
//#region dist/domain/recordedTransportUrl.js
/** Separator coordinates shared by name projection and selected-value matching. */
function* queryFields(query) {
	let start = query.startsWith("?") ? 1 : 0;
	let equals = query.indexOf("=", start);
	while (start < query.length) {
		const separator = query.indexOf("&", start);
		const end = separator < 0 ? query.length : separator;
		if (end > start) yield [
			start,
			equals >= start && equals < end ? equals : end,
			end
		];
		start = end + 1;
		if (equals >= 0 && equals < start) equals = query.indexOf("=", start);
	}
}
/** Scan one field at a time; selection avoids decoding unrelated values. */
function* iterateUrlQueryParameters(query, selected) {
	for (const [start, nameEnd, end] of queryFields(query)) {
		const name = formComponent(query.slice(start, nameEnd));
		if (selected === undefined || selected.has(name)) yield [name, formComponent(nameEnd < end ? query.slice(nameEnd + 1, end) : "")];
	}
}
/** WHATWG form-query names, preserving order, repeats and empty names without decoding values. */
function* parseUrlQueryParameterNames(query) {
	for (const [start, nameEnd] of queryFields(query)) yield formComponent(query.slice(start, nameEnd));
}
var parseRecordedTransportUrl, formComponent, recordedPathSegments;
function init_recordedTransportUrl() {
	return (init_recordedTransportUrl = __esmMin((() => {
		parseRecordedTransportUrl = (value, options = {}) => {
			const prefix = /^[\x00-\x20]*(?:([A-Za-z][A-Za-z0-9+.-]*):)?\/\//u.exec(value);
			const absolute = URL.parse(value);
			const parsed = absolute ?? URL.parse(value, "https://rea.invalid");
			const hasCredentials = parsed !== null && (parsed.username !== "" || parsed.password !== "");
			const origin = absolute !== null && absolute.origin !== "null" ? absolute.origin : null;
			if (prefix === null) return {
				origin,
				path: null,
				credentials: hasCredentials ? "ambiguous" : null
			};
			const authorityStart = prefix[0].length;
			const protocol = parsed?.protocol ?? `${prefix[1]?.toLowerCase() ?? "https"}:`;
			const special = [
				"ftp:",
				"file:",
				"http:",
				"https:",
				"ws:",
				"wss:"
			].includes(protocol);
			let authorityEnd = authorityStart;
			while (authorityEnd < value.length && !"/?#".includes(value[authorityEnd]) && !(special && value[authorityEnd] === "\\")) authorityEnd += 1;
			const authority = value.slice(authorityStart, authorityEnd);
			const stableAuthority = authority.length > 0 && !/[\t\n\r]/u.test(authority);
			const at = authority.lastIndexOf("@");
			const credentials = !stableAuthority && hasCredentials ? "ambiguous" : at >= 0 ? {
				start: authorityStart,
				end: authorityStart + at + 1
			} : hasCredentials ? "ambiguous" : null;
			if (origin === null || !/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(value) || !stableAuthority || special && value[authorityEnd] === "\\") return {
				origin,
				path: null,
				credentials
			};
			const hash = value.indexOf("#", authorityEnd);
			const question = value.indexOf("?", authorityEnd);
			const hasQuery = question >= 0 && (hash < 0 || question < hash);
			const query = options.includeQuery === true ? { query: absolute.search || (hasQuery ? "?" : "") } : {};
			if (value[authorityEnd] !== "/") return {
				origin,
				path: "/",
				credentials,
				...query
			};
			let pathEnd = authorityEnd;
			while (pathEnd < value.length && !"?#".includes(value[pathEnd])) pathEnd += 1;
			return {
				origin,
				path: value.slice(authorityEnd, pathEnd),
				credentials,
				...query
			};
		};
		formComponent = (raw) => {
			if (!/[%+\uD800-\uDFFF]/u.test(raw)) return raw;
			if (!/[\uD800-\uDFFF]/u.test(raw)) {
				try {
					return decodeURIComponent(raw.replaceAll("+", " "));
				} catch {}
			}
			return new URLSearchParams(`value=${raw}`).get("value") ?? "";
		};
		recordedPathSegments = (path, indexes) => {
			const needed = new Set();
			for (const index of indexes) if (Number.isSafeInteger(index) && index >= 0) needed.add(index);
			const result = new Map();
			if (needed.size === 0) return result;
			let start = path.indexOf("/");
			if (start < 0) return result;
			start += 1;
			let index = 0;
			while (needed.size > 0) {
				const end = path.indexOf("/", start);
				if (needed.delete(index)) result.set(index, path.slice(start, end < 0 ? path.length : end));
				if (end < 0) break;
				start = end + 1;
				index += 1;
			}
			return result;
		};
	})))();
}

//#endregion
//#region dist/domain/artifactIdentity.js
var logicalPathNfc, normalizeJoinedLogicalPath, logicalPathEscapesRoot, artifactIdForContent, occurrenceIdForLocation, artifactGraphDigest, artifactManifestId, artifactContradictionId, artifactEdgeId;
function init_artifactIdentity() {
	return (init_artifactIdentity = __esmMin((() => {
		init_artifactIntegrity();
		init_canonicalDigest();
		logicalPathNfc = (value) => value.normalize("NFC");
		normalizeJoinedLogicalPath = (value) => {
			if (value.includes("\0")) return value;
			return logicalPathNfc(posix.normalize(value).replace(/^\.\//u, ""));
		};
		logicalPathEscapesRoot = (path) => path.includes("\0") || path === ".." || path.startsWith("../") || path.startsWith("/");
		artifactIdForContent = (sha256) => `art_${digestCanonicalValue({ sha256 }, "Artifact")}`;
		occurrenceIdForLocation = (input) => input.logicalPath === "." ? `occ_${digestCanonicalValue({ root: input.rootArtifactId }, "Artifact")}` : `occ_${digestCanonicalValue({
			root_artifact_id: input.rootArtifactId,
			logical_path: input.logicalPath,
			entry_kind: input.entryKind,
			...input.duplicateOrdinal === undefined ? {} : { duplicate_ordinal: input.duplicateOrdinal }
		}, "Artifact")}`;
		artifactGraphDigest = (input) => digestCanonicalValue({
			nodes: input.nodes,
			occurrences: input.occurrences,
			edges: input.edges,
			integrity_contradictions: input.contradictions
		}, "Artifact");
		artifactManifestId = (rootArtifactId, graphSha256) => `agm_${digestCanonicalValue({
			root_artifact_id: rootArtifactId,
			graph_sha256: graphSha256
		}, "Artifact")}`;
		artifactContradictionId = (input) => `ic_${digestCanonicalValue({
			root_artifact_id: input.rootArtifactId,
			logical_path: input.logicalPath,
			..."integrity" in input ? artifactIntegrityPairOf(input.integrity) : {
				declared_sha256: input.declaredSha256,
				observed_sha256: input.observedSha256
			}
		}, "Artifact")}`;
		artifactEdgeId = (edge, occurrence) => `edge_${digestCanonicalValue({
			parent_artifact_id: edge.parent_artifact_id,
			child_artifact_id: occurrence.artifact_id,
			relation: edge.relation,
			occurrence_id: edge.occurrence_id,
			logical_path: occurrence.logical_path
		}, "Artifact")}`;
	})))();
}

//#endregion
//#region dist/domain/artifactInventoryEvidence.js
var hasCompleteInventoryCoverage, parseArtifactInventoryEvidence, parseArtifactInspectionInventoryResult, parseInspectionInventoryPayload, validateInspectionSubject, parseArtifactInventoryResult, parseInventoryPage, parseInventoryEvidencePage, validateArtifactInventorySubject, validateInventoryPage, assembleInventoryResults, orderedInventory, orderOccurrences, validateCompleteInventory, validateOccurrence, validateEdge, mergeExact, assertUnique;
function init_artifactInventoryEvidence() {
	return (init_artifactInventoryEvidence = __esmMin((() => {
		init_immutableJson();
		init_artifactGraph();
		init_unicodeCodePointOrder();
		init_comparisonSemantics();
		init_artifactIdentity();
		init_evidence();
		init_artifactInspection();
		hasCompleteInventoryCoverage = (inventory, requiredScope) => inventory.complete && inventory.coverage.scope === requiredScope && inventory.coverage.status === "complete";
		parseArtifactInventoryEvidence = (input) => {
			const evidence = (Array.isArray(input) ? input : [input]).map(parseEvidence);
			const pages = evidence.flatMap((carrier) => {
				if (carrier.operation === "inventory_artifact") return [parseInventoryEvidencePage(carrier)];
				if (carrier.operation !== "inspect_artifact") throw new TypeError("Artifact comparison requires inspect_artifact Evidence");
				return parseInspectionInventoryPayload(carrier.normalized_result, carrier.subject).pages;
			});
			return {
				evidence,
				inventory: assembleInventoryResults(pages)
			};
		};
		parseArtifactInspectionInventoryResult = (input, subject) => {
			const parsed = parseInspectionInventoryPayload(input, subject);
			return {
				inspection: parsed.inspection,
				inventory: assembleInventoryResults(parsed.pages),
				evidenceIds: parsed.evidenceIds
			};
		};
		parseInspectionInventoryPayload = (input, subject) => {
			const parsedInspection = artifactInspectionResultSchema.parse(input);
			const inspection = canBorrowParsedJsonSnapshot(input, parsedInspection) ? input : isImmutableJsonSnapshot(input) ? freezeJsonSnapshot(parsedInspection) : parsedInspection;
			const sealedSubsteps = immutableJsonSnapshotMember(inspection, "substeps");
			if (inspection.coverage.substeps_completed !== inspection.substeps.length) throw new TypeError("Artifact inspection substep count does not match its coverage declaration");
			const substeps = inspection.substeps.map((step, index) => {
				const sealedStep = immutableJsonSnapshotMember(sealedSubsteps, String(index));
				const sourceEvidence = immutableJsonSnapshotMember(sealedStep, "evidence") ?? step.evidence;
				const parsedEvidence = parseEvidence(sourceEvidence);
				const evidence = canBorrowParsedJsonSnapshot(sourceEvidence, parsedEvidence) ? sourceEvidence : parsedEvidence;
				immutableJsonSnapshotMember(evidence, "normalized_result");
				if (step.evidence_id !== evidence.evidence_id) throw new TypeError("Artifact inspection substep evidence ID does not match nested Evidence");
				return {
					evidenceId: evidence.evidence_id,
					page: parseInventoryEvidencePage(evidence)
				};
			});
			const firstPage = substeps[0]?.page;
			if (firstPage === undefined) throw new TypeError("Artifact inspection requires inventory substeps");
			validateInspectionSubject(subject, inspection, firstPage.manifest);
			return {
				inspection,
				pages: substeps.map(({ page }) => page),
				evidenceIds: substeps.map(({ evidenceId }) => evidenceId)
			};
		};
		validateInspectionSubject = (subject, inspection, manifest) => {
			if (inspection.subject.manifest_id !== manifest.manifest_id || inspection.subject.root_artifact_id !== manifest.root_artifact_id || inspection.subject.root_sha256 !== manifest.root_sha256 || inspection.subject.root_format !== manifest.root_format) throw new TypeError("Artifact inspection subject does not match its inventory manifest");
			if (subject === null || subject.digest.sha256 !== manifest.root_sha256 || subject.format !== manifest.root_format) throw new TypeError("Artifact inspection Evidence subject does not match its root manifest");
		};
		parseArtifactInventoryResult = (input, subject) => assembleInventoryResults([parseInventoryPage(input, subject)]);
		parseInventoryPage = (input, subject) => {
			const parsed = artifactInventoryResultSchema.parse(input);
			const inventory = canBorrowParsedJsonSnapshot(input, parsed) ? input : isImmutableJsonSnapshot(input) ? freezeJsonSnapshot(parsed) : parsed;
			validateArtifactInventorySubject(subject, inventory.manifest);
			validateInventoryPage(inventory);
			return inventory;
		};
		parseInventoryEvidencePage = (evidence) => {
			if (evidence.operation !== "inventory_artifact") throw new TypeError("Artifact inventory page must be inventory_artifact Evidence");
			return parseInventoryPage(evidence.normalized_result, evidence.subject);
		};
		validateArtifactInventorySubject = (subject, manifest) => {
			if (subject === null || subject.digest.sha256 !== manifest.root_sha256 || subject.format !== manifest.root_format) throw new TypeError("Artifact inventory Evidence subject does not match its root digest");
		};
		validateInventoryPage = (inventory) => {
			assertUnique(inventory.nodes.map(({ artifact_id: id }) => id), "node ID");
			assertUnique(inventory.occurrences.map(({ occurrence_id: id }) => id), "occurrence ID");
			assertUnique(inventory.edges.map(({ edge_id: id }) => id), "edge ID");
			for (const node of inventory.nodes) if (node.artifact_id !== artifactIdForContent(node.sha256)) throw new TypeError("Artifact node ID is not content-addressed");
		};
		assembleInventoryResults = (pages) => {
			const first = pages[0];
			if (first === undefined) throw new TypeError("Artifact inventory requires Evidence pages");
			const manifestJson = canonicalJson(first.manifest, "Artifact inventory");
			const coverageJson = canonicalJson(first.coverage, "Artifact inventory coverage");
			const nodes = new Map();
			const occurrences = new Map();
			const edges = new Map();
			for (const page of pages) {
				if (canonicalJson(page.manifest, "Artifact inventory") !== manifestJson) throw new TypeError("Artifact inventory pages do not share one manifest");
				if (canonicalJson(page.coverage, "Artifact inventory coverage") !== coverageJson) throw new TypeError("Artifact inventory pages do not share one coverage declaration");
				if (canonicalJson(page.integrity_contradictions, "Artifact inventory") !== canonicalJson(first.integrity_contradictions, "Artifact inventory")) throw new TypeError("Artifact inventory pages do not share integrity contradictions");
				for (const node of page.nodes) mergeExact(nodes, node.artifact_id, node, "node");
				for (const occurrence of page.occurrences) {
					mergeExact(occurrences, occurrence.occurrence_id, occurrence, "occurrence");
				}
				for (const edge of page.edges) mergeExact(edges, edge.edge_id, edge, "edge");
			}
			const inventory = orderedInventory(first, pages, {
				nodes,
				occurrences,
				edges
			});
			if (inventory.complete) validateCompleteInventory(inventory);
			return inventory;
		};
		orderedInventory = (first, pages, values) => {
			const nodes = [...values.nodes.values()].sort((left, right) => compareUnicodeCodePoints(left.artifact_id, right.artifact_id));
			const occurrences = orderOccurrences(first.manifest.root_artifact_id, [...values.occurrences.values()]);
			const edges = [...values.edges.values()].sort((left, right) => compareUnicodeCodePoints(left.edge_id, right.edge_id));
			const limitations = [...new Set(pages.flatMap((inventory) => inventory.limitations))].sort(compareUnicodeCodePoints);
			return {
				manifest: first.manifest,
				nodes,
				occurrences,
				edges,
				integrityContradictions: first.integrity_contradictions,
				limitations,
				coverage: first.coverage,
				complete: nodes.length === first.manifest.node_count && occurrences.length === first.manifest.occurrence_count && edges.length === first.manifest.edge_count
			};
		};
		orderOccurrences = (rootArtifactId, occurrences) => {
			const groups = new Map();
			for (const occurrence of occurrences) {
				const group = groups.get(occurrence.logical_path);
				if (group === undefined) groups.set(occurrence.logical_path, [occurrence]);
				else group.push(occurrence);
			}
			return [...groups].sort(([left], [right]) => compareUnicodeCodePoints(left, right)).flatMap(([path, group]) => {
				if (group.length < 2) return group;
				const ordinalById = new Map();
				const kinds = new Set(group.map(({ entry_kind }) => entry_kind));
				for (let ordinal = 0; ordinal < group.length; ordinal++) {
					for (const entryKind of kinds) ordinalById.set(occurrenceIdForLocation({
						rootArtifactId,
						logicalPath: path,
						entryKind,
						...ordinal === 0 ? {} : { duplicateOrdinal: ordinal }
					}), ordinal);
				}
				return group.sort((left, right) => (ordinalById.get(left.occurrence_id) ?? Number.MAX_SAFE_INTEGER) - (ordinalById.get(right.occurrence_id) ?? Number.MAX_SAFE_INTEGER) || compareUnicodeCodePoints(left.occurrence_id, right.occurrence_id));
			});
		};
		validateCompleteInventory = (inventory) => {
			const nodeIds = new Set(inventory.nodes.map(({ artifact_id: id }) => id));
			const occurrenceIds = new Set(inventory.occurrences.map(({ occurrence_id: id }) => id));
			const rootNode = inventory.nodes.find(({ artifact_id: id }) => id === inventory.manifest.root_artifact_id);
			if (rootNode?.sha256 !== inventory.manifest.root_sha256) throw new TypeError("Artifact root node does not match its manifest digest");
			const rootOccurrence = inventory.occurrences.find(({ logical_path }) => logical_path === ".");
			if (rootOccurrence?.artifact_id !== inventory.manifest.root_artifact_id || rootOccurrence.artifact_format !== inventory.manifest.root_format) throw new TypeError("Artifact root occurrence does not match its manifest representation");
			const duplicateOrdinalByPath = new Map();
			for (const occurrence of inventory.occurrences) {
				const ordinal = duplicateOrdinalByPath.get(occurrence.logical_path) ?? 0;
				duplicateOrdinalByPath.set(occurrence.logical_path, ordinal + 1);
				validateOccurrence(occurrence, inventory, nodeIds, occurrenceIds, ordinal);
			}
			const occurrencesById = new Map(inventory.occurrences.map((occurrence) => [occurrence.occurrence_id, occurrence]));
			for (const edge of inventory.edges) validateEdge(edge, nodeIds, occurrencesById);
			for (const contradiction of inventory.integrityContradictions) {
				if (!nodeIds.has(contradiction.parent_artifact_id) || !occurrenceIds.has(contradiction.occurrence_id)) throw new TypeError("Integrity contradiction references a missing graph member");
				const expectedId = artifactContradictionId({
					rootArtifactId: inventory.manifest.root_artifact_id,
					logicalPath: contradiction.logical_path,
					integrity: contradiction
				});
				if (contradiction.contradiction_id !== expectedId) throw new TypeError("Integrity contradiction ID does not match its identity");
			}
			const graphSha256 = artifactGraphDigest({
				nodes: inventory.nodes,
				occurrences: inventory.occurrences,
				edges: inventory.edges,
				contradictions: inventory.integrityContradictions
			});
			if (graphSha256 !== inventory.manifest.graph_sha256) throw new TypeError("Artifact graph commitment does not match its members");
			const manifestId = artifactManifestId(inventory.manifest.root_artifact_id, graphSha256);
			if (manifestId !== inventory.manifest.manifest_id) throw new TypeError("Artifact manifest ID does not match its commitment");
		};
		validateOccurrence = (occurrence, inventory, nodeIds, occurrenceIds, duplicateOrdinal) => {
			if (occurrence.artifact_id !== null && !nodeIds.has(occurrence.artifact_id)) throw new TypeError("Artifact occurrence references a missing node");
			if (occurrence.parent_occurrence_id !== null && !occurrenceIds.has(occurrence.parent_occurrence_id)) throw new TypeError("Artifact occurrence references a missing parent");
			const expectedId = occurrenceIdForLocation({
				rootArtifactId: inventory.manifest.root_artifact_id,
				logicalPath: occurrence.logical_path,
				entryKind: occurrence.entry_kind,
				...duplicateOrdinal === 0 ? {} : { duplicateOrdinal }
			});
			if (occurrence.occurrence_id !== expectedId) throw new TypeError("Artifact occurrence ID does not match its identity");
		};
		validateEdge = (edge, nodeIds, occurrences) => {
			const occurrence = occurrences.get(edge.occurrence_id);
			if (!nodeIds.has(edge.parent_artifact_id) || occurrence?.artifact_id === null || occurrence === undefined || !nodeIds.has(occurrence.artifact_id)) throw new TypeError("Artifact edge references a missing graph member");
			if (edge.edge_id !== artifactEdgeId(edge, occurrence)) throw new TypeError("Artifact edge ID does not match its identity");
		};
		mergeExact = (output, key, value, label) => {
			const previous = output.get(key);
			if (previous !== undefined && canonicalJson(previous, "Artifact inventory") !== canonicalJson(value, "Artifact inventory")) throw new TypeError(`Artifact inventory has conflicting ${label} pages`);
			output.set(key, value);
		};
		assertUnique = (values, label) => {
			if (new Set(values).size !== values.length) throw new TypeError(`Artifact inventory contains a duplicate ${label}`);
		};
	})))();
}

//#endregion
//#region dist/domain/managed/managedArtifact.js
var managedMetadataTokenSchema, offsetSchema, cliMetadataGuidSchema, publicKeyIdentitySchema, assemblyIdentitySchema, moduleIdentitySchema, managedArtifactReferenceSchema, managedMetadataSummarySchema, managedTokenIdentityScopeSchema, assemblyReferenceSchema, managedResourceSchema, customAttributeSchema, managedSignatureSchema, managedTypeSchema, managedExportedTypeSchema, managedFieldSchema, managedExceptionRegionSchema, managedInstructionAnchorSchema, managedMethodBodySchema, managedMethodSchema, declaringTypeNameSchema, managedMemberReferenceSchema, managedUserStringSchema, managedModuleReferenceSchema, managedNativeImportSchema, managedNativeImplementationSchema, managedCallEdgeSchema, managedFieldAccessSchema, managedParseIssueSchema, managedArtifactInspectionSchema, managedMemberInspectionSchema, managedNativeBoundaryInspectionSchema;
function init_managedArtifact() {
	return (init_managedArtifact = __esmMin((() => {
		init_digests();
		managedMetadataTokenSchema = z.string().regex(/^0x[0-9a-f]{8}$/u);
		offsetSchema = z.number().int().min(0);
		cliMetadataGuidSchema = z.string().regex(/^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/u);
		publicKeyIdentitySchema = z.object({
			kind: z.enum([
				"none",
				"public-key",
				"public-key-token"
			]),
			byte_length: z.number().int().min(0),
			sha256: digestSchema.nullable(),
			token: z.string().regex(/^[a-f0-9]{16}$/u).nullable()
		});
		assemblyIdentitySchema = z.object({
			name: z.string(),
			version: z.string().regex(/^\d+\.\d+\.\d+\.\d+$/u),
			culture: z.string().nullable(),
			flags: z.number().int().min(0).max(4294967295),
			hash_algorithm: z.number().int().min(0).max(4294967295),
			public_key: publicKeyIdentitySchema,
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema
		});
		moduleIdentitySchema = z.object({
			name: z.string(),
			generation: z.number().int().min(0).max(65535),
			mvid: cliMetadataGuidSchema.nullable(),
			enc_id: cliMetadataGuidSchema.nullable(),
			enc_base_id: cliMetadataGuidSchema.nullable(),
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema
		});
		managedArtifactReferenceSchema = z.object({
			path: z.string().min(1),
			sha256: digestSchema,
			byte_length: z.number().int().min(0),
			format: z.literal("pe")
		});
		managedMetadataSummarySchema = z.object({
			status: z.enum([
				"absent",
				"complete",
				"partial",
				"malformed"
			]),
			version: z.string().nullable(),
			table_row_counts: z.record(z.string(), z.number().int().min(0).max(4294967295))
		});
		managedTokenIdentityScopeSchema = z.object({
			token_identity: z.literal("build-local"),
			requires_artifact_sha256: digestSchema,
			requires_mvid: cliMetadataGuidSchema.nullable()
		});
		assemblyReferenceSchema = z.object({
			name: z.string(),
			version: z.string().regex(/^\d+\.\d+\.\d+\.\d+$/u),
			culture: z.string().nullable(),
			flags: z.number().int().min(0).max(4294967295),
			public_key_or_token: publicKeyIdentitySchema,
			hash_value_sha256: digestSchema.nullable(),
			hash_value_length: z.number().int().min(0),
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema
		});
		managedResourceSchema = z.object({
			name: z.string(),
			flags: z.number().int().min(0).max(4294967295),
			visibility: z.enum([
				"public",
				"private",
				"unknown"
			]),
			implementation_token: managedMetadataTokenSchema.nullable(),
			embedded: z.boolean(),
			declared_offset: z.number().int().min(0).max(4294967295),
			data_length: z.number().int().min(0).nullable(),
			data_sha256: digestSchema.nullable(),
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema
		});
		customAttributeSchema = z.object({
			parent_token: managedMetadataTokenSchema,
			constructor_token: managedMetadataTokenSchema.nullable(),
			type_name: z.string().nullable(),
			value_length: z.number().int().min(0),
			value_sha256: digestSchema,
			decoded_fixed_string: z.string().nullable(),
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema
		});
		managedSignatureSchema = z.object({
			raw_length: z.number().int().min(0),
			raw_sha256: digestSchema,
			resolved_sha256: digestSchema.nullable().default(null).describe("SHA-256 of the raw signature with each TypeDef or TypeRef operand replaced by that type's namespace-qualified name; equals raw_sha256 when the signature names no types. Unlike raw_sha256 it does not depend on build-local metadata rows. Null when the signature could not be decoded or names a type REA could not resolve, such as a TypeSpec."),
			kind: z.enum([
				"method",
				"field",
				"unknown"
			]),
			parse_status: z.enum([
				"decoded",
				"partial",
				"unsupported",
				"malformed"
			]),
			calling_convention: z.string().nullable(),
			generic_parameter_count: z.number().int().min(0).nullable(),
			parameter_count: z.number().int().min(0).nullable(),
			return_type: z.string().nullable(),
			parameter_types: z.array(z.string()),
			field_type: z.string().nullable(),
			issue: z.string().nullable()
		});
		managedTypeSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			namespace: z.string(),
			name: z.string(),
			full_name: z.string(),
			name_sha256: digestSchema.nullable().default(null).describe("Framed nominal namespace/name/enclosing-name digest, independent of build-local rows. Null for historical Evidence or unresolved nesting; defining assemblies and CLR runtime identity are not established."),
			flags: z.number().int().min(0).max(4294967295),
			extends_token: managedMetadataTokenSchema.nullable(),
			enclosing_type_token: managedMetadataTokenSchema.nullable().default(null).describe("Observed enclosing TypeDef from NestedClass; null when no enclosing entry was available, which alone does not establish top-level identity."),
			field_list: z.object({
				first_row: z.number().int().min(1).nullable(),
				last_row: z.number().int().min(0).nullable(),
				count: z.number().int().min(0)
			}),
			method_list: z.object({
				first_row: z.number().int().min(1).nullable(),
				last_row: z.number().int().min(0).nullable(),
				count: z.number().int().min(0)
			})
		});
		managedExportedTypeSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			namespace: z.string(),
			name: z.string(),
			flags: z.number().int().min(0).max(4294967295),
			forwarder: z.boolean(),
			type_def_id: z.number().int().min(0).max(4294967295),
			implementation_token: managedMetadataTokenSchema.nullable()
		});
		managedFieldSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			declaring_type_token: managedMetadataTokenSchema.nullable(),
			declaring_type: z.string().nullable(),
			name: z.string(),
			flags: z.number().int().min(0).max(65535),
			signature: managedSignatureSchema
		});
		managedExceptionRegionSchema = z.object({
			flags: z.number().int().min(0).max(4294967295),
			try_offset: z.number().int().min(0),
			try_length: z.number().int().min(0),
			handler_offset: z.number().int().min(0),
			handler_length: z.number().int().min(0),
			class_token: managedMetadataTokenSchema.nullable(),
			filter_offset: z.number().int().min(0).nullable()
		});
		managedInstructionAnchorSchema = z.object({
			il_offset: z.number().int().min(0),
			opcode: z.string().min(1),
			operand_kind: z.enum([
				"none",
				"branch",
				"constant",
				"field",
				"method",
				"signature",
				"string",
				"switch",
				"token",
				"type",
				"variable",
				"unknown"
			]),
			operand: z.string().nullable()
		});
		managedMethodBodySchema = z.object({
			status: z.enum([
				"present",
				"partial",
				"absent",
				"malformed"
			]),
			header_format: z.enum([
				"tiny",
				"fat",
				"none",
				"unknown"
			]),
			rva: z.number().int().min(0).max(4294967295),
			file_offset: offsetSchema.nullable(),
			max_stack: z.number().int().min(0).nullable(),
			init_locals: z.boolean().nullable(),
			local_var_sig_token: managedMetadataTokenSchema.nullable(),
			il_size: z.number().int().min(0),
			il_sha256: digestSchema.nullable().describe("SHA-256 of exactly the raw il_size CIL bytes; excludes the method header, locals signature, alignment, and extra sections"),
			normalized_il_sha256: digestSchema.nullable().describe("Member-result-v1 SHA-256 of UTF-8 JSON [opcode, operand_kind, operand] tuples for a complete decode; retains build-local tokens, omits switch targets, and excludes headers, locals, and exception regions"),
			instruction_count: z.number().int().min(0),
			decoded_instruction_count: z.number().int().min(0),
			truncated_instructions: z.number().int().min(0),
			opcode_counts: z.record(z.string(), z.number().int().min(1)),
			anchors: z.array(managedInstructionAnchorSchema),
			exception_regions: z.array(managedExceptionRegionSchema),
			issue: z.string().nullable()
		});
		managedMethodSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			declaring_type_token: managedMetadataTokenSchema.nullable(),
			declaring_type: z.string().nullable(),
			name: z.string(),
			rva: z.number().int().min(0).max(4294967295),
			impl_flags: z.number().int().min(0).max(65535),
			flags: z.number().int().min(0).max(65535),
			signature: managedSignatureSchema,
			body: managedMethodBodySchema
		});
		declaringTypeNameSchema = z.string().nullable().default(null);
		managedMemberReferenceSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			parent_token: managedMetadataTokenSchema.nullable(),
			parent_name: declaringTypeNameSchema.describe("Name of a TypeDef, TypeRef, or generic-instantiation TypeSpec parent; null for other parents or when unknown"),
			name: z.string(),
			signature: managedSignatureSchema
		});
		managedUserStringSchema = z.object({
			token: managedMetadataTokenSchema,
			offset: offsetSchema.describe("File offset of the #US item"),
			value: z.string().describe("Decoded UTF-16 code units, excluding the terminal flag byte; unpaired surrogates are kept")
		});
		managedModuleReferenceSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			name: z.string()
		});
		managedNativeImportSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			mapping_flags: z.number().int().min(0).max(65535),
			mapping_flags_hex: z.string().regex(/^0x[0-9a-f]{4}$/u),
			member_token: managedMetadataTokenSchema.nullable(),
			member_kind: z.enum([
				"method",
				"field",
				"unknown"
			]),
			member_name: z.string().nullable(),
			import_name: z.string(),
			import_scope_token: managedMetadataTokenSchema.nullable(),
			import_scope_name: z.string().nullable(),
			no_mangle: z.boolean(),
			char_set: z.enum([
				"not-specified",
				"ansi",
				"unicode",
				"auto",
				"unknown"
			]),
			call_convention: z.enum([
				"not-specified",
				"winapi",
				"cdecl",
				"stdcall",
				"thiscall",
				"fastcall",
				"unknown"
			]),
			supports_last_error: z.boolean(),
			best_fit: z.enum([
				"assembly-default",
				"enabled",
				"disabled",
				"unknown"
			]),
			throw_on_unmappable_char: z.enum([
				"assembly-default",
				"enabled",
				"disabled",
				"unknown"
			]),
			verification: z.literal("managed-declaration-only")
		});
		managedNativeImplementationSchema = z.object({
			token: managedMetadataTokenSchema,
			row_offset: offsetSchema,
			name: z.string(),
			rva: z.number().int().min(0).max(4294967295),
			flags: z.number().int().min(0).max(65535),
			impl_flags: z.number().int().min(0).max(65535),
			code_type: z.enum([
				"il",
				"native",
				"optil",
				"runtime",
				"unknown"
			]),
			managed_kind: z.enum([
				"managed",
				"unmanaged",
				"unknown"
			]),
			pinvoke_declared: z.boolean(),
			boundary_kind: z.enum([
				"pinvoke",
				"native-body",
				"runtime-provided",
				"unmanaged-method",
				"mixed-or-unknown"
			]),
			body_interpretation: z.enum([
				"managed-cil",
				"native-or-runtime",
				"not-file-backed",
				"unknown"
			])
		});
		managedCallEdgeSchema = z.object({
			caller_token: managedMetadataTokenSchema,
			caller: z.string().nullable(),
			opcode: z.string(),
			target_token: managedMetadataTokenSchema,
			target_kind: z.enum([
				"method-def",
				"member-ref",
				"method-spec",
				"unknown"
			]),
			target_name: z.string().nullable().describe("Method name; a method-spec target reports its generic method"),
			target_declaring_type: declaringTypeNameSchema.describe("Declaring type of the called method; null when unknown")
		});
		managedFieldAccessSchema = z.object({
			method_token: managedMetadataTokenSchema,
			method: z.string().nullable(),
			opcode: z.string(),
			field_token: managedMetadataTokenSchema,
			field_name: z.string().nullable(),
			field_declaring_type: declaringTypeNameSchema.describe("Declaring type of the accessed field; null when unknown")
		});
		managedParseIssueSchema = z.object({
			code: z.enum([
				"resource-limit",
				"invalid-cli-header",
				"invalid-directory",
				"invalid-metadata-root",
				"invalid-stream",
				"missing-stream",
				"invalid-tables",
				"invalid-row",
				"invalid-heap-index",
				"invalid-string",
				"invalid-blob",
				"unsupported-signature",
				"invalid-guid",
				"invalid-resource"
			]),
			scope: z.string().min(1),
			offset: offsetSchema.nullable(),
			detail: z.string().min(1)
		});
		managedArtifactInspectionSchema = z.object({
			artifact: managedArtifactReferenceSchema,
			pe: z.object({
				machine: z.number().int().min(0).max(65535),
				machine_hex: z.string().regex(/^0x[0-9a-f]{4}$/u),
				architecture: z.enum([
					"x86",
					"x86_64",
					"arm",
					"arm64"
				]),
				optional_header: z.enum(["pe32", "pe32-plus"]),
				section_count: z.number().int().min(1).max(65535),
				characteristics: z.number().int().min(0).max(65535),
				cli: z.object({
					header_offset: offsetSchema,
					header_size: z.number().int().min(72),
					runtime_version: z.string(),
					flags: z.number().int().min(0).max(4294967295),
					flag_names: z.array(z.string()),
					entry_point: z.object({
						kind: z.enum([
							"metadata-token",
							"native-rva",
							"none"
						]),
						value: z.string().nullable()
					}),
					metadata_rva: z.number().int().min(1).max(4294967295),
					metadata_size: z.number().int().min(1).max(4294967295),
					resources_rva: z.number().int().min(0).max(4294967295),
					resources_size: z.number().int().min(0).max(4294967295),
					strong_name_rva: z.number().int().min(0).max(4294967295),
					strong_name_size: z.number().int().min(0).max(4294967295),
					managed_native_header_rva: z.number().int().min(0).max(4294967295),
					managed_native_header_size: z.number().int().min(0).max(4294967295),
					ready_to_run_signature: z.boolean()
				}).nullable()
			}),
			classification: z.object({
				status: z.enum([
					"managed",
					"not-managed",
					"malformed"
				]),
				container: z.literal("pe"),
				runtime_family: z.enum([
					"dotnet-framework",
					"modern-dotnet",
					"unity-mono",
					"mixed-clr-native",
					"unknown"
				]),
				implementation: z.enum([
					"cil",
					"cil-and-ready-to-run",
					"cpp-cli-mixed",
					"metadata-only",
					"not-managed",
					"unknown"
				]),
				managed_architecture: z.enum([
					"anycpu",
					"anycpu-prefer-32",
					"x86",
					"x86_64",
					"arm",
					"arm64",
					"unknown"
				]),
				evidence: z.array(z.object({
					code: z.string().min(1),
					detail: z.string().min(1),
					file_offset: offsetSchema.nullable()
				}))
			}),
			metadata: z.object({
				status: z.enum([
					"absent",
					"complete",
					"partial",
					"malformed"
				]),
				version: z.string().nullable(),
				stream_names: z.array(z.string()),
				table_row_counts: z.record(z.string(), z.number().int().min(0).max(4294967295))
			}),
			module: moduleIdentitySchema.nullable(),
			assembly: assemblyIdentitySchema.nullable(),
			target_frameworks: z.array(z.string()),
			references: z.array(assemblyReferenceSchema),
			resources: z.array(managedResourceSchema),
			attributes: z.array(customAttributeSchema),
			coverage: z.object({
				state: z.enum([
					"complete",
					"partial",
					"unavailable"
				]),
				issues: z.array(managedParseIssueSchema)
			}),
			limitations: z.array(z.string())
		});
		managedMemberInspectionSchema = z.object({
			signature_resolution: z.literal("type-names-v1").nullable().default(null).describe("Signature type-name resolution was examined, including unresolved operands; null means historical Evidence without this attestation."),
			artifact: managedArtifactReferenceSchema,
			module: moduleIdentitySchema.nullable(),
			metadata: managedMetadataSummarySchema,
			identity_scope: managedTokenIdentityScopeSchema,
			types: z.array(managedTypeSchema),
			nesting_read: z.boolean().nullable().default(null).describe("Whether all NestedClass rows were read and valid. Null for historical Evidence; false means current nesting is incomplete. Individual name digests can remain unresolved for missing, cyclic or over-deep enclosing chains."),
			exported_types: z.array(managedExportedTypeSchema).nullable().default(null),
			fields: z.array(managedFieldSchema),
			methods: z.array(managedMethodSchema),
			member_refs: z.array(managedMemberReferenceSchema),
			call_edges: z.array(managedCallEdgeSchema),
			field_accesses: z.array(managedFieldAccessSchema),
			user_strings: z.object({
				state: z.enum(["complete", "partial"]),
				literals: z.array(managedUserStringSchema),
				issues: z.array(managedParseIssueSchema)
			}).nullable().default(null),
			/** Caller-selected declaring types; null when every type was inspected. */
			selection: z.object({
				type_names: z.array(z.string().min(1)).min(1),
				unmatched_type_names: z.array(z.string().min(1))
			}).nullable().default(null),
			coverage: z.object({
				state: z.enum([
					"complete",
					"partial",
					"unavailable"
				]),
				issues: z.array(managedParseIssueSchema)
			}),
			limitations: z.array(z.string())
		});
		managedNativeBoundaryInspectionSchema = z.object({
			artifact: managedArtifactReferenceSchema,
			module: moduleIdentitySchema.nullable(),
			metadata: managedMetadataSummarySchema,
			identity_scope: managedTokenIdentityScopeSchema,
			cli_native: z.object({
				il_only: z.boolean(),
				requires_32bit: z.boolean(),
				strong_name_signed: z.boolean(),
				native_entry_point: z.boolean(),
				ready_to_run_signature: z.boolean(),
				managed_native_header_rva: z.number().int().min(0).max(4294967295),
				managed_native_header_size: z.number().int().min(0).max(4294967295)
			}).nullable(),
			module_refs: z.array(managedModuleReferenceSchema),
			pinvoke_imports: z.array(managedNativeImportSchema),
			native_implementations: z.array(managedNativeImplementationSchema),
			summary: z.object({
				module_ref_count: z.number().int().min(0),
				pinvoke_import_count: z.number().int().min(0),
				native_implementation_count: z.number().int().min(0),
				ready_to_run: z.boolean().nullable(),
				mixed_mode_or_native_header: z.boolean().nullable()
			}),
			coverage: z.object({
				state: z.enum([
					"complete",
					"partial",
					"unavailable"
				]),
				issues: z.array(managedParseIssueSchema)
			}),
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
//#region dist/domain/apple/plistNumbers.js
var incompletePlistNumberLimitation, createPlistNumberCollector, createPlistNumberProjection;
function init_plistNumbers() {
	return (init_plistNumbers = __esmMin((() => {
		incompletePlistNumberLimitation = "Property-list number metadata could not be completely observed; decoded numbers may lose integer precision and exact integer/real association is unavailable.";
		createPlistNumberCollector = () => {
			const integers = new Map();
			const reals = new Set();
			let unsafeIntegerLiterals = 0;
			return {
				integer: (exact) => {
					if (exact >= BigInt(Number.MIN_SAFE_INTEGER) && exact <= BigInt(Number.MAX_SAFE_INTEGER)) return;
					unsafeIntegerLiterals++;
					const rounded = Number(exact);
					integers.set(rounded, (integers.get(rounded) ?? new Set()).add(exact.toString()));
				},
				real: (value) => {
					reals.add(value);
				},
				result: (incomplete = false) => ({
					integers,
					reals,
					unsafeIntegerLiterals,
					incomplete
				})
			};
		};
		createPlistNumberProjection = (literals) => {
			let exactIntegerCount = 0;
			let ambiguousNumberCount = 0;
			const mapNumber = (item) => {
				if (Number.isSafeInteger(item) || !Number.isInteger(item)) return item;
				if (literals.incomplete) {
					ambiguousNumberCount += 1;
					return item;
				}
				const decimals = literals.integers.get(item);
				if (decimals === undefined) {
					if (!literals.reals.has(item)) ambiguousNumberCount += 1;
					return item;
				}
				const [decimal] = decimals;
				if (decimals.size !== 1 || decimal === undefined || literals.reals.has(item)) {
					ambiguousNumberCount += 1;
					return item;
				}
				exactIntegerCount += 1;
				return {
					$plist_type: "integer",
					decimal
				};
			};
			const map = (item) => {
				if (typeof item === "number") return mapNumber(item);
				if (Array.isArray(item)) return item.map(map);
				if (item !== null && typeof item === "object") {
					const keys = Object.keys(item);
					const marker = item[keys[0] ?? ""];
					const reference = keys.length === 1 && (keys[0] === "UID" || keys[0] === "CF$UID") && typeof marker === "number";
					if (reference) {
						if (typeof marker === "number" && !Number.isSafeInteger(marker) && (literals.integers.has(marker) || !literals.reals.has(marker))) ambiguousNumberCount += 1;
						return item;
					}
					return Object.fromEntries(Object.entries(item).map(([key, child]) => [key, map(child)]));
				}
				return item;
			};
			return {
				project: map,
				limitations: () => [
					...literals.incomplete ? [incompletePlistNumberLimitation] : [],
					...literals.unsafeIntegerLiterals === 0 ? [] : [`${String(literals.unsafeIntegerLiterals)} observed integer literal(s) in the original archive exceed the exact range of a JSON number. Decoded numbers may lose integer precision unless represented as { "$plist_type": "integer", "decimal": "<exact digits>" }; the original archive bytes retain those literals.`],
					...exactIntegerCount === 0 ? [] : [`${String(exactIntegerCount)} unambiguous integer value(s) are reported with exact decimal text as { "$plist_type": "integer", "decimal": "<exact digits>" }.`],
					...ambiguousNumberCount === 0 ? [] : [`${String(ambiguousNumberCount)} number(s) beyond the exact integer range remain as decoded because their source integer/real type or reference marker cannot be associated unambiguously; integer precision loss remains possible.`]
				]
			};
		};
	})))();
}

//#endregion
//#region dist/domain/apple/interfaceBuilderKeyedArchive.js
var recordSchema, objectNode, connection, isUIKitRuntimeConnectionClass, isInterfaceBuilderConnectionClass, interfaceBuilderConnectionFieldNames, parseInterfaceBuilderRecords, archiveUid, HIERARCHY_KEY, keyedArchiveTable, parseKeyedArchive, record, firstString, archivedObjectReference, firstObjectReference, classifyObject, classifyConnection, jsonSafeRecord;
function init_interfaceBuilderKeyedArchive() {
	return (init_interfaceBuilderKeyedArchive = __esmMin((() => {
		init_jsonValue();
		recordSchema = z.record(z.string(), z.unknown());
		objectNode = z.strictObject({
			id: z.string().min(1),
			kind: z.enum([
				"view_controller",
				"view",
				"control",
				"constraint",
				"layout_guide",
				"resource",
				"placeholder",
				"external_object",
				"other"
			]),
			class_name: z.string().nullable(),
			name: z.string().min(1),
			attributes: z.record(z.string(), jsonValueSchema)
		});
		connection = z.strictObject({
			id: z.string().min(1),
			kind: z.enum([
				"outlet",
				"action",
				"segue",
				"other"
			]),
			source_id: z.string().min(1),
			destination_id: z.string().nullable(),
			label: z.string().nullable(),
			attributes: z.record(z.string(), jsonValueSchema)
		});
		isUIKitRuntimeConnectionClass = (className) => /^UIRuntime\w*Connection$/u.test(className);
		isInterfaceBuilderConnectionClass = (className) => isUIKitRuntimeConnectionClass(className) || /^NSNib(?:Connector|BindingConnector|ControlConnector|OutletConnector)$/u.test(className);
		interfaceBuilderConnectionFieldNames = (className) => isUIKitRuntimeConnectionClass(className) ? {
			source: "UISource",
			destination: "UIDestination",
			label: "UILabel"
		} : {
			source: "NSSource",
			destination: "NSDestination",
			label: "NSLabel"
		};
		parseInterfaceBuilderRecords = (value) => {
			const root = record(value);
			const keyed = parseKeyedArchive(root);
			if (keyed !== null) return keyed;
			const objectsRaw = record(root["com.apple.ibtool.document.objects"]);
			const connectionsRaw = record(root["com.apple.ibtool.document.connections"]);
			const hierarchyRaw = root["com.apple.ibtool.document.hierarchy"];
			const classesRaw = record(root["com.apple.ibtool.document.classes"]);
			const objects = [];
			const connections = [];
			let omittedConnections = 0;
			const objectEntries = Object.entries(objectsRaw);
			for (const [id, raw] of objectEntries.slice(0, 2e4)) {
				const attributes = record(raw);
				const className = firstString(attributes["customClass"], attributes["class"], attributes["isa"]);
				const label = firstString(attributes["label"], attributes["title"], attributes["name"], className);
				const carried = new Set();
				if (attributes["customClass"] === className) carried.add("customClass");
				if (attributes["label"] === label) carried.add("label");
				if (attributes["objectID"] === id) carried.add("objectID");
				objects.push(objectNode.parse({
					id,
					kind: classifyObject(className),
					class_name: className,
					name: label ?? id,
					attributes: jsonSafeRecord(Object.fromEntries(Object.entries(attributes).filter(([key]) => !carried.has(key))))
				}));
			}
			for (const [sourceId, rawConnections] of Object.entries(connectionsRaw)) {
				if (!Array.isArray(rawConnections)) continue;
				for (const [index, raw] of rawConnections.entries()) {
					if (connections.length >= 4e4) {
						omittedConnections += rawConnections.length - index;
						break;
					}
					const item = record(raw);
					const type = firstString(item.type, item.connectionType) ?? "unknown";
					const destination = firstString(item["destination-id"], item.destinationId);
					const label = firstString(item.label, item.selector, item.identifier);
					connections.push(connection.parse({
						id: `${sourceId}:connection:${index}`,
						kind: classifyConnection(type),
						source_id: sourceId,
						destination_id: destination,
						label,
						attributes: jsonSafeRecord(item)
					}));
				}
			}
			return {
				objects,
				connections,
				hierarchy: Array.isArray(hierarchyRaw) ? hierarchyRaw : [],
				classes: classesRaw,
				objectCount: objectEntries.length,
				omittedObjects: Math.max(0, objectEntries.length - 2e4),
				omittedConnections,
				unresolvedConnections: 0,
				omittedHierarchyReferences: 0
			};
		};
		archiveUid = (value) => {
			if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
			if (Object.keys(value).length !== 1) return undefined;
			const item = record(value);
			const marker = Object.hasOwn(item, "UID") ? item.UID : item["CF$UID"];
			return typeof marker === "number" && Number.isInteger(marker) ? marker : undefined;
		};
		HIERARCHY_KEY = /(?:subviews|contentview|childviewcontrollers|children|views)$/iu;
		keyedArchiveTable = (objectTable) => {
			const classFactsByUid = new Map();
			const parseClassFacts = (value) => {
				const descriptor = record(value);
				const rawSuperclasses = Array.isArray(descriptor.$classes) ? descriptor.$classes : [];
				if (!Object.hasOwn(descriptor, "$classname") && rawSuperclasses.length === 0) return null;
				return {
					name: firstString(descriptor.$classname),
					rawSuperclasses,
					superclasses: rawSuperclasses.filter((name) => typeof name === "string")
				};
			};
			const classFactsForUid = (uid) => {
				const cached = classFactsByUid.get(uid);
				if (cached !== undefined) return cached;
				if (!Number.isInteger(uid) || uid < 0 || uid >= objectTable.length) return null;
				const facts = parseClassFacts(objectTable[uid]);
				if (facts !== null) classFactsByUid.set(uid, facts);
				return facts;
			};
			const classFactsOfReference = (reference) => {
				const uid = archiveUid(reference);
				return uid === undefined ? parseClassFacts(reference) : classFactsForUid(uid);
			};
			const classFactsOfObject = (value) => classFactsOfReference(record(value).$class);
			const classNameOf = (value) => classFactsOfObject(value)?.name ?? null;
			const hasClassSuperclass = (value, superclass) => classFactsOfObject(value)?.superclasses.includes(superclass) ?? false;
			/** The string an archived string object holds, if it is one. */
			const archivedString = (target) => {
				if (typeof target === "string") return target;
				const text = record(target)["NS.string"];
				return typeof text === "string" && /^NS(?:Mutable)?String$/u.test(classNameOf(target) ?? "") ? text : undefined;
			};
			const text = (value) => {
				const uid = archiveUid(value);
				return firstString(uid === undefined ? value : archivedString(objectTable[uid]));
			};
			const authoredId = (item) => firstString(text(item.objectID), text(item["object-id"]));
			const reference = (uid) => {
				const target = uid === 0 ? null : objectTable[uid];
				if (target === undefined || target === null) return null;
				if (typeof target !== "object") return target;
				const string = archivedString(target);
				if (string !== undefined) return string;
				const objectId = authoredId(record(target));
				return {
					archiveUID: uid,
					...objectId === null ? {} : { objectID: objectId },
					className: classNameOf(target)
				};
			};
			/** Resolve one object's own fields, leaving references to other objects as stubs. */
			const resolve = (value) => {
				const uid = archiveUid(value);
				if (uid !== undefined) return reference(uid);
				if (Array.isArray(value)) return value.map(resolve);
				if (typeof value !== "object" || value === null) return value;
				const output = {};
				for (const [key, child] of Object.entries(value)) {
					if (key === "$class") output.className = classNameOf(value);
					else output[key] = resolve(child);
				}
				return output;
			};
			const hierarchy = (start) => {
				let omittedReferences = 0;
				const visited = new Set();
				const root = [];
				const pending = [{
					value: start,
					output: root
				}];
				const appendNode = (item, uid, output) => {
					const objectId = firstString(authoredId(item), text(item.id), uid === undefined ? null : String(uid));
					if (objectId === null) {
						for (const [key, child] of Object.entries(item).reverse()) if (HIERARCHY_KEY.test(key)) pending.push({
							value: child,
							output
						});
						return;
					}
					const children = [];
					output.push({
						objectID: objectId,
						children
					});
					for (const [key, child] of Object.entries(item).reverse()) if (HIERARCHY_KEY.test(key)) pending.push({
						value: child,
						output: children
					});
				};
				while (pending.length > 0) {
					const entry = pending.pop();
					if (entry === undefined) break;
					const { value, output } = entry;
					const uid = archiveUid(value);
					if (uid !== undefined) {
						if (uid === 0) continue;
						const target = objectTable[uid];
						if (target === undefined) {
							omittedReferences += 1;
							continue;
						}
						if (visited.has(uid)) continue;
						visited.add(uid);
						if (Array.isArray(target)) {
							for (let index = target.length - 1; index >= 0; index -= 1) {
								const child = target[index];
								if (child !== undefined) pending.push({
									value: child,
									output
								});
							}
							continue;
						}
						if (typeof target !== "object" || target === null) continue;
						const item = record(target);
						if (archivedArrayClass(item.$class)) {
							const members = item["NS.objects"];
							if (Array.isArray(members)) for (let index = members.length - 1; index >= 0; index -= 1) {
								const child = members[index];
								if (child !== undefined) pending.push({
									value: child,
									output
								});
							}
							continue;
						}
						appendNode(item, uid, output);
						continue;
					}
					if (Array.isArray(value)) {
						for (let index = value.length - 1; index >= 0; index -= 1) {
							const child = value[index];
							if (child !== undefined) pending.push({
								value: child,
								output
							});
						}
					} else if (typeof value === "object" && value !== null) {
						appendNode(record(value), undefined, output);
					}
				}
				return {
					items: root,
					omittedReferences
				};
			};
			const archivedArrayClass = (classReference) => {
				const superclasses = classFactsOfReference(classReference)?.superclasses ?? [];
				return superclasses.includes("NSArray") || superclasses.includes("NSMutableArray");
			};
			const classTable = () => Object.fromEntries(objectTable.flatMap((_, uid) => {
				const facts = classFactsForUid(uid);
				return facts === null || facts.name === null ? [] : [[facts.name, { superclasses: facts.rawSuperclasses }]];
			}));
			return {
				resolve,
				hierarchy,
				hasClassSuperclass,
				classTable
			};
		};
		parseKeyedArchive = (root) => {
			if (root.$archiver !== "NSKeyedArchiver" || !Array.isArray(root.$objects)) return null;
			const objectTable = root.$objects;
			const { resolve, hierarchy: toHierarchy, hasClassSuperclass, classTable } = keyedArchiveTable(objectTable);
			const objects = [];
			const connections = [];
			let objectCount = 0;
			let omittedConnections = 0;
			let unresolvedConnections = 0;
			for (const [index, raw] of objectTable.entries()) {
				if (index === 0) continue;
				const resolved = record(resolve(raw));
				const className = firstString(resolved.className);
				if (className === null && !Object.hasOwn(record(raw), "$class")) continue;
				objectCount += 1;
				const fields = Object.fromEntries(Object.entries(resolved).filter(([key]) => key !== "className"));
				if (className === null) fields.$class = record(raw).$class;
				const authoredId = firstString(fields.objectID, fields["object-id"]);
				const objectId = authoredId ?? (typeof fields.archiveUID === "number" ? String(fields.archiveUID) : String(index));
				const kind = classifyObject(className);
				if (objects.length < 2e4) objects.push(objectNode.parse({
					id: objectId,
					kind,
					class_name: className,
					name: firstString(fields.label, fields.title, fields.identifier, fields.accessibilityLabel, className) ?? `object ${String(index)}`,
					attributes: jsonSafeRecord(fields)
				}));
				if (className !== null && (isInterfaceBuilderConnectionClass(className) || hasClassSuperclass(raw, "NSNibConnector"))) {
					const controlAction = /ControlConnector/iu.test(className);
					const uiKit = isUIKitRuntimeConnectionClass(className);
					const connectionFields = interfaceBuilderConnectionFieldNames(className);
					const source = uiKit ? archivedObjectReference(fields[connectionFields.source]) : firstObjectReference(controlAction ? fields.destination : fields.source, archivedObjectReference(fields[connectionFields.source]), controlAction ? fields.to : fields.from, controlAction ? fields.target : fields.owner);
					if (source === null) {
						unresolvedConnections += 1;
						continue;
					}
					const kind = controlAction ? "action" : classifyConnection(className);
					const parsedConnection = connection.parse({
						id: `archive:${objectId}`,
						kind,
						source_id: source,
						destination_id: uiKit ? archivedObjectReference(fields[connectionFields.destination]) : firstObjectReference(controlAction ? fields.source : fields.destination, archivedObjectReference(fields[connectionFields.destination]), controlAction ? fields.from : fields.to, controlAction ? fields.owner : fields.target),
						label: uiKit ? firstString(fields[connectionFields.label]) : firstString(fields.label, fields[connectionFields.label], fields.selector, fields.identifier, fields.action),
						attributes: jsonSafeRecord(fields)
					});
					if (connections.length < 4e4) connections.push(parsedConnection);
					else omittedConnections += 1;
				}
			}
			const top = record(root.$top);
			const hierarchy = toHierarchy(top.root ?? top.UITopLevelObjectsKey);
			const classes = classTable();
			return {
				objects,
				connections,
				hierarchy: hierarchy.items,
				classes,
				objectCount,
				omittedObjects: Math.max(0, objectCount - 2e4),
				omittedConnections,
				unresolvedConnections,
				omittedHierarchyReferences: hierarchy.omittedReferences
			};
		};
		record = (value) => recordSchema.safeParse(value).data ?? {};
		firstString = (...values) => {
			for (const value of values) if (typeof value === "string" && value.length > 0) return value;
			return null;
		};
		archivedObjectReference = (value) => {
			const item = record(value);
			if (typeof item.archiveUID !== "number") return null;
			return firstString(item.objectID, item["object-id"]) ?? String(item.archiveUID);
		};
		firstObjectReference = (...values) => {
			for (const value of values) {
				const direct = firstString(value);
				if (direct !== null) return direct;
				const item = record(value);
				const objectId = firstString(item.objectID, item["object-id"], item.id, item.identifier, typeof item.archiveUID === "number" ? String(item.archiveUID) : null);
				if (objectId !== null) return objectId;
			}
			return null;
		};
		classifyObject = (className) => {
			const value = className?.toLowerCase() ?? "";
			if (value.includes("constraint")) return "constraint";
			if (value.includes("layoutguide")) return "layout_guide";
			if (value.includes("placeholder") || value.includes("firstresponder") || value === "uiproxyobject") return "placeholder";
			if (value.includes("image") || value.includes("color") || value.includes("font")) return "resource";
			if (value.includes("external")) return "external_object";
			if (value.includes("viewcontroller") || value.includes("windowcontroller")) return "view_controller";
			if (value.includes("button") || value.includes("control") || value.includes("textfield") || value.includes("slider") || value.includes("menuitem")) return "control";
			if (value.includes("view") || value.includes("window") || value.includes("cell")) return "view";
			return "other";
		};
		classifyConnection = (type) => {
			const value = type.toLowerCase();
			if (value.includes("outlet")) return "outlet";
			if (value.includes("action") || value.includes("eventconnection")) return "action";
			if (value.includes("segue")) return "segue";
			return "other";
		};
		jsonSafeRecord = (value) => Object.fromEntries(Object.entries(value).flatMap(([key, item]) => {
			try {
				const serialized = JSON.stringify(item);
				if (serialized === undefined) return [];
				const parsed = jsonValueSchema.safeParse(JSON.parse(serialized));
				return parsed.success ? [[key, parsed.data]] : [];
			} catch (cause) {
				void cause;
				return [];
			}
		}));
	})))();
}

//#endregion
//#region dist/domain/swiftSymbolClassification.js
var LEGACY_CATEGORIES, NOMINAL_CATEGORIES, classifySwiftSymbol, SWIFT_MANGLING_PREFIXES, isSwiftMangledSymbolName, identifierEnd;
function init_swiftSymbolClassification() {
	return (init_swiftSymbolClassification = __esmMin((() => {
		LEGACY_CATEGORIES = [
			["_TtC", "classes"],
			["_TtV", "structs"],
			["_TtO", "enums"],
			["_TtP", "protocols"],
			["_TtE", "extensions"]
		];
		NOMINAL_CATEGORIES = new Map([
			["C", "classes"],
			["V", "structs"],
			["O", "enums"],
			["P", "protocols"]
		]);
		classifySwiftSymbol = (name) => {
			const prefix = /^_?(?:\$[sS]|_T0)/u.exec(name);
			if (prefix === null) {
				if (!name.includes("_Tt")) return undefined;
				return { category: LEGACY_CATEGORIES.find(([prefix]) => name.startsWith(prefix))?.[1] ?? null };
			}
			const mangling = name.slice(prefix[0].length);
			let offset = identifierEnd(mangling, 0);
			if (offset === undefined) return { category: null };
			let category = null;
			for (;;) {
				const end = identifierEnd(mangling, offset);
				if (end === undefined) {
					if (mangling.charAt(offset) === "0") category = null;
					break;
				}
				const kind = mangling.charAt(end);
				const nominal = NOMINAL_CATEGORIES.get(kind);
				if (nominal === undefined) {
					if (mangling.slice(end) === "Mp") category = "protocols";
					else if (kind === "E" && category !== null) category = "extensions";
					break;
				}
				category = nominal;
				offset = end + 1;
			}
			return { category };
		};
		SWIFT_MANGLING_PREFIXES = [
			"_T0",
			"$S",
			"_$S",
			"$s",
			"_$s",
			"@__swiftmacro_",
			"$e",
			"_$e"
		];
		isSwiftMangledSymbolName = (name) => SWIFT_MANGLING_PREFIXES.some((prefix) => name.startsWith(prefix));
		identifierEnd = (mangling, offset) => {
			const lengthToken = /^[1-9][0-9]*/u.exec(mangling.slice(offset))?.[0];
			if (lengthToken === undefined) return undefined;
			const start = offset + lengthToken.length;
			const end = start + Number(lengthToken);
			if (!Number.isSafeInteger(end) || end > mangling.length || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(mangling.slice(start, end))) return undefined;
			return end;
		};
	})))();
}

//#endregion
//#region dist/domain/native/objcSwiftMetadata.js
var isAppleDispatchMetadataTarget, objcMethodTypeSchema, objcPropertyAttributeSchema, objcMethodSchema, objcPropertySchema, objcProtocolSchema, objcClassSchema, nativeMetadataLocationSchema, nativeMetadataDecodeSchema, nativeMetadataEvidenceSchema, objcIvarSchema, objcProtocolRecordSchema, objcDispatchImplementationSchema, objcCategorySchema, machoImportBindingSchema, swiftConformanceSchema, swiftDispatchSlotSchema, relativePointerSchema, swiftSymbolSchema, nativeMetadataCoverageSchema, objcClassImportIdentitySchema, objcClassImportBindingCoverageSchema, swiftDeclKindSchema, swiftAccessLevelSchema, swiftDeclSchema, dbOperationSchema, dbSaveResultSchema, objcSwiftMetadataSchema, DEFAULT_DISPATCH_METADATA_INPUT_BYTES, MAXIMUM_DISPATCH_METADATA_INPUT_BYTES, dispatchMetadataInputAdmissionSchema, nativeDispatchMetadataResultSchema, inspectNativeDispatchMetadata, parseMetadataAddress;
function init_objcSwiftMetadata() {
	return (init_objcSwiftMetadata = __esmMin((() => {
		init_binaryTargetTypes();
		init_evidence();
		init_swiftSymbolClassification();
		init_nativeCallReference();
		init_machoTargetSelection();
		init_unicodeCodePointOrder();
		isAppleDispatchMetadataTarget = (target) => target.kind === "executable" && isMachOFormat$1(target.format);
		objcMethodTypeSchema = z.enum([
			"instance",
			"class",
			"ivar_getter",
			"ivar_setter"
		]);
		objcPropertyAttributeSchema = z.strictObject({
			name: z.string().min(1),
			value: z.string()
		});
		objcMethodSchema = z.strictObject({
			selector: z.string().min(1),
			method_type: objcMethodTypeSchema,
			address: z.number().int().nullable(),
			is_required: z.boolean().nullable(),
			is_optional: z.boolean().nullable()
		});
		objcPropertySchema = z.strictObject({
			name: z.string().min(1),
			type_encoding: z.string().nullable(),
			attributes: z.array(objcPropertyAttributeSchema),
			atomicity: z.enum(["atomic", "nonatomic"]).nullable(),
			is_readonly: z.boolean().nullable(),
			getter: z.string().nullable(),
			setter: z.string().nullable()
		});
		objcProtocolSchema = z.strictObject({
			name: z.string().min(1),
			methods: z.array(objcMethodSchema).default([]),
			optional_methods: z.array(objcMethodSchema).default([]),
			properties: z.array(objcPropertySchema).default([])
		});
		objcClassSchema = z.strictObject({
			name: z.string().min(1),
			super_class: z.string().nullable(),
			is_meta_class: z.boolean().nullable(),
			is_root_class: z.boolean().nullable(),
			methods: z.array(objcMethodSchema).default([]),
			properties: z.array(objcPropertySchema).default([]),
			protocols: z.array(z.string()).default([]),
			ivar_count: z.number().int().nonnegative().nullable(),
			instance_size: z.number().int().nonnegative().nullable(),
			location: z.object({
				address: z.string().nullable(),
				file_offset: z.number().int().nonnegative().nullable()
			}).optional(),
			superclass_address: z.string().nullable().optional(),
			metaclass_address: z.string().nullable().optional(),
			decode: z.object({
				status: z.enum([
					"decoded",
					"partial",
					"unsupported",
					"invalid"
				]),
				reason: z.string().nullable()
			}).optional(),
			evidence: z.array(z.object({
				kind: z.literal("binary_metadata"),
				description: z.string(),
				location: z.object({
					address: z.string().nullable(),
					file_offset: z.number().int().nonnegative().nullable()
				}),
				artifact_path: z.string(),
				artifact_sha256: z.string()
			})).optional()
		});
		nativeMetadataLocationSchema = z.strictObject({
			address: z.string().nullable(),
			file_offset: z.number().int().nonnegative().nullable()
		});
		nativeMetadataDecodeSchema = z.strictObject({
			status: z.enum([
				"decoded",
				"partial",
				"unsupported",
				"invalid"
			]),
			reason: z.string().nullable()
		});
		nativeMetadataEvidenceSchema = z.strictObject({
			kind: z.enum([
				"binary_metadata",
				"interface_builder_resource",
				"symbol",
				"reference",
				"decompiler"
			]),
			description: z.string().min(1),
			provider: providerSchema.optional(),
			location: nativeMetadataLocationSchema,
			/** Preserve a provider's source value when it does not establish a location. */
			reported_address: z.string().optional(),
			call_reference: nativeCallReferenceSchema.exactOptional(),
			artifact_path: z.string().min(1).nullable().default(null),
			artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable().default(null)
		});
		objcIvarSchema = z.strictObject({
			class_name: z.string().min(1),
			name: z.string().min(1),
			type_encoding: z.string().nullable(),
			offset: z.number().int().nonnegative().nullable(),
			size: z.number().int().nonnegative().nullable().default(null),
			alignment: z.number().int().positive().nullable().default(null),
			location: nativeMetadataLocationSchema,
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		objcProtocolRecordSchema = z.strictObject({
			name: z.string(),
			adopted_protocols: z.array(z.string()),
			methods: z.array(objcMethodSchema),
			optional_methods: z.array(objcMethodSchema),
			location: nativeMetadataLocationSchema,
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		objcDispatchImplementationSchema = z.strictObject({
			class_name: z.string().min(1),
			selector: z.string().min(1),
			method_type: z.enum(["instance", "class"]),
			implementation_address: z.string().nullable(),
			/** Category that adds this method, when it is not defined by the class itself. */
			category: z.string().nullable().optional(),
			location: nativeMetadataLocationSchema,
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		objcCategorySchema = z.strictObject({
			name: z.string().min(1),
			/** Extended class; external classes come from the category's bind symbol. */
			class_name: z.string().min(1).nullable(),
			class_source: z.enum([
				"local",
				"external",
				"unresolved"
			]),
			instance_methods: z.array(z.string()),
			class_methods: z.array(z.string()),
			protocols: z.array(z.string()),
			properties: z.array(objcPropertySchema),
			location: nativeMetadataLocationSchema,
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		machoImportBindingSchema = z.strictObject({
			requested_address: z.string().min(1),
			symbol: z.string().min(1),
			binding_source: z.enum([
				"chained",
				"bind",
				"weak",
				"lazy"
			]),
			library_ordinal: z.number().int().min(-3).max(Number.MAX_SAFE_INTEGER),
			library: z.string().nullable(),
			weak: z.boolean(),
			addend: z.string().regex(/^-?\d+$/u)
		});
		swiftConformanceSchema = z.strictObject({
			type_name: z.string().min(1).nullable(),
			/** Raw three-bit Swift ABI type-reference kind; absent in older Evidence. */
			type_reference_kind: z.number().int().min(0).max(7).optional(),
			/** Address of the descriptor, class-name string, or resolved ObjC class reference. */
			type_reference_target: nativeMetadataLocationSchema.optional(),
			type_binding: machoImportBindingSchema.nullable().optional(),
			protocol_name: z.string().min(1).nullable(),
			/** Resolved protocol descriptor address, retained when its bytes are unavailable. */
			protocol_target: nativeMetadataLocationSchema.optional(),
			protocol_binding: machoImportBindingSchema.nullable().optional(),
			module: z.string().nullable(),
			witness_table: nativeMetadataLocationSchema,
			location: nativeMetadataLocationSchema,
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		swiftDispatchSlotSchema = z.strictObject({
			owner: z.string().min(1),
			table_kind: z.enum(["witness_table", "class_vtable"]),
			slot_index: z.number().int().nonnegative(),
			requirement: z.string().nullable(),
			implementation: z.string().nullable(),
			implementation_address: z.string().nullable(),
			implementation_binding: machoImportBindingSchema.nullable().optional(),
			thunk_address: z.string().nullable(),
			location: nativeMetadataLocationSchema,
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		relativePointerSchema = z.strictObject({
			field: nativeMetadataLocationSchema,
			target: nativeMetadataLocationSchema,
			displacement: z.number().int(),
			indirectable: z.boolean(),
			indirect: z.boolean().nullable(),
			encoding_tag: z.number().int().nonnegative().optional(),
			binding: machoImportBindingSchema.optional(),
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		swiftSymbolSchema = z.strictObject({
			mangled_name: z.string().min(1),
			address: z.string().min(1).nullable(),
			decode: nativeMetadataDecodeSchema,
			evidence: z.array(nativeMetadataEvidenceSchema).min(1)
		});
		nativeMetadataCoverageSchema = z.strictObject({
			facet: z.string().min(1),
			status: z.enum([
				"complete",
				"partial",
				"unsupported",
				"not_requested"
			]),
			reason: z.string().nullable(),
			examined: z.number().int().nonnegative(),
			decoded: z.number().int().nonnegative()
		});
		objcClassImportIdentitySchema = machoImportBindingSchema.omit({ requested_address: true });
		objcClassImportBindingCoverageSchema = z.strictObject({
			facet: z.literal("objc_class_import_bindings"),
			status: z.enum([
				"complete",
				"partial",
				"unsupported",
				"not_requested"
			]),
			reason: z.string().nullable(),
			examined: z.number().int().nonnegative(),
			decoded: z.number().int().nonnegative()
		});
		swiftDeclKindSchema = z.enum([
			"class",
			"struct",
			"enum",
			"protocol",
			"extension",
			"actor",
			"global_var",
			"global_func"
		]);
		swiftAccessLevelSchema = z.enum([
			"private",
			"fileprivate",
			"internal",
			"public",
			"open"
		]);
		swiftDeclSchema = z.strictObject({
			kind: swiftDeclKindSchema,
			name: z.string().min(1),
			module: z.string().nullable(),
			access_level: swiftAccessLevelSchema.default("internal"),
			super_class: z.string().nullable(),
			protocols: z.array(z.string()).default([]),
			is_final: z.boolean().default(false),
			is_required: z.boolean().default(false),
			is_convenience_init: z.boolean().default(false),
			is_override: z.boolean().default(false)
		});
		dbOperationSchema = z.enum([
			"save",
			"readback",
			"open_database",
			"close_database",
			"export",
			"import"
		]);
		dbSaveResultSchema = z.strictObject({
			operation: dbOperationSchema,
			succeeded: z.boolean(),
			preserved_names: z.number().int().nonnegative().default(0),
			preserved_comments: z.number().int().nonnegative().default(0),
			preserved_bookmarks: z.number().int().nonnegative().default(0),
			database_path: z.string().nullable(),
			error: z.string().nullable()
		});
		objcSwiftMetadataSchema = z.strictObject({
			objc_classes: z.array(objcClassSchema).default([]),
			objc_protocols: z.array(objcProtocolSchema).default([]),
			objc_categories: z.array(objcCategorySchema).default([]),
			swift_decls: z.array(swiftDeclSchema).default([]),
			objc_ivars: z.array(objcIvarSchema).default([]),
			objc_protocol_records: z.array(objcProtocolRecordSchema).default([]),
			objc_dispatch_implementations: z.array(objcDispatchImplementationSchema).default([]),
			swift_conformances: z.array(swiftConformanceSchema).default([]),
			swift_dispatch_slots: z.array(swiftDispatchSlotSchema).default([]),
			swift_symbols: z.array(swiftSymbolSchema).default([]),
			objc_class_import_bindings: z.array(machoImportBindingSchema).optional(),
			objc_class_import_binding_coverage: objcClassImportBindingCoverageSchema.optional(),
			target_selection: machoTargetSelectionSchema.optional(),
			relative_pointers: z.array(relativePointerSchema).default([]),
			coverage: z.array(nativeMetadataCoverageSchema).default([]),
			db_save_result: dbSaveResultSchema.nullable()
		});
		DEFAULT_DISPATCH_METADATA_INPUT_BYTES = 64 * 1024 * 1024;
		MAXIMUM_DISPATCH_METADATA_INPUT_BYTES = 1024 * 1024 * 1024;
		dispatchMetadataInputAdmissionSchema = z.strictObject({
			maximum_bytes: z.number().int().min(1).max(MAXIMUM_DISPATCH_METADATA_INPUT_BYTES),
			source: z.enum(["default", "caller"]),
			retained_bytes: z.number().int().nonnegative()
		});
		nativeDispatchMetadataResultSchema = z.strictObject({
			target_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
			target_architecture: z.enum(BINARY_ARCHITECTURES).nullable().optional(),
			provider: z.strictObject({
				id: z.string().min(1),
				name: z.string().min(1),
				version: z.string().nullable()
			}),
			analysis_profile_digest: z.string().min(1).nullable(),
			/** Present when REA read the target bytes itself; symbol-only inventories have none. */
			input_admission: dispatchMetadataInputAdmissionSchema.exactOptional(),
			result: objcSwiftMetadataSchema
		});
		inspectNativeDispatchMetadata = (names, maxRecords = 5e3) => {
			const symbolEvidence = (entry, address) => [{
				kind: "symbol",
				description: `Provider symbol ${entry.name}`,
				location: {
					address,
					file_offset: null
				},
				...address === null ? { reported_address: entry.address } : {},
				artifact_path: null,
				artifact_sha256: null
			}];
			const classNames = new Set();
			const implementations = new Map();
			const swiftSymbols = [];
			const examinedNames = names.slice(0, maxRecords);
			for (const entry of examinedNames) {
				const address = entry.address === "" ? null : entry.address;
				const classMatch = /(?:OBJC_CLASS_|OBJC_METACLASS_)\$_([^\s]+)/u.exec(entry.name);
				if (classMatch?.[1] !== undefined) classNames.add(classMatch[1]);
				const methodMatch = /^([+-])\[([^\s\]]+)\s+([^\]]+)\]$/u.exec(entry.name);
				if (methodMatch?.[1] !== undefined && methodMatch[2] && methodMatch[3]) {
					const methodType = methodMatch[1] === "+" ? "class" : "instance";
					const selector = methodMatch[3];
					implementations.set(`${methodMatch[2]}:${selector}:${methodType}`, {
						class_name: methodMatch[2],
						selector,
						method_type: methodType,
						implementation_address: address,
						location: {
							address,
							file_offset: null
						},
						decode: {
							status: "partial",
							reason: "symbol_name_only"
						},
						evidence: symbolEvidence(entry, address)
					});
					classNames.add(methodMatch[2]);
				}
				if (isSwiftMangledSymbolName(entry.name) || entry.name.startsWith("_Tt")) swiftSymbols.push({
					mangled_name: entry.name,
					address,
					decode: {
						status: "partial",
						reason: "mangled_symbol_not_demangled"
					},
					evidence: symbolEvidence(entry, address)
				});
			}
			const methodsByClass = new Map();
			for (const implementation of implementations.values()) {
				const methods = methodsByClass.get(implementation.class_name) ?? [];
				methods.push({
					selector: implementation.selector,
					method_type: implementation.method_type,
					address: parseMetadataAddress(implementation.implementation_address),
					is_required: null,
					is_optional: null
				});
				methodsByClass.set(implementation.class_name, methods);
			}
			const classes = [...classNames].sort().map((name) => ({
				name,
				super_class: null,
				is_meta_class: null,
				is_root_class: null,
				methods: methodsByClass.get(name) ?? [],
				properties: [],
				protocols: [],
				ivar_count: null,
				instance_size: null
			}));
			const decodedImplementations = [...implementations.values()].sort((left, right) => compareUnicodeCodePoints(compositeKey([left.class_name, left.selector]), compositeKey([right.class_name, right.selector])));
			const swift = swiftSymbols.length > 0;
			return objcSwiftMetadataSchema.parse({
				objc_classes: classes,
				objc_dispatch_implementations: decodedImplementations,
				swift_symbols: swiftSymbols,
				coverage: [
					{
						facet: "objc_class_symbols",
						status: "partial",
						reason: names.length > examinedNames.length ? "record_limit_reached_and_symbol_names_are_not_runtime_class_metadata" : "symbol_names_do_not_recover_all_runtime_class_metadata",
						examined: examinedNames.length,
						decoded: classes.length
					},
					{
						facet: "objc_dispatch_implementations",
						status: decodedImplementations.length > 0 ? "partial" : "unsupported",
						reason: names.length > examinedNames.length ? "record_limit_reached_and_only_symbolized_methods_are_resolved" : decodedImplementations.length > 0 ? "only_symbolized_methods_are_resolved" : "provider_name_inventory_has_no_objc_method_symbols",
						examined: examinedNames.length,
						decoded: decodedImplementations.length
					},
					{
						facet: "objc_ivar_layouts",
						status: "unsupported",
						reason: "symbol_inventory_does_not_expose_runtime_ivar_layouts",
						examined: 0,
						decoded: 0
					},
					{
						facet: "swift_declarations",
						status: swift ? "partial" : "unsupported",
						reason: swift ? "symbols_are_not_demangled_declarations" : "no_swift_symbols_observed",
						examined: swiftSymbols.length,
						decoded: 0
					},
					{
						facet: "swift_dispatch_tables",
						status: "unsupported",
						reason: "provider_name_inventory_does_not_decode_witness_or_class_vtables",
						examined: 0,
						decoded: 0
					},
					{
						facet: "relative_pointers",
						status: "unsupported",
						reason: "provider_name_inventory_does_not_decode_binary_relative_pointers",
						examined: 0,
						decoded: 0
					}
				],
				db_save_result: null
			});
		};
		parseMetadataAddress = (address) => {
			if (address === null) return null;
			const match = /(?:^|:)0x([0-9a-f]+)$/iu.exec(address);
			if (match?.[1] === undefined) return null;
			const value = Number.parseInt(match[1], 16);
			return Number.isSafeInteger(value) ? value : null;
		};
	})))();
}

//#endregion
//#region dist/domain/native/nativeInvestigationGraph.js
var nativeInvestigationNodeKindSchema, nativeInvestigationNodeSchema, nativeInvestigationRelationSchema, nativeInvestigationEdgeSchema, nativeInvestigationCoverageSchema, nativeInvestigationProviderSchema, nativeInvestigationGraphSchema, nativeInvestigationTraceLimitsSchema, nativeInvestigationTraceSchema, traceNativeInvestigationGraph, joinInterfaceBuilderDispatch;
function init_nativeInvestigationGraph() {
	return (init_nativeInvestigationGraph = __esmMin((() => {
		init_objcSwiftMetadata();
		init_jsonValue();
		nativeInvestigationNodeKindSchema = z.enum([
			"storyboard",
			"scene",
			"view_controller",
			"view",
			"control",
			"constraint",
			"layout_guide",
			"resource",
			"placeholder",
			"external_object",
			"outlet",
			"action",
			"segue",
			"objc_class",
			"objc_selector",
			"swift_declaration",
			"swift_requirement",
			"dispatch_table",
			"dispatch_slot",
			"thunk",
			"function",
			"state_value",
			"global_value",
			"field",
			"branch_condition",
			"sink",
			"unknown"
		]);
		nativeInvestigationNodeSchema = z.strictObject({
			id: z.string().min(1),
			kind: nativeInvestigationNodeKindSchema,
			name: z.string().min(1),
			location: nativeMetadataLocationSchema.nullable(),
			attributes: z.record(z.string(), jsonValueSchema),
			evidence: z.array(nativeMetadataEvidenceSchema)
		});
		nativeInvestigationRelationSchema = z.enum([
			"contains",
			"outlet_to",
			"target_action",
			"segue_to",
			"objc_dispatch",
			"swift_witness_dispatch",
			"swift_vtable_dispatch",
			"thunk_to",
			"direct_call",
			"indirect_call",
			"provider_call",
			"reads",
			"writes",
			"flows_to",
			"controls"
		]);
		nativeInvestigationEdgeSchema = z.discriminatedUnion("resolution", [z.strictObject({
			id: z.string().min(1),
			from: z.string().min(1),
			to: z.string().min(1),
			relation: nativeInvestigationRelationSchema,
			resolution: z.enum([
				"observed",
				"inferred",
				"resolved",
				"ambiguous"
			]),
			evidence: z.array(nativeMetadataEvidenceSchema).min(1),
			limitations: z.array(z.string())
		}), z.strictObject({
			id: z.string().min(1),
			from: z.string().min(1),
			to: z.null(),
			relation: nativeInvestigationRelationSchema,
			resolution: z.literal("unresolved"),
			reason: z.string().min(1),
			evidence: z.array(nativeMetadataEvidenceSchema),
			limitations: z.array(z.string())
		})]);
		nativeInvestigationCoverageSchema = z.strictObject({
			facet: z.string().min(1),
			status: z.enum([
				"complete",
				"partial",
				"unsupported",
				"not_requested"
			]),
			reason: z.string().nullable(),
			examined: z.number().int().nonnegative(),
			omitted: z.number().int().nonnegative()
		});
		nativeInvestigationProviderSchema = z.strictObject({
			id: z.string().min(1),
			version: z.string().nullable(),
			tool_version: z.string().min(1)
		});
		nativeInvestigationGraphSchema = z.strictObject({
			target_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
			provider: nativeInvestigationProviderSchema,
			nodes: z.array(nativeInvestigationNodeSchema),
			edges: z.array(nativeInvestigationEdgeSchema),
			coverage: z.array(nativeInvestigationCoverageSchema),
			truncated: z.boolean()
		});
		nativeInvestigationTraceLimitsSchema = z.strictObject({
			max_depth: z.number().int().min(0).max(32).default(8),
			max_nodes: z.number().int().min(1).max(2e3).default(250),
			max_edges: z.number().int().min(1).max(5e3).default(500)
		});
		nativeInvestigationTraceSchema = z.strictObject({
			target_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
			provider: nativeInvestigationProviderSchema,
			start: z.string().min(1),
			direction: z.enum(["forward", "backward"]),
			nodes: z.array(nativeInvestigationNodeSchema),
			edges: z.array(nativeInvestigationEdgeSchema),
			unresolved: z.array(nativeInvestigationEdgeSchema),
			reached_depth: z.number().int().nonnegative(),
			truncated: z.boolean(),
			reason: z.string().nullable(),
			coverage: z.array(nativeInvestigationCoverageSchema),
			limitations: z.array(z.string().min(1))
		});
		traceNativeInvestigationGraph = (graph, input) => {
			const start = graph.nodes.find(({ id }) => id === input.start);
			if (start === undefined) return {
				target_sha256: graph.target_sha256,
				provider: graph.provider,
				start: input.start,
				direction: input.direction ?? "forward",
				nodes: [],
				edges: [],
				unresolved: [],
				reached_depth: 0,
				truncated: false,
				reason: "start_node_missing",
				coverage: graph.coverage,
				limitations: ["The requested start node is absent from the supplied graph."]
			};
			const limits = nativeInvestigationTraceLimitsSchema.parse(input.limits ?? {});
			const direction = input.direction ?? "forward";
			const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
			const visited = new Set([start.id]);
			const selectedEdges = new Map();
			const unresolved = new Map();
			const queue = [{
				id: start.id,
				depth: 0
			}];
			let reachedDepth = 0;
			let truncated = false;
			let reason = null;
			const adjacency = new Map();
			for (const edge of graph.edges) {
				const nodeId = direction === "forward" ? edge.from : edge.to;
				if (nodeId === null) continue;
				const entries = adjacency.get(nodeId);
				if (entries === undefined) adjacency.set(nodeId, [edge]);
				else entries.push(edge);
			}
			while (queue.length > 0) {
				const current = queue.shift();
				if (current === undefined) break;
				const adjacent = adjacency.get(current.id) ?? [];
				for (const edge of adjacent) {
					if (selectedEdges.size + unresolved.size >= limits.max_edges) {
						truncated = true;
						reason = "max_edges_reached";
						break;
					}
					if (edge.resolution === "unresolved") {
						unresolved.set(edge.id, edge);
						continue;
					}
					const nextId = direction === "forward" ? edge.to : edge.from;
					const alreadyVisited = visited.has(nextId);
					if (!alreadyVisited && current.depth >= limits.max_depth) {
						truncated = true;
						reason ??= "max_depth_reached";
						continue;
					}
					if (!alreadyVisited && visited.size >= limits.max_nodes) {
						truncated = true;
						reason = "max_nodes_reached";
						break;
					}
					selectedEdges.set(edge.id, edge);
					if (alreadyVisited) continue;
					if (!nodeById.has(nextId)) {
						truncated = true;
						reason ??= "edge_target_missing_from_graph";
						continue;
					}
					visited.add(nextId);
					reachedDepth = Math.max(reachedDepth, current.depth + 1);
					queue.push({
						id: nextId,
						depth: current.depth + 1
					});
				}
				if (reason === "max_edges_reached" || reason === "max_nodes_reached") break;
			}
			return {
				target_sha256: graph.target_sha256,
				provider: graph.provider,
				start: start.id,
				direction,
				nodes: [...visited].flatMap((id) => {
					const node = nodeById.get(id);
					return node === undefined ? [] : [node];
				}),
				edges: [...selectedEdges.values()],
				unresolved: [...unresolved.values()],
				reached_depth: reachedDepth,
				truncated,
				reason,
				coverage: graph.coverage,
				limitations: ["Static analysis does not prove that an authored UI action is reachable or executed at runtime.", "Provider call graphs may omit unresolved indirect dispatch."]
			};
		};
		joinInterfaceBuilderDispatch = (graph, metadata) => {
			const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
			const edges = [...graph.edges];
			const existingEdgeIds = new Set(edges.map(({ id }) => id));
			const selectorNodesByAction = new Map();
			for (const edge of edges) {
				if (edge.resolution === "observed" && edge.relation === "target_action" && nodes.get(edge.to)?.kind === "objc_selector") selectorNodesByAction.set(edge.from, edge.to);
			}
			let examined = 0;
			let resolved = 0;
			let inferredWithoutOwnerClass = 0;
			for (const action of nodes.values()) {
				if (action.kind !== "action") continue;
				const selector = action.attributes.selector;
				if (typeof selector !== "string" || selector.length === 0) continue;
				const selectorNodeId = selectorNodesByAction.get(action.id);
				if (selectorNodeId === undefined) continue;
				const destinationEdge = edges.find((edge) => edge.resolution === "observed" && edge.relation === "target_action" && edge.from === action.id && [
					"view_controller",
					"placeholder",
					"external_object"
				].includes(nodes.get(edge.to)?.kind ?? ""));
				if (destinationEdge === undefined || destinationEdge.resolution !== "observed") continue;
				const owner = nodes.get(destinationEdge.to);
				examined += 1;
				const declaredClass = owner?.attributes.class_name;
				const className = typeof declaredClass === "string" && declaredClass.length > 0 && owner?.kind === "view_controller" ? declaredClass : null;
				const candidates = metadata.objc_dispatch_implementations.filter((candidate) => candidate.method_type === "instance" && candidate.selector === selector && (className === null || candidate.class_name.replace(/\([^)]*\)$/u, "") === className));
				const implementation = candidates.length === 1 ? candidates[0] : undefined;
				const edgeId = `dispatch:${selectorNodeId}:${className ?? owner?.id ?? "unknown"}:${selector}`;
				if (existingEdgeIds.has(edgeId)) continue;
				existingEdgeIds.add(edgeId);
				if (implementation === undefined || implementation.implementation_address === null) {
					edges.push({
						id: edgeId,
						from: selectorNodeId,
						to: null,
						relation: "objc_dispatch",
						resolution: "unresolved",
						reason: candidates.length > 1 ? "selector_has_multiple_candidate_implementations" : "implementation_not_resolved_from_binary_metadata_or_provider_symbols",
						evidence: [...action.evidence, ...candidates.flatMap(({ evidence }) => evidence)],
						limitations: ["A missing or ambiguous symbol match does not prove that the runtime implementation is absent."]
					});
					continue;
				}
				const functionId = `native:function:${implementation.implementation_address}`;
				if (!nodes.has(functionId)) nodes.set(functionId, {
					id: functionId,
					kind: "function",
					name: `${implementation.class_name} ${selector}`,
					location: {
						address: implementation.implementation_address,
						file_offset: implementation.location.file_offset
					},
					attributes: {
						class_name: implementation.class_name,
						selector,
						method_type: implementation.method_type
					},
					evidence: implementation.evidence
				});
				edges.push({
					id: edgeId,
					from: selectorNodeId,
					to: functionId,
					relation: "objc_dispatch",
					resolution: className !== null && implementation.decode.status === "decoded" ? "resolved" : "inferred",
					evidence: [...action.evidence, ...implementation.evidence],
					limitations: className === null ? ["The selector uniquely matches a encoded or symbolized method, but the Interface Builder receiver is an unresolved placeholder; runtime dispatch was not observed."] : ["The Interface Builder target and encoded or symbolized method agree on class and selector; runtime dispatch and dynamically supplied targets were not observed."]
				});
				resolved += 1;
				if (className === null) inferredWithoutOwnerClass += 1;
			}
			return nativeInvestigationGraphSchema.parse({
				...graph,
				provider: {
					id: "rea-native-investigation",
					version: null,
					tool_version: "rea-native-investigation/1"
				},
				nodes: [...nodes.values()],
				edges,
				coverage: [...graph.coverage, {
					facet: "ui_to_objc_dispatch",
					status: examined === resolved && inferredWithoutOwnerClass === 0 ? "complete" : "partial",
					reason: examined === resolved && inferredWithoutOwnerClass === 0 ? null : inferredWithoutOwnerClass > 0 ? "some_action_receivers_remain_placeholders" : "some_action_implementations_not_resolved",
					examined,
					omitted: examined - resolved + inferredWithoutOwnerClass
				}]
			});
		};
	})))();
}

//#endregion
//#region dist/domain/apple/interfaceBuilderGraph.js
var interfaceBuilderDocumentSchema, interfaceBuilderAnalysisSchema, buildInterfaceBuilderAnalysis, interfaceBuilderLimitsSchema;
function init_interfaceBuilderGraph() {
	return (init_interfaceBuilderGraph = __esmMin((() => {
		init_bundleResourceRoot();
		init_plistNumbers();
		init_interfaceBuilderKeyedArchive();
		init_nativeInvestigationGraph();
		interfaceBuilderDocumentSchema = z.strictObject({
			relative_path: z.string().min(1),
			archive_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
			document_kind: z.enum(["nib", "storyboard_scene"]),
			object_count: z.number().int().nonnegative(),
			connection_count: z.number().int().nonnegative(),
			hierarchy_complete: z.boolean()
		});
		interfaceBuilderAnalysisSchema = bundleResourceBoundResultSchema(z.string().regex(/^[a-f0-9]{64}$/u), {
			documents: z.array(interfaceBuilderDocumentSchema).max(64),
			graph: nativeInvestigationGraphSchema,
			limitations: z.array(z.string())
		});
		buildInterfaceBuilderAnalysis = (input) => {
			const nodes = new Map();
			const edges = [];
			const coverage = [];
			const summaries = [];
			const numberLimitations = [];
			let truncated = false;
			let omittedObjects = 0;
			let omittedConnections = 0;
			let omittedGraphNodes = 0;
			let omittedHierarchyReferences = 0;
			for (const document of input.documents.slice(0, input.limits.max_documents)) {
				const parsed = parseInterfaceBuilderRecords(document.raw);
				const numbers = document.numberLiterals === undefined ? undefined : createPlistNumberProjection(document.numberLiterals);
				const prefix = `ib:${JSON.stringify(document.relativePath)}:`;
				const graphId = (kind, parts = []) => `${prefix}${kind}:${JSON.stringify(parts)}`;
				const rootId = `${prefix}root`;
				const objectIds = new Set(parsed.objects.map(({ id }) => id));
				const evidenceFor = (description) => [{
					kind: "interface_builder_resource",
					description,
					location: {
						address: null,
						file_offset: null
					},
					artifact_path: document.relativePath,
					artifact_sha256: document.archiveSha256
				}];
				const addNode = (node) => {
					if (nodes.has(node.id)) return true;
					if (nodes.size >= input.limits.max_objects) {
						truncated = true;
						omittedGraphNodes += 1;
						return false;
					}
					nodes.set(node.id, numbers === undefined ? node : {
						...node,
						attributes: Object.fromEntries(Object.entries(node.attributes).map(([key, value]) => [key, numbers.project(value)]))
					});
					return true;
				};
				const rootNode = {
					id: rootId,
					kind: document.documentKind === "nib" ? "scene" : "storyboard",
					name: document.relativePath,
					location: null,
					attributes: { document_kind: document.documentKind },
					evidence: evidenceFor("compiled document")
				};
				addNode(rootNode);
				let documentObjectCount = 0;
				for (const object of parsed.objects.slice(0, input.limits.max_objects)) {
					const id = graphId("object", [object.id]);
					const kind = object.kind === "other" ? "unknown" : object.kind;
					if (!addNode({
						id,
						kind,
						name: object.name,
						location: null,
						attributes: {
							...object.attributes,
							interface_builder_object_id: object.id,
							class_name: object.class_name
						},
						evidence: evidenceFor(`object ${object.id}`)
					})) {
						break;
					}
					documentObjectCount += 1;
				}
				let connectionEdgeCount = 0;
				let hierarchyEdgeCount = 0;
				let documentOmittedConnections = 0;
				let documentOmittedHierarchyEdges = 0;
				let hierarchyTruncated = false;
				const objectNodeId = (objectId) => graphId("object", [objectId]);
				const addEdge = (edge, isHierarchy) => {
					if (isHierarchy ? hierarchyEdgeCount >= input.limits.max_objects : connectionEdgeCount >= input.limits.max_connections * 3) {
						truncated = true;
						if (isHierarchy) {
							hierarchyTruncated = true;
							documentOmittedHierarchyEdges += 1;
						} else {
							omittedConnections += 1;
							documentOmittedConnections += 1;
						}
						return;
					}
					edges.push(edge);
					if (isHierarchy) hierarchyEdgeCount += 1;
					else connectionEdgeCount += 1;
				};
				const connect = (id, from, to, relation, description, reason) => {
					const isHierarchy = relation === "contains" && id.includes(":hierarchy:");
					if (!nodes.has(from)) {
						truncated = true;
						if (isHierarchy) {
							hierarchyTruncated = true;
							documentOmittedHierarchyEdges += 1;
						} else {
							omittedConnections += 1;
							documentOmittedConnections += 1;
						}
						return;
					}
					const evidence = evidenceFor(description);
					const unresolvedEndpoint = to !== null && !nodes.has(to);
					if (unresolvedEndpoint) {
						truncated = true;
						if (isHierarchy) hierarchyTruncated = true;
					}
					const edgeTo = unresolvedEndpoint ? null : to;
					const edgeReason = unresolvedEndpoint ? "endpoint_omitted_by_object_limit" : reason ?? "destination_unresolved";
					addEdge(edgeTo === null ? {
						id,
						from,
						to: null,
						relation,
						resolution: "unresolved",
						reason: edgeReason,
						evidence,
						limitations: []
					} : {
						id,
						from,
						to: edgeTo,
						relation,
						resolution: "observed",
						evidence,
						limitations: []
					}, isHierarchy);
				};
				let hierarchyCount = 0;
				let documentOmittedHierarchyNodes = 0;
				const visitHierarchy = (initial, initialParentId) => {
					const pending = [{
						value: initial,
						parentId: initialParentId
					}];
					while (pending.length > 0) {
						const entry = pending.pop();
						if (entry === undefined) break;
						const { value, parentId } = entry;
						if (Array.isArray(value)) {
							for (let index = value.length - 1; index >= 0; index -= 1) {
								const child = value[index];
								if (child !== undefined) pending.push({
									value: child,
									parentId
								});
							}
							continue;
						}
						if (typeof value !== "object" || value === null) continue;
						const item = record(value);
						const objectId = firstString(item.objectID, item["object-id"], item.id, typeof item.archiveUID === "number" ? String(item.archiveUID) : null);
						let nextParent = parentId;
						if (objectId !== null && hierarchyCount >= input.limits.max_objects) {
							truncated = true;
							hierarchyTruncated = true;
							documentOmittedHierarchyNodes += 1;
						} else if (objectId !== null) {
							const known = objectIds.has(objectId);
							const childId = known ? objectNodeId(objectId) : graphId("unknown", [objectId]);
							if (!known && !addNode({
								id: childId,
								kind: "unknown",
								name: firstString(item.label, item.name) ?? objectId,
								location: null,
								attributes: { interface_builder_object_id: objectId },
								evidence: evidenceFor(`hierarchy item ${objectId}`)
							})) hierarchyTruncated = true;
							connect(graphId("hierarchy", [parentId, childId]), parentId, childId, "contains", `hierarchy ${objectId}`);
							nextParent = childId;
							hierarchyCount += 1;
						}
						pending.push({
							value: item.children,
							parentId: nextParent
						});
					}
				};
				for (const hierarchy of parsed.hierarchy) visitHierarchy(hierarchy, rootId);
				for (const [index, item] of parsed.connections.slice(0, input.limits.max_connections).entries()) {
					const sourceId = objectNodeId(item.source_id);
					if (!nodes.has(sourceId)) addNode({
						id: sourceId,
						kind: "unknown",
						name: item.source_id,
						location: null,
						attributes: { interface_builder_object_id: item.source_id },
						evidence: evidenceFor(`connection source ${item.source_id}`)
					});
					const destinationId = item.destination_id === null ? null : objectNodeId(item.destination_id);
					if (item.kind === "action") {
						const actionId = graphId("action", [item.id]);
						const selectorId = item.label === null ? null : graphId("selector", [item.destination_id, item.label]);
						addNode({
							id: actionId,
							kind: "action",
							name: item.label ?? "unlabeled action",
							location: null,
							attributes: {
								selector: item.label,
								destination_id: item.destination_id,
								...item.attributes
							},
							evidence: evidenceFor(`action ${item.id}`)
						});
						connect(graphId("action-edge", [item.id, "source"]), sourceId, actionId, "target_action", `action source ${item.source_id}`);
						if (selectorId !== null) {
							addNode({
								id: selectorId,
								kind: "objc_selector",
								name: item.label ?? "unknown selector",
								location: null,
								attributes: { destination_id: item.destination_id },
								evidence: evidenceFor(`selector ${item.label}`)
							});
							connect(graphId("action-edge", [item.id, "selector"]), actionId, selectorId, "target_action", `selector ${item.label}`);
						}
						if (destinationId === null || !nodes.has(destinationId)) connect(graphId("action-edge", [item.id, "destination"]), actionId, null, "target_action", `action destination ${item.destination_id ?? "missing"}`, "destination_object_missing_or_external");
						else connect(graphId("action-edge", [item.id, "destination"]), actionId, destinationId, "target_action", `action destination ${item.destination_id}`);
					} else if (item.kind === "outlet") {
						const outletId = graphId("outlet", [item.id]);
						addNode({
							id: outletId,
							kind: "outlet",
							name: item.label ?? item.id,
							location: null,
							attributes: item.attributes,
							evidence: evidenceFor(`outlet ${item.id}`)
						});
						connect(graphId("outlet-edge", [item.id, "source"]), sourceId, outletId, "contains", `outlet source ${item.source_id}`);
						if (destinationId === null || !nodes.has(destinationId)) connect(graphId("outlet-edge", [item.id, "destination"]), outletId, null, "outlet_to", `outlet ${item.label ?? item.id}`, "destination_object_missing_or_external");
						else connect(graphId("outlet-edge", [item.id, "destination"]), outletId, destinationId, "outlet_to", `outlet ${item.label ?? item.id}`);
					} else if (item.kind === "segue") {
						if (destinationId === null || !nodes.has(destinationId)) connect(graphId("segue", [index]), sourceId, null, "segue_to", `segue ${item.label ?? item.id}`, "destination_scene_missing");
						else connect(graphId("segue", [index]), sourceId, destinationId, "segue_to", `segue ${item.label ?? item.id}`);
					} else {
						connect(graphId("unknown-connection", [index]), sourceId, null, "contains", `connection type ${item.kind}`, "unsupported_connection_type");
					}
				}
				const objectsTruncated = parsed.omittedObjects > 0 || parsed.objects.length > documentObjectCount;
				const parserOmittedHierarchyReferences = parsed.omittedHierarchyReferences;
				const omittedSerializedHierarchyReferences = document.omittedSerializedHierarchyReferences ?? 0;
				omittedHierarchyReferences += parserOmittedHierarchyReferences + omittedSerializedHierarchyReferences;
				const parserOmittedConnections = parsed.omittedConnections;
				const connectionsTruncated = parserOmittedConnections > 0 || parsed.connections.length > input.limits.max_connections;
				const connectionsUnresolved = parsed.unresolvedConnections > 0;
				const unsupportedConnections = parsed.connections.some(({ kind }) => kind === "other");
				omittedObjects += parsed.omittedObjects + Math.max(0, parsed.objects.length - documentObjectCount);
				omittedConnections += Math.max(0, parsed.connections.length - input.limits.max_connections) + parserOmittedConnections + parsed.unresolvedConnections;
				const hierarchyStatus = parserOmittedHierarchyReferences > 0 || omittedSerializedHierarchyReferences > 0 ? "partial" : parsed.hierarchy.length === 0 ? "unsupported" : hierarchyTruncated ? "partial" : "complete";
				numberLimitations.push(...(numbers?.limitations() ?? []).map((note) => `${document.relativePath}: ${note}`));
				summaries.push({
					relative_path: document.relativePath,
					archive_sha256: document.archiveSha256,
					document_kind: document.documentKind,
					object_count: parsed.objectCount,
					connection_count: parsed.connections.length + parserOmittedConnections + parsed.unresolvedConnections,
					hierarchy_complete: hierarchyStatus === "complete"
				});
				coverage.push({
					facet: `objects:${document.relativePath}`,
					status: objectsTruncated ? "partial" : "complete",
					reason: objectsTruncated ? "object_limit_reached" : null,
					examined: documentObjectCount,
					omitted: parsed.omittedObjects + Math.max(0, parsed.objects.length - documentObjectCount)
				}, {
					facet: `connections:${document.relativePath}`,
					status: connectionsTruncated || documentOmittedConnections > 0 || connectionsUnresolved || unsupportedConnections ? "partial" : "complete",
					reason: connectionsTruncated || documentOmittedConnections > 0 ? "connection_limit_reached" : connectionsUnresolved ? "connection_unresolved" : unsupportedConnections ? "unsupported_connection_type" : null,
					examined: Math.min(parsed.connections.length, input.limits.max_connections),
					omitted: Math.max(0, parsed.connections.length - input.limits.max_connections) + documentOmittedConnections + parserOmittedConnections + parsed.unresolvedConnections
				}, {
					facet: `hierarchy:${document.relativePath}`,
					status: hierarchyStatus,
					reason: parserOmittedHierarchyReferences > 0 ? "archive_hierarchy_references_missing" : omittedSerializedHierarchyReferences > 0 ? "serialized_view_hierarchy_incomplete" : parsed.hierarchy.length === 0 ? "archive_hierarchy_not_decoded" : hierarchyTruncated ? "graph_limit_reached" : null,
					examined: hierarchyCount,
					omitted: documentOmittedHierarchyNodes + documentOmittedHierarchyEdges + parserOmittedHierarchyReferences + omittedSerializedHierarchyReferences
				}, {
					facet: `classes:${document.relativePath}`,
					status: Object.keys(parsed.classes).length > 0 ? "complete" : "unsupported",
					reason: Object.keys(parsed.classes).length > 0 ? null : "archive_class_table_not_decoded",
					examined: Object.keys(parsed.classes).length,
					omitted: 0
				});
			}
			if (input.documents.length > input.limits.max_documents) {
				truncated = true;
				coverage.push({
					facet: "documents",
					status: "partial",
					reason: "document_limit_reached",
					examined: input.limits.max_documents,
					omitted: input.documents.length - input.limits.max_documents
				});
			}
			if (omittedGraphNodes > 0) coverage.push({
				facet: "graph_nodes",
				status: "partial",
				reason: "max_objects_reached",
				examined: nodes.size,
				omitted: omittedGraphNodes
			});
			return interfaceBuilderAnalysisSchema.parse({
				target_sha256: input.targetSha256,
				...input.resourceRoot === undefined ? {} : { resource_root: input.resourceRoot },
				documents: summaries,
				graph: {
					target_sha256: input.targetSha256,
					provider: {
						id: "rea-artifact-graph",
						version: "1",
						tool_version: input.toolVersion
					},
					nodes: [...nodes.values()],
					edges,
					coverage,
					truncated: truncated || omittedObjects > 0 || omittedConnections > 0 || omittedHierarchyReferences > 0
				},
				limitations: [
					...numberLimitations,
					"The graph reflects recognized Interface Builder archive fields and connections; omitted private or unrecognized archive fields remain unknown.",
					"A target-action selector is an Interface Builder observation and does not prove that the binary contains a matching implementation.",
					"Decoded constraints, runtime visibility, dynamic UI creation, and pixel geometry are not inferred from these archives."
				]
			});
		};
		interfaceBuilderLimitsSchema = z.strictObject({
			max_documents: z.number().int().min(1).max(64).default(64),
			max_objects: z.number().int().min(1).max(2e4).default(2e4),
			max_connections: z.number().int().min(1).max(4e4).default(4e4),
			trace: nativeInvestigationTraceLimitsSchema.default({
				max_depth: 8,
				max_nodes: 250,
				max_edges: 500
			})
		});
	})))();
}

//#endregion
//#region dist/domain/jsonShape.js
var jsonValueTypeSchema, jsonShapePathSegmentSchema, jsonShapeSchema, arrayElementKey, inferJsonShape, parseJsonObject, jsonValueType, isRecord, orderedChildren;
function init_jsonShape() {
	return (init_jsonShape = __esmMin((() => {
		init_unicodeCodePointOrder();
		init_safeJson();
		jsonValueTypeSchema = z.enum([
			"object",
			"array",
			"string",
			"number",
			"boolean",
			"null"
		]);
		jsonShapePathSegmentSchema = z.discriminatedUnion("kind", [z.object({
			kind: z.literal("property"),
			name: z.string()
		}), z.object({ kind: z.literal("array-element") })]);
		jsonShapeSchema = z.object({
			root_type: jsonValueTypeSchema,
			node_count: z.number().int().min(1),
			max_depth_observed: z.number().int().min(0),
			properties: z.array(z.object({
				path: z.array(jsonShapePathSegmentSchema).min(1),
				types: z.array(jsonValueTypeSchema).min(1),
				observations: z.number().int().min(1)
			}))
		});
		arrayElementKey = Symbol("array-element");
		inferJsonShape = (text) => {
			let root;
			try {
				root = JSON.parse(text);
			} catch (cause) {
				void cause;
				return null;
			}
			const rootShape = {
				path: [],
				types: new Set(),
				observations: 0
			};
			const childShape = (parent, key) => {
				const children = parent.children ??= new Map();
				const existing = children.get(key);
				if (existing !== undefined) return existing;
				const node = {
					path: [...parent.path, typeof key === "string" ? {
						kind: "property",
						name: key
					} : { kind: "array-element" }],
					types: new Set(),
					observations: 0
				};
				children.set(key, node);
				return node;
			};
			const pending = [{
				value: root,
				shape: rootShape
			}];
			let nodeCount = 0;
			let maxDepthObserved = 0;
			while (pending.length > 0) {
				const current = pending.pop();
				if (current === undefined) break;
				nodeCount += 1;
				maxDepthObserved = Math.max(maxDepthObserved, current.shape.path.length);
				current.shape.types.add(jsonValueType(current.value));
				current.shape.observations += 1;
				if (Array.isArray(current.value)) {
					if (current.value.length === 0) continue;
					const shape = childShape(current.shape, arrayElementKey);
					for (let index = current.value.length - 1; index >= 0; index -= 1) pending.push({
						value: current.value[index],
						shape
					});
					continue;
				}
				if (!isRecord(current.value)) continue;
				const allEntries = Object.entries(current.value);
				for (let index = allEntries.length - 1; index >= 0; index -= 1) {
					const entry = allEntries[index];
					if (entry === undefined) continue;
					const [name, value] = entry;
					pending.push({
						value,
						shape: childShape(current.shape, name)
					});
				}
			}
			const properties = [];
			const shapes = orderedChildren(rootShape);
			while (shapes.length > 0) {
				const shape = shapes.pop();
				if (shape === undefined) break;
				properties.push({
					path: shape.path.map((segment) => ({ ...segment })),
					types: [...shape.types].sort(),
					observations: shape.observations
				});
				for (const child of orderedChildren(shape)) shapes.push(child);
			}
			return {
				root_type: jsonValueType(root),
				node_count: nodeCount,
				max_depth_observed: maxDepthObserved,
				properties
			};
		};
		parseJsonObject = (text) => {
			const parsed = safeParseJson(text);
			return parsed.ok && isRecord(parsed.value) ? parsed.value : null;
		};
		jsonValueType = (value) => {
			if (value === null) return "null";
			if (Array.isArray(value)) return "array";
			switch (typeof value) {
				case "string": return "string";
				case "number": return "number";
				case "boolean": return "boolean";
				default: return "object";
			}
		};
		isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
		orderedChildren = (node) => [...node.children ?? []].sort(([left], [right]) => left === right ? 0 : left === arrayElementKey ? 1 : right === arrayElementKey ? -1 : compareUnicodeCodePoints(right, left)).map(([, child]) => child);
	})))();
}

//#endregion
//#region dist/domain/browserNetworkEvidence.js
var PLAYWRIGHT_RESPONSE_BODY_PROVENANCE_LIMITATION, browserNetworkContentSelectionValuesSchema, browserNetworkContentSelectionSchema, unavailableBrowserNetworkBodySchema, browserNetworkBodySchema, browserNetworkHeadersSchema;
function init_browserNetworkEvidence() {
	return (init_browserNetworkEvidence = __esmMin((() => {
		PLAYWRIGHT_RESPONSE_BODY_PROVENANCE_LIMITATION = "Captured response-body bytes are the result of Playwright's Response.body() API. Playwright may satisfy that API with a credentialed follow-up load of the request URL when CDP has no body, so transaction and event links do not verify that retained bytes came from the original network transaction.";
		browserNetworkContentSelectionValuesSchema = z.strictObject({
			request_body: z.boolean(),
			response_body: z.boolean(),
			header_values: z.boolean()
		});
		browserNetworkContentSelectionSchema = browserNetworkContentSelectionValuesSchema.extend({
			request_body: z.boolean().default(false),
			response_body: z.boolean().default(false),
			header_values: z.boolean().default(false)
		}).default({
			request_body: false,
			response_body: false,
			header_values: false
		});
		unavailableBrowserNetworkBodySchema = z.discriminatedUnion("reason", [
			z.strictObject({
				state: z.literal("unavailable"),
				reason: z.enum([
					"request-failed",
					"response-unfinished",
					"body-read-failed",
					"body-read-timeout",
					"cancelled",
					"capture-ended"
				]),
				message: z.string().min(1)
			}),
			z.strictObject({
				state: z.literal("unavailable"),
				reason: z.literal("body-size-limit"),
				message: z.string().min(1),
				limit_bytes: z.number().int().positive().safe(),
				observed_bytes: z.number().int().positive().safe()
			}),
			z.strictObject({
				state: z.literal("unavailable"),
				reason: z.literal("body-allocation-limit"),
				message: z.string().min(1),
				limit_allocation_bytes: z.number().int().positive().safe(),
				observed_allocation_bytes: z.number().int().positive().safe()
			})
		]);
		browserNetworkBodySchema = z.union([
			z.strictObject({ state: z.literal("not_requested") }),
			z.strictObject({ state: z.literal("not_exposed") }),
			unavailableBrowserNetworkBodySchema,
			z.strictObject({
				state: z.literal("captured"),
				representation: z.enum([
					"browser-exposed-request-bytes",
					"playwright-response-body-bytes",
					"browser-decoded-response-bytes"
				]),
				encoding: z.literal("base64"),
				content: z.string(),
				bytes: z.number().int().min(0),
				sha256: z.string().regex(/^[a-f0-9]{64}$/u),
				media_type: z.string().nullable(),
				redacted: z.boolean()
			}).superRefine((artifact, context) => {
				const bytes = Buffer.from(artifact.content, "base64");
				if (bytes.toString("base64") !== artifact.content) context.addIssue({
					code: "custom",
					path: ["content"],
					message: "Network body must use canonical base64"
				});
				if (bytes.length !== artifact.bytes) context.addIssue({
					code: "custom",
					path: ["bytes"],
					message: "Network body byte count disagrees with retained bytes"
				});
				if (createHash("sha256").update(bytes).digest("hex") !== artifact.sha256) context.addIssue({
					code: "custom",
					path: ["sha256"],
					message: "Network body digest disagrees with retained bytes"
				});
			})
		]);
		browserNetworkHeadersSchema = z.union([
			z.strictObject({ state: z.literal("not_requested") }),
			z.strictObject({
				state: z.literal("unavailable"),
				message: z.string().min(1)
			}),
			z.strictObject({
				state: z.literal("captured"),
				items: z.array(z.strictObject({
					name: z.string().min(1),
					value: z.string().nullable(),
					redacted: z.boolean()
				}))
			})
		]);
	})))();
}

//#endregion
//#region dist/domain/browserScenarioCaptureLimits.js
var positiveSafeInteger, DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS, browserScenarioCaptureLimitsValuesSchema, browserScenarioCaptureLimitsSchema;
function init_browserScenarioCaptureLimits() {
	return (init_browserScenarioCaptureLimits = __esmMin((() => {
		positiveSafeInteger = z.number().int().safe().positive();
		DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS = {
			max_events: 1e4,
			max_event_allocation_bytes: 4 * 1024 * 1024,
			max_total_event_allocation_bytes: 16 * 1024 * 1024,
			max_network_transactions: 1024,
			max_network_body_bytes: 64 * 1024,
			max_network_body_allocation_bytes: 1024 * 1024,
			max_network_header_allocation_bytes: 1024 * 1024,
			max_network_metadata_allocation_bytes: 1024 * 1024
		};
		browserScenarioCaptureLimitsValuesSchema = z.strictObject({
			max_events: positiveSafeInteger,
			max_event_allocation_bytes: positiveSafeInteger,
			max_total_event_allocation_bytes: positiveSafeInteger,
			max_network_transactions: positiveSafeInteger,
			max_network_body_bytes: positiveSafeInteger,
			max_network_body_allocation_bytes: positiveSafeInteger,
			max_network_header_allocation_bytes: positiveSafeInteger,
			max_network_metadata_allocation_bytes: positiveSafeInteger
		});
		browserScenarioCaptureLimitsSchema = browserScenarioCaptureLimitsValuesSchema.extend({
			max_events: browserScenarioCaptureLimitsValuesSchema.shape.max_events.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_events),
			max_event_allocation_bytes: browserScenarioCaptureLimitsValuesSchema.shape.max_event_allocation_bytes.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_event_allocation_bytes),
			max_total_event_allocation_bytes: browserScenarioCaptureLimitsValuesSchema.shape.max_total_event_allocation_bytes.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_total_event_allocation_bytes),
			max_network_transactions: browserScenarioCaptureLimitsValuesSchema.shape.max_network_transactions.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_network_transactions),
			max_network_body_bytes: browserScenarioCaptureLimitsValuesSchema.shape.max_network_body_bytes.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_network_body_bytes),
			max_network_body_allocation_bytes: browserScenarioCaptureLimitsValuesSchema.shape.max_network_body_allocation_bytes.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_network_body_allocation_bytes),
			max_network_header_allocation_bytes: browserScenarioCaptureLimitsValuesSchema.shape.max_network_header_allocation_bytes.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_network_header_allocation_bytes),
			max_network_metadata_allocation_bytes: browserScenarioCaptureLimitsValuesSchema.shape.max_network_metadata_allocation_bytes.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS.max_network_metadata_allocation_bytes)
		});
	})))();
}

//#endregion
//#region dist/domain/emptyArraySchema.js
var emptyArraySchema;
function init_emptyArraySchema() {
	return (init_emptyArraySchema = __esmMin((() => {
		emptyArraySchema = z.array(z.never()).length(0);
	})))();
}

//#endregion
//#region dist/domain/urlComponents.js
var urlDeclaresQueryOrFragment;
function init_urlComponents() {
	return (init_urlComponents = __esmMin((() => {
		urlDeclaresQueryOrFragment = (url) => url.href.includes("?") || url.href.includes("#");
	})))();
}

//#endregion
//#region dist/domain/browserObservation.js
var parseExactOrigin, browserOriginSchema, isLiteralLoopbackHostname, HTTP_ENDPOINT_MESSAGE, BROWSER_SOCKET_PATH, REDACTED_BROWSER_SOCKET_PATH, httpDiscoveryOrigin, browserSocketAuthority, browserEndpointSchema, browserObservationEndpointSchema, recordedBrowserObservationEndpointSchema, browserAllowedOriginsSchema, browserInput, listBrowserTargetsInputSchema, inspectWebPageInputFacts, inspectWebPageWithoutSourceSchema, inspectWebPageWithSourceShapeSchema, refineInspectWebPageInput, inspectWebPageWithSourceInputSchema, inspectWebPageInputSchema, sanitizedBrowserUrlSchema, sanitizeBrowserUrl, removeUrlUserInfo, credentialFreeHref, sanitizeEndpointCandidate;
function init_browserObservation() {
	return (init_browserObservation = __esmMin((() => {
		init_browserDeadline();
		init_urlComponents();
		init_recordedTransportUrl();
		parseExactOrigin = (value) => {
			let url;
			try {
				url = new URL(value);
			} catch (cause) {
				void cause;
				return undefined;
			}
			if (url.protocol !== "http:" && url.protocol !== "https:" || url.hostname.includes("*") || url.username !== "" || url.password !== "" || url.pathname !== "/" || urlDeclaresQueryOrFragment(url)) return undefined;
			return url.origin;
		};
		browserOriginSchema = z.string().min(1).transform((value, context) => {
			const origin = parseExactOrigin(value);
			if (origin === undefined) {
				context.addIssue({
					code: "custom",
					message: "Expected one exact HTTP(S) origin without a path or wildcard"
				});
				return z.NEVER;
			}
			return origin;
		});
		isLiteralLoopbackHostname = (hostname) => hostname === "127.0.0.1" || hostname === "[::1]" || hostname === "::1";
		HTTP_ENDPOINT_MESSAGE = "CDP endpoint must be an explicit-port HTTP URL on 127.0.0.1 or ::1";
		BROWSER_SOCKET_PATH = "/devtools/browser/";
		REDACTED_BROWSER_SOCKET_PATH = `${BROWSER_SOCKET_PATH}[REDACTED]`;
		httpDiscoveryOrigin = (url) => url.protocol === "http:" && isLiteralLoopbackHostname(url.hostname) && url.port !== "" && url.username === "" && url.password === "" && url.pathname === "/" && !urlDeclaresQueryOrFragment(url) ? url.origin : undefined;
		browserSocketAuthority = (url) => {
			const id = url.pathname.slice(BROWSER_SOCKET_PATH.length);
			return url.protocol === "ws:" && isLiteralLoopbackHostname(url.hostname) && url.port !== "" && url.username === "" && url.password === "" && !urlDeclaresQueryOrFragment(url) && url.pathname.startsWith(BROWSER_SOCKET_PATH) && id.length > 0 && !id.includes("/") ? `${url.protocol}//${url.host}` : undefined;
		};
		browserEndpointSchema = z.string().min(1).transform((value, context) => {
			const url = URL.parse(value);
			const origin = url === null ? undefined : httpDiscoveryOrigin(url);
			if (origin !== undefined) return origin;
			context.addIssue({
				code: "custom",
				message: url === null ? "Invalid CDP endpoint URL" : HTTP_ENDPOINT_MESSAGE
			});
			return z.NEVER;
		});
		browserObservationEndpointSchema = z.string().min(1).describe("Literal loopback CDP endpoint: http://127.0.0.1:PORT, or ws://127.0.0.1:PORT/devtools/browser/ID.").transform((value, context) => {
			const url = URL.parse(value);
			if (url === null) {
				context.addIssue({
					code: "custom",
					message: "Invalid CDP endpoint URL"
				});
				return z.NEVER;
			}
			const origin = httpDiscoveryOrigin(url);
			if (origin !== undefined) return {
				transport: "http_discovery",
				url: origin,
				recorded: origin
			};
			const authority = browserSocketAuthority(url);
			if (authority !== undefined) return {
				transport: "browser_websocket",
				url: url.href,
				recorded: `${authority}${REDACTED_BROWSER_SOCKET_PATH}`
			};
			context.addIssue({
				code: "custom",
				message: url.protocol === "ws:" ? "CDP browser WebSocket must be ws://127.0.0.1:PORT/devtools/browser/ID or ws://[::1]:PORT/devtools/browser/ID" : HTTP_ENDPOINT_MESSAGE
			});
			return z.NEVER;
		});
		recordedBrowserObservationEndpointSchema = z.string().min(1).refine((value) => {
			const url = URL.parse(value);
			return url !== null && (httpDiscoveryOrigin(url) !== undefined || browserSocketAuthority(url) !== undefined && url.pathname === REDACTED_BROWSER_SOCKET_PATH);
		}, { message: "Recorded CDP endpoint must be a loopback HTTP origin or a redacted browser WebSocket URL" });
		browserAllowedOriginsSchema = z.array(browserOriginSchema).transform((origins) => Array.from(new Set(origins)).sort()).default([]);
		browserInput = {
			cdp_endpoint: browserObservationEndpointSchema,
			allowed_origins: browserAllowedOriginsSchema
		};
		listBrowserTargetsInputSchema = z.strictObject({ ...browserInput });
		inspectWebPageInputFacts = {
			...browserInput,
			target_id: z.string().trim().min(1),
			command_timeout_ms: webRuntimeCommandTimeoutSchema,
			observation_ms: z.number().int().min(0).default(500),
			include_accessibility_text: z.boolean().default(false),
			include_console_text: z.boolean().default(false),
			include_json_body_shapes: z.boolean().default(false),
			include_websocket_shapes: z.boolean().default(false),
			include_storage_keys: z.boolean().default(false),
			include_storage_fingerprints: z.boolean().default(false)
		};
		inspectWebPageWithoutSourceSchema = z.strictObject({
			...inspectWebPageInputFacts,
			include_script_sources: z.literal(false).optional().default(false)
		});
		inspectWebPageWithSourceShapeSchema = z.strictObject({
			...inspectWebPageInputFacts,
			include_script_sources: z.literal(true).default(true)
		});
		refineInspectWebPageInput = (input, context) => {
			if (input.include_storage_fingerprints && !input.include_storage_keys) context.addIssue({
				code: "custom",
				path: ["include_storage_fingerprints"],
				message: "Storage fingerprints require storage key capture"
			});
		};
		inspectWebPageWithSourceInputSchema = inspectWebPageWithSourceShapeSchema.superRefine(refineInspectWebPageInput);
		inspectWebPageInputSchema = z.discriminatedUnion("include_script_sources", [inspectWebPageWithoutSourceSchema.superRefine(refineInspectWebPageInput), inspectWebPageWithSourceShapeSchema.extend({ include_script_sources: z.literal(true) }).superRefine(refineInspectWebPageInput)]);
		sanitizedBrowserUrlSchema = z.object({
			url: z.string(),
			origin: z.string().nullable(),
			query_parameter_names: z.array(z.string()),
			redacted: z.boolean()
		});
		sanitizeBrowserUrl = (value) => {
			let parsed;
			try {
				parsed = new URL(value);
			} catch (cause) {
				void cause;
				return {
					url: value,
					origin: null,
					query_parameter_names: [],
					redacted: false
				};
			}
			const hadCredentials = parsed.username !== "" || parsed.password !== "";
			const names = [...parseUrlQueryParameterNames(parsed.search)];
			const sanitizedUrl = hadCredentials ? removeUrlUserInfo(value, parsed) : value;
			return {
				url: sanitizedUrl,
				origin: parsed.origin === "null" ? null : parsed.origin,
				query_parameter_names: names,
				redacted: hadCredentials
			};
		};
		removeUrlUserInfo = (value, parsed) => {
			const { credentials } = parseRecordedTransportUrl(value);
			return credentials === null || credentials === "ambiguous" ? credentialFreeHref(parsed) : `${value.slice(0, credentials.start)}${value.slice(credentials.end)}`;
		};
		credentialFreeHref = (parsed) => {
			parsed.username = "";
			parsed.password = "";
			return parsed.href;
		};
		sanitizeEndpointCandidate = (value) => {
			return sanitizeBrowserUrl(value).url;
		};
	})))();
}

//#endregion
//#region dist/domain/browserCompleteness.js
var browserSectionSchema, browserExclusionReasonSchema, browserExclusionSchema, browserDroppedEventsSchema, browserCompletenessConditionSchema, browserCompletenessSchema, classifyBrowserCompleteness, sortedSections, canonicalExclusions;
function init_browserCompleteness() {
	return (init_browserCompleteness = __esmMin((() => {
		init_unicodeCodePointOrder();
		browserSectionSchema = z.enum([
			"frames",
			"dom",
			"accessibility",
			"scripts",
			"script_sources",
			"resources",
			"network_requests",
			"network_initiators",
			"console_events",
			"console_text",
			"websocket_connections",
			"websocket_frames",
			"websocket_shapes",
			"json_body_shapes",
			"workers",
			"storage",
			"storage_keys",
			"metadata",
			"webmcp_tools",
			"screenshot",
			"source_maps",
			"timeline"
		]);
		browserExclusionReasonSchema = z.enum([
			"disallowed_origin",
			"unsupported_url",
			"unattributed_origin",
			"not_approved",
			"out_of_target_scope",
			"provider_unavailable",
			"invalid_protocol_value",
			"resource_budget_exhausted"
		]);
		browserExclusionSchema = z.object({
			section: browserSectionSchema,
			reason: browserExclusionReasonSchema,
			count: z.number().int().min(0).nullable()
		});
		browserDroppedEventsSchema = z.object({
			scripts: z.number().int().min(0),
			network_requests: z.number().int().min(0),
			console_events: z.number().int().min(0),
			websocket_connections: z.number().int().min(0),
			websocket_frames: z.number().int().min(0),
			webmcp_tools: z.number().int().min(0),
			timeline_events: z.number().int().min(0),
			total: z.number().int().min(0)
		});
		browserCompletenessConditionSchema = z.enum([
			"complete_within_window",
			"policy_filtered",
			"attach_limited",
			"truncated"
		]);
		browserCompletenessSchema = z.object({
			status: browserCompletenessConditionSchema,
			conditions: z.array(browserCompletenessConditionSchema).min(1).max(3),
			policy_filtered_sections: z.array(browserSectionSchema),
			attach_limited_sections: z.array(browserSectionSchema),
			truncated_sections: z.array(browserSectionSchema),
			unavailable_sections: z.array(browserSectionSchema),
			excluded: z.array(browserExclusionSchema),
			dropped_events: browserDroppedEventsSchema
		});
		classifyBrowserCompleteness = (input) => {
			const policyFiltered = input.policyFilteredSections.size > 0;
			const truncated = input.truncatedSections.size > 0 || Object.values(input.droppedEvents).some((count) => count > 0);
			const attachLimited = input.attachLimitedSections.size > 0 || input.unavailableSections.size > 0;
			const status = truncated ? "truncated" : policyFiltered ? "policy_filtered" : attachLimited ? "attach_limited" : "complete_within_window";
			const conditions = [
				...attachLimited ? ["attach_limited"] : [],
				...policyFiltered ? ["policy_filtered"] : [],
				...truncated ? ["truncated"] : []
			];
			const droppedTotal = Object.values(input.droppedEvents).reduce((sum, count) => sum + count, 0);
			return browserCompletenessSchema.parse({
				status,
				conditions: conditions.length === 0 ? ["complete_within_window"] : conditions,
				policy_filtered_sections: sortedSections(input.policyFilteredSections),
				attach_limited_sections: sortedSections(input.attachLimitedSections),
				truncated_sections: sortedSections(input.truncatedSections),
				unavailable_sections: sortedSections(input.unavailableSections),
				excluded: canonicalExclusions(input.excluded),
				dropped_events: {
					...input.droppedEvents,
					total: droppedTotal
				}
			});
		};
		sortedSections = (sections) => [...sections].sort();
		canonicalExclusions = (exclusions) => [...exclusions].sort((left, right) => compareUnicodeCodePoints(left.section, right.section) || compareUnicodeCodePoints(left.reason, right.reason));
	})))();
}

//#endregion
//#region dist/domain/webContentArtifact.js
var webTextArtifactMetadataSchema, webTextArtifactSchema, createWebTextArtifact;
function init_webContentArtifact() {
	return (init_webContentArtifact = __esmMin((() => {
		webTextArtifactMetadataSchema = z.object({
			sha256: z.string().regex(/^[a-f0-9]{64}$/u),
			bytes: z.number().int().min(0),
			media_type: z.string().min(1),
			charset: z.literal("utf-8")
		});
		webTextArtifactSchema = webTextArtifactMetadataSchema.extend({ text: z.string() }).superRefine((artifact, context) => {
			const bytes = Buffer.byteLength(artifact.text);
			const digest = createHash("sha256").update(artifact.text).digest("hex");
			if (artifact.bytes !== bytes) context.addIssue({
				code: "custom",
				path: ["bytes"],
				message: "Byte count mismatch"
			});
			if (artifact.sha256 !== digest) context.addIssue({
				code: "custom",
				path: ["sha256"],
				message: "Digest mismatch"
			});
		});
		createWebTextArtifact = (text, mediaType) => {
			const sha256 = createHash("sha256").update(text).digest("hex");
			return {
				sha256,
				bytes: Buffer.byteLength(text),
				media_type: mediaType,
				charset: "utf-8",
				text
			};
		};
	})))();
}

//#endregion
//#region dist/domain/cdpObservationSchemas.js
var cdpDomNodeSchema, cdpScriptSourceSchema, cdpScriptMetadataSchema;
function init_cdpObservationSchemas() {
	return (init_cdpObservationSchemas = __esmMin((() => {
		init_webContentArtifact();
		cdpDomNodeSchema = z.object({
			index: z.number().int().min(0),
			parent_index: z.number().int().min(-1),
			node_type: z.number().int().min(0),
			node_name: z.string(),
			node_value_length: z.number().int().min(0),
			attribute_names: z.array(z.string())
		});
		cdpScriptSourceSchema = z.discriminatedUnion("included", [z.object({
			included: z.literal(false),
			reason: z.string()
		}), z.object({
			included: z.literal(true),
			artifact: webTextArtifactSchema
		})]);
		cdpScriptMetadataSchema = z.object({
			cdp_hash: z.string().nullable().describe("Producer-reported script hash; null when unavailable."),
			length: z.number().int().min(0).nullable().describe("Producer-reported script length; null when unavailable."),
			is_module: z.boolean().nullable().describe("Producer-reported module classification; null when unavailable."),
			language: z.string().nullable()
		});
	})))();
}

//#endregion
//#region dist/domain/browserObservationSchemas.js
var browserVersionSchema, browserTargetSchema, browserTargetListSchema, browserFrameSchema, browserAxNodeSchema, browserResourceReconciliationSchema, browserScriptSchema, browserResourceSchema, browserNetworkRequestSchema, browserConsoleEventSchema, browserWebSocketFrameSchema, browserWebSocketConnectionSchema, browserWorkerSchema, browserCspSourceSchema, browserLinkMetadataSchema, browserAgentHintSchema, browserSafeMetadataSchema, webPageInspectionSchema;
function init_browserObservationSchemas() {
	return (init_browserObservationSchemas = __esmMin((() => {
		init_browserCompleteness();
		init_cdpObservationSchemas();
		init_jsonShape();
		init_digests();
		browserVersionSchema = z.object({
			product: z.string(),
			protocol_version: z.string(),
			revision: z.string(),
			user_agent: z.string(),
			js_version: z.string()
		});
		browserTargetSchema = z.object({
			target_id: z.string(),
			type: z.string(),
			title: z.string(),
			url: z.string(),
			origin: z.string(),
			attached: z.boolean().nullable().describe("Discovery-reported debugger attachment state; null means unknown")
		});
		browserTargetListSchema = z.object({
			browser: browserVersionSchema,
			targets: z.array(browserTargetSchema),
			excluded: z.object({
				disallowed_origin: z.number().int().min(0),
				unsupported_url: z.number().int().min(0),
				non_page: z.number().int().min(0)
			}),
			limitations: z.array(z.string())
		});
		browserFrameSchema = z.object({
			frame_id: z.string(),
			parent_frame_id: z.string().nullable(),
			url: z.string(),
			origin: z.string().nullable()
		});
		browserAxNodeSchema = z.object({
			node_id: z.string(),
			parent_id: z.string().nullable(),
			role: z.string().nullable(),
			name: z.string().nullable(),
			description: z.string().nullable(),
			ignored: z.boolean(),
			states: z.array(z.object({
				name: z.string(),
				value: z.union([
					z.boolean(),
					z.number(),
					z.string()
				])
			})).default([])
		});
		browserResourceReconciliationSchema = z.discriminatedUnion("status", [
			z.object({
				status: z.literal("exact"),
				resource_key: z.string()
			}),
			z.object({
				status: z.literal("ambiguous"),
				candidate_resource_keys: z.array(z.string())
			}),
			z.object({
				status: z.literal("unmatched"),
				reason: z.literal("no_exact_sanitized_url")
			})
		]);
		browserScriptSchema = z.object({
			script_key: z.string().regex(/^scr_[a-f0-9]{64}(?:_[0-9]+)?$/u),
			frame_id: z.string().nullable().default(null),
			url: z.string(),
			origin: z.string().nullable(),
			...cdpScriptMetadataSchema.shape,
			source_map_url: z.string().nullable(),
			resource_reconciliation: browserResourceReconciliationSchema,
			source: cdpScriptSourceSchema
		});
		browserResourceSchema = z.object({
			resource_key: prefixedDigestSchema("res"),
			url: z.string(),
			origin: z.string().nullable(),
			type: z.string(),
			mime_type: z.string(),
			content_size: z.number().min(0).nullable()
		});
		browserNetworkRequestSchema = z.object({
			request_id: z.string(),
			url: z.string(),
			origin: z.string().nullable(),
			method: z.string(),
			resource_type: z.string().nullable(),
			status: z.number().nullable(),
			mime_type: z.string().nullable(),
			encoded_data_length: z.number().min(0).nullable(),
			redirects: z.array(z.object({
				url: z.string(),
				response_url: z.string(),
				method: z.string(),
				resource_type: z.string().nullable(),
				status: z.number().nullable(),
				mime_type: z.string().nullable(),
				encoded_data_length: z.number().min(0).nullable(),
				request_timestamp: z.number().nullable(),
				redirect_event_timestamp: z.number().nullable()
			})).optional(),
			initiator: z.object({
				type: z.string(),
				url: z.string().nullable(),
				line: z.number().int().min(0).nullable(),
				column: z.number().int().min(0).nullable()
			}),
			body_shapes: z.object({
				status: z.enum([
					"not_approved",
					"included",
					"partial",
					"unavailable"
				]),
				request: jsonShapeSchema.nullable(),
				response: jsonShapeSchema.nullable()
			})
		});
		browserConsoleEventSchema = z.object({
			type: z.string(),
			timestamp: z.number().nullable().describe("CDP Runtime.Timestamp in milliseconds since Unix epoch; null when the producer value is absent or invalid."),
			argument_types: z.array(z.string()).nullable().describe("CDP argument types by argument position; null when the producer argument inventory is absent or not an array."),
			url: z.string().nullable(),
			line: z.number().int().min(0).nullable(),
			column: z.number().int().min(0).nullable(),
			text_capture: z.object({
				status: z.enum([
					"not_approved",
					"included",
					"unavailable"
				]),
				values: z.array(z.object({
					argument_index: z.number().int().min(0),
					type: z.string(),
					text: z.string()
				})),
				retained_bytes: z.number().int().min(0)
			})
		});
		browserWebSocketFrameSchema = z.object({
			direction: z.enum(["sent", "received"]),
			opcode: z.number().int().min(0).max(15).nullable(),
			payload_bytes: z.number().int().min(0).nullable(),
			payload_shape: z.object({
				format: z.enum([
					"json",
					"text",
					"binary"
				]),
				json_shape: jsonShapeSchema.nullable()
			}).nullable()
		});
		browserWebSocketConnectionSchema = z.object({
			request_id: z.string(),
			url: z.string(),
			events: z.array(browserWebSocketFrameSchema)
		});
		browserWorkerSchema = z.object({
			target_id: z.string(),
			type: z.string(),
			url: z.string(),
			origin: z.string().nullable(),
			attached: z.boolean(),
			opener_target_id: z.string().nullable().default(null),
			parent_frame_id: z.string().nullable().default(null)
		});
		browserCspSourceSchema = z.object({
			kind: z.enum([
				"keyword",
				"scheme",
				"approved_origin",
				"external_origin",
				"other"
			]),
			value: z.string().nullable()
		});
		browserLinkMetadataSchema = z.object({
			href: z.string().nullable(),
			destination_scope: z.enum([
				"approved",
				"outside_policy",
				"unsupported"
			]),
			rel: z.array(z.string()),
			as: z.string().nullable(),
			type: z.string().nullable(),
			crossorigin: z.string().nullable()
		});
		browserAgentHintSchema = z.object({
			mechanism: z.enum([
				"link_rel",
				"dom_link_rel",
				"well_known_resource",
				"response_header"
			]),
			declaration: z.string(),
			url: z.string().nullable(),
			trust: z.literal("page-declared-untrusted")
		});
		browserSafeMetadataSchema = z.object({
			responses: z.array(z.object({
				request_id: z.string(),
				url: z.string(),
				mime_type: z.string().nullable(),
				content_length: z.number().int().min(0).nullable(),
				content_encoding: z.string().nullable(),
				csp: z.object({
					directives: z.array(z.object({
						name: z.string(),
						sources: z.array(browserCspSourceSchema)
					})),
					nonce_count: z.number().int().min(0),
					hash_count: z.number().int().min(0)
				}),
				links: z.array(browserLinkMetadataSchema),
				policies: z.object({
					coop: z.string().nullable(),
					coep: z.string().nullable(),
					corp: z.string().nullable(),
					referrer_policy: z.string().nullable(),
					x_content_type_options: z.string().nullable(),
					permissions_policy_features: z.array(z.string())
				})
			})),
			dom_urls: z.array(z.object({
				node_index: z.number().int().min(0),
				attribute: z.enum([
					"href",
					"src",
					"action",
					"formaction",
					"poster"
				]),
				url: z.string().nullable(),
				destination_scope: z.enum([
					"approved",
					"outside_policy",
					"unsupported"
				])
			})),
			agent_hints: z.array(browserAgentHintSchema),
			excluded_dom_urls: z.number().int().min(0),
			headers_allowlisted: z.literal(true)
		});
		webPageInspectionSchema = z.object({
			browser: browserVersionSchema,
			target: browserTargetSchema,
			capture_window: z.object({
				started_at: z.iso.datetime(),
				ended_at: z.iso.datetime(),
				observation_ms: z.number().int().min(0)
			}),
			completeness: browserCompletenessSchema,
			frames: z.array(browserFrameSchema),
			dom: z.object({
				total_nodes: z.number().int().min(0),
				nodes: z.array(cdpDomNodeSchema)
			}),
			accessibility: z.object({
				total_nodes: z.number().int().min(0),
				text_capture: z.object({
					status: z.enum([
						"not_approved",
						"included",
						"unavailable"
					]),
					retained_bytes: z.number().int().min(0),
					excluded_fields: z.number().int().min(0)
				}),
				nodes: z.array(browserAxNodeSchema)
			}),
			scripts: z.object({
				total: z.number().int().min(0),
				items: z.array(browserScriptSchema)
			}),
			resources: z.array(browserResourceSchema),
			network: z.object({
				requests: z.array(browserNetworkRequestSchema),
				websocket_connections: z.array(browserWebSocketConnectionSchema),
				coverage_started_at: z.iso.datetime(),
				prior_activity_available: z.literal(false)
			}),
			console: z.object({
				events: z.array(browserConsoleEventSchema),
				coverage_started_at: z.iso.datetime(),
				prior_activity_available: z.literal(false)
			}),
			workers: z.array(browserWorkerSchema),
			metadata: browserSafeMetadataSchema,
			storage: z.object({
				origin: z.string(),
				usage_bytes: z.number().min(0).nullable(),
				quota_bytes: z.number().min(0).nullable(),
				local_storage_keys: z.array(z.string()),
				session_storage_keys: z.array(z.string()),
				indexed_db_names: z.array(z.string()),
				cache_names: z.array(z.string()),
				content_fingerprints: z.array(z.object({
					scope: z.enum([
						"cookie",
						"local_storage",
						"session_storage",
						"indexed_db_schema",
						"indexed_db_record",
						"cache_entry"
					]),
					identity_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
					value_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
					complete: z.boolean()
				})).default([]),
				fingerprint_algorithm: z.literal("sha256").default("sha256"),
				fingerprints_complete: z.boolean().default(false),
				values_redacted: z.literal(true)
			}),
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
//#region dist/domain/webScreenshot.js
var webScreenshotArtifactSchema, captureWebScreenshotInputSchema, webScreenshotSchema, compareWebScreenshotsInputSchema, webScreenshotDiffContextShape, webScreenshotDiffSchema, createWebScreenshotArtifact, decodeCanonicalBase64;
function init_webScreenshot() {
	return (init_webScreenshot = __esmMin((() => {
		init_browserDeadline();
		init_browserCompleteness();
		init_browserObservation();
		init_browserObservationSchemas();
		webScreenshotArtifactSchema = z.object({
			sha256: z.string().regex(/^[a-f0-9]{64}$/u),
			bytes: z.number().int().min(1),
			media_type: z.literal("image/png"),
			data_base64: z.string()
		}).superRefine((artifact, context) => {
			const bytes = decodeCanonicalBase64(artifact.data_base64);
			if (bytes === undefined) {
				context.addIssue({
					code: "custom",
					message: "Invalid canonical base64"
				});
				return;
			}
			const sha256 = createHash("sha256").update(bytes).digest("hex");
			if (bytes.byteLength !== artifact.bytes || sha256 !== artifact.sha256) context.addIssue({
				code: "custom",
				message: "Screenshot artifact digest or size mismatch"
			});
		});
		captureWebScreenshotInputSchema = z.strictObject({
			cdp_endpoint: browserObservationEndpointSchema,
			allowed_origins: browserAllowedOriginsSchema,
			target_id: z.string().trim().min(1),
			command_timeout_ms: webRuntimeCommandTimeoutSchema
		});
		webScreenshotSchema = z.object({
			browser: browserVersionSchema,
			target: z.object({
				target_id: z.string(),
				url: z.string(),
				origin: z.string()
			}),
			captured_at: z.iso.datetime(),
			viewport: z.object({
				width: z.number().int().min(1),
				height: z.number().int().min(1)
			}),
			artifact: webScreenshotArtifactSchema,
			completeness: browserCompletenessSchema,
			limitations: z.array(z.string())
		});
		compareWebScreenshotsInputSchema = z.strictObject({
			before: webScreenshotArtifactSchema,
			after: webScreenshotArtifactSchema,
			channel_threshold: z.number().int().min(0).max(255).default(0)
		});
		webScreenshotDiffContextShape = {
			before: z.object({
				width: z.number().int().min(1),
				height: z.number().int().min(1)
			}),
			after: z.object({
				width: z.number().int().min(1),
				height: z.number().int().min(1)
			}),
			channel_threshold: z.number().int().min(0).max(255),
			limitations: z.array(z.string())
		};
		webScreenshotDiffSchema = z.discriminatedUnion("status", [
			z.object({
				...webScreenshotDiffContextShape,
				status: z.literal("identical"),
				compared_pixels: z.number().int().positive(),
				changed_pixels: z.literal(0),
				changed_ratio: z.literal(0),
				maximum_channel_delta: z.number().int().min(0).max(255),
				mean_absolute_channel_delta: z.number().min(0).max(255)
			}),
			z.object({
				...webScreenshotDiffContextShape,
				status: z.literal("different"),
				compared_pixels: z.number().int().positive(),
				changed_pixels: z.number().int().positive(),
				changed_ratio: z.number().positive().max(1),
				maximum_channel_delta: z.number().int().positive().max(255),
				mean_absolute_channel_delta: z.number().positive().max(255)
			}),
			z.object({
				...webScreenshotDiffContextShape,
				status: z.literal("dimension_mismatch"),
				compared_pixels: z.literal(0),
				changed_pixels: z.null(),
				changed_ratio: z.null(),
				maximum_channel_delta: z.null(),
				mean_absolute_channel_delta: z.null()
			})
		]).superRefine((diff, context) => {
			const sameDimensions = diff.before.width === diff.after.width && diff.before.height === diff.after.height;
			if (sameDimensions !== (diff.status !== "dimension_mismatch")) context.addIssue({
				code: "custom",
				path: ["status"],
				message: "Screenshot comparison status must match viewport dimensions"
			});
			if (diff.status !== "dimension_mismatch" && diff.compared_pixels !== diff.before.width * diff.before.height) context.addIssue({
				code: "custom",
				path: ["compared_pixels"],
				message: "Compared pixel count must match the shared dimensions"
			});
		});
		createWebScreenshotArtifact = (bytes) => {
			const sha256 = createHash("sha256").update(bytes).digest("hex");
			return webScreenshotArtifactSchema.parse({
				sha256,
				bytes: bytes.byteLength,
				media_type: "image/png",
				data_base64: bytes.toString("base64")
			});
		};
		decodeCanonicalBase64 = (value) => {
			if (value.length === 0 || value.length % 4 !== 0) return undefined;
			const decoded = Buffer.from(value, "base64");
			return decoded.toString("base64") === value ? decoded : undefined;
		};
	})))();
}

//#endregion
//#region dist/domain/browserScenarioCaptureValues.js
var textArtifactSchema, captureStateSchema, historySchema, hashedStorageValueShape, redactedStorageValueShape, storageValueFingerprintSchema, storageValueSchema, cookieShape, storageSnapshotSchema, browserStepArtifactsSchema, browserScenarioEventFamilySchema, eventBase, eventUrl, networkEventShape, webSocketFrameShape, browserScenarioEventSchema, completenessSectionSchema, browserScenarioEventKindSchema, browserScenarioEventBudgetReasonSchema, browserScenarioEventOmissionsSchema, browserScenarioCompletenessSchema, classifyBrowserScenarioCompleteness, browserScenarioStepShape, browserScenarioStepSchema;
function init_browserScenarioCaptureValues() {
	return (init_browserScenarioCaptureValues = __esmMin((() => {
		init_emptyArraySchema();
		init_browserNetworkEvidence();
		init_browserObservation();
		init_webScreenshot();
		init_digests();
		textArtifactSchema = z.strictObject({
			sha256: digestSchema,
			bytes: z.number().int().min(0),
			text: z.string()
		}).superRefine((artifact, context) => {
			const bytes = Buffer.from(artifact.text);
			const sha256 = createHash("sha256").update(bytes).digest("hex");
			if (bytes.byteLength !== artifact.bytes || sha256 !== artifact.sha256) context.addIssue({
				code: "custom",
				message: "Text artifact digest or size mismatch"
			});
		});
		captureStateSchema = (value) => z.discriminatedUnion("state", [
			z.strictObject({
				state: z.literal("captured"),
				value
			}),
			z.strictObject({ state: z.literal("not_requested") }),
			z.strictObject({
				state: z.literal("missing"),
				reason: z.string().min(1)
			}),
			z.strictObject({
				state: z.literal("truncated"),
				observed: z.number().int().min(0),
				retained: z.number().int().min(0),
				reason: z.string().min(1)
			})
		]);
		historySchema = z.strictObject({
			length: z.number().int().min(0),
			current_url: sanitizedBrowserUrlSchema,
			navigation_entries: z.array(z.strictObject({
				type: z.enum([
					"navigate",
					"reload",
					"back_forward",
					"prerender",
					"unknown"
				]),
				name: sanitizedBrowserUrlSchema
			}))
		});
		hashedStorageValueShape = {
			value_state: z.literal("hashed"),
			value_sha256: digestSchema
		};
		redactedStorageValueShape = {
			value_state: z.literal("redacted-secret"),
			value_sha256: z.null()
		};
		storageValueFingerprintSchema = z.discriminatedUnion("value_state", [z.strictObject(hashedStorageValueShape), z.strictObject(redactedStorageValueShape)]);
		storageValueSchema = z.discriminatedUnion("value_state", [z.strictObject({
			name: z.string(),
			...hashedStorageValueShape
		}), z.strictObject({
			name: z.string(),
			...redactedStorageValueShape
		})]);
		cookieShape = {
			name: z.string(),
			domain: z.string(),
			path: z.string(),
			secure: z.boolean(),
			http_only: z.boolean(),
			same_site: z.enum([
				"Strict",
				"Lax",
				"None"
			])
		};
		storageSnapshotSchema = z.strictObject({
			cookies: z.array(z.discriminatedUnion("value_state", [z.strictObject({
				...cookieShape,
				...hashedStorageValueShape
			}), z.strictObject({
				...cookieShape,
				...redactedStorageValueShape
			})])),
			local_storage: z.array(storageValueSchema),
			session_storage: z.array(storageValueSchema)
		});
		browserStepArtifactsSchema = z.strictObject({
			screenshot: captureStateSchema(webScreenshotArtifactSchema),
			dom: captureStateSchema(textArtifactSchema),
			accessibility: captureStateSchema(textArtifactSchema),
			url: captureStateSchema(sanitizedBrowserUrlSchema),
			history: captureStateSchema(historySchema),
			storage: captureStateSchema(storageSnapshotSchema)
		});
		browserScenarioEventFamilySchema = z.enum([
			"console",
			"page-errors",
			"network",
			"websockets",
			"frames",
			"workers",
			"popups",
			"downloads"
		]);
		eventBase = {
			sequence: z.number().int().min(1),
			step_index: z.number().int().min(0)
		};
		eventUrl = sanitizedBrowserUrlSchema.nullable();
		networkEventShape = {
			...eventBase,
			transaction_id: z.string().min(1),
			redirected_from_transaction_id: z.string().min(1).nullable(),
			/** Distinguishes a captured root from an unobserved predecessor for null links. */
			redirected_from_transaction_state: z.enum(["root", "unknown"]).optional(),
			method: z.string().min(1),
			url: sanitizedBrowserUrlSchema,
			resource_type: z.string().min(1),
			header_names: z.array(z.string())
		};
		webSocketFrameShape = {
			...eventBase,
			kind: z.enum(["websocket-frame-sent", "websocket-frame-received"]),
			url: sanitizedBrowserUrlSchema,
			payload_bytes: z.number().int().min(0),
			truncated: z.boolean()
		};
		browserScenarioEventSchema = z.union([
			z.strictObject({
				...eventBase,
				kind: z.literal("console"),
				level: z.string().min(1),
				text: z.string(),
				url: eventUrl
			}),
			z.strictObject({
				...eventBase,
				kind: z.literal("page-error"),
				message: z.string(),
				stack: z.string().nullable()
			}),
			z.strictObject({
				...networkEventShape,
				kind: z.literal("request"),
				status: z.null(),
				failure: z.null()
			}),
			z.strictObject({
				...networkEventShape,
				kind: z.literal("response"),
				status: z.number().int().min(100).max(599),
				failure: z.null()
			}),
			z.strictObject({
				...networkEventShape,
				kind: z.literal("request-failed"),
				status: z.null(),
				failure: z.string().min(1)
			}),
			z.strictObject({
				...networkEventShape,
				kind: z.literal("request-finished"),
				status: z.null(),
				failure: z.null()
			}),
			z.strictObject({
				...networkEventShape,
				kind: z.literal("request-unfinished"),
				status: z.null(),
				failure: z.null(),
				reason: z.enum(["capture-ended", "cancelled"])
			}),
			z.strictObject({
				...eventBase,
				kind: z.literal("network-content"),
				transaction_id: z.string().min(1),
				source_event_sequence: z.number().int().min(1),
				phase: z.enum(["request", "response"]),
				headers: browserNetworkHeadersSchema,
				body: browserNetworkBodySchema
			}),
			z.strictObject({
				...eventBase,
				kind: z.enum(["websocket-opened", "websocket-closed"]),
				url: sanitizedBrowserUrlSchema
			}),
			z.strictObject({
				...webSocketFrameShape,
				payload_type: z.literal("text"),
				payload_text: z.string()
			}),
			z.strictObject({
				...webSocketFrameShape,
				payload_type: z.literal("binary"),
				payload_text: z.null()
			}),
			z.strictObject({
				...eventBase,
				kind: z.enum([
					"frame-attached",
					"frame-detached",
					"frame-navigated",
					"worker-created",
					"worker-closed",
					"popup-opened",
					"popup-closed"
				]),
				url: eventUrl,
				name: z.string().nullable()
			}),
			z.strictObject({
				...eventBase,
				kind: z.literal("download-cancelled"),
				suggested_filename: z.string(),
				url: sanitizedBrowserUrlSchema
			})
		]).superRefine((event, context) => {
			if ("redirected_from_transaction_id" in event && event.redirected_from_transaction_id !== null && event.redirected_from_transaction_state !== undefined) context.addIssue({
				code: "custom",
				message: "Redirect state is valid only when the predecessor transaction ID is null",
				path: ["redirected_from_transaction_state"]
			});
		});
		completenessSectionSchema = z.enum([
			"action",
			"screenshot",
			"dom",
			"accessibility",
			"url",
			"history",
			"storage",
			"events",
			"frames",
			"workers",
			"popups",
			"websockets"
		]);
		browserScenarioEventKindSchema = z.enum([
			"console",
			"page-error",
			"request",
			"response",
			"request-failed",
			"request-finished",
			"request-unfinished",
			"network-content",
			"websocket-opened",
			"websocket-closed",
			"websocket-frame-sent",
			"websocket-frame-received",
			"frame-attached",
			"frame-detached",
			"frame-navigated",
			"worker-created",
			"worker-closed",
			"popup-opened",
			"popup-closed",
			"download-cancelled"
		]);
		browserScenarioEventBudgetReasonSchema = z.enum([
			"max-events",
			"max-event-allocation-bytes",
			"max-total-event-allocation-bytes",
			"max-network-transactions",
			"max-network-metadata-allocation-bytes",
			"max-listener-owners"
		]);
		browserScenarioEventOmissionsSchema = z.strictObject({
			by_kind: z.array(z.strictObject({
				kind: browserScenarioEventKindSchema,
				count: z.number().int().positive(),
				reasons: z.array(browserScenarioEventBudgetReasonSchema).min(1)
			})),
			network_transactions: z.array(z.strictObject({
				transaction_id: z.string().min(1),
				omitted_kinds: z.array(browserScenarioEventKindSchema).min(1),
				reasons: z.array(browserScenarioEventBudgetReasonSchema).min(1)
			})),
			network_transaction_range: z.strictObject({
				first_transaction_id: z.string().min(1),
				last_transaction_id: z.string().min(1),
				count: z.number().int().positive(),
				reason: z.literal("max-network-transactions")
			}).nullable()
		});
		browserScenarioCompletenessSchema = z.discriminatedUnion("status", [
			z.strictObject({
				status: z.literal("complete"),
				equality_eligible: z.literal(true),
				missing_sections: emptyArraySchema,
				truncated_sections: emptyArraySchema
			}),
			z.strictObject({
				status: z.literal("incomplete"),
				equality_eligible: z.literal(false),
				missing_sections: z.array(completenessSectionSchema).min(1),
				truncated_sections: emptyArraySchema
			}),
			z.strictObject({
				status: z.literal("truncated"),
				equality_eligible: z.literal(false),
				missing_sections: z.array(completenessSectionSchema),
				truncated_sections: z.array(completenessSectionSchema).min(1)
			})
		]);
		classifyBrowserScenarioCompleteness = (missing, truncated) => {
			const missingSections = [...new Set(missing)].sort();
			const truncatedSections = [...new Set(truncated)].sort();
			if (truncatedSections.length > 0) return browserScenarioCompletenessSchema.parse({
				status: "truncated",
				equality_eligible: false,
				missing_sections: missingSections,
				truncated_sections: truncatedSections
			});
			if (missingSections.length > 0) return browserScenarioCompletenessSchema.parse({
				status: "incomplete",
				equality_eligible: false,
				missing_sections: missingSections,
				truncated_sections: []
			});
			return {
				status: "complete",
				equality_eligible: true,
				missing_sections: [],
				truncated_sections: []
			};
		};
		browserScenarioStepShape = {
			step_index: z.number().int().min(0),
			step_id: z.string().min(1),
			action: z.string().min(1),
			elapsed_ms: z.number().int().min(0),
			before_url: sanitizedBrowserUrlSchema,
			after_url: sanitizedBrowserUrlSchema,
			event_sequence_start: z.number().int().min(1),
			event_sequence_end: z.number().int().min(0),
			artifacts: browserStepArtifactsSchema,
			completeness: browserScenarioCompletenessSchema
		};
		browserScenarioStepSchema = z.union([z.strictObject({
			...browserScenarioStepShape,
			status: z.literal("completed"),
			error: z.null()
		}), z.strictObject({
			...browserScenarioStepShape,
			status: z.enum(["failed", "cancelled"]),
			error: z.string()
		})]);
	})))();
}

//#endregion
//#region dist/domain/browserScenarioCapture.js
var browserScenarioCaptureSchema$1;
function init_browserScenarioCapture() {
	return (init_browserScenarioCapture = __esmMin((() => {
		init_browserNetworkEvidence();
		init_browserScenarioCaptureLimits();
		init_browserScenarioCaptureValues();
		browserScenarioCaptureSchema$1 = z.strictObject({
			browser: z.strictObject({
				mode: z.enum(["launch", "connect"]),
				process_ownership: z.enum(["provider-owned", "external"]),
				cleanup: z.enum(["terminated-owned-process", "disconnected-external"]),
				product: z.string().min(1),
				version: z.string().min(1)
			}),
			scenario: z.strictObject({
				start_origin: z.string().min(1),
				action_count: z.number().int().min(1),
				secret_references: z.array(z.string().min(1)),
				network_content: browserNetworkContentSelectionValuesSchema,
				event_families: z.array(browserScenarioEventFamilySchema),
				limits: browserScenarioCaptureLimitsValuesSchema
			}),
			duration_ms: z.number().int().min(0),
			steps: z.array(browserScenarioStepSchema).min(1),
			events: z.strictObject({
				retained: z.number().int().min(0),
				dropped: z.number().int().min(0),
				items: z.array(browserScenarioEventSchema),
				omissions: browserScenarioEventOmissionsSchema
			}),
			completeness: browserScenarioCompletenessSchema,
			limitations: z.array(z.string().min(1))
		}).superRefine((capture, context) => {
			const bySequence = new Map(capture.events.items.map((event) => [event.sequence, event]));
			if (bySequence.size !== capture.events.items.length) context.addIssue({
				code: "custom",
				path: ["events", "items"],
				message: "Event sequence numbers must be unique"
			});
			for (const [index, event] of capture.events.items.entries()) {
				if (event.kind !== "network-content") continue;
				const source = bySequence.get(event.source_event_sequence);
				if (source?.kind !== event.phase || source.transaction_id !== event.transaction_id || source.sequence >= event.sequence) context.addIssue({
					code: "custom",
					path: [
						"events",
						"items",
						index,
						"source_event_sequence"
					],
					message: "Network content must reference an earlier matching transaction phase"
				});
			}
			if (capture.events.retained !== capture.events.items.length) context.addIssue({
				code: "custom",
				path: ["events", "retained"],
				message: "Retained event count must equal items length"
			});
			if (capture.events.omissions.by_kind.reduce((count, omission) => count + omission.count, 0) !== capture.events.dropped) context.addIssue({
				code: "custom",
				path: [
					"events",
					"omissions",
					"by_kind"
				],
				message: "Per-kind omission counts must equal the dropped event count"
			});
			if (capture.steps.length !== capture.scenario.action_count + 1) context.addIssue({
				code: "custom",
				path: ["steps"],
				message: "Capture must include initial state and one entry per action"
			});
			const expectedIndices = capture.steps.map((_, index) => index);
			if (capture.steps.some(({ step_index: index }, offset) => index !== expectedIndices[offset])) context.addIssue({
				code: "custom",
				path: ["steps"],
				message: "Step indices must be contiguous from zero"
			});
			if (capture.events.items.some(({ step_index: index }) => index >= capture.steps.length)) context.addIssue({
				code: "custom",
				path: ["events", "items"],
				message: "Event references an unknown step index"
			});
		});
	})))();
}

//#endregion
//#region dist/domain/functionComparisonResults.js
var dimensionResult, unresolvedDimension, overallStatus, summarize, digest;
function init_functionComparisonResults() {
	return (init_functionComparisonResults = __esmMin((() => {
		init_canonicalDigest();
		dimensionResult = (input) => {
			const context = {
				dimension: input.dimension,
				left_digest: digest(input.left),
				right_digest: digest(input.right),
				left_count: input.leftCount,
				right_count: input.rightCount,
				text_delta: input.textDelta,
				evidence_links: [...input.links],
				limitations: [...input.limitations]
			};
			if (input.status === "unchanged") return {
				...context,
				status: "unchanged",
				conclusion_kind: "derived_relationship"
			};
			return {
				...context,
				status: "changed",
				conclusion_kind: input.providersDiffer ? "contradiction" : "derived_relationship"
			};
		};
		unresolvedDimension = (input) => ({
			dimension: input.dimension,
			status: "unknown",
			left_digest: null,
			right_digest: null,
			left_count: input.leftCount,
			right_count: input.rightCount,
			text_delta: null,
			conclusion_kind: "unresolved_branch",
			evidence_links: [...input.links],
			limitations: [...input.limitations]
		});
		overallStatus = (dimensions, match) => {
			if (match === "mismatched") return "changed";
			if (match === "ambiguous") return "unknown";
			if (dimensions.some(({ status }) => status === "changed")) return "changed";
			if (dimensions.some(({ status }) => status === "unknown")) return "unknown";
			return "unchanged";
		};
		summarize = (dimensions) => ({
			unchanged: dimensions.filter(({ status }) => status === "unchanged").length,
			changed: dimensions.filter(({ status }) => status === "changed").length,
			unknown: dimensions.filter(({ status }) => status === "unknown").length
		});
		digest = (value) => digestCanonicalValue(value, "Function comparison");
	})))();
}

//#endregion
//#region dist/domain/functionComparisonSchemas.js
var comparisonStatusSchema, functionComparisonDimensionNameSchema, evidenceIdSchema$6, functionComparisonInputSchema, textDeltaSchema, functionDimensionContextShape, functionDimensionSchema, functionMatchSchema, functionComparisonResultSchema;
function init_functionComparisonSchemas() {
	return (init_functionComparisonSchemas = __esmMin((() => {
		init_functionComparisonResults();
		init_evidenceReference();
		init_digests();
		comparisonStatusSchema = z.enum([
			"unchanged",
			"changed",
			"unknown"
		]);
		functionComparisonDimensionNameSchema = z.enum([
			"identity",
			"pseudocode",
			"assembly",
			"comments",
			"calls",
			"references",
			"strings_names",
			"cfg"
		]);
		evidenceIdSchema$6 = prefixedDigestSchema("ev");
		functionComparisonInputSchema = z.strictObject({
			left: evidenceInputSchema,
			right: evidenceInputSchema
		});
		textDeltaSchema = z.object({
			added_lines: z.number().int().min(0),
			removed_lines: z.number().int().min(0),
			hunks: z.number().int().min(0)
		});
		functionDimensionContextShape = {
			dimension: functionComparisonDimensionNameSchema,
			left_count: z.number().int().min(0).nullable(),
			right_count: z.number().int().min(0).nullable(),
			evidence_links: z.array(evidenceIdSchema$6).min(2),
			limitations: z.array(z.string())
		};
		functionDimensionSchema = z.union([
			z.object({
				...functionDimensionContextShape,
				status: z.literal("unchanged"),
				left_digest: digestSchema,
				right_digest: digestSchema,
				text_delta: textDeltaSchema.nullable(),
				conclusion_kind: z.literal("derived_relationship")
			}),
			z.object({
				...functionDimensionContextShape,
				status: z.literal("changed"),
				left_digest: digestSchema,
				right_digest: digestSchema,
				text_delta: textDeltaSchema.nullable(),
				conclusion_kind: z.enum(["derived_relationship", "contradiction"])
			}),
			z.object({
				...functionDimensionContextShape,
				status: z.literal("unknown"),
				left_digest: z.null(),
				right_digest: z.null(),
				text_delta: z.null(),
				conclusion_kind: z.literal("unresolved_branch")
			})
		]);
		functionMatchSchema = z.union([z.object({
			status: z.literal("matched"),
			method: z.literal("symbol"),
			left_name: z.string(),
			right_name: z.string()
		}), z.object({
			status: z.enum(["mismatched", "ambiguous"]),
			method: z.literal("explicit"),
			left_name: z.string(),
			right_name: z.string()
		})]);
		functionComparisonResultSchema = z.object({
			status: comparisonStatusSchema,
			function_match: functionMatchSchema,
			left_subject_sha256: digestSchema,
			right_subject_sha256: digestSchema,
			summary: z.object({
				unchanged: z.number().int().min(0),
				changed: z.number().int().min(0),
				unknown: z.number().int().min(0)
			}),
			dimensions: z.array(functionDimensionSchema).length(8),
			changes: z.array(functionDimensionSchema),
			limitations: z.array(z.string())
		}).superRefine((result, context) => {
			if (result.status !== overallStatus(result.dimensions, result.function_match.status)) context.addIssue({
				code: "custom",
				path: ["status"],
				message: "Function comparison status contradicts its dimensions or function match."
			});
		});
	})))();
}

//#endregion
//#region dist/domain/residualUnknown.js
var evidenceIdSchema$5, unknownIdSchema, text, environmentRequirementSchema, stableUnknownId, probeSchema, comparisonConclusionScopeSchema, relationshipSchema, resolutionSchema, residualUnknownObjectSchema, refineRevision, residualUnknownValidatedSchema, residualUnknownSchema, generatedRevisionSchema, recordUnknownInputSchema, updateUnknownInputSchema, createResidualUnknown, updateResidualUnknown, createRevision, projectRevisionDetails, computeRevisionDigest, sortedUnique, sameOrderedValues, sortedRelationships;
function init_residualUnknown() {
	return (init_residualUnknown = __esmMin((() => {
		init_canonicalDigest();
		init_unicodeCodePointOrder();
		init_digests();
		init_functionComparisonSchemas();
		evidenceIdSchema$5 = prefixedDigestSchema("ev");
		unknownIdSchema = prefixedDigestSchema("unk");
		text = z.string().trim().min(1);
		environmentRequirementSchema = z.strictObject({
			id: z.string().min(1).nullable(),
			platform: z.string().min(1).nullable(),
			architecture: z.string().min(1).nullable(),
			isolation: z.enum([
				"none",
				"process",
				"container",
				"virtual-machine"
			]).nullable()
		});
		stableUnknownId = (question, domain, scopeDigest, comparisonConclusionScope) => `unk_${digestCanonicalValue({
			domain: domain.trim(),
			question: question.replace(/\s+/gu, " ").trim(),
			scope_digest: scopeDigest,
			...comparisonConclusionScope === undefined ? {} : { comparison_conclusion_scope: comparisonConclusionScope }
		}, "Unknown identity")}`;
		probeSchema = z.strictObject({
			operation: z.string().min(1),
			rationale: text
		});
		comparisonConclusionScopeSchema = z.object({
			comparison_evidence_id: evidenceIdSchema$5,
			dimensions: z.array(z.union([z.literal("overall"), functionComparisonDimensionNameSchema])).min(1)
		}).strict().superRefine(({ dimensions }, context) => {
			if (!sameOrderedValues(dimensions, sortedUnique(dimensions))) context.addIssue({
				code: "custom",
				message: "Comparison dimensions must be sorted and unique"
			});
		});
		relationshipSchema = z.strictObject({
			type: z.enum([
				"depends-on",
				"related-to",
				"contradicts"
			]),
			unknown_id: unknownIdSchema
		});
		resolutionSchema = z.discriminatedUnion("disposition", [z.strictObject({
			disposition: z.literal("verified"),
			rationale: text,
			evidence_ids: z.array(evidenceIdSchema$5).min(1)
		}), z.strictObject({
			disposition: z.enum(["withdrawn", "out-of-scope"]),
			rationale: text,
			evidence_ids: z.array(evidenceIdSchema$5)
		})]);
		residualUnknownObjectSchema = z.strictObject({
			unknown_id: unknownIdSchema,
			revision: z.number().int().min(1),
			previous_revision_digest: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
			revision_digest: z.string().regex(/^[a-f0-9]{64}$/u),
			scope_digest: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
			question: text,
			status: z.enum([
				"open",
				"investigating",
				"blocked",
				"contradicted",
				"resolved"
			]),
			severity: z.enum([
				"low",
				"medium",
				"high",
				"critical"
			]),
			domain: text,
			comparison_conclusion_scope: comparisonConclusionScopeSchema.exactOptional(),
			supporting_evidence_ids: z.array(evidenceIdSchema$5),
			contradicting_evidence_ids: z.array(evidenceIdSchema$5),
			required_authority: z.enum([
				"shipped-artifact",
				"controlled-replay",
				"historical-reference",
				"external-service",
				"analyst-inference"
			]).nullable(),
			required_confidence: z.enum([
				"observed",
				"derived",
				"inferred"
			]),
			required_environment: environmentRequirementSchema.nullable(),
			recommended_probes: z.array(probeSchema),
			relationships: z.array(relationshipSchema),
			resolution: resolutionSchema.nullable(),
			mutation_evidence_ids: z.array(evidenceIdSchema$5).min(1)
		});
		refineRevision = (value, context) => {
			if (value.unknown_id !== stableUnknownId(value.question, value.domain, value.scope_digest, value.comparison_conclusion_scope)) context.addIssue({
				code: "custom",
				message: "Residual unknown ID does not match its immutable identity",
				path: ["unknown_id"]
			});
			if (value.revision === 1 !== (value.previous_revision_digest === null)) context.addIssue({
				code: "custom",
				message: "Only the first revision has no predecessor",
				path: ["previous_revision_digest"]
			});
			if (value.status === "resolved" !== (value.resolution !== null)) context.addIssue({
				code: "custom",
				message: "Only resolved unknowns carry a resolution",
				path: ["resolution"]
			});
			if (value.status === "contradicted" && value.contradicting_evidence_ids.length === 0) context.addIssue({
				code: "custom",
				message: "Contradicted status requires contradicting evidence",
				path: ["contradicting_evidence_ids"]
			});
			if (value.relationships.some((relationship) => relationship.unknown_id === value.unknown_id)) context.addIssue({
				code: "custom",
				message: "An unknown cannot relate to itself",
				path: ["relationships"]
			});
			for (const ids of [
				value.supporting_evidence_ids,
				value.contradicting_evidence_ids,
				value.mutation_evidence_ids
			]) if (new Set(ids).size !== ids.length) context.addIssue({
				code: "custom",
				message: "Evidence IDs must be unique"
			});
			if (value.comparison_conclusion_scope !== undefined && ![...value.supporting_evidence_ids, ...value.contradicting_evidence_ids].includes(value.comparison_conclusion_scope.comparison_evidence_id)) context.addIssue({
				code: "custom",
				message: "Scoped comparison Evidence must support or contradict the unknown",
				path: ["comparison_conclusion_scope"]
			});
			if (value.comparison_conclusion_scope !== undefined && value.domain !== "function-comparison") context.addIssue({
				code: "custom",
				message: "Comparison conclusion scope requires function-comparison domain",
				path: ["comparison_conclusion_scope"]
			});
			const contradictingEvidence = new Set(value.contradicting_evidence_ids);
			if (value.supporting_evidence_ids.some((id) => contradictingEvidence.has(id))) context.addIssue({
				code: "custom",
				message: "Evidence cannot simultaneously support and contradict"
			});
			const relationships = value.relationships.map((relationship) => `${relationship.type}:${relationship.unknown_id}`);
			if (new Set(relationships).size !== relationships.length) context.addIssue({
				code: "custom",
				message: "Relationships must be unique",
				path: ["relationships"]
			});
		};
		residualUnknownValidatedSchema = residualUnknownObjectSchema.superRefine((value, context) => {
			if (computeRevisionDigest(value) !== value.revision_digest) context.addIssue({
				code: "custom",
				message: "Residual unknown revision digest does not match",
				path: ["revision_digest"]
			});
			refineRevision(value, context);
		});
		residualUnknownSchema = residualUnknownValidatedSchema;
		generatedRevisionSchema = residualUnknownObjectSchema.omit({ revision_digest: true }).superRefine(refineRevision);
		recordUnknownInputSchema = residualUnknownObjectSchema.omit({
			unknown_id: true,
			revision: true,
			previous_revision_digest: true,
			revision_digest: true,
			scope_digest: true,
			status: true,
			supporting_evidence_ids: true,
			contradicting_evidence_ids: true,
			resolution: true,
			mutation_evidence_ids: true
		}).extend({
			supporting_evidence_ids: z.array(evidenceIdSchema$5).default([]),
			contradicting_evidence_ids: z.array(evidenceIdSchema$5).default([])
		}).strict();
		updateUnknownInputSchema = z.strictObject({
			unknown_id: unknownIdSchema,
			expected_revision: z.number().int().min(1),
			status: residualUnknownObjectSchema.shape.status,
			severity: residualUnknownObjectSchema.shape.severity,
			supporting_evidence_ids: z.array(evidenceIdSchema$5),
			contradicting_evidence_ids: z.array(evidenceIdSchema$5),
			required_authority: residualUnknownObjectSchema.shape.required_authority,
			required_confidence: residualUnknownObjectSchema.shape.required_confidence,
			required_environment: environmentRequirementSchema.nullable(),
			recommended_probes: z.array(probeSchema),
			relationships: z.array(relationshipSchema),
			resolution: resolutionSchema.nullable()
		});
		createResidualUnknown = (input, mutationEvidenceId, scopeDigest) => {
			const question = input.question.replace(/\s+/gu, " ").trim();
			const domain = input.domain.trim();
			const comparisonConclusionScope = input.comparison_conclusion_scope === undefined ? undefined : {
				comparison_evidence_id: input.comparison_conclusion_scope.comparison_evidence_id,
				dimensions: input.comparison_conclusion_scope.dimensions
			};
			const revision = {
				unknown_id: stableUnknownId(question, domain, scopeDigest, comparisonConclusionScope),
				revision: 1,
				previous_revision_digest: null,
				scope_digest: scopeDigest,
				question,
				status: input.contradicting_evidence_ids.length > 0 ? "contradicted" : "open",
				domain,
				...comparisonConclusionScope === undefined ? {} : { comparison_conclusion_scope: comparisonConclusionScope },
				...projectRevisionDetails(input),
				resolution: null,
				mutation_evidence_ids: [mutationEvidenceId]
			};
			return createRevision(revision);
		};
		updateResidualUnknown = (current, input, mutationEvidenceId) => {
			const revision = {
				unknown_id: current.unknown_id,
				revision: current.revision + 1,
				previous_revision_digest: current.revision_digest,
				scope_digest: current.scope_digest,
				question: current.question,
				status: input.status,
				domain: current.domain,
				...current.comparison_conclusion_scope === undefined ? {} : { comparison_conclusion_scope: current.comparison_conclusion_scope },
				...projectRevisionDetails(input),
				resolution: input.resolution,
				mutation_evidence_ids: sortedUnique([...current.mutation_evidence_ids, mutationEvidenceId])
			};
			return createRevision(revision);
		};
		createRevision = (value) => {
			const revision = generatedRevisionSchema.parse(value);
			return {
				...revision,
				revision_digest: computeRevisionDigest(revision)
			};
		};
		projectRevisionDetails = (input) => ({
			severity: input.severity,
			supporting_evidence_ids: sortedUnique(input.supporting_evidence_ids),
			contradicting_evidence_ids: sortedUnique(input.contradicting_evidence_ids),
			required_authority: input.required_authority,
			required_confidence: input.required_confidence,
			required_environment: input.required_environment,
			recommended_probes: [...input.recommended_probes],
			relationships: sortedRelationships(input.relationships)
		});
		computeRevisionDigest = (value) => {
			const { revision_digest: _revisionDigest, ...semantic } = "revision_digest" in value ? value : {
				...value,
				revision_digest: ""
			};
			void _revisionDigest;
			return digestCanonicalValue(semantic, "Unknown identity");
		};
		sortedUnique = (values) => [...new Set(values)].sort(compareUnicodeCodePoints);
		sameOrderedValues = (left, right) => left.length === right.length && left.every((value, index) => value === right[index]);
		sortedRelationships = (values) => [...values].sort((left, right) => compareUnicodeCodePoints(compositeKey([left.type, left.unknown_id]), compositeKey([right.type, right.unknown_id])));
	})))();
}

//#endregion
//#region dist/domain/evidenceBundle.js
var detectedSubjectSchema, rawSubjectSchema, manifestFields, artifactManifestSchema, providerManifestSchema, environmentManifestSchema, scenarioManifestSchema, captureManifestSchema, evidenceBundleSchema, immutableBundles, NonCanonicalEvidenceBundleError, DuplicateEvidenceRecordError, createImmutableEvidenceBundle, createEvidenceBundle, evidenceBundleForTarget, referencedEvidenceIds, describeEvidenceBundleFailure, describeValidationFailure, parseEvidenceBundle, parseImmutableEvidenceBundle, parseBundle, authenticateParsedEvidenceBundle, authenticateBundle, validateUnknownGraph, validateVerifiedResolution, validateResidualUnknownAddition, reachesUnknown, evidenceQualifies, rejectDependencyCycles, serializeEvidenceBundle, uniqueSorted;
function init_evidenceBundle() {
	return (init_evidenceBundle = __esmMin((() => {
		init_jsonSerialization();
		init_unicodeCodePointOrder();
		init_evidence();
		init_residualUnknown();
		init_immutableJson();
		[detectedSubjectSchema, rawSubjectSchema] = evidenceSchema.shape.subject.unwrap().options;
		manifestFields = {
			digest: true,
			format: true,
			architecture: true
		};
		artifactManifestSchema = z.discriminatedUnion("format", [detectedSubjectSchema.pick(manifestFields), rawSubjectSchema.pick(manifestFields)]);
		providerManifestSchema = providerSchema;
		environmentManifestSchema = evidenceSchema.shape.environment.unwrap();
		scenarioManifestSchema = z.strictObject({
			evidence_id: evidenceSchema.shape.evidence_id,
			operation: z.string().min(1),
			authority: z.literal("controlled-replay")
		});
		captureManifestSchema = z.strictObject({
			evidence_id: evidenceSchema.shape.evidence_id,
			predicate_type: z.string().min(1)
		});
		evidenceBundleSchema = z.strictObject({
			artifacts: z.array(artifactManifestSchema),
			providers: z.array(providerManifestSchema),
			environments: z.array(environmentManifestSchema),
			scenarios: z.array(scenarioManifestSchema),
			captures: z.array(captureManifestSchema),
			unknowns: z.array(residualUnknownSchema),
			records: z.array(evidenceSchema)
		});
		immutableBundles = new WeakMap();
		NonCanonicalEvidenceBundleError = class extends TypeError {
			constructor() {
				super("Evidence bundle manifests are not canonical");
				this.name = "NonCanonicalEvidenceBundleError";
			}
		};
		DuplicateEvidenceRecordError = class extends TypeError {
			constructor() {
				super("Evidence bundle contains duplicate record IDs");
				this.name = "DuplicateEvidenceRecordError";
			}
		};
		createImmutableEvidenceBundle = (records, unknowns = []) => {
			const checkedRecords = records.map(immutableEvidence);
			if (new Set(checkedRecords.map(({ evidence_id }) => evidence_id)).size !== checkedRecords.length) throw new DuplicateEvidenceRecordError();
			const checkedUnknowns = unknowns.map((unknown) => residualUnknownSchema.parse(unknown));
			validateUnknownGraph(checkedUnknowns, checkedRecords);
			const bundle = freezeJsonSnapshot(createEvidenceBundle(checkedRecords, checkedUnknowns));
			immutableBundles.set(bundle, bundle);
			return bundle;
		};
		createEvidenceBundle = (records, unknowns = []) => {
			const sortedRecords = [...records].sort((left, right) => compareUnicodeCodePoints(left.evidence_id, right.evidence_id));
			return {
				artifacts: uniqueSorted(sortedRecords.flatMap(({ subject }) => subject === null ? [] : [artifactManifestSchema.parse({
					digest: subject.digest,
					format: subject.format,
					architecture: subject.architecture
				})])),
				providers: uniqueSorted(sortedRecords.map(({ provider }) => provider)),
				environments: uniqueSorted(sortedRecords.flatMap(({ environment }) => environment === null ? [] : [environment])),
				scenarios: sortedRecords.flatMap((evidence) => evidence.authority === "controlled-replay" ? [{
					evidence_id: evidence.evidence_id,
					operation: evidence.operation,
					authority: evidence.authority
				}] : []),
				captures: sortedRecords.flatMap((evidence) => evidence.predicate_type === "rea.process-capture" ? [{
					evidence_id: evidence.evidence_id,
					predicate_type: evidence.predicate_type
				}] : []),
				unknowns: [...unknowns].sort((left, right) => compareUnicodeCodePoints(left.unknown_id, right.unknown_id) || left.revision - right.revision),
				records: sortedRecords
			};
		};
		evidenceBundleForTarget = (bundle, sha256) => {
			const recordsById = new Map(bundle.records.map((record) => [record.evidence_id, record]));
			const histories = new Map();
			for (const unknown of bundle.unknowns) {
				const history = histories.get(unknown.unknown_id) ?? [];
				history.push(unknown);
				histories.set(unknown.unknown_id, history);
			}
			const retained = new Set();
			const dependents = new Map();
			const relationships = new Map();
			for (const [id, history] of histories) {
				const eligible = history.every((unknown) => {
					if (unknown.scope_digest !== sha256) return false;
					const mutationEvidenceIds = new Set(unknown.mutation_evidence_ids);
					return referencedEvidenceIds(unknown).every((evidenceId) => {
						const record = recordsById.get(evidenceId);
						return record?.subject?.digest.sha256 === sha256 || mutationEvidenceIds.has(evidenceId) && record?.predicate_type === "rea.residual-unknown-mutation";
					});
				});
				if (!eligible) continue;
				retained.add(id);
				const relatedIds = new Set(history.flatMap((unknown) => unknown.relationships.map(({ unknown_id }) => unknown_id)));
				relationships.set(id, relatedIds);
				for (const relatedId of relatedIds) {
					const references = dependents.get(relatedId) ?? new Set();
					references.add(id);
					dependents.set(relatedId, references);
				}
			}
			const pending = [];
			for (const [id, relatedIds] of relationships) if ([...relatedIds].some((relatedId) => !retained.has(relatedId))) pending.push(id);
			for (let index = 0; index < pending.length; index += 1) {
				const id = pending[index];
				if (id === undefined || !retained.delete(id)) continue;
				for (const dependent of dependents.get(id) ?? []) pending.push(dependent);
			}
			const unknowns = bundle.unknowns.filter((unknown) => retained.has(unknown.unknown_id));
			const mutationIds = new Set(unknowns.flatMap(({ mutation_evidence_ids: ids }) => ids));
			return createEvidenceBundle(bundle.records.filter((record) => record.subject?.digest.sha256 === sha256 || mutationIds.has(record.evidence_id)), unknowns);
		};
		referencedEvidenceIds = (unknown) => [
			...unknown.supporting_evidence_ids,
			...unknown.contradicting_evidence_ids,
			...unknown.mutation_evidence_ids,
			...unknown.resolution?.evidence_ids ?? []
		];
		describeEvidenceBundleFailure = (input, cause) => {
			try {
				const record = parseEvidence(input);
				return {
					kind: "single-record",
					message: `Expected an Evidence bundle with records and manifest arrays, but this JSON is one Evidence record (${record.evidence_id}). Export a session bundle with the MCP export_evidence_bundle tool and supply that file.`
				};
			} catch {
				return {
					kind: "invalid-bundle",
					message: cause instanceof z.ZodError ? `Evidence bundle does not match the bundle schema ${describeValidationFailure(cause)}. Supply an unmodified bundle written by export_evidence_bundle or rea evidence-export.` : `Evidence bundle validation failed: ${describeValidationFailure(cause)}. Recreate or re-export the bundle, then try again.`
				};
			}
		};
		describeValidationFailure = (cause) => {
			if (!(cause instanceof z.ZodError)) return cause instanceof Error ? cause.message : String(cause);
			const [first, ...rest] = cause.issues;
			const location = first === undefined || first.path.length === 0 ? "the document root" : first.path.map(String).join(".");
			return `at ${location}: ${first?.message ?? "invalid value"}${rest.length === 0 ? "" : ` (${String(rest.length)} more issues)`}`;
		};
		parseEvidenceBundle = (input) => {
			return parseBundle(input, false);
		};
		parseImmutableEvidenceBundle = (input) => {
			return parseBundle(input, true);
		};
		parseBundle = (input, seal) => {
			if (typeof input === "object" && input !== null) {
				const owned = immutableBundles.get(input);
				if (owned !== undefined) return owned;
			}
			return authenticateBundle(evidenceBundleSchema.parse(input), seal);
		};
		authenticateParsedEvidenceBundle = (parsed) => authenticateBundle(parsed, false);
		authenticateBundle = (parsed, seal) => {
			const recordIds = parsed.records.map(({ evidence_id: id }) => id);
			if (new Set(recordIds).size !== recordIds.length) throw new DuplicateEvidenceRecordError();
			validateUnknownGraph(parsed.unknowns, parsed.records);
			const canonical = createEvidenceBundle(parsed.records.map((record, index) => {
				try {
					if (!seal) return parseEvidence(record);
					record.normalized_result = freezeJsonSnapshot(record.normalized_result);
					record.raw_result = freezeJsonSnapshot(record.raw_result);
					return immutableEvidence(record);
				} catch (cause) {
					if (cause instanceof z.ZodError) throw new z.ZodError(cause.issues.map((issue) => ({
						...issue,
						path: [
							"records",
							index,
							...issue.path
						]
					})));
					throw cause;
				}
			}), parsed.unknowns);
			if (!equalJsonText(parsed, canonical)) throw new NonCanonicalEvidenceBundleError();
			if (seal) {
				freezeJsonSnapshot(canonical);
				immutableBundles.set(canonical, canonical);
			}
			return canonical;
		};
		validateUnknownGraph = (unknowns, records) => {
			const evidenceById = new Map(records.map((record) => [record.evidence_id, record]));
			const histories = new Map();
			for (const unknown of unknowns) {
				const history = histories.get(unknown.unknown_id) ?? [];
				history.push(unknown);
				histories.set(unknown.unknown_id, history);
			}
			const unknownById = new Map();
			for (const [id, unordered] of histories) {
				const history = [...unordered].sort((left, right) => left.revision - right.revision);
				for (const [index, revision] of history.entries()) {
					if (revision.revision !== index + 1) throw new TypeError(`Residual unknown ${id} revision history has a gap`);
					if (index > 0 && revision.previous_revision_digest !== history[index - 1]?.revision_digest) throw new TypeError(`Residual unknown ${id} revision chain is broken`);
				}
				const head = history.at(-1);
				if (head === undefined) throw new TypeError("Residual unknown revision history is empty");
				unknownById.set(id, head);
			}
			for (const unknown of unknowns) {
				const referencedEvidence = [
					...unknown.supporting_evidence_ids,
					...unknown.contradicting_evidence_ids,
					...unknown.mutation_evidence_ids,
					...unknown.resolution?.evidence_ids ?? []
				];
				for (const evidenceId of referencedEvidence) if (!evidenceById.has(evidenceId)) throw new TypeError(`Residual unknown references missing evidence ${evidenceId}`);
				for (const relationship of unknown.relationships) if (!unknownById.has(relationship.unknown_id)) throw new TypeError(`Residual unknown references missing unknown ${relationship.unknown_id}`);
				if (unknown.resolution?.disposition === "verified") validateVerifiedResolution(unknown, evidenceById);
			}
			rejectDependencyCycles(unknownById);
		};
		validateVerifiedResolution = (unknown, evidenceById) => {
			if (unknown.contradicting_evidence_ids.length > 0) throw new TypeError(`Residual unknown ${unknown.unknown_id} retains contradicting evidence`);
			const qualifies = unknown.resolution?.evidence_ids.some((evidenceId) => {
				const evidence = evidenceById.get(evidenceId);
				return unknown.supporting_evidence_ids.includes(evidenceId) && evidence !== undefined && evidence.predicate_type !== "rea.residual-unknown-mutation" && evidenceQualifies(unknown, evidence);
			});
			if (qualifies !== true) throw new TypeError(`Residual unknown ${unknown.unknown_id} has no qualifying resolution evidence`);
		};
		validateResidualUnknownAddition = (unknown, evidenceById, currentHeads) => {
			const current = currentHeads.get(unknown.unknown_id);
			if (current === undefined ? unknown.revision !== 1 || unknown.previous_revision_digest !== null : unknown.revision !== current.revision + 1 || unknown.previous_revision_digest !== current.revision_digest) throw new TypeError(`Residual unknown ${unknown.unknown_id} revision chain is broken`);
			for (const evidenceId of referencedEvidenceIds(unknown)) if (!evidenceById.has(evidenceId)) throw new TypeError(`Residual unknown references missing evidence ${evidenceId}`);
			for (const relationship of unknown.relationships) if (relationship.unknown_id !== unknown.unknown_id && !currentHeads.has(relationship.unknown_id)) throw new TypeError(`Residual unknown references missing unknown ${relationship.unknown_id}`);
			if (unknown.resolution?.disposition === "verified") validateVerifiedResolution(unknown, evidenceById);
			if (current !== undefined) {
				const dependencies = unknown.relationships.filter((relationship) => relationship.type === "depends-on").map(({ unknown_id }) => unknown_id);
				if (dependencies.length > 0 && reachesUnknown(dependencies, unknown.unknown_id, currentHeads, unknown)) throw new TypeError("Residual unknown dependency graph contains a cycle");
			}
		};
		reachesUnknown = (starts, goal, currentHeads, candidate) => {
			const pending = [...starts];
			const visited = new Set();
			while (pending.length > 0) {
				const id = pending.pop();
				if (id === undefined) break;
				if (id === goal) return true;
				if (visited.has(id)) continue;
				visited.add(id);
				const unknown = id === candidate.unknown_id ? candidate : currentHeads.get(id);
				if (unknown === undefined) continue;
				for (const relationship of unknown.relationships) if (relationship.type === "depends-on") pending.push(relationship.unknown_id);
			}
			return false;
		};
		evidenceQualifies = (unknown, evidence) => {
			if (unknown.required_authority !== null && evidence.authority !== unknown.required_authority) return false;
			const confidenceRank = {
				inferred: 1,
				derived: 2,
				observed: 3
			};
			if (confidenceRank[evidence.confidence] < confidenceRank[unknown.required_confidence]) return false;
			const requirement = unknown.required_environment;
			if (requirement === null) return true;
			if (evidence.environment === null) return false;
			return (requirement.id === null || requirement.id === evidence.environment.id) && (requirement.platform === null || requirement.platform === evidence.environment.platform) && (requirement.architecture === null || requirement.architecture === evidence.environment.architecture) && (requirement.isolation === null || requirement.isolation === evidence.environment.isolation);
		};
		rejectDependencyCycles = (unknownById) => {
			const visited = new Set();
			const active = new Set();
			const pending = [];
			for (const root of unknownById.keys()) {
				if (visited.has(root)) continue;
				const rootUnknown = unknownById.get(root);
				if (rootUnknown === undefined) throw new TypeError("Residual unknown dependency graph is inconsistent");
				active.add(root);
				pending.push({
					id: root,
					relationships: rootUnknown.relationships,
					nextRelationship: 0
				});
				while (pending.length > 0) {
					const frame = pending[pending.length - 1];
					if (frame === undefined) break;
					let descended = false;
					while (frame.nextRelationship < frame.relationships.length) {
						const relationship = frame.relationships[frame.nextRelationship];
						frame.nextRelationship += 1;
						if (relationship?.type !== "depends-on") continue;
						const dependency = relationship.unknown_id;
						if (active.has(dependency)) throw new TypeError("Residual unknown dependency graph contains a cycle");
						if (visited.has(dependency)) continue;
						const unknown = unknownById.get(dependency);
						if (unknown === undefined) throw new TypeError("Residual unknown dependency graph is inconsistent");
						active.add(dependency);
						pending.push({
							id: dependency,
							relationships: unknown.relationships,
							nextRelationship: 0
						});
						descended = true;
						break;
					}
					if (descended) continue;
					pending.pop();
					active.delete(frame.id);
					visited.add(frame.id);
				}
			}
		};
		serializeEvidenceBundle = (bundle) => {
			const serialized = canonicalize(parseEvidenceBundle(bundle));
			if (serialized === undefined) throw new TypeError("Evidence bundle canonicalization failed");
			return serialized;
		};
		uniqueSorted = (values) => {
			const unique = new Map();
			for (const value of values) unique.set(JSON.stringify(value), value);
			return [...unique.entries()].sort(([left], [right]) => compareUnicodeCodePoints(left, right)).map(([, value]) => value);
		};
	})))();
}

//#endregion
//#region dist/domain/process/processScenario.js
var positiveBudget, processScenarioOutputBudgetProjectionSchema, PROCESS_TERMINAL_CELL_BUDGET, timedEventBase, reservedRunIdEnvironmentName, ENVIRONMENT_NAME_CHARACTER, environmentNamePattern, environmentName, childProcessString, fitsProcessTerminalCellBudget, normalizationSchema, digestProcessCommitment, committedScenarioEvents, processScenarioCommitment, processComparisonContract, processScenarioSchema, eventsOutOfOrder, parseProcessScenario;
function init_processScenario() {
	return (init_processScenario = __esmMin((() => {
		positiveBudget = z.number().int().safe().positive();
		processScenarioOutputBudgetProjectionSchema = z.object({ output_bytes: positiveBudget }).passthrough();
		PROCESS_TERMINAL_CELL_BUDGET = 1e6;
		timedEventBase = { at_ms: z.number().int().safe().nonnegative() };
		reservedRunIdEnvironmentName = "REA_PROCESS_RUN_ID";
		ENVIRONMENT_NAME_CHARACTER = "[^=\\x00]";
		environmentNamePattern = (reserved) => {
			let rest = `${ENVIRONMENT_NAME_CHARACTER}+`;
			for (let index = reserved.length - 1; index >= 0; index -= 1) {
				const character = reserved[index] ?? "";
				const choice = `[^=\\x00${character}]${ENVIRONMENT_NAME_CHARACTER}*|${character}${rest}`;
				rest = index === 0 ? choice : `(?:${choice})?`;
			}
			return new RegExp(`^(?:${rest})$`, "u");
		};
		environmentName = z.string().min(1, "Environment names must not be empty").regex(environmentNamePattern(reservedRunIdEnvironmentName), { error: (issue) => issue.input === reservedRunIdEnvironmentName ? `${reservedRunIdEnvironmentName} is reserved by the process adapter` : "Environment names cannot contain '=' or NUL" });
		childProcessString = z.string().regex(/^[^\x00]*$/u, "Values passed to operating-system APIs cannot contain NUL");
		fitsProcessTerminalCellBudget = (columns, rows, scrollback) => rows + scrollback <= Math.floor(PROCESS_TERMINAL_CELL_BUDGET / columns);
		normalizationSchema = z.object({
			paths: z.boolean(),
			pids: z.boolean(),
			ports: z.boolean(),
			time_bucket_ms: positiveBudget,
			patterns: z.array(z.object({
				pattern: z.string(),
				replacement: z.string()
			}))
		});
		digestProcessCommitment = (value) => {
			const serialized = canonicalize(value);
			if (serialized === undefined) throw new TypeError("Process capture commitment is not canonical JSON");
			return createHash("sha256").update(serialized).digest("hex");
		};
		committedScenarioEvents = (events, includeSensitiveInputLength) => events.map((event) => event.type === "input" && event.sensitive ? {
			...event,
			data: includeSensitiveInputLength ? `<redacted-input:${String(Buffer.byteLength(event.data))}-bytes>` : "<redacted-input>"
		} : event);
		processScenarioCommitment = (scenario, executableSha256) => {
			const { finalization_ms: finalizationMs, ...committed } = scenario;
			return {
				...committed,
				...finalizationMs > 0 ? { finalization_ms: finalizationMs } : {},
				events: committedScenarioEvents(scenario.events, true),
				executable_sha256: executableSha256 ?? null
			};
		};
		processComparisonContract = (scenario) => ({
			working_directory: scenario.working_directory,
			environment: scenario.environment,
			ambient_environment: "unknown",
			filesystem_observation_paths: scenario.filesystem_observation_paths,
			terminal: scenario.terminal,
			events: committedScenarioEvents(scenario.events, false),
			timeout_ms: scenario.timeout_ms,
			idle_timeout_ms: scenario.idle_timeout_ms,
			settle_ms: scenario.settle_ms,
			...scenario.finalization_ms > 0 ? { finalization_ms: scenario.finalization_ms } : {},
			limits: scenario.limits,
			normalization: scenario.normalization,
			...scenario.normalization.paths ? { path_normalization_version: "longest-original-paths-v1" } : {},
			...scenario.normalization.ports ? { port_normalization_version: "contextual-endpoints-v2" } : {},
			...scenario.normalization.patterns.length > 0 ? { pattern_normalization_version: "literal-replacements-v1" } : {},
			rendered_line_format: "trailing-spaces-trimmed-v1"
		});
		processScenarioSchema = z.strictObject({
			executable: childProcessString.min(1),
			arguments: z.array(childProcessString).default([]),
			working_directory: childProcessString.default("."),
			environment: z.record(environmentName, childProcessString).default({}),
			filesystem_observation_paths: z.array(childProcessString.min(1)).default([]),
			terminal: z.strictObject({
				columns: z.number().int().min(1).max(65535).default(80),
				rows: z.number().int().min(1).max(65535).default(24),
				scrollback: z.number().int().safe().nonnegative().default(1e3)
			}).describe("The visible terminal and scrollback together must use at most 1,000,000 xterm renderer cells: columns × (rows + scrollback). Resize events use the same scrollback and limit. This release has no runtime override.").default({
				columns: 80,
				rows: 24,
				scrollback: 1e3
			}),
			events: z.array(z.discriminatedUnion("type", [
				z.strictObject({
					...timedEventBase,
					type: z.literal("input"),
					data: z.string(),
					sensitive: z.boolean().default(false)
				}),
				z.strictObject({
					...timedEventBase,
					type: z.literal("resize"),
					columns: z.number().int().min(1).max(65535),
					rows: z.number().int().min(1).max(65535)
				}),
				z.strictObject({
					...timedEventBase,
					type: z.literal("signal"),
					signal: z.enum([
						"SIGINT",
						"SIGTERM",
						"SIGKILL"
					])
				})
			])).default([]),
			timeout_ms: positiveBudget.default(3e4),
			idle_timeout_ms: positiveBudget.default(3e4),
			settle_ms: z.number().int().safe().nonnegative().default(100),
			finalization_ms: z.number().int().safe().nonnegative().default(0).describe("Milliseconds a target may keep running after SIGTERM when timeout_ms or idle_timeout_ms fires, before SIGKILL; 0 sends SIGKILL immediately. Both signals reach the captured root only while its launch-time start identity still matches; cancellation ends the run at once."),
			limits: z.strictObject({
				output_bytes: positiveBudget.default(1e6),
				files: positiveBudget.default(1e4),
				file_bytes: positiveBudget.default(1e7),
				processes: positiveBudget.default(1e3),
				filesystem_depth: z.number().int().safe().nonnegative().default(16)
			}).strict().default({
				output_bytes: 1e6,
				files: 1e4,
				file_bytes: 1e7,
				processes: 1e3,
				filesystem_depth: 16
			}),
			normalization: z.strictObject({
				paths: z.boolean().default(false),
				pids: z.boolean().default(true),
				ports: z.boolean().default(true),
				time_bucket_ms: positiveBudget.default(10),
				patterns: z.array(z.strictObject({
					pattern: z.string().describe("Literal text to replace in captured output; not a regular expression."),
					replacement: z.string()
				})).default([])
			}).default({
				paths: false,
				pids: true,
				ports: true,
				time_bucket_ms: 10,
				patterns: []
			})
		}).superRefine((scenario, context) => {
			const lifecycleBudget = BigInt(scenario.timeout_ms) + BigInt(scenario.finalization_ms) + BigInt(scenario.settle_ms);
			if (lifecycleBudget > BigInt(Number.MAX_SAFE_INTEGER)) context.addIssue({
				code: "custom",
				message: `timeout_ms + finalization_ms + settle_ms must stay at or below ${String(Number.MAX_SAFE_INTEGER)} ms, the largest total exactly representable as a JavaScript number`,
				path: ["timeout_ms"]
			});
			if (!fitsProcessTerminalCellBudget(scenario.terminal.columns, scenario.terminal.rows, scenario.terminal.scrollback)) context.addIssue({
				code: "custom",
				path: ["terminal"],
				message: `terminal columns × (rows + scrollback) must not exceed ${String(PROCESS_TERMINAL_CELL_BUDGET)} renderer cells. This release has no runtime override.`
			});
			for (let index = 1; index < scenario.events.length; index += 1) {
				const event = scenario.events[index];
				const previous = scenario.events[index - 1];
				if (eventsOutOfOrder(event, previous)) {
					context.addIssue({
						code: "custom",
						message: "events must be ordered by at_ms",
						path: ["events", index]
					});
				}
			}
			for (const [index, event] of scenario.events.entries()) {
				if (event.type === "resize" && !fitsProcessTerminalCellBudget(event.columns, event.rows, scenario.terminal.scrollback)) context.addIssue({
					code: "custom",
					path: ["events", index],
					message: `resize event at ${String(event.at_ms)} ms exceeds the ${String(PROCESS_TERMINAL_CELL_BUDGET)}-cell renderer budget with the selected scrollback. This release has no runtime override.`
				});
				if (event.at_ms > scenario.timeout_ms) {
					context.addIssue({
						code: "custom",
						message: `event at ${String(event.at_ms)} ms occurs after the ${String(scenario.timeout_ms)} ms scenario timeout`,
						path: ["events", index]
					});
				}
			}
		});
		eventsOutOfOrder = (event, previous) => event !== undefined && previous !== undefined && event.at_ms < previous.at_ms;
		parseProcessScenario = (input) => processScenarioSchema.parse(input);
	})))();
}

//#endregion
//#region dist/domain/process/processCaptureCoverage.js
var byteRetentionSchema, enumerationOmissionReasonSchema, filesystemCoverageSchema, processCaptureTruncationDetailsSchema, omitted, filesystemTruncated, hasCaptureTruncation, processSourceTruncated;
function init_processCaptureCoverage() {
	return (init_processCaptureCoverage = __esmMin((() => {
		byteRetentionSchema = z.strictObject({
			budget_bytes: z.number().int().nonnegative(),
			observed_bytes: z.number().int().nonnegative(),
			retained_bytes: z.number().int().nonnegative(),
			observed_frames: z.number().int().nonnegative(),
			retained_frames: z.number().int().nonnegative(),
			unknown_size_frames: z.number().int().nonnegative().optional()
		});
		enumerationOmissionReasonSchema = z.enum([
			"identity_changed",
			"directory_unavailable",
			"entry_unavailable"
		]);
		filesystemCoverageSchema = z.strictObject({
			files_limit: z.number().int().nonnegative(),
			depth_limit: z.number().int().nonnegative(),
			enumeration_truncated: z.boolean(),
			enumeration_reasons: z.array(z.enum([
				"files_limit",
				"depth_limit",
				...enumerationOmissionReasonSchema.options
			])),
			enumeration_omissions: z.array(z.strictObject({
				path: z.string(),
				reason: enumerationOmissionReasonSchema,
				system_code: z.string().nullable()
			})),
			hash_budget_bytes: z.number().int().nonnegative(),
			hashed_bytes: z.number().int().nonnegative(),
			hash_omissions: z.array(z.strictObject({
				path: z.string(),
				size_bytes: z.number().int().nonnegative(),
				remaining_budget_bytes: z.number().int().nonnegative(),
				reason: z.enum([
					"file_bytes_budget",
					"file_changed_or_short_read",
					"file_unavailable"
				]),
				system_code: z.string().nullable()
			}))
		});
		processCaptureTruncationDetailsSchema = z.strictObject({
			raw_terminal: byteRetentionSchema.describe("UTF-8 bytes of original PTY chunks; whole chunks are retained or omitted."),
			rendered_terminal: byteRetentionSchema.describe("Cumulative UTF-8 bytes of serialized state plus visible lines, evaluated from retained PTY input; whole frames are retained or omitted. When normalization exceeds a bound before the frame size is known, observed_bytes contains the exact total for size-known frames and unknown_size_frames counts the other omissions."),
			normalized_terminal: z.strictObject({
				budget_bytes: z.number().int().nonnegative(),
				retained_bytes: z.number().int().nonnegative(),
				omitted_frames: z.number().int().nonnegative()
			}).optional().describe("UTF-8 bytes of normalized raw-chunk text retained under output_bytes; omitted frames can have unknown final size when normalization exceeded an intermediate bound."),
			filesystem_before: filesystemCoverageSchema,
			filesystem_after: filesystemCoverageSchema,
			process: z.strictObject({
				sample_limit: z.number().int().nonnegative(),
				sampling_partial: z.boolean(),
				retained_samples: z.number().int().nonnegative(),
				sample_limit_reached: z.boolean(),
				sampling_failures: z.number().int().nonnegative(),
				first_sampling_failure: z.string().nullable(),
				coverage: z.literal("sampled")
			})
		});
		omitted = (retention) => retention.observed_frames > retention.retained_frames;
		filesystemTruncated = (coverage) => coverage.enumeration_truncated || coverage.enumeration_omissions.length > 0 || coverage.hash_omissions.length > 0;
		hasCaptureTruncation = (details) => omitted(details.raw_terminal) || omitted(details.rendered_terminal) || (details.normalized_terminal?.omitted_frames ?? 0) > 0 || (details.rendered_terminal.unknown_size_frames ?? 0) > 0 || filesystemTruncated(details.filesystem_before) || filesystemTruncated(details.filesystem_after) || details.process.sampling_partial;
		processSourceTruncated = (capture, source) => {
			const details = capture.truncation_details;
			switch (source) {
				case "terminal_raw": return omitted(details.raw_terminal);
				case "terminal_rendered": return omitted(details.raw_terminal) || omitted(details.rendered_terminal);
				case "filesystem": return filesystemTruncated(details.filesystem_before) || filesystemTruncated(details.filesystem_after);
				case "process": return details.process.sampling_partial;
				case "interaction":
				case "lifecycle": return false;
			}
		};
	})))();
}

//#endregion
//#region dist/domain/process/processCaptureValidation.js
var orderedTimestamps, validateCommitments, validateOrdering, validateEventJournal, finalizationManifestIssue, finalizationAgreementIssue, finalizationConsistencyIssue, validateLifecycle, validateCoverage, collectProcessCaptureIssues;
function init_processCaptureValidation() {
	return (init_processCaptureValidation = __esmMin((() => {
		init_processScenario();
		init_processCaptureCoverage();
		orderedTimestamps = (values) => values.every((value, index) => {
			const previous = values[index - 1];
			return previous === undefined || value >= previous;
		});
		validateCommitments = (capture, require) => {
			const { manifest } = capture;
			require(manifest.scenario.executable_sha256 === manifest.selected_executable_sha256, "manifest.selected_executable_sha256", "selected executable commitment does not match the scenario projection");
			require(manifest.executable_identity.state === "path_metadata_unchanged" ? manifest.executable_sha256 === manifest.selected_executable_sha256 && manifest.executable_identity.reason === null : manifest.executable_sha256 === null && manifest.executable_identity.reason !== null, "manifest.executable_identity", "launch identity and executable digest do not agree");
			for (const [field, value] of [
				["full_scenario_sha256", manifest.scenario],
				["comparison_contract_sha256", manifest.comparison_contract],
				["normalization_sha256", capture.normalization]
			]) require(manifest[field] === digestProcessCommitment(value), `manifest.${field}`, "commitment does not match its canonical value");
		};
		validateOrdering = (capture, require) => {
			for (const [name, values] of [
				["frames", capture.frames],
				["rendered_frames", capture.rendered_frames],
				["interaction_events", capture.interaction_events]
			]) require(values.every(({ sequence }, index) => sequence === index), name, "sequence values must be contiguous from zero");
			for (const [name, values] of [
				["frames", capture.frames],
				["rendered_frames", capture.rendered_frames],
				["process_samples", capture.process_samples]
			]) require(orderedTimestamps(values.map(({ at_ms }) => at_ms)), name, "timestamps must be ordered");
			require(orderedTimestamps(capture.interaction_events.map(({ dispatched_at_ms }) => dispatched_at_ms)), "interaction_events", "dispatch timestamps must be ordered");
		};
		validateEventJournal = (capture, require) => {
			const journal = capture.event_journal;
			if (journal.length === 0) return;
			const sizes = {
				frames: capture.frames.length,
				rendered_frames: capture.rendered_frames.length,
				interaction_events: capture.interaction_events.length,
				lifecycle: 2,
				process_samples: capture.process_samples.length,
				filesystem_checkpoints: capture.filesystem_checkpoints.length
			};
			const references = new Set();
			for (const [position, entry] of journal.entries()) {
				require(entry.capture_order === position, `event_journal.${String(position)}.capture_order`, "capture order must be contiguous from zero");
				require(entry.index < sizes[entry.collection], `event_journal.${String(position)}.index`, "journal reference is outside its capture collection");
				const reference = `${entry.collection}:${String(entry.index)}`;
				require(!references.has(reference), `event_journal.${String(position)}`, "journal references must be unique");
				references.add(reference);
			}
			const expectedSize = Object.values(sizes).reduce((total, size) => total + size, 0);
			require(journal.length === expectedSize, "event_journal", "nonempty journal must reference every captured observation");
		};
		finalizationManifestIssue = (committedScenario, committedComparison) => committedScenario !== undefined && committedComparison !== undefined && committedScenario["finalization_ms"] !== committedComparison["finalization_ms"] ? "comparison_contract finalization_ms must match the committed scenario" : undefined;
		finalizationAgreementIssue = (exitFinalization, observedFinalization) => exitFinalization !== undefined && observedFinalization !== undefined && JSON.stringify(exitFinalization) !== JSON.stringify(observedFinalization) ? "exit finalization and finalization observation must agree" : undefined;
		finalizationConsistencyIssue = (exit, committedScenario, committedComparison, options) => {
			const manifestIssue = finalizationManifestIssue(committedScenario, committedComparison);
			if (manifestIssue !== undefined) return manifestIssue;
			const finalization = exit?.finalization ?? options?.finalization;
			if (finalization === undefined) {
				const committed = committedScenario?.["finalization_ms"];
				return (exit?.reason === "timeout" || exit?.reason === "idle_timeout") && typeof committed === "number" && committed > 0 ? "a deadline exit under a committed finalization_ms requires finalization evidence" : undefined;
			}
			if (exit?.reason === "exited") return "finalization requires a deadline exit reason";
			const first = finalization.signals[0];
			if (first?.signal !== "SIGTERM") return "finalization signals must start with SIGTERM";
			const killIndexes = finalization.signals.flatMap(({ signal }, index) => signal === "SIGKILL" ? [index] : []);
			if (killIndexes.length > 1 || killIndexes[0] !== undefined && killIndexes[0] !== finalization.signals.length - 1) return "finalization may contain at most one final SIGKILL";
			if (!finalization.signals.every(({ sent_at_ms }, index) => {
				const previous = finalization.signals[index - 1];
				return previous === undefined || sent_at_ms >= previous.sent_at_ms;
			})) return "finalization signal attempt times must not decrease";
			if (finalization.signals.filter(({ signal }) => signal === "SIGTERM").length !== 1) return "finalization must attempt SIGTERM exactly once";
			const kill = finalization.signals.find(({ signal }) => signal === "SIGKILL");
			if (kill !== undefined && kill.sent_at_ms < finalization.requested_ms && exit !== undefined && exit.reason !== "cancelled") return "finalization SIGKILL cannot precede the requested interval";
			if (finalization.elapsed_ms === null && options?.allowNullElapsedMs !== true) return "finalization requires an observed elapsed_ms";
			if (finalization.exit_code !== null && exit?.signal !== undefined && exit.signal !== null && exit.signal !== 0) return "finalization exit_code requires an exit not caused by a signal";
			if (finalization.elapsed_ms !== null && finalization.elapsed_ms < (finalization.signals.at(-1)?.sent_at_ms ?? first.sent_at_ms)) return "finalization elapsed_ms cannot precede the last signal attempt";
			if (committedScenario !== undefined && committedScenario["finalization_ms"] !== finalization.requested_ms) return "finalization must match the committed finalization_ms";
			return undefined;
		};
		validateLifecycle = (capture, require) => {
			require(capture.filesystem_checkpoints.map(({ name }) => name).join(",") === "before,after_settlement", "filesystem_checkpoints", "capture must include initial and final filesystem snapshots");
			require(orderedTimestamps(capture.filesystem_checkpoints.map(({ at_ms }) => at_ms)), "filesystem_checkpoints", "filesystem snapshot times must be ordered");
			require(!capture.filesystem_checkpoints.some(({ truncated }) => truncated) || capture.truncated, "truncated", "filesystem snapshot truncation must propagate to the capture");
			require(capture.exit.reason === "exited" || capture.exit.code === null, "exit", "deadline termination cannot declare a normal exit code");
			const finalizationIssue = finalizationConsistencyIssue(capture.exit, capture.manifest.scenario, capture.manifest.comparison_contract);
			require(finalizationIssue === undefined, "exit", finalizationIssue ?? "");
		};
		validateCoverage = (capture, require) => {
			const details = capture.truncation_details;
			require(details.process.retained_samples === capture.process_samples.length && details.process.retained_samples <= details.process.sample_limit && details.process.sampling_partial === (details.process.sample_limit_reached || details.process.sampling_failures > 0) && details.process.sampling_failures === 0 === (details.process.first_sampling_failure === null), "truncation_details.process", "sampling coverage must agree with retained samples and observed failures");
			require(capture.truncated === hasCaptureTruncation(details), "truncation_details", "aggregate truncation must match producer coverage");
			for (const [name, retention, count, bytes] of [[
				"raw_terminal",
				details.raw_terminal,
				capture.frames.length,
				capture.frames.reduce((total, frame) => total + Buffer.byteLength(frame.raw_data ?? frame.data), 0)
			], [
				"rendered_terminal",
				details.rendered_terminal,
				capture.rendered_frames.length,
				capture.rendered_frames.reduce((total, frame) => frame.lines.reduce((sum, line) => sum + Buffer.byteLength(line), total + Buffer.byteLength(frame.serialized_state)), 0)
			]]) {
				require(retention.retained_frames === count && retention.observed_frames >= count && retention.retained_bytes === bytes && retention.observed_bytes >= retention.retained_bytes && (retention.observed_frames > count || retention.observed_bytes === retention.retained_bytes) && retention.retained_bytes <= retention.budget_bytes && (retention.unknown_size_frames ?? 0) <= retention.observed_frames - retention.retained_frames, `truncation_details.${name}`, "retained observations and budget accounting do not agree");
			}
			const normalized = details.normalized_terminal;
			if (normalized !== undefined) {
				const committedOutputBudget = processScenarioOutputBudgetProjectionSchema.safeParse(capture.manifest.scenario["limits"]);
				require(committedOutputBudget.success, "manifest.scenario.limits.output_bytes", "committed process scenario must include an explicit valid output_bytes budget");
				const retainedBytes = capture.frames.reduce((total, frame) => total + Buffer.byteLength(frame.data), 0);
				if (committedOutputBudget.success) require(normalized.budget_bytes === committedOutputBudget.data.output_bytes && normalized.retained_bytes === retainedBytes && normalized.retained_bytes <= normalized.budget_bytes && normalized.omitted_frames <= details.raw_terminal.observed_frames - details.raw_terminal.retained_frames, "truncation_details.normalized_terminal", "normalized terminal retention must agree with the committed budget and retained frames");
			}
			for (const [name, coverage, files, checkpoint] of [[
				"filesystem_before",
				details.filesystem_before,
				capture.files_before,
				capture.filesystem_checkpoints[0]
			], [
				"filesystem_after",
				details.filesystem_after,
				capture.files_after,
				capture.filesystem_checkpoints[1]
			]]) {
				const unhashedFiles = new Map(files.filter((file) => file.type === "file" && file.sha256 === null).map((file) => [file.path, file]));
				const entryTypes = new Map(files.map(({ path, type }) => [path, type]));
				require(coverage.hash_omissions.length === unhashedFiles.size && new Set(coverage.hash_omissions.map(({ path }) => path)).size === unhashedFiles.size && coverage.hash_omissions.every((omission) => unhashedFiles.get(omission.path)?.size === omission.size_bytes && omission.remaining_budget_bytes <= coverage.hash_budget_bytes && (omission.reason === "file_unavailable" ? omission.system_code !== null : omission.system_code === null)), `truncation_details.${name}.hash_omissions`, "every retained regular file without a digest must have one matching omission reason");
				require(new Set(coverage.enumeration_omissions.map(({ path }) => path)).size === coverage.enumeration_omissions.length && (!coverage.enumeration_reasons.includes("entry_unavailable") || coverage.enumeration_omissions.some(({ reason }) => reason === "entry_unavailable")) && coverage.enumeration_omissions.every((omission) => coverage.enumeration_reasons.includes(omission.reason) && (omission.reason === "directory_unavailable" ? entryTypes.get(omission.path) === "directory" && omission.system_code !== null : (entryTypes.get(omission.path) === undefined || entryTypes.get(omission.path) === "directory") && (omission.reason === "entry_unavailable" ? omission.system_code !== null : omission.system_code === null))), `truncation_details.${name}.enumeration_omissions`, "every enumeration omission must identify an unavailable entry or retained directory, with a matching reason and system error only for unavailable reads");
				require(coverage.hashed_bytes === files.filter((file) => file.type === "file" && file.sha256 !== null).reduce((sum, file) => sum + file.size, 0) && coverage.hashed_bytes <= coverage.hash_budget_bytes && files.length <= coverage.files_limit, `truncation_details.${name}`, "filesystem budget accounting does not match retained observations");
				require(coverage.enumeration_truncated === coverage.enumeration_reasons.length > 0 && checkpoint?.truncated === (coverage.enumeration_truncated || coverage.enumeration_omissions.length > 0 || coverage.hash_omissions.length > 0), `truncation_details.${name}`, "filesystem checkpoint truncation must match enumeration and digest coverage");
			}
		};
		collectProcessCaptureIssues = (capture) => {
			const issues = [];
			const require = (condition, path, message) => {
				if (!condition) issues.push({
					path,
					message
				});
			};
			validateCommitments(capture, require);
			validateOrdering(capture, require);
			validateEventJournal(capture, require);
			validateLifecycle(capture, require);
			validateCoverage(capture, require);
			return issues;
		};
	})))();
}

//#endregion
//#region dist/domain/process/processCapture.js
var PROCESS_CAPTURE_EVENT_COLLECTIONS, fileStateShape, fileStateSchema, processFilesystemSnapshotSchema, fileEffectSchema, processSettlementSchema, unverifiedCleanupProcessesSchema, processCaptureFinalizationSchema, processCaptureShapeSchema, processCleanupResourceSchema, partialObservationFieldSchema, incompleteProcessCaptureObservationsSchema, partialCleanupReportSchema, partialObservationMetadataSchema, completedCaptureObservationSchema, incompleteCaptureObservationSchema, partialProcessCaptureObservationSchema, processCaptureSchema;
function init_processCapture() {
	return (init_processCapture = __esmMin((() => {
		init_jsonValue();
		init_processScenario();
		init_processCaptureValidation();
		init_processCaptureCoverage();
		PROCESS_CAPTURE_EVENT_COLLECTIONS = [
			"frames",
			"rendered_frames",
			"interaction_events",
			"lifecycle",
			"process_samples",
			"filesystem_checkpoints"
		];
		fileStateShape = {
			path: z.string(),
			mode: z.number().int().nonnegative(),
			size: z.number().int().nonnegative()
		};
		fileStateSchema = z.discriminatedUnion("type", [
			z.object({
				...fileStateShape,
				type: z.literal("file"),
				sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
				symlink_target: z.null()
			}),
			z.object({
				...fileStateShape,
				type: z.literal("symlink"),
				sha256: z.null(),
				symlink_target: z.string()
			}),
			z.object({
				...fileStateShape,
				type: z.enum(["directory", "other"]),
				sha256: z.null(),
				symlink_target: z.null()
			})
		]);
		processFilesystemSnapshotSchema = z.strictObject({
			files: z.array(fileStateSchema),
			truncated: z.boolean(),
			completeRoots: z.array(z.string()),
			coverage: filesystemCoverageSchema
		});
		fileEffectSchema = z.discriminatedUnion("status", [
			z.object({
				path: z.string(),
				status: z.literal("created"),
				before: z.null(),
				after: fileStateSchema
			}),
			z.object({
				path: z.string(),
				status: z.literal("deleted"),
				before: fileStateSchema,
				after: z.null()
			}),
			z.object({
				path: z.string(),
				status: z.enum(["modified", "unchanged"]),
				before: fileStateSchema,
				after: fileStateSchema
			}),
			z.object({
				path: z.string(),
				status: z.literal("unknown"),
				before: fileStateSchema.nullable(),
				after: fileStateSchema.nullable(),
				reason: z.string().min(1)
			})
		]);
		processSettlementSchema = z.discriminatedUnion("state", [z.object({
			state: z.literal("quiesced"),
			elapsed_ms: z.number().int().nonnegative(),
			cleanup_outcome: z.enum(["not_required", "failed"])
		}), z.object({
			state: z.enum(["alive_at_deadline", "unverifiable"]),
			elapsed_ms: z.number().int().nonnegative(),
			cleanup_outcome: z.enum(["cleaned", "failed"])
		})]);
		unverifiedCleanupProcessesSchema = z.array(z.strictObject({
			pid: z.number().int().positive(),
			reason: z.string()
		}));
		processCaptureFinalizationSchema = z.strictObject({
			requested_ms: z.number().int().safe().positive(),
			elapsed_ms: z.number().int().nonnegative().nullable(),
			exit_code: z.number().int().nonnegative().nullable(),
			signals: z.array(z.strictObject({
				signal: z.enum(["SIGTERM", "SIGKILL"]),
				sent_at_ms: z.number().int().nonnegative(),
				delivery: z.enum([
					"signaled",
					"gone",
					"identity-changed",
					"unverified"
				]),
				reason: z.string().min(1).optional()
			})).min(1)
		}).superRefine((finalization, context) => {
			if (finalization.exit_code !== null && finalization.elapsed_ms === null) context.addIssue({
				code: "custom",
				path: ["exit_code"],
				message: "finalization exit_code requires an observed exit"
			});
			for (const [index, attempt] of finalization.signals.entries()) if (attempt.reason !== undefined && attempt.delivery !== "unverified") context.addIssue({
				code: "custom",
				path: [
					"signals",
					index,
					"reason"
				],
				message: "finalization reason is only allowed for an unverified delivery"
			});
		});
		processCaptureShapeSchema = z.strictObject({
			manifest: z.strictObject({
				rea_version: z.string().min(1),
				provider_version: z.string().min(1),
				platform: z.string().min(1),
				architecture: z.string().min(1),
				pty_backend: z.literal("node-pty"),
				started_at: z.iso.datetime(),
				completed_at: z.iso.datetime(),
				scenario: z.record(z.string(), jsonValueSchema),
				comparison_contract: z.record(z.string(), jsonValueSchema),
				full_scenario_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
				comparison_contract_sha256: z.string().regex(/^[a-f0-9]{64}$/u),
				selected_executable_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
				executable_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
				executable_identity: z.strictObject({
					state: z.enum(["path_metadata_unchanged", "unknown"]),
					reason: z.string().nullable()
				}),
				normalization_sha256: z.string().regex(/^[a-f0-9]{64}$/u)
			}),
			normalization: normalizationSchema,
			frames: z.array(z.object({
				sequence: z.number().int().nonnegative(),
				at_ms: z.number().int().nonnegative(),
				data: z.string(),
				raw_data: z.string().optional()
			})),
			rendered_frames: z.array(z.object({
				sequence: z.number().int().nonnegative(),
				at_ms: z.number().int().nonnegative(),
				columns: z.number().int().positive(),
				rows: z.number().int().positive(),
				cursor_x: z.number().int().nonnegative(),
				cursor_y: z.number().int().nonnegative(),
				active_buffer: z.enum(["normal", "alternate"]),
				lines: z.array(z.string()),
				serialized_state: z.string()
			})),
			interaction_events: z.array(z.object({
				sequence: z.number().int().nonnegative(),
				scheduled_at_ms: z.number().int().nonnegative(),
				dispatched_at_ms: z.number().int().nonnegative(),
				type: z.enum([
					"input",
					"resize",
					"signal"
				]),
				data: z.string(),
				outcome: z.enum([
					"dispatched",
					"target_exited",
					"failed"
				])
			})),
			exit: z.object({
				code: z.number().int().nullable(),
				signal: z.number().int().nullable(),
				reason: z.enum([
					"exited",
					"timeout",
					"idle_timeout"
				]),
				finalization: processCaptureFinalizationSchema.optional()
			}),
			settlement: z.discriminatedUnion("state", [z.object({
				state: z.literal("quiesced"),
				elapsed_ms: z.number().int().nonnegative(),
				cleanup_outcome: z.literal("not_required")
			}), z.object({
				state: z.enum(["alive_at_deadline", "unverifiable"]),
				elapsed_ms: z.number().int().nonnegative(),
				cleanup_outcome: z.enum(["cleaned", "failed"])
			})]),
			process_samples: z.array(z.object({
				at_ms: z.number().int().nonnegative(),
				pid: z.number().int().positive(),
				parent_pid: z.number().int().nonnegative(),
				command: z.string(),
				process_group_id: z.number().int().positive().nullable(),
				session_id: z.number().int().nonnegative().nullable()
			})),
			filesystem_checkpoints: z.array(z.object({
				name: z.enum(["before", "after_settlement"]),
				at_ms: z.number().int().nonnegative(),
				files: z.array(fileStateSchema),
				effects: z.array(fileEffectSchema),
				truncated: z.boolean()
			})),
			event_journal: z.array(z.object({
				capture_order: z.number().int().nonnegative(),
				collection: z.enum(PROCESS_CAPTURE_EVENT_COLLECTIONS),
				index: z.number().int().nonnegative()
			})),
			files_before: z.array(fileStateSchema),
			files_after: z.array(fileStateSchema),
			filesystem_effects: z.array(fileEffectSchema),
			truncated: z.boolean(),
			truncation_details: processCaptureTruncationDetailsSchema,
			limitations: z.array(z.string()),
			residual_unknowns: z.array(z.object({
				scope: z.enum([
					"terminal",
					"interaction",
					"exit",
					"process",
					"filesystem",
					"cleanup",
					"network",
					"environment"
				]),
				reason: z.string()
			})),
			cleanup: z.object({
				owned_process_group: z.literal("verified"),
				temporary_root: z.literal("removed"),
				unverified_processes: unverifiedCleanupProcessesSchema.optional()
			})
		});
		processCleanupResourceSchema = z.strictObject({
			state: z.enum([
				"cleaned",
				"failed",
				"unverified",
				"not_required"
			]),
			reason: z.string().nullable(),
			unverified_processes: unverifiedCleanupProcessesSchema.optional()
		});
		partialObservationFieldSchema = (value) => z.discriminatedUnion("state", [z.strictObject({
			state: z.literal("available"),
			value
		}), z.strictObject({
			state: z.literal("unavailable"),
			reason: z.string()
		})]);
		incompleteProcessCaptureObservationsSchema = z.strictObject({
			target_pid: partialObservationFieldSchema(z.number().int().positive()),
			frames: partialObservationFieldSchema(processCaptureShapeSchema.shape.frames),
			rendered_frames: partialObservationFieldSchema(processCaptureShapeSchema.shape.rendered_frames),
			interaction_events: partialObservationFieldSchema(processCaptureShapeSchema.shape.interaction_events),
			exit: partialObservationFieldSchema(z.strictObject({
				code: z.number().int().nullable(),
				signal: z.number().int().nullable(),
				reason: z.enum([
					"exited",
					"timeout",
					"idle_timeout",
					"cancelled"
				]),
				finalization: processCaptureFinalizationSchema.optional()
			})),
			finalization: partialObservationFieldSchema(processCaptureFinalizationSchema).optional(),
			settlement: partialObservationFieldSchema(z.strictObject({
				state: z.enum([
					"quiesced",
					"alive_at_deadline",
					"unverifiable"
				]),
				elapsed_ms: z.number().int().nonnegative()
			})),
			process_samples: partialObservationFieldSchema(processCaptureShapeSchema.shape.process_samples),
			filesystem_snapshots: z.strictObject({
				before: partialObservationFieldSchema(processFilesystemSnapshotSchema),
				after: partialObservationFieldSchema(processFilesystemSnapshotSchema)
			}),
			event_journal: partialObservationFieldSchema(processCaptureShapeSchema.shape.event_journal),
			manifest: partialObservationFieldSchema(processCaptureShapeSchema.shape.manifest)
		});
		partialCleanupReportSchema = z.strictObject({
			owned_process_group: processCleanupResourceSchema,
			terminal_renderer: processCleanupResourceSchema,
			temporary_root: processCleanupResourceSchema
		});
		partialObservationMetadataSchema = z.strictObject({
			cleanup: partialCleanupReportSchema,
			execution_failure: z.string().nullable()
		});
		completedCaptureObservationSchema = z.strictObject({ capture: processCaptureShapeSchema.omit({ cleanup: true }).extend({ settlement: processSettlementSchema }) });
		incompleteCaptureObservationSchema = z.strictObject({ observations: incompleteProcessCaptureObservationsSchema });
		partialProcessCaptureObservationSchema = z.union([completedCaptureObservationSchema.extend(partialObservationMetadataSchema.shape), incompleteCaptureObservationSchema.extend(partialObservationMetadataSchema.shape)]).superRefine((partial, context) => {
			const cleanupIncomplete = Object.values(partial.cleanup).some(({ state }) => state === "failed" || state === "unverified");
			if (!cleanupIncomplete && partial.execution_failure === null) context.addIssue({
				code: "custom",
				path: ["execution_failure"],
				message: "partial observations require incomplete cleanup or an execution failure"
			});
			const observedExit = "capture" in partial ? partial.capture.exit : partial.observations.exit.state === "available" ? partial.observations.exit.value : undefined;
			const observedFinalization = "observations" in partial && partial.observations.finalization?.state === "available" ? partial.observations.finalization.value : undefined;
			const committedManifest = "capture" in partial ? partial.capture.manifest : partial.observations.manifest.state === "available" ? partial.observations.manifest.value : undefined;
			const manifestFinalizationIssue = finalizationManifestIssue(committedManifest?.scenario, committedManifest?.comparison_contract);
			const exitFinalizationIssue = manifestFinalizationIssue ?? (observedExit === undefined ? undefined : finalizationConsistencyIssue(observedExit, committedManifest?.scenario, committedManifest?.comparison_contract));
			const incompleteFinalizationIssue = manifestFinalizationIssue ?? (observedFinalization === undefined ? undefined : finalizationConsistencyIssue(observedExit === undefined ? undefined : {
				reason: observedExit.reason,
				signal: observedExit.signal
			}, committedManifest?.scenario, committedManifest?.comparison_contract, {
				finalization: observedFinalization,
				allowNullElapsedMs: true
			}));
			if (exitFinalizationIssue !== undefined) context.addIssue({
				code: "custom",
				path: ["exit"],
				message: exitFinalizationIssue
			});
			if (incompleteFinalizationIssue !== undefined) context.addIssue({
				code: "custom",
				path: ["finalization"],
				message: incompleteFinalizationIssue
			});
			const agreementIssue = finalizationAgreementIssue(observedExit?.finalization, observedFinalization);
			if (agreementIssue !== undefined) context.addIssue({
				code: "custom",
				path: ["finalization"],
				message: agreementIssue
			});
			if ("observations" in partial && partial.observations.exit.state === "unavailable" && observedFinalization !== undefined && observedFinalization?.elapsed_ms !== null) context.addIssue({
				code: "custom",
				path: ["finalization"],
				message: "finalization elapsed_ms must be null when the exit observation is unavailable"
			});
			if ("observations" in partial) {
				const { observations } = partial;
				if (![
					observations.frames,
					observations.interaction_events,
					observations.process_samples,
					observations.filesystem_snapshots.before,
					observations.event_journal
				].some(({ state }) => state === "available")) context.addIssue({
					code: "custom",
					path: ["observations"],
					message: "incomplete observations contain no collected evidence"
				});
				return;
			}
			const { capture } = partial;
			const settlement = capture.settlement.state === "quiesced" ? {
				...capture.settlement,
				cleanup_outcome: "not_required"
			} : {
				...capture.settlement,
				cleanup_outcome: "cleaned"
			};
			const validationCapture = {
				...capture,
				settlement,
				cleanup: {
					owned_process_group: "verified",
					temporary_root: "removed"
				}
			};
			for (const issue of collectProcessCaptureIssues(validationCapture)) context.addIssue({
				code: "custom",
				path: ["capture", ...issue.path.split(".")],
				message: issue.message
			});
		});
		processCaptureSchema = processCaptureShapeSchema.superRefine((capture, context) => {
			if (capture.settlement.cleanup_outcome === "failed") context.addIssue({
				code: "custom",
				path: ["settlement", "cleanup_outcome"],
				message: "verified captures cannot contain failed cleanup"
			});
			for (const issue of collectProcessCaptureIssues(capture)) context.addIssue({
				code: "custom",
				path: issue.path.split("."),
				message: issue.message
			});
		}).describe("The capture must preserve its canonical scenario, comparison, and normalization SHA-256 commitments; ordered capture timestamps and contiguous sequence numbers; before and final filesystem snapshots with truncation propagated; and exit-code consistency with deadline termination. The event journal is required; empty journals are valid. A non-empty journal must reference every captured observation exactly once with unique in-range references. These cross-field invariants are checked by REA after capture.");
	})))();
}

//#endregion
//#region dist/domain/process/processCaptureParsing.js
var verifiedCaptures, isVerifiedCapture, attachProof, parseProcessCapture;
function init_processCaptureParsing() {
	return (init_processCaptureParsing = __esmMin((() => {
		init_processCapture();
		verifiedCaptures = new WeakSet();
		isVerifiedCapture = (capture) => verifiedCaptures.has(capture);
		attachProof = (capture) => {
			verifiedCaptures.add(capture);
			if (isVerifiedCapture(capture)) return capture;
			throw new TypeError("Process Capture proof ownership failed");
		};
		parseProcessCapture = (input) => attachProof(processCaptureSchema.parse(input));
	})))();
}

//#endregion
//#region dist/domain/functionComparisonNormalization.js
var identityProjection, functionMatch, normalizeCfg, commentProjection, stringAndNameProjection, swiftLiteralSitesConflict, swiftLiteralSites, sorted, isAutoName, parseAddress, relativeAddress;
function init_functionComparisonNormalization() {
	return (init_functionComparisonNormalization = __esmMin((() => {
		init_comparisonSemantics();
		init_unicodeCodePointOrder();
		identityProjection = (snapshot) => ({
			name: snapshot.dossier.procedure.name,
			signature: snapshot.dossier.procedure.signature,
			locals: snapshot.dossier.procedure.locals.map(({ description }) => description).sort()
		});
		functionMatch = (left, right) => {
			const leftName = left.dossier.procedure.name;
			const rightName = right.dossier.procedure.name;
			const stableNames = !isAutoName(leftName) && !isAutoName(rightName);
			if (stableNames && leftName === rightName) return {
				status: "matched",
				method: "symbol",
				left_name: leftName,
				right_name: rightName
			};
			return {
				status: stableNames ? "mismatched" : "ambiguous",
				method: "explicit",
				left_name: leftName,
				right_name: rightName
			};
		};
		normalizeCfg = (blocks) => {
			const parsed = [];
			for (const block of blocks) {
				const start = parseAddress(block.start);
				const end = parseAddress(block.end);
				if (start === null || end === null || end <= start) return null;
				parsed.push({
					block,
					start,
					end
				});
			}
			const ordered = parsed.sort((left, right) => left.start < right.start ? -1 : left.start > right.start ? 1 : 0);
			if (new Set(ordered.map(({ start }) => start)).size !== ordered.length) return null;
			const indices = new Map(ordered.map(({ start }, index) => [start, index]));
			const graph = [];
			for (const { block, start, end } of ordered) {
				const successors = [];
				for (const address of block.successors) {
					const parsedAddress = parseAddress(address);
					if (parsedAddress === null) return null;
					const index = indices.get(parsedAddress);
					if (index === undefined) return null;
					successors.push(index);
				}
				graph.push({
					size: String(end - start),
					successors: successors.sort((left, right) => left - right)
				});
			}
			return graph;
		};
		commentProjection = (snapshot) => {
			const values = snapshot.dossier.comments.map(({ address, kind, text }) => ({
				offset: relativeAddress(address, snapshot.dossier.procedure.address),
				kind,
				text
			}));
			return values.some(({ offset }) => offset === null) ? null : sorted(values);
		};
		stringAndNameProjection = (snapshot, includeSwiftLiterals = true) => {
			const values = [
				...snapshot.dossier.referenced_strings.map(({ source_address: sourceAddress, value }) => ({
					kind: "string",
					source_offset: relativeAddress(sourceAddress, snapshot.dossier.procedure.address),
					value
				})),
				...snapshot.dossier.referenced_names.map(({ source_address: sourceAddress, value }) => ({
					kind: "name",
					source_offset: relativeAddress(sourceAddress, snapshot.dossier.procedure.address),
					value
				})),
				...(includeSwiftLiterals ? snapshot.dossier.swift_string_literals ?? [] : []).map(({ source_address: sourceAddress, value, representation, registers }) => ({
					kind: "swift_string",
					source_offset: relativeAddress(sourceAddress, snapshot.dossier.procedure.address),
					value,
					representation,
					registers
				}))
			];
			return values.some(({ source_offset: offset }) => offset === null) ? null : sorted(values);
		};
		swiftLiteralSitesConflict = (left, right) => {
			const leftSites = swiftLiteralSites(left);
			const rightSites = swiftLiteralSites(right);
			for (const site of new Set([...leftSites.values.keys(), ...rightSites.values.keys()])) {
				const leftValues = leftSites.values.get(site) ?? (leftSites.complete ? [] : undefined);
				const rightValues = rightSites.values.get(site) ?? (rightSites.complete ? [] : undefined);
				if (leftValues === undefined || rightValues === undefined) continue;
				const leftFacts = new Set(leftValues);
				const rightFacts = new Set(rightValues);
				if (rightSites.complete && leftValues.some((value) => !rightFacts.has(value)) || leftSites.complete && rightValues.some((value) => !leftFacts.has(value))) return true;
			}
			return false;
		};
		swiftLiteralSites = (snapshot) => {
			const base = snapshot.dossier.procedure.address;
			const omissions = snapshot.dossier.swift_string_literal_omissions ?? [];
			const site = (sourceAddress, registers) => {
				const offset = relativeAddress(sourceAddress, base);
				return offset === null ? null : canonicalJson([offset, registers]);
			};
			const values = new Map();
			for (const literal of snapshot.dossier.swift_string_literals ?? []) {
				const key = site(literal.source_address, literal.registers);
				if (key === null) continue;
				values.set(key, [...values.get(key) ?? [], canonicalJson([literal.value, literal.representation])].sort(compareUnicodeCodePoints));
			}
			const complete = snapshot.dossier.swift_string_literals !== undefined && omissions.length === 0;
			return {
				values,
				complete
			};
		};
		sorted = (values) => values.map((value) => ({
			value,
			json: canonicalJson(value, "Function normalization")
		})).sort((left, right) => compareUnicodeCodePoints(left.json, right.json)).map(({ value }) => value);
		isAutoName = (name) => /^(?:sub_[0-9a-f]+|fcn\.[0-9a-f]+|FUN_[0-9a-f]+)$/iu.test(name);
		parseAddress = (value) => /^0x[0-9a-f]+$/iu.test(value) ? BigInt(value) : null;
		relativeAddress = (value, base) => {
			const parsed = parseAddress(value);
			const parsedBase = parseAddress(base);
			return parsed === null || parsedBase === null || parsed < parsedBase ? null : String(parsed - parsedBase);
		};
	})))();
}

//#endregion
//#region dist/domain/functionCallCoverage.js
var callerCoveragePrefix, calleeCoveragePrefix, combineFunctionRelationshipCoverage, isCallerOnlyIncompleteCoverage, assessFunctionCallCoverage;
function init_functionCallCoverage() {
	return (init_functionCallCoverage = __esmMin((() => {
		init_relationshipCoverage();
		init_canonicalOrdering();
		callerCoveragePrefix = "Callers: ";
		calleeCoveragePrefix = "Callees: ";
		combineFunctionRelationshipCoverage = (callers, callees) => {
			const reads = [{
				direction: "callers",
				coverage: callers
			}, {
				direction: "callees",
				coverage: callees
			}];
			const diagnostics = uniqueSorted$1(reads.flatMap(({ coverage }) => coverage?.diagnostics ?? []));
			const details = diagnostics.length > 0 ? { diagnostics } : {};
			const callersLimited = callers?.status !== "complete";
			const calleesLimited = callees?.status !== "complete";
			const limited_directions = callersLimited ? calleesLimited ? ["callers", "callees"] : ["callers"] : ["callees"];
			const reasons = reads.flatMap(({ direction, coverage }) => {
				const label = direction === "callers" ? callerCoveragePrefix : calleeCoveragePrefix;
				return relationshipCoverageLimitations(coverage).map((reason) => `${label}${reason}`);
			});
			if (reads.some(({ coverage }) => coverage === undefined || coverage.status === "unknown")) return {
				status: "unknown",
				reason: uniqueSorted$1(reasons).join(" "),
				limited_directions,
				...details
			};
			if (reasons.length > 0) return {
				status: "partial",
				limitations: uniqueSorted$1(reasons),
				limited_directions,
				...details
			};
			return {
				status: "complete",
				...details
			};
		};
		isCallerOnlyIncompleteCoverage = (coverage) => {
			if (coverage.status === "complete") return false;
			if (coverage.limited_directions !== undefined) return !coverage.limited_directions.some((direction) => direction === "callees");
			return coverage.status === "unknown" && coverage.reason.startsWith(callerCoveragePrefix) && !coverage.reason.includes(calleeCoveragePrefix);
		};
		assessFunctionCallCoverage = (coverage, dossier) => ({
			blockers: uniqueSorted$1([...relationshipCoverageLimitations(coverage), ...(dossier.unresolved_calls ?? []).map(({ address, reason }) => `Unresolved call at ${address}: ${reason}`)]),
			diagnostics: uniqueSorted$1(coverage?.diagnostics ?? [])
		});
	})))();
}

//#endregion
//#region dist/contracts/providerSelection.js
var analysisProviderIdSchema, analysisProviderSelectorSchema, PROVIDER_REJECTION_CODES;
function init_providerSelection() {
	return (init_providerSelection = __esmMin((() => {
		analysisProviderIdSchema = z.string().min(1).regex(/^[a-z][a-z0-9\x2d]*$/u).refine((value) => value !== "auto", { message: "auto is reserved for provider selection" });
		analysisProviderSelectorSchema = z.union([z.literal("auto"), analysisProviderIdSchema]);
		PROVIDER_REJECTION_CODES = [
			"not_configured",
			"executable_missing",
			"runtime_missing",
			"runtime_unavailable",
			"unsupported_host",
			"unsupported_version",
			"target_kind_unsupported",
			"target_format_unsupported",
			"architecture_unsupported",
			"target_role_unsupported",
			"managed_target_unsupported",
			"open_options_invalid",
			"version_unresolved"
		];
	})))();
}

//#endregion
//#region dist/domain/zipPackageFormat.js
var ZIP_PACKAGE_FORMATS, isZipPackageFormat, hasZipSignature, END_OF_CENTRAL_DIRECTORY, CENTRAL_DIRECTORY_HEADER, LOCAL_FILE_HEADER, END_RECORD_BYTES, MAXIMUM_COMMENT_BYTES, CENTRAL_HEADER_BYTES, locateTrailingZipArchive, zipPackageFormatForPath, zipRootPackageFormat, ZIP_NON_ENTRY_LIMITATION;
function init_zipPackageFormat() {
	return (init_zipPackageFormat = __esmMin((() => {
		ZIP_PACKAGE_FORMATS = [
			"zip",
			"ipa",
			"apk",
			"msix",
			"appx",
			"hap",
			"hsp",
			"app-pack"
		];
		isZipPackageFormat = (format) => ZIP_PACKAGE_FORMATS.some((candidate) => candidate === format);
		hasZipSignature = (bytes) => bytes.length >= 4 && bytes[0] === 80 && bytes[1] === 75 && (bytes[2] === 3 && bytes[3] === 4 || bytes[2] === 5 && bytes[3] === 6 || bytes[2] === 7 && bytes[3] === 8);
		END_OF_CENTRAL_DIRECTORY = 101010256;
		CENTRAL_DIRECTORY_HEADER = 33639248;
		LOCAL_FILE_HEADER = 67324752;
		END_RECORD_BYTES = 22;
		MAXIMUM_COMMENT_BYTES = 65535;
		CENTRAL_HEADER_BYTES = 46;
		locateTrailingZipArchive = async (size, read) => {
			if (!Number.isSafeInteger(size) || size < END_RECORD_BYTES) return undefined;
			const tailStart = Math.max(0, size - END_RECORD_BYTES - MAXIMUM_COMMENT_BYTES);
			const tail = Buffer.from(await read(tailStart, size - tailStart));
			if (tail.length !== size - tailStart) return undefined;
			let record = -1;
			for (let at = tail.length - END_RECORD_BYTES; at >= 0; at -= 1) if (tail.readUInt32LE(at) === END_OF_CENTRAL_DIRECTORY && at + END_RECORD_BYTES + tail.readUInt16LE(at + 20) === tail.length) {
				record = at;
				break;
			}
			if (record < 0) return undefined;
			const entriesOnDisk = tail.readUInt16LE(record + 8);
			const directoryBytes = tail.readUInt32LE(record + 12);
			const declaredDirectory = tail.readUInt32LE(record + 16);
			if (tail.readUInt16LE(record + 4) !== 0 || tail.readUInt16LE(record + 6) !== 0 || entriesOnDisk === 0 || entriesOnDisk === 65535 || entriesOnDisk !== tail.readUInt16LE(record + 10) || directoryBytes === 4294967295 || declaredDirectory === 4294967295) return undefined;
			const directory = tailStart + record - directoryBytes;
			const shift = directory - declaredDirectory;
			if (directory < 0 || shift < 0) return undefined;
			const header = Buffer.from(await read(directory, CENTRAL_HEADER_BYTES));
			if (header.length !== CENTRAL_HEADER_BYTES || header.readUInt32LE(0) !== CENTRAL_DIRECTORY_HEADER) return undefined;
			const firstLocal = header.readUInt32LE(42) + shift;
			if (firstLocal === 0 || firstLocal >= directory) return undefined;
			const local = Buffer.from(await read(firstLocal, 4));
			return local.length === 4 && local.readUInt32LE(0) === LOCAL_FILE_HEADER ? { leadingBytes: firstLocal } : undefined;
		};
		zipPackageFormatForPath = (path) => {
			const lower = path.toLowerCase();
			if (lower.endsWith(".zip")) return "zip";
			if (lower.endsWith(".ipa")) return "ipa";
			if (lower.endsWith(".apk")) return "apk";
			if (lower.endsWith(".msix") || lower.endsWith(".msixbundle")) return "msix";
			if (lower.endsWith(".appx") || lower.endsWith(".appxbundle")) return "appx";
			if (lower.endsWith(".hap")) return "hap";
			if (lower.endsWith(".hsp")) return "hsp";
			return undefined;
		};
		zipRootPackageFormat = (path) => {
			const lower = path.toLowerCase();
			return lower.endsWith(".app") ? "app-pack" : zipPackageFormatForPath(lower) ?? "zip";
		};
		ZIP_NON_ENTRY_LIMITATION = "ZIP inventory lists central-directory entries only. Non-entry bytes, including leading bytes before the first entry such as a self-extractor stub, an APK Signing Block before the central directory or a ZIP comment after it, are not occurrences.";
	})))();
}

//#endregion
//#region dist/config/mcpInputSchemaProfile.js
var COMPACT_INPUT_SCHEMA_BUDGET_BYTES, mcpInputSchemaProfileSchema, resolveMcpInputSchemaProfile, compactPresentationForMcpInputSchemaProfile, profileConstraint$1, parseMcpInputSchemaProfile;
function init_mcpInputSchemaProfile() {
	return (init_mcpInputSchemaProfile = __esmMin((() => {
		init_configurationErrors();
		init_result();
		COMPACT_INPUT_SCHEMA_BUDGET_BYTES = 13 * 1024;
		mcpInputSchemaProfileSchema = z.enum(["full", "compact"]);
		resolveMcpInputSchemaProfile = (profile) => profile ?? "compact";
		compactPresentationForMcpInputSchemaProfile = (profile) => resolveMcpInputSchemaProfile(profile) === "full" ? undefined : { budgetBytes: COMPACT_INPUT_SCHEMA_BUDGET_BYTES };
		profileConstraint$1 = "REA_MCP_INPUT_SCHEMA_PROFILE must be \"compact\" (default) or \"full\". The compact profile advertises bounded input schemas with fewer nested annotations; full preserves complete advertised input guidance.";
		parseMcpInputSchemaProfile = (value) => {
			if (value === undefined) return ok(undefined);
			const parsed = mcpInputSchemaProfileSchema.safeParse(value);
			return parsed.success ? ok(parsed.data) : err(new ConfigurationError(profileConstraint$1, { settings: [{
				setting: "REA_MCP_INPUT_SCHEMA_PROFILE",
				constraint: profileConstraint$1
			}] }));
		};
	})))();
}

//#endregion
//#region dist/config/mcpOutputSchemaProfile.js
var mcpOutputSchemaProfileSchema, profileConstraint, parseMcpOutputSchemaProfile;
function init_mcpOutputSchemaProfile() {
	return (init_mcpOutputSchemaProfile = __esmMin((() => {
		init_configurationErrors();
		init_result();
		mcpOutputSchemaProfileSchema = z.enum(["full", "off"]);
		profileConstraint = "REA_MCP_OUTPUT_SCHEMA_PROFILE must be \"full\" (default) or \"off\". The off profile omits output schemas from tools/list while REA validates every successful result against its canonical tool contract and returns complete structured content.";
		parseMcpOutputSchemaProfile = (value) => {
			if (value === undefined) return ok(undefined);
			const parsed = mcpOutputSchemaProfileSchema.safeParse(value);
			return parsed.success ? ok(parsed.data) : err(new ConfigurationError(profileConstraint, { settings: [{
				setting: "REA_MCP_OUTPUT_SCHEMA_PROFILE",
				constraint: profileConstraint
			}] }));
		};
	})))();
}

//#endregion
//#region dist/domain/nativeConvention.js
var foldSegment, REACT_NATIVE_SEGMENTS, FLUTTER_SEGMENTS, UNITY_SEGMENTS, DESKTOP_IL2CPP_LIBRARIES, nativeRuntimeConvention, isSwiftRuntimeLibrary, desktopPathConventions;
function init_nativeConvention() {
	return (init_nativeConvention = __esmMin((() => {
		foldSegment = (segment) => segment.toLocaleLowerCase("en-US");
		REACT_NATIVE_SEGMENTS = new Set([
			"react.framework",
			"reactnative.framework",
			"libreactnative.so",
			"libreactnativejni.so",
			"libhermes_executor.so",
			"libhermes.so",
			"hermes.framework"
		]);
		FLUTTER_SEGMENTS = new Set(["libflutter.so", "flutter.framework"]);
		UNITY_SEGMENTS = new Set(["libunity.so", "unityframework.framework"]);
		DESKTOP_IL2CPP_LIBRARIES = new Set([
			"gameassembly.dll",
			"gameassembly.so",
			"gameassembly.dylib",
			"libil2cpp.so"
		]);
		nativeRuntimeConvention = (path) => {
			for (const segment of path.split("/")) {
				const folded = foldSegment(segment);
				if (REACT_NATIVE_SEGMENTS.has(folded)) return "react-native";
				if (FLUTTER_SEGMENTS.has(folded)) return "flutter";
				if (UNITY_SEGMENTS.has(folded)) return "unity";
			}
			return null;
		};
		isSwiftRuntimeLibrary = (path) => path.split("/").some((segment) => /^libswift.+\.dylib$/u.test(foldSegment(segment)));
		desktopPathConventions = (path) => {
			const segments = path.split("/");
			const folded = segments.map(foldSegment);
			let unityManagedDirectory = null;
			for (let index = 0; index + 2 < folded.length; index++) {
				const segment = folded[index];
				const namedDataDirectory = segment !== undefined && segment.length > 5 && segment.endsWith("_data");
				const bundleDataDirectory = segment === "data" && folded[index - 1] === "resources" && folded[index - 2] === "contents";
				if ((namedDataDirectory || bundleDataDirectory) && folded[index + 1] === "managed") unityManagedDirectory = segments.slice(0, index + 2).join("/");
			}
			const name = folded.at(-1) ?? "";
			return {
				unityManagedDirectory,
				il2cppLibrary: DESKTOP_IL2CPP_LIBRARIES.has(name),
				electronArchive: folded.at(-2) === "resources" && (name === "app.asar" || name === "default_app.asar"),
				unrealContainer: (name.endsWith(".pak") || name.endsWith(".utoc")) && folded.some((segment, index) => segment === "content" && folded[index + 1] === "paks" && index + 2 < folded.length)
			};
		};
	})))();
}

//#endregion
//#region dist/domain/apple/machoCpuIdentity.js
var CPU_SUBTYPE_CAPABILITY_MASK, machoCpuSubtypeBase;
function init_machoCpuIdentity() {
	return (init_machoCpuIdentity = __esmMin((() => {
		CPU_SUBTYPE_CAPABILITY_MASK = 4278190080;
		machoCpuSubtypeBase = (cpuSubtype) => cpuSubtype & ~CPU_SUBTYPE_CAPABILITY_MASK;
	})))();
}

//#endregion
//#region dist/identity.js
var PRODUCT_IDENTITY, SDK_IDENTITY;
function init_identity() {
	return (init_identity = __esmMin((() => {
		PRODUCT_IDENTITY = {
			displayName: "REA",
			packageName: PACKAGE_METADATA.name,
			packageSpecifier: `${PACKAGE_METADATA.name}@latest`,
			registrationPackageSpecifier: `${PACKAGE_METADATA.name}@${PACKAGE_METADATA.version}`,
			packageVersion: PACKAGE_METADATA.version,
			cliBinary: "rea",
			mcpCommand: `npx -y ${PACKAGE_METADATA.name}@${PACKAGE_METADATA.version} mcp`,
			mcpServerKey: "rea",
			skillName: "reverse-engineer-anything",
			skillVersion: PACKAGE_METADATA.skillVersion,
			configFileName: "rea.json"
		};
		SDK_IDENTITY = {
			server: PACKAGE_METADATA.serverSdkVersion,
			client_test: PACKAGE_METADATA.clientSdkVersion,
			core: PACKAGE_METADATA.coreSdkVersion
		};
	})))();
}

//#endregion
//#region dist/domain/native/nativeValueTrace.js
var nativeValueTraceInputSchema, nativeValueTraceSchema;
function init_nativeValueTrace() {
	return (init_nativeValueTrace = __esmMin((() => {
		init_nativeValueFlow();
		nativeValueTraceInputSchema = z.strictObject({
			procedure: z.string().min(1),
			max_depth: z.number().int().min(0).max(16).default(3),
			max_functions: z.number().int().min(1).max(64).default(16),
			max_call_sites: z.number().int().min(1).max(4096).default(256),
			max_nodes: z.number().int().min(1).max(2e4).default(5e3),
			max_edges: z.number().int().min(1).max(4e4).default(1e4),
			offset: z.number().int().min(0).default(0),
			limit: z.number().int().min(1).max(5e3).default(1e3)
		});
		nativeValueTraceSchema = z.strictObject({
			seed: z.string(),
			target_sha256: z.string(),
			nodes: z.array(z.strictObject({
				id: z.string(),
				procedure: z.string(),
				evidence_id: z.string(),
				kind: z.enum(["operation", "parameter"]),
				operation: nativePcodeOperationSchema.nullable(),
				parameter: z.strictObject({
					ordinal: z.number().int().nonnegative(),
					name: z.string(),
					data_type: z.string()
				}).nullable()
			})),
			edges: z.array(z.strictObject({
				source: z.string(),
				target: z.string(),
				input_index: z.number().int().nonnegative().nullable(),
				kind: z.enum([
					"def-use",
					"call",
					"parameter-use",
					"argument-binding",
					"return-binding"
				]),
				status: z.enum([
					"derived",
					"direct",
					"resolved-indirect",
					"candidate"
				]),
				evidence_id: z.string()
			})),
			procedures: z.array(z.strictObject({
				address: z.string(),
				depth: z.number().int().nonnegative(),
				evidence_id: z.string(),
				provider: z.string(),
				analysis_profile_digest: z.string().nullable()
			})),
			unknowns: z.array(z.strictObject({
				procedure: z.string(),
				address: z.string().nullable(),
				reason: z.string()
			})),
			total_nodes: z.number().int().nonnegative(),
			total_edges: z.number().int().nonnegative(),
			decompilations: z.number().int().nonnegative(),
			next_offset: z.number().int().nonnegative().nullable(),
			truncated: z.boolean(),
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
//#region dist/contracts/enhancedInputs.js
var traceLiteralInputSchema, DEFAULT_CALL_RELATIONSHIP_DIRECTION, MAX_ENHANCED_RECORDS, callRelationshipDirectionSchema, enhancedInputSchemas;
function init_enhancedInputs() {
	return (init_enhancedInputs = __esmMin((() => {
		init_objcSwiftMetadata();
		init_nativeValueTrace();
		traceLiteralInputSchema = z.strictObject({
			query: z.string().min(1),
			case_sensitive: z.boolean().default(false)
		});
		DEFAULT_CALL_RELATIONSHIP_DIRECTION = "forward";
		MAX_ENHANCED_RECORDS = 2e4;
		callRelationshipDirectionSchema = z.enum(["forward", "backward"]).default(DEFAULT_CALL_RELATIONSHIP_DIRECTION);
		enhancedInputSchemas = {
			trace_native_values: nativeValueTraceInputSchema,
			inspect_native_dispatch_metadata: z.strictObject({
				max_records: z.number().int().min(1).max(MAX_ENHANCED_RECORDS).default(5e3),
				objc_class_import_addresses: z.array(z.string()).max(MAX_ENHANCED_RECORDS).describe("Optional exact pointer-slot addresses from the selected name inventory; used to report decoded Objective-C class import bindings.").optional(),
				objc_class_import_addresses_complete: z.boolean().describe("Whether the candidate addresses include every selected class-label row; false keeps binding coverage partial when the existing record budget truncates the scan.").optional(),
				max_input_bytes: z.number().int().min(1).max(MAXIMUM_DISPATCH_METADATA_INPUT_BYTES).optional().describe("Largest target file REA reads into memory for binary metadata, in bytes. Omitted: 67108864 (64 MiB). The whole file counts, including every slice of a universal Mach-O. At most 1073741824 (1 GiB).")
			}),
			get_objc_classes: z.strictObject({ pattern: z.string().default("") }),
			get_objc_protocols: z.strictObject({}),
			batch_decompile: z.strictObject({ addresses: z.array(z.string().describe("A provider-normalized procedure address")).default([]) }),
			get_call_graph: z.strictObject({
				address: z.string().describe("A procedure symbol or address to resolve to its canonical entry"),
				direction: callRelationshipDirectionSchema
			}),
			analyze_swift_types: z.strictObject({
				category: z.enum([
					"classes",
					"structs",
					"enums",
					"protocols",
					"extensions",
					"other"
				]).optional().describe("Limit categorized results to one Swift category; unresolved category observations remain in unclassified."),
				pattern: z.string().optional().describe("Case-sensitive literal filter applied to provider procedure names and their supporting Swift manglings.")
			}),
			find_xrefs_to_name: z.strictObject({ name: z.string() }),
			binary_overview: z.strictObject({}),
			analyze_function: z.strictObject({ procedure: z.string().describe("A procedure name or address") }),
			inspect_native_api: z.strictObject({ procedure: z.string().describe("A procedure name or address") }),
			trace_feature: traceLiteralInputSchema,
			trace_call_path: z.strictObject({
				start: z.string().describe("A starting procedure symbol or address"),
				goal: z.string().describe("An optional destination procedure symbol or address").optional(),
				direction: callRelationshipDirectionSchema
			}),
			trace_native_ui_action: z.strictObject({
				action: z.string().min(1).describe("A unique compiled UI action selector, interface object ID, native symbol or exact function address"),
				max_depth: z.number().int().min(0).max(32).default(8),
				max_nodes: z.number().int().min(1).max(2e3).default(250),
				max_edges: z.number().int().min(1).max(5e3).default(500)
			})
		};
	})))();
}

//#endregion
//#region dist/domain/native/nativeInstruction.js
var nativeInstructionInputSchema, reference, nativeInstructionSchema, nativeCallTargetsSchema;
function init_nativeInstruction() {
	return (init_nativeInstruction = __esmMin((() => {
		nativeInstructionInputSchema = z.strictObject({
			address: z.string().min(1),
			document: z.string().optional()
		});
		reference = z.strictObject({
			target_address: z.string(),
			type: z.string(),
			call: z.boolean(),
			jump: z.boolean(),
			indirect: z.boolean(),
			computed: z.boolean(),
			operand_index: z.number().int(),
			source_address: z.string().min(1).nullable().optional(),
			data: z.boolean().nullable().optional(),
			read: z.boolean().nullable().optional(),
			write: z.boolean().nullable().optional(),
			primary: z.boolean().nullable().optional().describe("Provider primary-reference status, not proof of literal addressing or a runtime access. Null or omission means unavailable."),
			provenance: z.string().min(1).nullable().optional().describe("Provider subsystem reporting this reference; null or omission means unavailable."),
			source: z.string().min(1).nullable().optional().describe("Provider reference origin, such as analysis, default, imported or user_defined; null or omission means unavailable.")
		});
		nativeInstructionSchema = z.strictObject({
			address: z.string(),
			status: z.enum([
				"decoded",
				"not-instruction-boundary",
				"data",
				"undecodable",
				"outside-memory"
			]),
			procedure: z.string().nullable(),
			architecture: z.string(),
			mode: z.string().describe("Provider-reported mode label. Per-address decoder context, when available, is reported separately; a program-wide label does not establish runtime encoding mode."),
			decoder_context: z.array(z.strictObject({
				register: z.string().min(1),
				value: z.string().min(1).nullable(),
				source: z.string().min(1)
			})).optional().describe("Observed per-address decoder context. Null means no value was available; omission means the provider or older capture does not expose this facet. The separate mode field retains the program language variant."),
			bytes: z.string().nullable(),
			length: z.number().int().positive().nullable(),
			mnemonic: z.string().nullable(),
			raw_disassembly: z.string().nullable(),
			operands: z.array(z.strictObject({
				index: z.number().int().nonnegative(),
				raw: z.string(),
				provider_type: z.number().int(),
				components: z.array(z.strictObject({
					kind: z.enum([
						"register",
						"immediate",
						"address",
						"unknown"
					]),
					text: z.string(),
					value: z.string().nullable(),
					bit_width: z.number().int().nonnegative().nullable()
				})),
				memory_addressing: z.literal("unavailable")
			})),
			flow: z.strictObject({
				kind: z.enum([
					"call",
					"jump",
					"return",
					"fallthrough",
					"terminal",
					"unavailable"
				]),
				conditional: z.boolean(),
				computed: z.boolean(),
				direct_destinations: z.array(z.string()),
				classification_evidence: z.array(z.strictObject({
					source: z.string().min(1),
					value: z.string().min(1)
				})).optional().describe("Observed provider facts used to classify flow; older captures or other providers may omit them.")
			}),
			references: z.array(reference),
			incoming_references: z.array(reference).nullable().optional().describe("Static references to this exact code or data address, excluding synthetic entry-point references. An empty array means the provider examined the address and found none; null or omission means unavailable. Analyzer references do not prove literal addressing or runtime access."),
			limitations: z.array(z.string())
		});
		nativeCallTargetsSchema = z.strictObject({
			call_site: z.string(),
			procedure: z.string().nullable(),
			status: z.enum([
				"direct",
				"resolved-indirect",
				"ambiguous",
				"unresolved",
				"not-call",
				"unavailable"
			]),
			mechanism: z.enum([
				"direct",
				"computed",
				"indirect",
				"unavailable"
			]),
			targets: z.array(z.strictObject({
				address: z.string(),
				procedure: z.string().nullable(),
				status: z.enum([
					"direct",
					"resolved-indirect",
					"candidate"
				]),
				basis: z.literal("provider-reference"),
				references: z.array(reference)
			})),
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
//#region dist/domain/electron/electronFuses.js
var ELECTRON_FUSE_SENTINEL, ELECTRON_FUSE_STATE_BYTES, ELECTRON_FUSE_V1_NAMES, FUSE_IMPLICATIONS, OTHER_MEANS_LIMITATION, MISSING_SENTINEL_LIMITATION, byteSchema, fuseStateSchema, electronFuseSchema, electronFuseSentinelSchema, electronFuseSliceSchema, implicationLocation, electronFuseImplicationSchema, electronFuseReportSchema, inspectElectronFusesInputSchema, electronFuseState, electronFuseName, describeElectronFuseFindings, embeddedAsarIntegrityApplies, describeSentinel, implicationFor, validateReportBounds, implicationKey, validateSentinel;
function init_electronFuses() {
	return (init_electronFuses = __esmMin((() => {
		init_digests();
		init_localPath();
		ELECTRON_FUSE_SENTINEL = "dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX";
		ELECTRON_FUSE_STATE_BYTES = {
			disabled: 48,
			enabled: 49,
			removed: 114
		};
		ELECTRON_FUSE_V1_NAMES = [
			"RunAsNode",
			"EnableCookieEncryption",
			"EnableNodeOptionsEnvironmentVariable",
			"EnableNodeCliInspectArguments",
			"EnableEmbeddedAsarIntegrityValidation",
			"OnlyLoadAppFromAsar",
			"LoadBrowserProcessSpecificV8Snapshot",
			"GrantFileProtocolExtraPrivileges",
			"WasmTrapHandlers"
		];
		FUSE_IMPLICATIONS = [
			{
				subject: "node_cli_inspect_arguments",
				fuseIndex: 3,
				enabled: "honored",
				inactive: "not_honored"
			},
			{
				subject: "electron_run_as_node",
				fuseIndex: 0,
				enabled: "honored",
				inactive: "not_honored"
			},
			{
				subject: "embedded_asar_integrity_validation",
				fuseIndex: 4,
				enabled: "enforced",
				inactive: "not_enforced"
			},
			{
				subject: "only_load_app_from_asar",
				fuseIndex: 5,
				enabled: "restricted_to_app_asar",
				inactive: "not_restricted_to_app_asar"
			}
		];
		OTHER_MEANS_LIMITATION = "Fuse state does not prove the application enables Inspector through other means, such as app.commandLine or a remote-debugging switch in application code.";
		MISSING_SENTINEL_LIMITATION = "A missing sentinel means fuse state is unknown, not that every fuse is disabled.";
		byteSchema = z.number().int().min(0).max(255);
		fuseStateSchema = z.enum([
			"enabled",
			"disabled",
			"removed",
			"unknown"
		]);
		electronFuseSchema = z.strictObject({
			index: z.number().int().nonnegative(),
			name: z.string().min(1).nullable(),
			state: fuseStateSchema,
			raw_byte: byteSchema
		});
		electronFuseSentinelSchema = z.strictObject({
			sentinel_offset: z.number().int().nonnegative(),
			wire_version: byteSchema.nullable(),
			declared_length: byteSchema.nullable(),
			fuses: z.array(electronFuseSchema),
			complete: z.boolean()
		});
		electronFuseSliceSchema = z.strictObject({
			index: z.number().int().nonnegative(),
			file_offset: z.number().int().nonnegative(),
			size: z.number().int().nonnegative(),
			architecture: z.string().min(1).nullable(),
			sentinel_count: z.number().int().nonnegative(),
			sentinels: z.array(electronFuseSentinelSchema)
		});
		implicationLocation = {
			relationship: z.literal("derivation"),
			slice_index: z.number().int().nonnegative(),
			sentinel_offset: z.number().int().nonnegative()
		};
		electronFuseImplicationSchema = z.discriminatedUnion("subject", [
			z.strictObject({
				...implicationLocation,
				subject: z.literal("node_cli_inspect_arguments"),
				fuse_index: z.literal(3),
				outcome: z.enum([
					"honored",
					"not_honored",
					"unknown"
				])
			}),
			z.strictObject({
				...implicationLocation,
				subject: z.literal("electron_run_as_node"),
				fuse_index: z.literal(0),
				outcome: z.enum([
					"honored",
					"not_honored",
					"unknown"
				])
			}),
			z.strictObject({
				...implicationLocation,
				subject: z.literal("embedded_asar_integrity_validation"),
				fuse_index: z.literal(4),
				outcome: z.enum([
					"enforced",
					"not_enforced",
					"unknown"
				])
			}),
			z.strictObject({
				...implicationLocation,
				subject: z.literal("only_load_app_from_asar"),
				fuse_index: z.literal(5),
				outcome: z.enum([
					"restricted_to_app_asar",
					"not_restricted_to_app_asar",
					"unknown"
				])
			})
		]);
		electronFuseReportSchema = z.strictObject({
			artifact: z.strictObject({
				selected_path: localPathStringSchema,
				resolved_path: localPathStringSchema,
				sha256: digestSchema,
				bytes: z.number().int().nonnegative(),
				format: z.enum([
					"mach-o",
					"mach-o-universal",
					"pe",
					"elf"
				])
			}).describe("Caller-selected path, resolved regular file, and the container that was read"),
			slices: z.array(electronFuseSliceSchema).describe("One entry per universal Mach-O slice, or a single entry for a thin Mach-O, PE, or ELF file. Sentinel offsets are file-absolute."),
			runtime_implications: z.array(electronFuseImplicationSchema).describe("Derivations from version-1 fuse bytes. Each entry names the fuse index it came from."),
			limitations: z.array(z.string().min(1))
		}).superRefine((report, context) => {
			validateReportBounds(report, context);
		});
		inspectElectronFusesInputSchema = z.strictObject({ path: absoluteLocalPathStringSchema.describe("Absolute filesystem path to a macOS .app bundle, Electron Framework binary, Windows PE executable, or Linux ELF executable") });
		electronFuseState = (byte) => {
			if (byte === ELECTRON_FUSE_STATE_BYTES.disabled) return "disabled";
			if (byte === ELECTRON_FUSE_STATE_BYTES.enabled) return "enabled";
			if (byte === ELECTRON_FUSE_STATE_BYTES.removed) return "removed";
			return "unknown";
		};
		electronFuseName = (wireVersion, index) => wireVersion === 1 ? ELECTRON_FUSE_V1_NAMES[index] ?? null : null;
		describeElectronFuseFindings = (slices, container) => {
			const runtime_implications = [];
			const limitations = [OTHER_MEANS_LIMITATION, MISSING_SENTINEL_LIMITATION];
			for (const slice of slices) {
				if (slice.sentinel_count === 0) limitations.push(`Slice ${slice.index} at file offset ${slice.file_offset} contains no Electron fuse sentinel; fuse state for that slice is unknown, not disabled.`);
				else if (slice.sentinel_count > 1) limitations.push(`Slice ${slice.index} at file offset ${slice.file_offset} contains ${slice.sentinel_count} Electron fuse sentinels; every sentinel is reported and none is selected.`);
				for (const sentinel of slice.sentinels) describeSentinel(slice.index, sentinel, container, runtime_implications, limitations);
			}
			return {
				runtime_implications,
				limitations
			};
		};
		embeddedAsarIntegrityApplies = (container) => container === "mach-o" || container === "mach-o-universal" || container === "pe";
		describeSentinel = (sliceIndex, sentinel, container, implications, limitations) => {
			if (!sentinel.complete) limitations.push(`Electron fuse wire at file offset ${sentinel.sentinel_offset} is truncated; fuse bytes past the slice stay unknown.`);
			if (sentinel.wire_version === null) return;
			if (sentinel.wire_version !== 1) {
				limitations.push(`Electron fuse wire at file offset ${sentinel.sentinel_offset} uses wire version ${sentinel.wire_version}; version 1 is the only pinned name table, so runtime implications for this wire are unknown.`);
				return;
			}
			for (const spec of FUSE_IMPLICATIONS) {
				const fuse = sentinel.fuses.find((item) => item.index === spec.fuseIndex);
				if (fuse === undefined) {
					limitations.push(`Electron fuse wire at file offset ${sentinel.sentinel_offset} does not include fuse index ${spec.fuseIndex}; that runtime implication is unknown.`);
					continue;
				}
				const applicabilityUnknown = spec.subject === "embedded_asar_integrity_validation" && !embeddedAsarIntegrityApplies(container);
				if (applicabilityUnknown) limitations.push(`Electron compiles embedded ASAR integrity validation only on macOS and Windows; the observed fuse byte at file offset ${sentinel.sentinel_offset} does not establish enforcement.`);
				implications.push(implicationFor(spec, applicabilityUnknown ? "unknown" : fuse.state, {
					slice_index: sliceIndex,
					sentinel_offset: sentinel.sentinel_offset
				}));
			}
		};
		implicationFor = (spec, state, location) => {
			const outcome = state === "enabled" ? spec.enabled : state === "unknown" ? "unknown" : spec.inactive;
			return {
				relationship: "derivation",
				subject: spec.subject,
				fuse_index: spec.fuseIndex,
				outcome,
				...location
			};
		};
		validateReportBounds = (report, context) => {
			const size = report.artifact.bytes;
			for (const [sliceIndex, slice] of report.slices.entries()) {
				if (slice.index !== sliceIndex) context.addIssue({
					code: "custom",
					path: [
						"slices",
						sliceIndex,
						"index"
					],
					message: "Slice index does not match its position in the report."
				});
				if (slice.sentinel_count !== slice.sentinels.length) context.addIssue({
					code: "custom",
					path: [
						"slices",
						sliceIndex,
						"sentinel_count"
					],
					message: "Sentinel count does not match the reported sentinels."
				});
				if (slice.file_offset > size || slice.size > size - slice.file_offset) context.addIssue({
					code: "custom",
					path: ["slices", sliceIndex],
					message: "Slice range extends outside the selected artifact."
				});
				for (const [sentinelIndex, sentinel] of slice.sentinels.entries()) validateSentinel(slice, sentinel, sliceIndex, sentinelIndex, context);
			}
			const expected = new Set(describeElectronFuseFindings(report.slices, report.artifact.format).runtime_implications.map(implicationKey));
			for (const [index, implication] of report.runtime_implications.entries()) {
				if (!expected.has(implicationKey(implication))) context.addIssue({
					code: "custom",
					path: ["runtime_implications", index],
					message: "Runtime implication is not supported by the reported fuse bytes and applicability."
				});
				const slice = report.slices[implication.slice_index];
				if (slice?.sentinels.some((sentinel) => sentinel.sentinel_offset === implication.sentinel_offset) !== true) context.addIssue({
					code: "custom",
					path: ["runtime_implications", index],
					message: "Runtime implication does not reference a reported sentinel."
				});
			}
		};
		implicationKey = (fact) => JSON.stringify([
			fact.slice_index,
			fact.sentinel_offset,
			fact.subject,
			fact.fuse_index,
			fact.outcome
		]);
		validateSentinel = (slice, sentinel, sliceIndex, sentinelIndex, context) => {
			const sentinelEnd = sentinel.sentinel_offset + ELECTRON_FUSE_SENTINEL.length;
			const wireEnd = sentinelEnd + (sentinel.wire_version === null ? 0 : 1) + (sentinel.declared_length === null ? 0 : 1) + sentinel.fuses.length;
			if (wireEnd > slice.file_offset + slice.size) context.addIssue({
				code: "custom",
				path: [
					"slices",
					sliceIndex,
					"sentinels",
					sentinelIndex
				],
				message: "Reported wire header or fuse bytes extend outside the slice."
			});
			if (sentinel.sentinel_offset < slice.file_offset || sentinelEnd > slice.file_offset + slice.size) context.addIssue({
				code: "custom",
				path: [
					"slices",
					sliceIndex,
					"sentinels",
					sentinelIndex,
					"sentinel_offset"
				],
				message: "Sentinel is outside its slice."
			});
			if (sentinel.wire_version === null && sentinel.declared_length !== null) context.addIssue({
				code: "custom",
				path: [
					"slices",
					sliceIndex,
					"sentinels",
					sentinelIndex,
					"declared_length"
				],
				message: "A wire without a version byte cannot declare a fuse count."
			});
			if (sentinel.complete && (sentinel.declared_length === null || sentinel.fuses.length !== sentinel.declared_length)) context.addIssue({
				code: "custom",
				path: [
					"slices",
					sliceIndex,
					"sentinels",
					sentinelIndex,
					"complete"
				],
				message: "A complete wire must contain every declared fuse byte."
			});
			if (!sentinel.complete && sentinel.declared_length !== null && sentinel.fuses.length >= sentinel.declared_length) context.addIssue({
				code: "custom",
				path: [
					"slices",
					sliceIndex,
					"sentinels",
					sentinelIndex,
					"complete"
				],
				message: "An incomplete wire must omit at least one declared fuse byte."
			});
			for (const [fuseIndex, fuse] of sentinel.fuses.entries()) {
				if (fuse.index !== fuseIndex) context.addIssue({
					code: "custom",
					path: [
						"slices",
						sliceIndex,
						"sentinels",
						sentinelIndex,
						"fuses",
						fuseIndex,
						"index"
					],
					message: "Fuse index does not match its wire position."
				});
				if (fuse.state !== electronFuseState(fuse.raw_byte)) context.addIssue({
					code: "custom",
					path: [
						"slices",
						sliceIndex,
						"sentinels",
						sentinelIndex,
						"fuses",
						fuseIndex,
						"state"
					],
					message: "Fuse state does not match its raw byte."
				});
				if (sentinel.wire_version !== null && fuse.name !== electronFuseName(sentinel.wire_version, fuse.index)) context.addIssue({
					code: "custom",
					path: [
						"slices",
						sliceIndex,
						"sentinels",
						sentinelIndex,
						"fuses",
						fuseIndex,
						"name"
					],
					message: "Fuse name does not match the pinned version-1 table."
				});
			}
		};
	})))();
}

//#endregion
//#region dist/domain/webRuntime.js
var SCRIPT_ID, RESOURCE_LINE, RESOURCE_COLUMN, START_LINE, START_COLUMN, webRuntimeScopeSchema, webRuntimeSourceSchema, webRuntimeLocationSchema, webRuntimeTargetSchema, WEB_RUNTIME_LIMITS;
function init_webRuntime() {
	return (init_webRuntime = __esmMin((() => {
		init_browserObservation();
		init_browserDeadline();
		init_jsonValue();
		SCRIPT_ID = "CDP session script ID; empty for a position a request initiator reported, which has no session-script association for joining captured source or resource_start.";
		RESOURCE_LINE = "Zero-based line in the resource named by url, as reported by CDP: the script file for an external script (including a module-import initiator), or the HTML document for an inline script or parser markup.";
		RESOURCE_COLUMN = "Zero-based UTF-16 column on that line of the resource named by url, as reported by CDP.";
		START_LINE = "Zero-based line where the script text starts in its enclosing resource (the HTML document for an inline script).";
		START_COLUMN = "Zero-based UTF-16 column where the script text starts on that line of its enclosing resource.";
		webRuntimeScopeSchema = z.strictObject({
			cdp_endpoint: browserEndpointSchema,
			allowed_origins: browserAllowedOriginsSchema,
			target_id: z.string().min(1),
			command_timeout_ms: webRuntimeCommandTimeoutSchema
		});
		webRuntimeSourceSchema = z.object({
			script_id: z.string().min(1),
			url: z.string(),
			execution_context_id: z.number().int().nullable(),
			reported_execution_context: jsonObjectSchema.nullable(),
			reported_script_context_aux_data: jsonObjectSchema.nullable(),
			frame_id: z.string().nullable(),
			producer_hash: z.string().nullable(),
			source_map_url: z.string().nullable(),
			has_source_url: z.boolean().nullable(),
			language: z.string().nullable(),
			resource_start: z.object({
				line_number: z.number().int().min(0).describe(START_LINE),
				column_number: z.number().int().min(0).describe(START_COLUMN)
			}).nullable(),
			source: z.discriminatedUnion("state", [z.object({
				state: z.literal("captured"),
				text: z.string(),
				sha256: z.string().regex(/^[a-f0-9]{64}$/u),
				utf8_bytes: z.number().int().min(0),
				utf16_units: z.number().int().min(0)
			}), z.object({
				state: z.enum(["unavailable", "excluded"]),
				reason: z.string().min(1)
			})])
		});
		webRuntimeLocationSchema = z.object({
			script_id: z.string().describe(SCRIPT_ID),
			url: z.string().nullable(),
			line_number: z.number().int().min(0).describe(RESOURCE_LINE),
			column_number: z.number().int().min(0).nullable().describe(RESOURCE_COLUMN),
			function_name: z.string().nullable(),
			source_association: z.enum(["script_id", "unknown"])
		});
		webRuntimeTargetSchema = z.object({
			target_id: z.string().min(1),
			origin: z.string().min(1),
			initial_url: z.string(),
			frame_id: z.string().min(1),
			loader_id: z.string().nullable()
		});
		WEB_RUNTIME_LIMITS = {
			protocolBytes: 64 * 1024 * 1024,
			retainedEventBytes: 8 * 1024 * 1024,
			sourceBytes: 32 * 1024 * 1024,
			commandTimeoutMs: DEFAULT_CDP_COMMAND_TIMEOUT_MS,
			cleanupTimeoutMs: CDP_CLEANUP_GRACE_MS
		};
	})))();
}

//#endregion
//#region dist/domain/browserScenarioValues.js
var scenarioIdentifierSchema, BROWSER_SCENARIO_START_STEP_ID, browserScenarioBaseUrlSchema, browserScenarioValueSchema, queryEntrySchema, browserScenarioUrlSchema, browserScenarioBrowserSchema, browserScenarioEnvironmentSchema, locatorSchema, MAX_BROWSER_SCENARIO_TIMEOUT_MS, stepBase, browserScenarioActionSchema, storageEntrySchema, browserScenarioStorageSchema, browserScenarioSecretSchema, snapshotKindSchema, browserScenarioCaptureSchema;
function init_browserScenarioValues() {
	return (init_browserScenarioValues = __esmMin((() => {
		init_stringPatterns();
		init_localPath();
		init_browserNetworkEvidence();
		init_browserScenarioCaptureValues();
		init_browserScenarioCaptureLimits();
		init_browserObservation();
		scenarioIdentifierSchema = z.string().regex(IDENTIFIER_PATTERN);
		BROWSER_SCENARIO_START_STEP_ID = "scenario_start";
		browserScenarioBaseUrlSchema = z.string().min(1).transform((value, context) => {
			let url;
			try {
				url = new URL(value);
			} catch (cause) {
				void cause;
				context.addIssue({
					code: "custom",
					message: "Invalid browser URL"
				});
				return z.NEVER;
			}
			if (url.protocol !== "http:" && url.protocol !== "https:" || url.username !== "" || url.password !== "") {
				context.addIssue({
					code: "custom",
					message: "Browser URLs must be HTTP(S) and omit credentials"
				});
				return z.NEVER;
			}
			return url.toString();
		});
		browserScenarioValueSchema = z.discriminatedUnion("source", [z.strictObject({
			source: z.literal("literal"),
			value: z.string()
		}), z.strictObject({
			source: z.literal("secret"),
			secret_id: scenarioIdentifierSchema
		})]);
		queryEntrySchema = z.strictObject({
			name: z.string().min(1),
			value: browserScenarioValueSchema
		});
		browserScenarioUrlSchema = z.strictObject({
			url: browserScenarioBaseUrlSchema,
			query: z.array(queryEntrySchema).default([])
		});
		browserScenarioBrowserSchema = z.discriminatedUnion("mode", [z.strictObject({
			mode: z.literal("launch"),
			executable_path: absoluteLocalPathStringSchema.describe("Absolute local filesystem path for the browser executable; relative paths are rejected."),
			headless: z.boolean().default(true).describe("Run without a visible browser window; defaults to true and can be disabled when the host supports a display.")
		}), z.strictObject({
			mode: z.literal("connect"),
			cdp_endpoint: browserEndpointSchema,
			target_id: z.string().trim().min(1)
		})]);
		browserScenarioEnvironmentSchema = z.strictObject({
			viewport: z.strictObject({
				width: z.number().int().positive().default(1280),
				height: z.number().int().positive().default(720),
				device_scale_factor: z.number().positive().default(1)
			}).default({
				width: 1280,
				height: 720,
				device_scale_factor: 1
			}),
			locale: z.string().min(2).regex(/^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/u).default("en-US").describe("Formatting locale. Launch also sets navigator.language(s) and Accept-Language; connect retains the caller's page and request languages and reports this limitation."),
			timezone: z.string().min(1).regex(/^[A-Za-z0-9_+\x2d]+(?:\x2f[A-Za-z0-9_+\x2d]+)*$/u).default("UTC"),
			color_scheme: z.enum([
				"light",
				"dark",
				"no-preference"
			]).default("light"),
			reduced_motion: z.enum(["reduce", "no-preference"]).default("reduce"),
			service_workers: z.enum(["allow", "block"]).default("block")
		}).default({
			viewport: {
				width: 1280,
				height: 720,
				device_scale_factor: 1
			},
			locale: "en-US",
			timezone: "UTC",
			color_scheme: "light",
			reduced_motion: "reduce",
			service_workers: "block"
		}).describe("Optional deterministic browser settings. Defaults to 1280x720, en-US, UTC, light mode, reduced motion, and blocked service workers.");
		locatorSchema = z.discriminatedUnion("kind", [
			z.strictObject({
				kind: z.literal("test_id"),
				value: z.string().min(1)
			}),
			z.strictObject({
				kind: z.literal("role"),
				role: z.enum([
					"button",
					"checkbox",
					"combobox",
					"dialog",
					"link",
					"listbox",
					"menuitem",
					"option",
					"radio",
					"slider",
					"spinbutton",
					"switch",
					"tab",
					"textbox"
				]),
				name: z.string().min(1)
			}),
			z.strictObject({
				kind: z.literal("css"),
				selector: z.string().min(1)
			})
		]);
		MAX_BROWSER_SCENARIO_TIMEOUT_MS = 2147483647;
		stepBase = {
			step_id: scenarioIdentifierSchema,
			timeout_ms: z.number().int().min(1).max(MAX_BROWSER_SCENARIO_TIMEOUT_MS).optional().describe("Optional action deadline in milliseconds; omitted means wait until completion or request cancellation.")
		};
		browserScenarioActionSchema = z.discriminatedUnion("action", [
			z.strictObject({
				...stepBase,
				action: z.literal("goto"),
				destination: browserScenarioUrlSchema,
				wait_until: z.enum([
					"commit",
					"domcontentloaded",
					"load"
				])
			}),
			z.strictObject({
				...stepBase,
				action: z.literal("click"),
				locator: locatorSchema,
				button: z.enum([
					"left",
					"middle",
					"right"
				]).default("left"),
				click_count: z.number().int().positive().default(1)
			}),
			z.strictObject({
				...stepBase,
				action: z.literal("fill"),
				locator: locatorSchema,
				value: browserScenarioValueSchema
			}),
			z.strictObject({
				...stepBase,
				action: z.literal("press"),
				locator: locatorSchema,
				key: z.string().min(1)
			}),
			z.strictObject({
				...stepBase,
				action: z.literal("select_option"),
				locator: locatorSchema,
				value: browserScenarioValueSchema
			}),
			z.strictObject({
				...stepBase,
				action: z.enum(["check", "uncheck"]),
				locator: locatorSchema
			}),
			z.strictObject({
				...stepBase,
				action: z.literal("wait_for"),
				locator: locatorSchema,
				state: z.enum([
					"attached",
					"detached",
					"visible",
					"hidden"
				])
			}),
			z.strictObject({
				step_id: scenarioIdentifierSchema,
				action: z.literal("wait_for_timeout"),
				duration_ms: z.number().int().min(1).max(MAX_BROWSER_SCENARIO_TIMEOUT_MS).describe("Wait this many milliseconds; the wait ends early on cancellation.")
			})
		]);
		storageEntrySchema = z.strictObject({
			name: z.string().min(1),
			value: browserScenarioValueSchema
		});
		browserScenarioStorageSchema = z.strictObject({
			cookies: z.array(z.strictObject({
				name: z.string().min(1),
				value: browserScenarioValueSchema,
				destination: browserScenarioUrlSchema,
				http_only: z.boolean(),
				secure: z.boolean(),
				same_site: z.enum([
					"Strict",
					"Lax",
					"None"
				])
			})).default([]),
			local_storage: z.array(z.strictObject({
				origin: browserOriginSchema,
				entries: z.array(storageEntrySchema)
			})).default([]),
			session_storage: z.array(z.strictObject({
				origin: browserOriginSchema,
				entries: z.array(storageEntrySchema)
			})).default([])
		}).default({
			cookies: [],
			local_storage: [],
			session_storage: []
		}).describe("Optional initial cookies, local storage, or session storage. Defaults to empty; every supplied value and origin must be declared and within the allowed origins.");
		browserScenarioSecretSchema = z.strictObject({
			secret_id: scenarioIdentifierSchema,
			environment_variable: z.string().min(1).refine((name) => !name.includes("=") && !name.includes("\0"), "Environment variable names cannot contain '=' or NUL")
		});
		snapshotKindSchema = z.enum([
			"screenshot",
			"dom",
			"accessibility",
			"url",
			"history",
			"storage"
		]);
		browserScenarioCaptureSchema = z.strictObject({
			after_each_step: z.array(snapshotKindSchema).default([]),
			at_end: z.array(snapshotKindSchema).default(["url"]),
			events: z.array(browserScenarioEventFamilySchema).default([]),
			network: browserNetworkContentSelectionSchema,
			limits: browserScenarioCaptureLimitsSchema.default(DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS)
		}).default({
			after_each_step: [],
			at_end: ["url"],
			events: [],
			network: {
				request_body: false,
				response_body: false,
				header_values: false
			},
			limits: DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS
		}).describe("Optional retained artifacts and event families. Defaults to only a final sanitized URL; request screenshots, DOM, accessibility, history, storage, and event capture explicitly.");
	})))();
}

//#endregion
//#region dist/domain/javascript/electronObservation.js
var approvedElectronInput, listElectronTargetsInputSchema, inspectElectronPageFacts, inspectElectronPageInputSchema, electronTargetSchema, electronTargetListSchema, electronPageInspectionSchema;
function init_electronObservation() {
	return (init_electronObservation = __esmMin((() => {
		init_browserDeadline();
		init_browserCompleteness();
		init_browserObservation();
		init_browserObservationSchemas();
		init_cdpObservationSchemas();
		init_digests();
		approvedElectronInput = { cdp_endpoint: browserEndpointSchema };
		listElectronTargetsInputSchema = z.strictObject({ ...approvedElectronInput });
		inspectElectronPageFacts = {
			...approvedElectronInput,
			target_id: z.string().trim().min(1),
			observation_ms: z.number().int().min(0).default(100),
			command_timeout_ms: webRuntimeCommandTimeoutSchema
		};
		inspectElectronPageInputSchema = z.union([z.strictObject({
			...inspectElectronPageFacts,
			include_script_sources: z.literal(false).default(false)
		}), z.strictObject({
			...inspectElectronPageFacts,
			include_script_sources: z.literal(true)
		})]);
		electronTargetSchema = z.object({
			target_id: z.string(),
			type: z.string(),
			title: z.string(),
			file_path: z.string(),
			attached: z.boolean().nullable().describe("Discovery-reported debugger attachment state; null means unknown")
		});
		electronTargetListSchema = z.object({
			browser: browserVersionSchema,
			targets: z.array(electronTargetSchema),
			excluded: z.object({
				unsupported_url: z.number().int().min(0),
				non_page: z.number().int().min(0)
			}),
			limitations: z.array(z.string())
		});
		electronPageInspectionSchema = z.object({
			browser: browserVersionSchema,
			target: electronTargetSchema,
			capture_window: z.object({
				started_at: z.iso.datetime(),
				ended_at: z.iso.datetime(),
				observation_ms: z.number().int().min(0)
			}),
			completeness: browserCompletenessSchema,
			frames: z.array(z.object({
				frame_id: z.string(),
				parent_frame_id: z.string().nullable(),
				file_path: z.string()
			})),
			dom: z.object({
				total_nodes: z.number().int().min(0),
				nodes: z.array(cdpDomNodeSchema)
			}),
			scripts: z.object({
				total: z.number().int().min(0),
				items: z.array(z.object({
					script_key: prefixedDigestSchema("electron_script"),
					frame_id: z.string().nullable().default(null),
					file_path: z.string(),
					...cdpScriptMetadataSchema.shape,
					source: cdpScriptSourceSchema
				}))
			}),
			resources: z.array(z.object({
				resource_key: prefixedDigestSchema("electron_resource"),
				file_path: z.string(),
				type: z.string(),
				mime_type: z.string(),
				content_size: z.number().min(0).nullable()
			})),
			workers: z.array(z.object({
				target_id: z.string().min(1),
				type: z.string().min(1),
				file_path: z.string(),
				attached: z.boolean(),
				opener_target_id: z.string().min(1).nullable(),
				parent_frame_id: z.string().min(1).nullable()
			})).default([]),
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
//#region dist/domain/javascript/electronActiveObservation.js
var absolutePathSchema, windowIndexSchema, deepLinkUrlSchema, actionSchema, electronActiveObservationInputSchema, electronActiveTimelineEventSchema, ipcEventSchema, electronActiveProcessMetricSchema, electronActiveWindowSchema, coverageSchema, actionResultContextShape, actionResultSchema, electronActiveObservationResultSchema;
function init_electronActiveObservation() {
	return (init_electronActiveObservation = __esmMin((() => {
		init_localPath();
		absolutePathSchema = z.string().min(1).refine((value) => value.startsWith("/") || /^[A-Za-z]:[\\/]/u.test(value) || value.startsWith("\\\\"), "provider path must be absolute");
		windowIndexSchema = z.number().int().min(0);
		deepLinkUrlSchema = z.string().min(1).refine((value) => {
			try {
				return new URL(value).protocol.length > 0;
			} catch (cause) {
				void cause;
				return false;
			}
		}, "deep-link url must be an absolute URL");
		actionSchema = z.discriminatedUnion("kind", [
			z.strictObject({
				step_id: z.string().min(1),
				kind: z.literal("click"),
				selector: z.string().min(1),
				window_index: windowIndexSchema.default(0)
			}),
			z.strictObject({
				step_id: z.string().min(1),
				kind: z.literal("wait"),
				duration_ms: z.number().int().min(0),
				window_index: windowIndexSchema.optional()
			}),
			z.strictObject({
				step_id: z.string().min(1),
				kind: z.literal("renderer-reload"),
				window_index: windowIndexSchema.default(0)
			}),
			z.strictObject({
				step_id: z.string().min(1),
				kind: z.literal("renderer-crash"),
				window_index: windowIndexSchema.default(0)
			}),
			z.strictObject({
				step_id: z.string().min(1),
				kind: z.literal("deep-link"),
				delivery: z.enum(["open-url", "second-instance"]),
				url: deepLinkUrlSchema
			})
		]);
		electronActiveObservationInputSchema = z.strictObject({
			executable_path: absoluteLocalPathStringSchema.describe("Absolute local filesystem path for the Electron executable; relative paths are rejected."),
			application_path: absoluteLocalPathStringSchema.describe("Absolute local filesystem path for the Electron application; relative paths are rejected."),
			application_root: absoluteLocalPathStringSchema.optional().describe("Absolute local filesystem root for application-relative paths; omit to derive it from the application path. Relative paths are rejected."),
			args: z.array(z.string().regex(/^[^\x00]*$/u, "Electron arguments must not contain NUL")).default([]),
			actions: z.array(actionSchema).default([])
		});
		electronActiveTimelineEventSchema = z.strictObject({
			sequence: z.number().int().min(1),
			correlation_id: z.string().nullable(),
			kind: z.enum([
				"main-handler-invocation",
				"main-event-invocation",
				"ipc-observation-gap",
				"utility-process-fork",
				"utility-process-message",
				"ipc-main-to-renderer",
				"ipc-utility-to-main",
				"ipc-renderer-send",
				"ipc-renderer-invoke",
				"ipc-renderer-post-message",
				"app-lifecycle",
				"window-lifecycle",
				"web-contents-lifecycle",
				"navigation",
				"shell-attempt",
				"process-lifecycle",
				"permission",
				"popup-attempt",
				"download",
				"protocol",
				"preload",
				"native-addon",
				"updater",
				"error"
			]),
			event: z.string().nullable(),
			phase: z.enum([
				"attempted",
				"completed",
				"blocked",
				"failed",
				"observed"
			]),
			channel: z.string().nullable(),
			direction: z.enum([
				"renderer-to-main",
				"main-to-renderer",
				"main-to-utility",
				"utility-to-main"
			]).nullable(),
			sender: z.string().nullable(),
			receiver: z.string().nullable(),
			frame: z.string().nullable(),
			target: z.string().nullable(),
			argument_shapes: z.array(z.string()),
			result_shape: z.string().nullable(),
			process_type: z.string().nullable(),
			source: z.string(),
			capture_method: z.enum([
				"api-wrapper",
				"event-emitter",
				"process-hook"
			]),
			artifact_path: z.string().nullable(),
			artifact_sha256: z.string().regex(/^[a-f0-9]{64}$/u).nullable(),
			error: z.boolean()
		});
		ipcEventSchema = electronActiveTimelineEventSchema.extend({ kind: z.enum([
			"main-handler-invocation",
			"main-event-invocation",
			"utility-process-fork",
			"utility-process-message",
			"ipc-main-to-renderer",
			"ipc-utility-to-main",
			"ipc-renderer-send",
			"ipc-renderer-invoke",
			"ipc-renderer-post-message"
		]) });
		electronActiveProcessMetricSchema = z.strictObject({
			pid: z.number().int().min(1),
			type: z.string().min(1),
			name: z.string().nullable(),
			service_name: z.string().nullable()
		});
		electronActiveWindowSchema = z.strictObject({
			window_id: z.string(),
			web_contents_id: z.string(),
			url: z.string(),
			title: z.string(),
			visible: z.boolean().nullable(),
			destroyed: z.boolean()
		});
		coverageSchema = z.strictObject({
			status: z.enum([
				"complete",
				"partial_attach",
				"hook_conflict",
				"target_exited",
				"cleanup_failed"
			]),
			observed_event_families: z.array(z.string()),
			unavailable_event_families: z.array(z.string()),
			observed_roles: z.array(z.string()),
			pre_capture_activity: z.literal("unavailable")
		});
		actionResultContextShape = {
			step_id: z.string().min(1),
			kind: z.enum([
				"click",
				"wait",
				"renderer-reload",
				"renderer-crash",
				"deep-link"
			]),
			window_index: windowIndexSchema.nullable(),
			target: z.string().nullable(),
			elapsed_ms: z.number().int().min(0)
		};
		actionResultSchema = z.discriminatedUnion("status", [z.strictObject({
			...actionResultContextShape,
			status: z.literal("completed"),
			error: z.null()
		}), z.strictObject({
			...actionResultContextShape,
			status: z.enum(["failed", "cancelled"]),
			error: z.string()
		})]);
		electronActiveObservationResultSchema = z.strictObject({
			application: z.strictObject({
				executable_path: absolutePathSchema,
				application_path: absolutePathSchema,
				electron_version: z.string().min(1),
				process_ownership: z.literal("provider-owned"),
				cleanup: z.literal("terminated-owned-process")
			}),
			actions: z.array(actionResultSchema),
			windows: z.array(electronActiveWindowSchema),
			processes: z.strictObject({ items: z.array(electronActiveProcessMetricSchema) }),
			ipc: z.strictObject({
				events: z.array(ipcEventSchema),
				observed: z.number().int().min(0),
				dropped: z.number().int().min(0)
			}),
			timeline: z.strictObject({
				events: z.array(electronActiveTimelineEventSchema),
				observed: z.number().int().min(0),
				dropped: z.number().int().min(0)
			}),
			retention: z.strictObject({
				budget_bytes: z.number().int().min(0),
				estimated_retained_bytes: z.number().int().min(0),
				event_serialized_byte_upper_bound: z.number().int().min(0),
				retained: z.number().int().min(0),
				dropped: z.number().int().min(0),
				dropped_event_families: z.array(z.strictObject({
					family: z.string().min(1),
					count: z.number().int().min(1)
				})),
				dropped_event_roles: z.array(z.strictObject({
					role: z.string().min(1),
					count: z.number().int().min(1)
				})),
				observed_ipc: z.number().int().min(0),
				dropped_ipc: z.number().int().min(0),
				observed_runtime: z.number().int().min(0),
				dropped_runtime: z.number().int().min(0)
			}),
			coverage: coverageSchema,
			limitations: z.array(z.string())
		});
	})))();
}

//#endregion
//#region dist/domain/javascript/javascriptRuntimeObservation.js
var observationTextSchema, runtimeEndpoint, listJavaScriptRuntimeTargetsInputSchema, javascriptRuntimeKindSchema, observedJavaScriptRuntimeKindSchema, observeJavaScriptRuntimeInputSchema, javascriptRuntimeVersionSchema, javascriptRuntimeLocationSchema, javascriptRuntimeUnresolvedLocationSchema, javascriptRuntimeTargetLocationSchema, javascriptRuntimeTargetSchema, javascriptRuntimeTargetListSchema, javascriptRuntimeScriptSchema, javascriptRuntimeContextSchema, javascriptRuntimeObservationSchema;
function init_javascriptRuntimeObservation() {
	return (init_javascriptRuntimeObservation = __esmMin((() => {
		init_browserObservation();
		init_digests();
		observationTextSchema = z.string().min(1);
		runtimeEndpoint = { inspector_endpoint: browserEndpointSchema };
		listJavaScriptRuntimeTargetsInputSchema = z.strictObject({ ...runtimeEndpoint });
		javascriptRuntimeKindSchema = z.enum([
			"node",
			"electron-main",
			"electron-preload",
			"electron-renderer"
		]);
		observedJavaScriptRuntimeKindSchema = javascriptRuntimeKindSchema.or(z.literal("unknown"));
		observeJavaScriptRuntimeInputSchema = z.strictObject({
			...runtimeEndpoint,
			target_id: z.string().trim().min(1),
			runtime_kind: javascriptRuntimeKindSchema.optional(),
			observation_ms: z.number().int().min(0).default(100)
		});
		javascriptRuntimeVersionSchema = z.strictObject({
			product: z.string().min(1),
			protocol_version: z.string().min(1),
			v8_version: z.string().nullable()
		});
		javascriptRuntimeLocationSchema = z.discriminatedUnion("kind", [
			z.strictObject({
				kind: z.literal("file"),
				file_path: z.string().min(1)
			}),
			z.strictObject({
				kind: z.literal("url"),
				origin: z.string().min(1),
				sanitized_url: z.string().min(1)
			}),
			z.strictObject({
				kind: z.literal("builtin"),
				specifier: z.string().min(1)
			})
		]);
		javascriptRuntimeUnresolvedLocationSchema = z.strictObject({
			kind: z.literal("unresolved"),
			reported_url: z.string().describe("Raw Inspector URL, which may be empty for anonymous or evaluated code."),
			reason: z.enum(["unverifiable-file-location", "location-authorization-not-attempted"])
		});
		javascriptRuntimeTargetLocationSchema = z.union([javascriptRuntimeLocationSchema, javascriptRuntimeUnresolvedLocationSchema]);
		javascriptRuntimeTargetSchema = z.strictObject({
			target_id: z.string().min(1),
			protocol_type: z.string().min(1),
			attached: z.boolean().nullable().describe("Discovery-reported debugger attachment state; null means unknown"),
			location: javascriptRuntimeTargetLocationSchema
		});
		javascriptRuntimeTargetListSchema = z.strictObject({
			runtime: javascriptRuntimeVersionSchema,
			targets: z.array(javascriptRuntimeTargetSchema),
			excluded: z.strictObject({
				unsupported_location: z.number().int().min(0),
				unconnectable: z.number().int().min(0)
			}),
			limitations: z.array(observationTextSchema)
		});
		javascriptRuntimeScriptSchema = z.strictObject({
			script_key: prefixedDigestSchema("v8_script"),
			location: javascriptRuntimeTargetLocationSchema,
			execution_context_key: z.string().nullable(),
			cdp_hash: z.string().nullable(),
			length: z.number().int().min(0).nullable().describe("Producer-reported script length; null when unavailable."),
			is_module: z.boolean().nullable().describe("Producer-reported module classification; null when unavailable."),
			status: z.literal("observed-loaded")
		});
		javascriptRuntimeContextSchema = z.strictObject({
			context_key: z.string().min(1),
			state: z.enum([
				"created",
				"destroyed",
				"cleared"
			]),
			name: z.string().nullable(),
			origin: z.string().nullable()
		});
		javascriptRuntimeObservationSchema = z.strictObject({
			runtime: javascriptRuntimeVersionSchema,
			target: javascriptRuntimeTargetSchema.extend({
				runtime_kind: observedJavaScriptRuntimeKindSchema,
				runtime_kind_authority: z.enum(["caller-declared-unverified", "not-declared"])
			}),
			capture: z.strictObject({
				observation_ms: z.number().int().min(0),
				events_observed: z.number().int().min(0),
				events_retained: z.number().int().min(0),
				events_dropped: z.number().int().min(0),
				metadata_bytes_retained: z.number().int().min(0),
				truncated: z.boolean(),
				truncation_reasons: z.array(observationTextSchema)
			}),
			scripts: z.strictObject({
				items: z.array(javascriptRuntimeScriptSchema),
				observed_total: z.number().int().min(0),
				excluded: z.strictObject({
					unsupported_location: z.number().int().min(0),
					invalid_protocol_value: z.number().int().min(0)
				})
			}),
			execution_contexts: z.array(javascriptRuntimeContextSchema),
			directly_observed: z.array(observationTextSchema),
			unavailable_without_instrumentation: z.array(observationTextSchema),
			unknowns: z.array(observationTextSchema),
			limitations: z.array(observationTextSchema)
		});
	})))();
}

//#endregion
//#region dist/domain/reconstructionCoverageEvidence.js
var evidenceAuthorities, packageAuthorities, verifierHasComparableEvidence, packageProofHasComparableEvidence, hasComparableEvidence;
function init_reconstructionCoverageEvidence() {
	return (init_reconstructionCoverageEvidence = __esmMin((() => {
		evidenceAuthorities = {
			"shipped-artifact": ["shipped-artifact"],
			"controlled-replay": ["controlled-replay"],
			"live-observation": ["controlled-replay", "external-service"],
			external: ["external-service"]
		};
		packageAuthorities = {
			build: ["live-observation"],
			"clean-install": ["live-observation"],
			"package-contents": ["shipped-artifact", "live-observation"],
			"runtime-routing": ["live-observation"],
			"authority-independence": ["shipped-artifact", "live-observation"]
		};
		verifierHasComparableEvidence = (result, contract, records) => hasComparableEvidence(result.evidence_ids, [contract.authority], records);
		packageProofHasComparableEvidence = (proof, records) => hasComparableEvidence(proof.evidence_ids, packageAuthorities[proof.kind], records);
		hasComparableEvidence = (evidenceIds, requirements, records) => evidenceIds.some((id) => {
			const evidence = records.get(id);
			if (evidence === undefined) return false;
			return requirements.some((required) => evidenceAuthorities[required].includes(evidence.authority) && (evidence.confidence === "observed" || required === "shipped-artifact" && evidence.confidence === "derived"));
		});
	})))();
}

//#endregion
//#region dist/domain/offsetDateTime.js
var offsetDateTimeSchema, parseOffsetDateTimeInstant, offsetDateTimeInstantFromEpochMilliseconds, fractionalSecondFromMilliseconds, compareOffsetDateTimeInstants;
function init_offsetDateTime() {
	return (init_offsetDateTime = __esmMin((() => {
		offsetDateTimeSchema = z.string().regex(/^(?:(?:\d\d[2468][048]|\d\d[13579][26]|\d\d0[48]|[02468][048]00|[13579][26]00)-02-29|\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\d|30)|(?:02)-(?:0[1-9]|1\d|2[0-8])))T(?:(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|(?:[+\x2d](?:[01]\d|2[0-3]):[0-5]\d)))$/u, "Use an ISO-8601 date-time with an explicit UTC offset");
		parseOffsetDateTimeInstant = (value) => {
			const match = /^(.*?)(?:\.(\d+))?(Z|[+\x2d]\d{2}:\d{2})$/u.exec(value);
			if (match === null) throw new TypeError("Expected a validated offset date-time.");
			const [, dateTime, fractionalDigits, offset] = match;
			if (dateTime === undefined || offset === undefined) throw new TypeError("Expected a validated offset date-time.");
			const wholeSecondMilliseconds = Date.parse(`${dateTime}${offset}`);
			if (!Number.isSafeInteger(wholeSecondMilliseconds) || wholeSecondMilliseconds % 1e3 !== 0) throw new TypeError("Offset date-time is outside the supported time range.");
			return {
				epochSecond: wholeSecondMilliseconds / 1e3,
				fraction: fractionalDigits?.replace(/0+$/u, "") ?? ""
			};
		};
		offsetDateTimeInstantFromEpochMilliseconds = (epochMilliseconds) => {
			if (!Number.isFinite(epochMilliseconds)) throw new TypeError("Expected finite epoch milliseconds.");
			if (Math.abs(epochMilliseconds) > Number.MAX_SAFE_INTEGER) return {
				epochSecond: epochMilliseconds / 1e3,
				fraction: ""
			};
			const epochSecond = Math.floor(epochMilliseconds / 1e3);
			const millisecondsWithinSecond = epochMilliseconds - epochSecond * 1e3;
			return {
				epochSecond,
				fraction: fractionalSecondFromMilliseconds(millisecondsWithinSecond)
			};
		};
		fractionalSecondFromMilliseconds = (milliseconds) => {
			if (milliseconds === 0) return "";
			const [coefficient = "", exponentText] = String(milliseconds).toLowerCase().split("e");
			const exponent = exponentText === undefined ? 0 : Number(exponentText);
			const point = coefficient.indexOf(".");
			const decimalPosition = (point < 0 ? coefficient.length : point) + exponent - 3;
			const digits = coefficient.replace(".", "");
			const fraction = decimalPosition <= 0 ? `0.${"0".repeat(-decimalPosition)}${digits}` : decimalPosition < digits.length ? `${digits.slice(0, decimalPosition)}.${digits.slice(decimalPosition)}` : `${digits}${"0".repeat(decimalPosition - digits.length)}`;
			return (fraction.includes(".") ? fraction.slice(fraction.indexOf(".") + 1) : "").replace(/0+$/u, "");
		};
		compareOffsetDateTimeInstants = (left, right) => {
			if (left.epochSecond !== right.epochSecond) return left.epochSecond < right.epochSecond ? -1 : 1;
			const length = Math.max(left.fraction.length, right.fraction.length);
			for (let index = 0; index < length; index += 1) {
				const leftDigit = left.fraction.charCodeAt(index) || 48;
				const rightDigit = right.fraction.charCodeAt(index) || 48;
				if (leftDigit !== rightDigit) return leftDigit < rightDigit ? -1 : 1;
			}
			return 0;
		};
	})))();
}

//#endregion
//#region dist/domain/reconstructionCoverageVerifierResults.js
var latestVerifierObservationsByVerifier, sameVerifierAssessment, verifierAssessmentIdentity;
function init_reconstructionCoverageVerifierResults() {
	return (init_reconstructionCoverageVerifierResults = __esmMin((() => {
		init_canonicalOrdering();
		init_offsetDateTime();
		latestVerifierObservationsByVerifier = (results) => {
			const latestByVerifier = new Map();
			for (const result of results) {
				const observation = {
					result,
					instant: parseOffsetDateTimeInstant(result.observed_at)
				};
				const latest = latestByVerifier.get(result.verifier_id);
				const latestInstant = latest?.[0]?.instant;
				const comparison = latestInstant === undefined ? 1 : compareOffsetDateTimeInstants(observation.instant, latestInstant);
				if (latest === undefined || comparison > 0) latestByVerifier.set(result.verifier_id, [observation]);
				else if (comparison === 0) latest.push(observation);
			}
			return latestByVerifier;
		};
		sameVerifierAssessment = (left, right) => verifierAssessmentIdentity(left) === verifierAssessmentIdentity(right);
		verifierAssessmentIdentity = (result) => JSON.stringify({
			verifier_id: result.verifier_id,
			contract_sha256: result.contract_sha256,
			status: result.status,
			covered_claim_ids: uniqueSorted$1(result.covered_claim_ids),
			covered_dimensions: uniqueSorted$1(result.covered_dimensions),
			artifact_sha256s: uniqueSorted$1(result.artifact_sha256s),
			owner_sha256s: uniqueSorted$1(result.owner_sha256s),
			normalization_sha256: result.normalization_sha256,
			repeats: result.repeats
		});
	})))();
}

//#endregion
//#region dist/domain/reconstructionCoverageEvaluation.js
var recommendedReconstructionProbes, probeOperation, evaluateReconstructionSurfaces, evaluateOwner, evaluateReconstructionClaims, createVerifierIndexes, evaluateVerifierResult, verifierResultMatchesContract, evaluateReconstructionCoverageRisks, evaluateReconstructionPackageProofs, addReason, addEvidence;
function init_reconstructionCoverageEvaluation() {
	return (init_reconstructionCoverageEvaluation = __esmMin((() => {
		init_reconstructionCoverageEvidence();
		init_offsetDateTime();
		init_reconstructionCoverageVerifierResults();
		recommendedReconstructionProbes = (reasons) => reasons.map((reason) => ({
			operation: probeOperation(reason.code),
			subject_id: reason.subject_id,
			rationale: reason.detail
		}));
		probeOperation = (code) => {
			if (code.startsWith("owner-") || code.startsWith("authority-routing")) return "reconcile_reconstruction_owner";
			if (code.startsWith("verifier-")) return "run_reconstruction_verifier";
			if (code.startsWith("package-proof")) return "verify_reconstruction_package";
			if (code === "active-contradiction") return "resolve_contradiction";
			if (code === "active-unknown") return "probe_residual_unknown";
			return "update_authoritative_inventory";
		};
		evaluateReconstructionSurfaces = (context) => {
			for (const surfaceId of context.boundary.required_surface_ids) {
				const surface = context.surfaces.get(surfaceId);
				if (surface === undefined) {
					addReason(context, "surface-missing", surfaceId, "Required surface is absent from the authoritative inventory.");
					continue;
				}
				addEvidence(context, surface.evidence_ids);
				for (const dependencyId of surface.dependency_surface_ids) if (!context.surfaces.has(dependencyId)) addReason(context, "dependency-surface-missing", surfaceId, `Declared dependency surface is absent: ${dependencyId}`);
				evaluateOwner(context, surfaceId);
			}
		};
		evaluateOwner = (context, surfaceId) => {
			const owners = context.ownersBySurface.get(surfaceId) ?? [];
			if (owners.length === 0) {
				addReason(context, "owner-missing", surfaceId, "Required surface has no reconstructed owner or explicit disposition.");
				return;
			}
			if (owners.length > 1) {
				addReason(context, "owner-duplicate", surfaceId, "Required surface has conflicting ownership declarations.");
				return;
			}
			const owner = owners[0]?.ownership;
			if (owner === undefined) return;
			if (owner.disposition !== "implemented") {
				if (!context.boundary.allowed_dispositions.includes(owner.disposition)) addReason(context, "disposition-not-allowed", surfaceId, `${owner.disposition} is not allowed by this completion boundary.`);
				return;
			}
			const ownerChecks = [
				[
					owner.path_state === "missing",
					"owner-path-missing",
					"Declared owner path is missing."
				],
				[
					owner.path_state === "unknown",
					"owner-path-unknown",
					"Declared owner path has not been checked."
				],
				[
					owner.package_state === "missing",
					"owner-undistributed",
					"Declared owner is absent from the distributable."
				],
				[
					owner.package_state === "unknown",
					"owner-distribution-unknown",
					"Owner distribution state is unknown."
				],
				[
					owner.authority_route === "detected",
					"authority-routing-detected",
					"Reconstructed owner routes into the authority."
				],
				[
					owner.authority_route === "unknown",
					"authority-routing-unknown",
					"Authority independence has not been established."
				]
			];
			for (const [matches, code, detail] of ownerChecks) if (matches) addReason(context, code, surfaceId, detail);
		};
		evaluateReconstructionClaims = (context) => {
			const indexes = createVerifierIndexes(context);
			for (const claimId of context.boundary.required_claim_ids) {
				const claim = context.claims.get(claimId);
				if (claim === undefined) {
					addReason(context, "claim-missing", claimId, "Required finite claim is absent.");
					continue;
				}
				const contracts = indexes.contractsByClaim.get(claimId) ?? [];
				if (contracts.length === 0) {
					addReason(context, "verifier-missing", claimId, "No verifier contract covers this claim.");
					continue;
				}
				if (contracts.length > 1) {
					addReason(context, "verifier-duplicate", claimId, "Multiple verifier contracts claim primary coverage.");
					continue;
				}
				const contract = contracts[0];
				if (contract !== undefined) evaluateVerifierResult(context, claim, contract, indexes);
			}
		};
		createVerifierIndexes = (context) => {
			const { coverage } = context;
			const contractsByClaim = new Map();
			for (const contract of coverage.verifier_contracts) for (const claimId of new Set(contract.claim_ids)) {
				const contracts = contractsByClaim.get(claimId) ?? [];
				contracts.push(contract);
				contractsByClaim.set(claimId, contracts);
			}
			return {
				contractsByClaim,
				latestResultsByVerifier: latestVerifierObservationsByVerifier(coverage.verifier_results),
				artifactDigests: new Set(coverage.artifacts.map(({ artifact_sha256: value }) => value)),
				ownerDigests: new Set(coverage.owners.flatMap(({ ownership }) => ownership.disposition === "implemented" ? [ownership.owner_sha256] : [])),
				surfaces: context.surfaces,
				artifacts: context.artifacts,
				ownersBySurface: context.ownersBySurface
			};
		};
		evaluateVerifierResult = (context, claim, contract, indexes) => {
			const latestResults = indexes.latestResultsByVerifier.get(contract.verifier_id);
			if (latestResults === undefined) {
				addReason(context, "verifier-result-missing", claim.claim_id, "Verifier has no recorded result.");
				return;
			}
			addEvidence(context, latestResults.flatMap(({ result }) => result.evidence_ids));
			const latest = latestResults[0];
			if (latest === undefined) return;
			if (!latestResults.every((candidate) => sameVerifierAssessment(latest.result, candidate.result))) {
				addReason(context, "verifier-result-ambiguous", claim.claim_id, "Latest verifier observations have conflicting assessment content.");
				return;
			}
			const comparable = latestResults.find(({ result }) => verifierHasComparableEvidence(result, contract, context.evidenceById));
			if (comparable === undefined) {
				addReason(context, "verifier-result-incompatible", claim.claim_id, `Latest verifier observation has no cited Evidence with comparable ${contract.authority} authority and confidence.`);
				return;
			}
			const { result } = comparable;
			if (!verifierResultMatchesContract(claim, contract, result, indexes)) {
				addReason(context, "verifier-result-incompatible", claim.claim_id, "Latest verifier result does not match current artifacts, owners, dimensions, authority, normalization, repeats, or contract.");
				return;
			}
			const cutoffEpochMs = context.nowEpochMs - contract.max_age_ms;
			if (compareOffsetDateTimeInstants(comparable.instant, context.nowInstant) > 0 || cutoffEpochMs >= -Number.MAX_SAFE_INTEGER && compareOffsetDateTimeInstants(comparable.instant, offsetDateTimeInstantFromEpochMilliseconds(cutoffEpochMs)) < 0) {
				addReason(context, "verifier-result-stale", claim.claim_id, "Latest compatible verifier result is stale.");
				return;
			}
			if (result.status === "fail") addReason(context, "verifier-failed", claim.claim_id, "Latest compatible verifier result failed.");
			else if (result.status !== "pass") addReason(context, "verifier-unknown", claim.claim_id, `Latest compatible verifier result is ${result.status}.`);
		};
		verifierResultMatchesContract = (claim, contract, result, indexes) => {
			const expectedArtifactDigests = claim.surface_ids.flatMap((surfaceId) => {
				const surface = indexes.surfaces.get(surfaceId);
				const artifact = surface === undefined ? undefined : indexes.artifacts.get(surface.artifact_id);
				return artifact === undefined ? [] : [artifact.artifact_sha256];
			});
			const expectedOwnerDigests = claim.surface_ids.flatMap((surfaceId) => (indexes.ownersBySurface.get(surfaceId) ?? []).flatMap(({ ownership }) => ownership.disposition === "implemented" ? [ownership.owner_sha256] : []));
			return result.contract_sha256 === contract.contract_sha256 && result.normalization_sha256 === contract.normalization_sha256 && result.covered_claim_ids.includes(claim.claim_id) && result.covered_claim_ids.every((item) => contract.claim_ids.includes(item)) && claim.required_dimensions.every((item) => contract.dimensions.includes(item)) && claim.required_dimensions.every((item) => result.covered_dimensions.includes(item)) && result.covered_dimensions.every((item) => contract.dimensions.includes(item)) && result.artifact_sha256s.every((item) => indexes.artifactDigests.has(item)) && expectedArtifactDigests.every((item) => result.artifact_sha256s.includes(item)) && result.owner_sha256s.every((item) => indexes.ownerDigests.has(item)) && expectedOwnerDigests.every((item) => result.owner_sha256s.includes(item)) && result.repeats >= contract.minimum_repeats && claim.required_authority === contract.authority;
		};
		evaluateReconstructionCoverageRisks = (context) => {
			for (const unknownId of context.coverage.residual_unknown_ids) if (!context.boundary.allowed_unknown_ids.includes(unknownId)) addReason(context, "active-unknown", unknownId, "Active residual unknown is not permitted by the completion boundary.");
			for (const contradiction of context.coverage.contradictions) if (contradiction.status === "active" && (contradiction.surface_ids.some((id) => context.boundary.required_surface_ids.includes(id)) || contradiction.claim_ids.some((id) => context.boundary.required_claim_ids.includes(id)))) {
				addEvidence(context, contradiction.evidence_ids);
				addReason(context, "active-contradiction", contradiction.contradiction_id, "Active contradiction affects the completion boundary.");
			}
		};
		evaluateReconstructionPackageProofs = (context) => {
			const requiredArtifactDigests = context.boundary.required_surface_ids.flatMap((surfaceId) => {
				const surface = context.surfaces.get(surfaceId);
				const artifact = surface === undefined ? undefined : context.artifacts.get(surface.artifact_id);
				return artifact === undefined ? [] : [artifact.artifact_sha256];
			});
			for (const kind of context.boundary.required_package_proof_kinds) {
				const proofs = context.coverage.package_proofs.filter((proof) => proof.kind === kind);
				const applicable = (proof) => requiredArtifactDigests.every((digest) => proof.artifact_sha256s.includes(digest)) && packageProofHasComparableEvidence(proof, context.evidenceById);
				const passing = proofs.find((proof) => proof.status === "pass" && applicable(proof));
				if (passing !== undefined) {
					addEvidence(context, passing.evidence_ids);
					continue;
				}
				const failing = proofs.find((proof) => proof.status === "fail" && applicable(proof));
				if (failing !== undefined) {
					addEvidence(context, failing.evidence_ids);
					addReason(context, "package-proof-failed", kind, "Required package or integration proof failed.");
				} else if (proofs.length > 0) {
					addEvidence(context, proofs.flatMap(({ evidence_ids }) => evidence_ids));
					addReason(context, "package-proof-unknown", kind, "Required package or integration proof has no qualifying passing Evidence.");
				} else addReason(context, "package-proof-missing", kind, "Required package or integration proof is missing.");
			}
		};
		addReason = (context, code, subjectId, detail) => {
			context.reasons.push({
				code,
				subject_id: subjectId,
				detail
			});
		};
		addEvidence = (context, evidenceIds) => {
			for (const evidenceId of evidenceIds) context.evidenceIds.add(evidenceId);
		};
	})))();
}

//#endregion
//#region dist/domain/reconstructionCoverage.js
var evidenceIdSchema$4, stableIdSchema$1, boundedTextSchema, authoritySchema, artifactSchema, surfaceSchema, implementationOwnerSchema, externalOwnerSchema, ownerSchema, claimSchema, verifierContractBaseSchema, verifierContractSchema, verifierResultSchema, contradictionSchema, packageProofSchema, boundarySchema, reconstructionCoverageDataSchema, createReconstructionCoverageData, parseCoverageData, closureReasonSchema, reconstructionClosureResultSchema, createReconstructionVerifierContract, evaluateReconstructionClosure, validateCoverageReferences, indexUnique, closureStatus, reasonOrder;
function init_reconstructionCoverage() {
	return (init_reconstructionCoverage = __esmMin((() => {
		init_unicodeCodePointOrder();
		init_evidenceBundle();
		init_reconstructionCoverageEvaluation();
		init_digests();
		init_canonicalDigest();
		init_offsetDateTime();
		evidenceIdSchema$4 = prefixedDigestSchema("ev");
		stableIdSchema$1 = z.string().regex(/^[A-Za-z][A-Za-z0-9._:\x2f\x2d]{0,199}$/u);
		boundedTextSchema = z.string().trim().min(1);
		authoritySchema = z.enum([
			"observed",
			"derived",
			"inferred",
			"historical",
			"external"
		]);
		artifactSchema = z.strictObject({
			artifact_id: stableIdSchema$1,
			artifact_sha256: digestSchema,
			version: z.string().trim().min(1),
			environment_sha256: digestSchema,
			evidence_ids: z.array(evidenceIdSchema$4).min(1)
		});
		surfaceSchema = z.strictObject({
			surface_id: stableIdSchema$1,
			family: z.string().trim().min(1),
			artifact_id: stableIdSchema$1,
			occurrence_id: z.string().trim().min(1).nullable(),
			location: boundedTextSchema,
			authority: authoritySchema,
			dependency_surface_ids: z.array(stableIdSchema$1),
			evidence_ids: z.array(evidenceIdSchema$4).min(1)
		});
		implementationOwnerSchema = z.strictObject({
			disposition: z.literal("implemented"),
			owner_path: boundedTextSchema,
			owner_export: z.string().trim().min(1).nullable(),
			owner_sha256: digestSchema,
			path_state: z.enum([
				"present",
				"missing",
				"unknown"
			]),
			package_state: z.enum([
				"distributed",
				"missing",
				"unknown"
			]),
			authority_route: z.enum([
				"none",
				"detected",
				"unknown"
			])
		});
		externalOwnerSchema = z.strictObject({
			disposition: z.enum(["external", "non-goal"]),
			rationale: boundedTextSchema
		});
		ownerSchema = z.strictObject({
			surface_id: stableIdSchema$1,
			ownership: z.discriminatedUnion("disposition", [implementationOwnerSchema, externalOwnerSchema])
		});
		claimSchema = z.strictObject({
			claim_id: stableIdSchema$1,
			title: z.string().trim().min(1),
			kind: z.string().trim().min(1),
			surface_ids: z.array(stableIdSchema$1).min(1),
			required_dimensions: z.array(stableIdSchema$1).min(1),
			required_authority: z.enum([
				"shipped-artifact",
				"controlled-replay",
				"live-observation",
				"external"
			])
		});
		verifierContractBaseSchema = z.strictObject({
			verifier_id: stableIdSchema$1,
			claim_ids: z.array(stableIdSchema$1).min(1),
			dimensions: z.array(stableIdSchema$1).min(1),
			authority: z.enum([
				"shipped-artifact",
				"controlled-replay",
				"live-observation",
				"external"
			]),
			max_age_ms: z.number().int().min(1),
			minimum_repeats: z.number().int().min(1),
			normalization_sha256: digestSchema,
			normalization_removes_dimensions: z.literal(false)
		});
		verifierContractSchema = verifierContractBaseSchema.extend({ contract_sha256: digestSchema });
		verifierResultSchema = z.strictObject({
			verifier_id: stableIdSchema$1,
			contract_sha256: digestSchema,
			observed_at: offsetDateTimeSchema,
			status: z.enum([
				"pass",
				"fail",
				"unknown",
				"unsupported",
				"truncated",
				"skipped"
			]),
			covered_claim_ids: z.array(stableIdSchema$1).min(1),
			covered_dimensions: z.array(stableIdSchema$1).min(1),
			artifact_sha256s: z.array(digestSchema).min(1),
			owner_sha256s: z.array(digestSchema),
			normalization_sha256: digestSchema,
			repeats: z.number().int().min(1),
			evidence_ids: z.array(evidenceIdSchema$4).min(1)
		});
		contradictionSchema = z.strictObject({
			contradiction_id: stableIdSchema$1,
			status: z.enum(["active", "resolved"]),
			surface_ids: z.array(stableIdSchema$1),
			claim_ids: z.array(stableIdSchema$1),
			evidence_ids: z.array(evidenceIdSchema$4).min(2)
		});
		packageProofSchema = z.strictObject({
			proof_id: stableIdSchema$1,
			kind: z.enum([
				"build",
				"clean-install",
				"package-contents",
				"runtime-routing",
				"authority-independence"
			]),
			status: z.enum([
				"pass",
				"fail",
				"unknown",
				"unsupported",
				"skipped"
			]),
			artifact_sha256s: z.array(digestSchema).min(1),
			evidence_ids: z.array(evidenceIdSchema$4).min(1)
		});
		boundarySchema = z.strictObject({
			boundary_id: stableIdSchema$1,
			title: z.string().trim().min(1),
			required_surface_ids: z.array(stableIdSchema$1).min(1),
			required_claim_ids: z.array(stableIdSchema$1).min(1),
			required_package_proof_kinds: z.array(packageProofSchema.shape.kind).min(1),
			allowed_dispositions: z.array(z.enum(["external", "non-goal"])),
			allowed_unknown_ids: z.array(stableIdSchema$1)
		});
		reconstructionCoverageDataSchema = z.strictObject({
			evidence_bundle: evidenceBundleSchema,
			artifacts: z.array(artifactSchema),
			surfaces: z.array(surfaceSchema),
			owners: z.array(ownerSchema),
			claims: z.array(claimSchema),
			verifier_contracts: z.array(verifierContractSchema),
			verifier_results: z.array(verifierResultSchema),
			residual_unknown_ids: z.array(stableIdSchema$1),
			contradictions: z.array(contradictionSchema),
			package_proofs: z.array(packageProofSchema),
			boundaries: z.array(boundarySchema)
		});
		createReconstructionCoverageData = (input) => parseCoverageData(input).coverage;
		parseCoverageData = (input) => {
			const coverage = reconstructionCoverageDataSchema.parse(input);
			return {
				coverage,
				...validateCoverageReferences(coverage)
			};
		};
		closureReasonSchema = z.strictObject({
			code: z.enum([
				"surface-missing",
				"owner-missing",
				"owner-duplicate",
				"owner-path-missing",
				"owner-path-unknown",
				"owner-undistributed",
				"owner-distribution-unknown",
				"authority-routing-detected",
				"authority-routing-unknown",
				"disposition-not-allowed",
				"dependency-surface-missing",
				"claim-missing",
				"verifier-missing",
				"verifier-duplicate",
				"verifier-result-missing",
				"verifier-result-stale",
				"verifier-result-incompatible",
				"verifier-result-ambiguous",
				"verifier-failed",
				"verifier-unknown",
				"active-unknown",
				"active-contradiction",
				"package-proof-missing",
				"package-proof-failed",
				"package-proof-unknown"
			]),
			subject_id: stableIdSchema$1,
			detail: boundedTextSchema
		});
		reconstructionClosureResultSchema = z.strictObject({
			boundary_id: stableIdSchema$1,
			status: z.enum([
				"partial",
				"failed",
				"unknown",
				"ready"
			]),
			summary: z.strictObject({
				required_surfaces: z.number().int().min(0),
				required_claims: z.number().int().min(0),
				reasons: z.number().int().min(0)
			}),
			reasons: z.array(closureReasonSchema),
			recommended_probes: z.array(z.strictObject({
				operation: stableIdSchema$1,
				subject_id: stableIdSchema$1,
				rationale: boundedTextSchema
			})),
			evidence_ids: z.array(evidenceIdSchema$4)
		});
		createReconstructionVerifierContract = (input) => {
			const parsed = verifierContractBaseSchema.parse(input);
			return verifierContractSchema.parse({
				...parsed,
				contract_sha256: digestCanonicalValue(parsed, "Reconstruction coverage")
			});
		};
		evaluateReconstructionClosure = (coverageInput, boundaryId, nowEpochMs) => {
			const parsed = parseCoverageData(coverageInput);
			const boundary = parsed.coverage.boundaries.find(({ boundary_id: id }) => id === boundaryId);
			if (boundary === undefined) throw new TypeError(`Unknown reconstruction boundary: ${boundaryId}`);
			const nowInstant = offsetDateTimeInstantFromEpochMilliseconds(nowEpochMs);
			const context = {
				...parsed,
				boundary,
				nowEpochMs,
				nowInstant,
				reasons: [],
				evidenceIds: new Set()
			};
			evaluateReconstructionSurfaces(context);
			evaluateReconstructionClaims(context);
			evaluateReconstructionCoverageRisks(context);
			evaluateReconstructionPackageProofs(context);
			const reasons = [...context.reasons].sort(reasonOrder);
			return reconstructionClosureResultSchema.parse({
				boundary_id: boundary.boundary_id,
				status: closureStatus(reasons),
				summary: {
					required_surfaces: boundary.required_surface_ids.length,
					required_claims: boundary.required_claim_ids.length,
					reasons: reasons.length
				},
				reasons,
				recommended_probes: recommendedReconstructionProbes(reasons),
				evidence_ids: [...context.evidenceIds].sort()
			});
		};
		validateCoverageReferences = (workspace) => {
			const evidenceBundle = authenticateParsedEvidenceBundle(workspace.evidence_bundle);
			const evidenceById = new Map(evidenceBundle.records.map((record) => [record.evidence_id, record]));
			const unknownIds = new Set(evidenceBundle.unknowns.map(({ unknown_id: id }) => id));
			const artifacts = indexUnique(workspace.artifacts, "artifact_id");
			const surfaces = indexUnique(workspace.surfaces, "surface_id");
			const claims = indexUnique(workspace.claims, "claim_id");
			const contracts = indexUnique(workspace.verifier_contracts, "verifier_id");
			indexUnique(workspace.contradictions, "contradiction_id");
			indexUnique(workspace.package_proofs, "proof_id");
			indexUnique(workspace.boundaries, "boundary_id");
			for (const contract of workspace.verifier_contracts) {
				const { contract_sha256: contractSha256, ...base } = contract;
				if (contractSha256 !== digestCanonicalValue(verifierContractBaseSchema.parse(base), "Reconstruction coverage")) throw new TypeError(`Verifier contract digest is invalid: ${contract.verifier_id}`);
			}
			for (const surface of workspace.surfaces) if (!artifacts.has(surface.artifact_id)) throw new TypeError(`Surface artifact is missing: ${surface.surface_id}`);
			const ownersBySurface = new Map();
			for (const owner of workspace.owners) {
				if (!surfaces.has(owner.surface_id)) throw new TypeError(`Owner surface is missing: ${owner.surface_id}`);
				const owners = ownersBySurface.get(owner.surface_id);
				if (owners === undefined) ownersBySurface.set(owner.surface_id, [owner]);
				else owners.push(owner);
			}
			for (const claim of workspace.claims) if (claim.surface_ids.some((id) => !surfaces.has(id))) throw new TypeError(`Claim surface is missing: ${claim.claim_id}`);
			for (const contract of workspace.verifier_contracts) if (contract.claim_ids.some((id) => !claims.has(id))) throw new TypeError(`Verifier claim is missing: ${contract.verifier_id}`);
			for (const result of workspace.verifier_results) if (!contracts.has(result.verifier_id)) throw new TypeError(`Verifier result contract is missing: ${result.verifier_id}`);
			const referencedEvidenceIds = [
				...workspace.artifacts.flatMap(({ evidence_ids: ids }) => ids),
				...workspace.surfaces.flatMap(({ evidence_ids: ids }) => ids),
				...workspace.verifier_results.flatMap(({ evidence_ids: ids }) => ids),
				...workspace.contradictions.flatMap(({ evidence_ids: ids }) => ids),
				...workspace.package_proofs.flatMap(({ evidence_ids: ids }) => ids)
			];
			const danglingEvidence = referencedEvidenceIds.find((id) => !evidenceById.has(id));
			if (danglingEvidence !== undefined) throw new TypeError(`Coverage workspace Evidence is missing: ${danglingEvidence}`);
			const danglingUnknown = workspace.residual_unknown_ids.find((id) => !unknownIds.has(id));
			if (danglingUnknown !== undefined) throw new TypeError(`Coverage workspace residual unknown is missing: ${danglingUnknown}`);
			return {
				evidenceById,
				artifacts,
				surfaces,
				claims,
				ownersBySurface
			};
		};
		indexUnique = (items, key) => {
			const values = new Map();
			for (const item of items) {
				if (values.has(item[key])) throw new TypeError(`Duplicate reconstruction coverage ${String(key)}`);
				values.set(item[key], item);
			}
			return values;
		};
		closureStatus = (reasons) => {
			if (reasons.length === 0) return "ready";
			if (reasons.some(({ code }) => [
				"verifier-failed",
				"active-contradiction",
				"authority-routing-detected",
				"owner-path-missing",
				"owner-undistributed",
				"package-proof-failed"
			].includes(code))) return "failed";
			if (reasons.some(({ code }) => [
				"verifier-result-stale",
				"verifier-result-incompatible",
				"verifier-result-ambiguous",
				"verifier-unknown",
				"active-unknown",
				"owner-path-unknown",
				"owner-distribution-unknown",
				"authority-routing-unknown",
				"package-proof-unknown"
			].includes(code))) return "unknown";
			return "partial";
		};
		reasonOrder = (left, right) => compareUnicodeCodePoints(compositeKey([left.code, left.subject_id]), compositeKey([right.code, right.subject_id]));
	})))();
}

//#endregion
//#region dist/domain/reconstructionCoverageInput.js
var reconstructionCoverageEvaluationInputSchema;
function init_reconstructionCoverageInput() {
	return (init_reconstructionCoverageInput = __esmMin((() => {
		init_reconstructionCoverage();
		reconstructionCoverageEvaluationInputSchema = z.strictObject({
			coverage: reconstructionCoverageDataSchema,
			boundary_id: z.string().min(1)
		});
	})))();
}

//#endregion
//#region dist/domain/bridgeCandidateProjection.js
var bridgeCandidateCoverageSchema, MAX_BRIDGE_CANDIDATE_JSON_BYTES, jsonText, projectCartesianCandidates;
function init_bridgeCandidateProjection() {
	return (init_bridgeCandidateProjection = __esmMin((() => {
		bridgeCandidateCoverageSchema = z.strictObject({
			status: z.enum(["complete", "partial"]),
			total_candidates: z.number().int().nonnegative(),
			emitted_candidates: z.number().int().nonnegative(),
			omitted_candidates: z.number().int().nonnegative()
		});
		MAX_BRIDGE_CANDIDATE_JSON_BYTES = 2 * 1024 * 1024;
		jsonText = (value) => {
			const serialized = JSON.stringify(value);
			if (serialized === undefined) throw new TypeError("Bridge candidate is not JSON serializable");
			return serialized;
		};
		projectCartesianCandidates = (input) => {
			const total = input.groups.reduce((sum, group) => sum + group.left.length * group.right.length, 0);
			const preparedGroups = input.groups.map((group) => ({
				left: group.left.map((value) => ({
					value,
					pathBytes: Buffer.byteLength(jsonText(value.path))
				})),
				right: group.right.map((value) => {
					const emptyLeftCandidate = jsonText(input.createCandidate("", value));
					return {
						value,
						rowOverhead: Buffer.byteLength(emptyLeftCandidate) - 2
					};
				})
			}));
			let estimatedFullBytes = 2 + Math.max(0, total - 1);
			for (const group of preparedGroups) {
				estimatedFullBytes += group.left.length * group.right.reduce((sum, { rowOverhead }) => sum + rowOverhead, 0) + group.right.length * group.left.reduce((sum, { pathBytes }) => sum + pathBytes, 0);
			}
			const shouldEmitAll = estimatedFullBytes <= MAX_BRIDGE_CANDIDATE_JSON_BYTES;
			const candidates = [];
			let estimatedRetainedBytes = 2;
			candidateLoop: for (const group of preparedGroups) {
				for (const left of group.left) {
					for (const right of group.right) {
						const candidateBytes = right.rowOverhead + left.pathBytes;
						const additionalBytes = candidateBytes + (candidates.length > 0 ? 1 : 0);
						if (!shouldEmitAll && estimatedRetainedBytes + additionalBytes > 2097152) break candidateLoop;
						candidates.push(input.createCandidate(left.value.path, right.value));
						estimatedRetainedBytes += additionalBytes;
					}
				}
			}
			return {
				candidates,
				coverage: {
					status: candidates.length === total ? "complete" : "partial",
					total_candidates: total,
					emitted_candidates: candidates.length,
					omitted_candidates: total - candidates.length
				}
			};
		};
	})))();
}

//#endregion
//#region dist/domain/mobileApplicationGraphProjection.js
var projectionEvidenceIdSchema, projectionPathSchema, applicationInventoryProjectionInputSchema, projectedComponentSchema, unavailableComponentSchema, projectedBridgeCandidateSchema, projectionCoverage, projectedInventoryEntries, projectedFileComponents;
function init_mobileApplicationGraphProjection() {
	return (init_mobileApplicationGraphProjection = __esmMin((() => {
		init_artifactInventoryEvidence();
		init_evidence();
		init_digests();
		projectionEvidenceIdSchema = prefixedDigestSchema("ev");
		projectionPathSchema = z.string().min(1);
		applicationInventoryProjectionInputSchema = z.strictObject({ inventory_evidence: z.array(evidenceSchema).min(1) });
		projectedComponentSchema = z.strictObject({
			path: projectionPathSchema,
			artifact_id: prefixedDigestSchema("art"),
			sha256: digestSchema,
			format: z.string().min(1)
		});
		unavailableComponentSchema = z.strictObject({
			path: projectionPathSchema,
			artifact_id: z.null(),
			sha256: z.null(),
			format: z.string().min(1),
			encrypted: z.boolean(),
			limitations: z.array(z.string())
		});
		projectedBridgeCandidateSchema = (basis) => z.strictObject({
			managed_path: projectionPathSchema,
			native_path: projectionPathSchema,
			basis: z.enum(basis)
		});
		projectionCoverage = (inventory, budgetComplete) => ({
			status: hasCompleteInventoryCoverage(inventory, "container-entries") && budgetComplete ? "complete-within-inventory" : "partial",
			inventory_complete: inventory.complete
		});
		projectedInventoryEntries = (inventory) => {
			const nodes = new Map(inventory.nodes.map((node) => [node.artifact_id, node]));
			return inventory.occurrences.filter(({ logical_path }) => logical_path !== ".").map((occurrence) => {
				const path = occurrence.logical_path;
				const kind = occurrence.entry_kind;
				if (occurrence.artifact_id === null) return {
					path,
					kind,
					component: undefined,
					unavailable: {
						path,
						artifact_id: null,
						sha256: null,
						format: occurrence.artifact_format,
						encrypted: occurrence.encrypted,
						limitations: occurrence.limitations
					}
				};
				const node = nodes.get(occurrence.artifact_id);
				if (node === undefined) throw new TypeError("Application projection occurrence has no artifact node");
				return {
					path,
					kind,
					component: {
						path,
						artifact_id: node.artifact_id,
						sha256: node.sha256,
						format: occurrence.artifact_format
					},
					unavailable: undefined
				};
			});
		};
		projectedFileComponents = (entries) => entries.flatMap(({ kind, component }) => (kind === "file" || kind === "slice") && component !== undefined ? [component] : []);
	})))();
}

//#endregion
//#region dist/domain/android/androidApplication.js
var evidenceIdSchema$3, componentSchema$1, androidApplicationProjectionInputSchema, androidApplicationProjectionResultSchema, projectAndroidApplication, classify$1, runtimeFamilies$1, bridgeCandidates$1, bridgeBasis$1;
function init_androidApplication() {
	return (init_androidApplication = __esmMin((() => {
		init_bridgeCandidateProjection();
		init_artifactInventoryEvidence();
		init_digests();
		init_canonicalDigest();
		init_nativeConvention();
		init_mobileApplicationGraphProjection();
		init_unicodeCodePointOrder();
		evidenceIdSchema$3 = projectionEvidenceIdSchema;
		componentSchema$1 = projectedComponentSchema;
		androidApplicationProjectionInputSchema = applicationInventoryProjectionInputSchema;
		androidApplicationProjectionResultSchema = z.strictObject({
			projection_id: prefixedDigestSchema("adp"),
			root_sha256: digestSchema,
			root_format: z.literal("apk"),
			source_evidence_ids: z.array(evidenceIdSchema$3).min(1),
			components: z.strictObject({
				manifests: z.array(componentSchema$1),
				resources: z.array(componentSchema$1),
				dex: z.array(componentSchema$1),
				jvm_classes: z.array(componentSchema$1),
				native_libraries: z.array(componentSchema$1),
				javascript: z.array(componentSchema$1),
				signing: z.array(componentSchema$1)
			}),
			unavailable_components: z.array(unavailableComponentSchema),
			runtime_families: z.array(z.enum([
				"dalvik-art",
				"java-kotlin",
				"native",
				"javascript",
				"react-native",
				"flutter",
				"unity"
			])),
			bridge_candidates: z.array(projectedBridgeCandidateSchema([
				"managed-and-native-content",
				"jni-library-convention",
				"react-native-convention",
				"flutter-convention",
				"unity-convention"
			])),
			bridge_candidate_coverage: bridgeCandidateCoverageSchema,
			coverage: z.strictObject({
				status: z.enum(["complete-within-inventory", "partial"]),
				inventory_complete: z.boolean()
			}),
			limitations: z.array(z.string())
		});
		projectAndroidApplication = (input) => {
			const parsed = androidApplicationProjectionInputSchema.parse(input);
			const { evidence, inventory } = parseArtifactInventoryEvidence(parsed.inventory_evidence);
			if (inventory.manifest.root_format !== "apk") throw new TypeError(`Android application projection requires APK inventory Evidence; the inventory root format is ${inventory.manifest.root_format}. APK is chosen for a ZIP archive whose name ends in .apk.`);
			const entries = projectedInventoryEntries(inventory);
			const all = projectedFileComponents(entries);
			const unavailable = entries.flatMap(({ unavailable }) => unavailable === undefined ? [] : [unavailable]);
			const classified = classify$1(all);
			const bridgeProjection = bridgeCandidates$1([...classified.dex, ...classified.jvm_classes], classified.native_libraries);
			const components = classified;
			const limitations = [
				...inventory.limitations,
				...!hasCompleteInventoryCoverage(inventory, "container-entries") ? ["Source inventory coverage is partial; absence is unknown."] : [],
				"Manifest, resource, signing, and bytecode semantics require a dedicated Android provider; this projection reports exact inventory paths and hashes only.",
				"Runtime families are inferred from inventory formats and paths; filename suffixes do not establish valid DEX or JVM class bytes.",
				"Bridge candidates are path-based hypotheses, not decoded JNI declarations or observed runtime calls.",
				"A bridge basis is inferred from the native path and is repeated for every managed component.",
				"ZIP inventory cannot see the APK Signing Block, so an empty signing array does not mean the APK is unsigned.",
				...all.some(({ path }) => path === "AndroidManifest.xml") ? [] : ["No root AndroidManifest.xml occurrence was observed. The APK family comes from the .apk suffix of a ZIP archive, so these bytes may not be an APK."],
				...bridgeProjection.coverage.status === "partial" ? [`Bridge candidate pairs exceeded the projection safety budget; ${bridgeProjection.coverage.omitted_candidates} hypotheses are omitted. Component arrays still include every component from the supplied inventory pages.`] : [],
				...unavailable.length > 0 ? ["Some inventoried occurrences have no authenticated content identity. Their paths and limitations are retained in unavailable_components; component absence is unknown."] : []
			];
			const withoutId = {
				root_sha256: inventory.manifest.root_sha256,
				root_format: "apk",
				source_evidence_ids: evidence.map(({ evidence_id: id }) => id).sort(compareUnicodeCodePoints),
				components,
				unavailable_components: unavailable,
				runtime_families: runtimeFamilies$1(all, classified),
				bridge_candidates: bridgeProjection.candidates,
				bridge_candidate_coverage: bridgeProjection.coverage,
				coverage: projectionCoverage(inventory, bridgeProjection.coverage.status === "complete" && unavailable.length === 0),
				limitations
			};
			return {
				projection: androidApplicationProjectionResultSchema.parse({
					...withoutId,
					projection_id: `adp_${digestCanonicalValue(withoutId, "Android application projection")}`
				}),
				sources: evidence
			};
		};
		classify$1 = (all) => ({
			manifests: all.filter(({ path }) => /(?:^|\/)AndroidManifest\.xml$/u.test(path)),
			resources: all.filter(({ path }) => /(?:^|\/)resources\.arsc$/u.test(path)),
			dex: all.filter(({ path }) => /(?:^|\/)[^/]+\.dex$/iu.test(path)),
			jvm_classes: all.filter(({ path }) => /(?:^|\/)[^/]+\.class$/iu.test(path)),
			native_libraries: all.filter(({ path, format }) => format === "elf" || /(?:^|\/)lib\/[^/]+\/[^/]+\.so$/iu.test(path)),
			javascript: all.filter(({ format }) => format === "javascript-bundle"),
			signing: all.filter(({ path }) => /^META-INF\/[^/]+\.(?:MF|RSA|DSA|EC|SF)$/iu.test(path))
		});
		runtimeFamilies$1 = (all, components) => {
			const families = new Set();
			if (components.dex.length > 0) families.add("dalvik-art");
			if (components.jvm_classes.length > 0) families.add("java-kotlin");
			if (all.some(({ format }) => format === "elf")) families.add("native");
			if (all.some(({ format }) => format === "javascript-bundle")) families.add("javascript");
			for (const { path } of all) {
				const convention = nativeRuntimeConvention(path);
				if (convention !== null) families.add(convention);
			}
			return [...families].sort(compareUnicodeCodePoints);
		};
		bridgeCandidates$1 = (managed, native) => {
			return projectCartesianCandidates({
				groups: [{
					left: managed,
					right: native
				}],
				createCandidate: (managed_path, target) => ({
					managed_path,
					native_path: target.path,
					basis: bridgeBasis$1(target.path)
				})
			});
		};
		bridgeBasis$1 = (path) => {
			const convention = nativeRuntimeConvention(path);
			if (convention === "react-native") return "react-native-convention";
			if (convention === "flutter") return "flutter-convention";
			if (convention === "unity") return "unity-convention";
			if (/(?:^|\/)lib\/[^/]+\/lib[^/]+\.so$/iu.test(path)) return "jni-library-convention";
			return "managed-and-native-content";
		};
	})))();
}

//#endregion
//#region dist/domain/apple/appleBundleAnatomy.js
function* directoryPaths(tree) {
	for (const [parent, names] of tree.directories) for (const name of names) yield joinPath(parent, name);
}
var pathSchema$1, BUNDLE_EXTENSION, MACH_O_FORMATS, appleBundleSchema, isMachOFormat, isSidecar, isWithin, anatomyNameIs, anatomyChild, anatomyTailMatches, projectAppleBundleAnatomy, applicationRoots, detectBundles, indexTree, joinPath, directoryOf, enclosingBundle, bundleLayout, bundleRole, directFiles, contentDirectories, namedDirectory, namedFile, infoPlistPath, executableCandidates, signingPaths, platformsOf;
function init_appleBundleAnatomy() {
	return (init_appleBundleAnatomy = __esmMin((() => {
		init_unicodeCodePointOrder();
		pathSchema$1 = z.string().min(1);
		BUNDLE_EXTENSION = /\.(?:app|appex|xpc|framework|systemextension|dext|bundle|plugin|qlgenerator|mdimporter)$/iu;
		MACH_O_FORMATS = ["mach-o", "mach-o-universal"];
		appleBundleSchema = z.strictObject({
			path: pathSchema$1,
			parent_path: pathSchema$1.nullable(),
			layout: z.enum([
				"shallow",
				"macos-deep",
				"versioned-framework"
			]),
			role: z.enum([
				"application",
				"app-extension",
				"xpc-service",
				"framework",
				"login-item",
				"system-extension",
				"driver-extension",
				"plug-in",
				"resource-bundle",
				"bundle",
				"helper-application",
				"nested-application"
			]),
			role_basis: z.literal("path-convention"),
			info_plist_path: pathSchema$1.nullable(),
			executable_candidates: z.array(pathSchema$1),
			signing_paths: z.array(pathSchema$1)
		});
		isMachOFormat = (format) => MACH_O_FORMATS.includes(format);
		isSidecar = (path) => {
			const segments = path.split("/");
			return segments.includes("__MACOSX") || (segments.at(-1) ?? "").startsWith("._");
		};
		isWithin = (path, root) => root === "." || path === root || path.startsWith(`${root}/`);
		anatomyNameIs = (actual, expected) => actual.toLocaleLowerCase("en-US") === expected.toLocaleLowerCase("en-US");
		anatomyChild = (names, expected) => {
			if (names === undefined) return null;
			let exact;
			let folded;
			for (const name of names) {
				if (name === expected) exact = name;
				else if (anatomyNameIs(name, expected) && (folded === undefined || compareUnicodeCodePoints(name, folded) < 0)) folded = name;
			}
			return exact ?? folded ?? null;
		};
		anatomyTailMatches = (path, expected) => {
			const actual = path.split("/");
			if (actual.length < expected.length) return false;
			const tail = actual.slice(-expected.length);
			return expected.every((name, index) => {
				const segment = tail[index];
				if (segment === undefined || segment.length === 0) return false;
				return name === "*" || anatomyNameIs(segment, name);
			});
		};
		projectAppleBundleAnatomy = (entries, subject) => {
			const tree = indexTree(entries);
			const roots = applicationRoots(tree, subject);
			return {
				roots,
				bundles: detectBundles(tree, roots)
			};
		};
		applicationRoots = (tree, subject) => {
			if (subject.format === "directory" && /\.app$/iu.test(subject.name)) return ["."];
			const found = new Set();
			for (const path of directoryPaths(tree)) {
				const segments = path.split("/");
				const app = segments[1];
				if (anatomyNameIs(segments[0] ?? "", "Payload") && app !== undefined && /\.app$/iu.test(app)) {
					found.add(`${segments[0]}/${app}`);
					continue;
				}
				const index = segments.findIndex((segment, position) => /\.app$/iu.test(segment) && anatomyNameIs(segments[position + 1] ?? "", "Contents"));
				if (index >= 0) found.add(segments.slice(0, index + 1).join("/"));
			}
			const roots = [...found];
			return roots.filter((root) => !roots.some((other) => other !== root && isWithin(root, other))).sort(compareUnicodeCodePoints);
		};
		detectBundles = (tree, roots) => {
			const paths = new Set(roots);
			for (const path of directoryPaths(tree)) {
				if (BUNDLE_EXTENSION.test(path.split("/").at(-1) ?? "") && roots.some((root) => isWithin(path, root))) paths.add(path);
			}
			return [...paths].sort(compareUnicodeCodePoints).map((path) => {
				const layout = bundleLayout(path, tree);
				return {
					path,
					parent_path: enclosingBundle(path, paths),
					layout,
					role: roots.includes(path) ? "application" : bundleRole(path),
					role_basis: "path-convention",
					info_plist_path: infoPlistPath(path, layout, tree),
					executable_candidates: executableCandidates(path, layout, tree),
					signing_paths: signingPaths(path, layout, tree)
				};
			});
		};
		indexTree = (entries) => {
			const directories = new Map();
			const files = new Map();
			for (const { path, kind, component } of entries) {
				if (isSidecar(path)) continue;
				const segments = path.split("/");
				let parent = "";
				for (const [index, segment] of segments.entries()) {
					const leaf = index === segments.length - 1;
					if (!leaf || kind === "directory") {
						const names = directories.get(parent) ?? new Set();
						names.add(segment);
						directories.set(parent, names);
					} else if (kind === "file" && component !== undefined) {
						const children = files.get(parent) ?? new Map();
						children.set(segment, component);
						files.set(parent, children);
					}
					parent = joinPath(parent, segment);
				}
			}
			return {
				directories,
				files
			};
		};
		joinPath = (directory, name) => directory === "" ? name : `${directory}/${name}`;
		directoryOf = (bundle) => bundle === "." ? "" : bundle;
		enclosingBundle = (path, bundles) => {
			if (path === ".") return null;
			const segments = path.split("/");
			for (let length = segments.length - 1; length > 0; length--) {
				const candidate = segments.slice(0, length).join("/");
				if (bundles.has(candidate)) return candidate;
			}
			return bundles.has(".") ? "." : null;
		};
		bundleLayout = (bundle, tree) => {
			const directory = directoryOf(bundle);
			if (namedDirectory(tree, directory, "Contents") !== null) return "macos-deep";
			if (namedDirectory(tree, directory, "Versions") !== null) return "versioned-framework";
			return "shallow";
		};
		bundleRole = (bundle) => {
			const segments = bundle.split("/");
			const name = (segments.at(-1) ?? "").toLowerCase();
			const container = segments.at(-2);
			if (name.endsWith(".appex")) return "app-extension";
			if (name.endsWith(".xpc")) return "xpc-service";
			if (name.endsWith(".framework")) return "framework";
			if (name.endsWith(".systemextension")) return "system-extension";
			if (name.endsWith(".dext")) return "driver-extension";
			if (name.endsWith(".bundle")) {
				if (anatomyNameIs(container ?? "", "PlugIns")) return "plug-in";
				return anatomyNameIs(container ?? "", "Resources") ? "resource-bundle" : "bundle";
			}
			if (!name.endsWith(".app")) return "plug-in";
			if (anatomyNameIs(container ?? "", "LoginItems") && anatomyNameIs(segments.at(-3) ?? "", "Library")) return "login-item";
			if (anatomyNameIs(container ?? "", "Helpers")) return "helper-application";
			return "nested-application";
		};
		directFiles = (directory, tree) => [...tree.files.get(directory)?.values() ?? []].sort((left, right) => compareUnicodeCodePoints(left.path, right.path));
		contentDirectories = (bundle, layout, tree) => {
			const directory = directoryOf(bundle);
			if (layout === "macos-deep") {
				const contents = namedDirectory(tree, directory, "Contents");
				return contents === null ? [] : [contents];
			}
			if (layout === "shallow") return [directory];
			const versions = namedDirectory(tree, directory, "Versions");
			if (versions === null) return [];
			return [...tree.directories.get(versions) ?? []].filter((version) => !anatomyNameIs(version, "Current")).map((version) => joinPath(versions, version)).sort(compareUnicodeCodePoints);
		};
		namedDirectory = (tree, directory, expected) => {
			const name = anatomyChild(tree.directories.get(directory), expected);
			return name === null ? null : joinPath(directory, name);
		};
		namedFile = (tree, directory, expected) => {
			const name = anatomyChild(tree.files.get(directory)?.keys(), expected);
			return name === null ? null : joinPath(directory, name);
		};
		infoPlistPath = (bundle, layout, tree) => {
			const directories = contentDirectories(bundle, layout, tree);
			if (directories.length !== 1) return null;
			const directory = directories[0];
			if (directory === undefined) return null;
			const parent = layout === "versioned-framework" ? namedDirectory(tree, directory, "Resources") : directory;
			if (parent === null) return null;
			return namedFile(tree, parent, "Info.plist");
		};
		executableCandidates = (bundle, layout, tree) => contentDirectories(bundle, layout, tree).flatMap((directory) => {
			const executableDirectory = layout === "macos-deep" ? namedDirectory(tree, directory, "MacOS") : directory;
			return executableDirectory === null ? [] : directFiles(executableDirectory, tree);
		}).filter(({ format }) => isMachOFormat(format)).map(({ path }) => path);
		signingPaths = (bundle, layout, tree) => contentDirectories(bundle, layout, tree).flatMap((directory) => {
			const signature = namedDirectory(tree, directory, "_CodeSignature");
			return [
				signature === null ? null : namedFile(tree, signature, "CodeResources"),
				namedFile(tree, directory, "embedded.provisionprofile"),
				namedFile(tree, directory, "embedded.mobileprovision")
			];
		}).filter((path) => path !== null).sort(compareUnicodeCodePoints);
		platformsOf = (bundles) => [...new Set(bundles.flatMap(({ role, layout, info_plist_path: plist }) => {
			if (role !== "application") return [];
			if (layout === "macos-deep") return ["macos"];
			if (layout === "shallow" && plist !== null) return ["ios"];
			return [];
		}))].sort(compareUnicodeCodePoints);
	})))();
}

//#endregion
//#region dist/domain/apple/appleApplication.js
var evidenceIdSchema$2, pathSchema, APPLE_ROOT_FORMATS, appleApplicationProjectionInputSchema, appleApplicationProjectionResultSchema, projectAppleApplication, appleProjectionId, attributeComponents, appleRootFormat, isNativeLibrary, launchdDomain, classifyComponents, deduplicateComponents, identifyRuntimeFamilies, identifyBridgeCandidates, bridgeBasis, projectionLimitations;
function init_appleApplication() {
	return (init_appleApplication = __esmMin((() => {
		init_appleBundleAnatomy();
		init_nativeConvention();
		init_artifactInventoryEvidence();
		init_evidence();
		init_digests();
		init_canonicalDigest();
		init_bridgeCandidateProjection();
		init_mobileApplicationGraphProjection();
		init_unicodeCodePointOrder();
		evidenceIdSchema$2 = prefixedDigestSchema("ev");
		pathSchema = z.string().min(1);
		APPLE_ROOT_FORMATS = [
			"ipa",
			"directory",
			"zip",
			"dmg"
		];
		appleApplicationProjectionInputSchema = z.strictObject({ inventory_evidence: z.array(evidenceSchema).min(1) });
		appleApplicationProjectionResultSchema = z.strictObject({
			projection_id: prefixedDigestSchema("aap"),
			root_sha256: digestSchema,
			root_format: z.enum(APPLE_ROOT_FORMATS),
			platforms: z.array(z.enum(["ios", "macos"])),
			source_evidence_ids: z.array(evidenceIdSchema$2).min(1),
			application_roots: z.array(pathSchema),
			bundles: z.array(appleBundleSchema),
			components: z.strictObject({
				bundle_metadata: z.array(projectedComponentSchema),
				executables: z.array(projectedComponentSchema),
				frameworks: z.array(projectedComponentSchema),
				native_libraries: z.array(projectedComponentSchema),
				javascript: z.array(projectedComponentSchema),
				signing: z.array(projectedComponentSchema),
				privileged_helpers: z.array(projectedComponentSchema),
				launchd_plists: z.array(projectedComponentSchema.extend({ domain: z.enum(["agent", "daemon"]) })),
				helpers: z.array(projectedComponentSchema)
			}),
			unavailable_components: z.array(unavailableComponentSchema),
			symlinks: z.array(pathSchema),
			runtime_families: z.array(z.enum([
				"native",
				"swift-objective-c",
				"javascript",
				"react-native",
				"flutter",
				"unity"
			])),
			bridge_candidates: z.array(z.strictObject({
				source_path: pathSchema,
				native_path: pathSchema,
				basis: z.enum([
					"javascript-and-native-content",
					"react-native-convention",
					"flutter-convention",
					"unity-convention"
				])
			})),
			bridge_candidate_coverage: bridgeCandidateCoverageSchema,
			coverage: z.strictObject({
				status: z.enum(["complete-within-inventory", "partial"]),
				inventory_complete: z.boolean()
			}),
			limitations: z.array(z.string())
		});
		projectAppleApplication = (input) => {
			const parsed = appleApplicationProjectionInputSchema.parse(input);
			const { evidence, inventory } = parseArtifactInventoryEvidence(parsed.inventory_evidence);
			const rootFormat = appleRootFormat(inventory.manifest.root_format);
			const entries = projectedInventoryEntries(inventory);
			const inventoried = projectedFileComponents(entries);
			const { roots, bundles } = projectAppleBundleAnatomy(entries, {
				name: evidence[0]?.subject?.name ?? "",
				format: rootFormat
			});
			const { all, unattributed } = attributeComponents(inventoried, roots, rootFormat);
			const unavailable = attributeComponents(entries.flatMap(({ kind, unavailable }) => (kind === "file" || kind === "slice") && unavailable !== undefined ? [unavailable] : []), roots, rootFormat);
			const classified = classifyComponents(entries, all, roots);
			const runtimeFamilies = identifyRuntimeFamilies(all);
			const bridgeProjection = identifyBridgeCandidates(classified.javascript, deduplicateComponents([...classified.executables, ...classified.native_libraries]), roots);
			const uninventoriedImage = rootFormat === "dmg" && inventory.occurrences.length === 1;
			const inventoryComplete = hasCompleteInventoryCoverage(inventory, "container-entries");
			const complete = inventoryComplete && !uninventoriedImage;
			const limitations = [...inventory.limitations, ...projectionLimitations({
				complete: inventoryComplete,
				uninventoriedImage,
				roots,
				bundles,
				sidecars: entries.some(({ path }) => isSidecar(path)),
				symlinks: entries.some(({ kind }) => kind === "symlink"),
				unattributed: unattributed + unavailable.unattributed,
				unavailable: unavailable.all.length > 0,
				bridgeCandidateCoverage: bridgeProjection.coverage
			})];
			const withoutId = {
				root_sha256: inventory.manifest.root_sha256,
				root_format: rootFormat,
				platforms: platformsOf(bundles),
				source_evidence_ids: evidence.map(({ evidence_id: id }) => id).sort(compareUnicodeCodePoints),
				application_roots: roots,
				bundles,
				components: classified,
				unavailable_components: unavailable.all,
				symlinks: entries.filter(({ kind }) => kind === "symlink").map(({ path }) => path).sort(compareUnicodeCodePoints),
				runtime_families: runtimeFamilies,
				bridge_candidates: bridgeProjection.candidates,
				bridge_candidate_coverage: bridgeProjection.coverage,
				coverage: {
					status: complete && unavailable.all.length === 0 && bridgeProjection.coverage.status === "complete" ? "complete-within-inventory" : "partial",
					inventory_complete: inventory.complete
				},
				limitations
			};
			return {
				projection: appleApplicationProjectionResultSchema.parse({
					...withoutId,
					projection_id: appleProjectionId(withoutId)
				}),
				sources: evidence
			};
		};
		appleProjectionId = (projection) => `aap_${digestCanonicalValue(projection, "Apple application projection")}`;
		attributeComponents = (inventoried, roots, rootFormat) => {
			const visible = inventoried.filter(({ path }) => !isSidecar(path));
			if (rootFormat === "ipa") return {
				all: visible,
				unattributed: 0
			};
			const all = visible.filter(({ path }) => roots.some((root) => isWithin(path, root)));
			return {
				all,
				unattributed: visible.length - all.length
			};
		};
		appleRootFormat = (format) => {
			const root = APPLE_ROOT_FORMATS.find((candidate) => candidate === format);
			if (root === undefined) throw new TypeError(`Apple application projection requires IPA, directory, ZIP, or DMG inventory Evidence (got ${format})`);
			return root;
		};
		isNativeLibrary = (path) => /\.(?:dylib|so)$/iu.test(path);
		launchdDomain = (path) => {
			if (anatomyTailMatches(path, [
				"Contents",
				"Library",
				"LaunchAgents",
				"*"
			])) return "agent";
			if (anatomyTailMatches(path, [
				"Contents",
				"Library",
				"LaunchDaemons",
				"*"
			])) return "daemon";
			return undefined;
		};
		classifyComponents = (entries, all, roots) => {
			const withinApp = (path) => roots.some((root) => isWithin(path, root));
			const matching = (predicate) => entries.flatMap(({ path, kind, component }) => kind === "file" && component !== undefined && !isSidecar(path) && withinApp(path) && predicate(path) ? [component] : []);
			const lastSegment = (path) => path.split("/").at(-1) ?? "";
			return {
				bundle_metadata: all.filter(({ path }) => anatomyNameIs(lastSegment(path), "Info.plist")),
				executables: all.filter(({ path, format }) => isMachOFormat(format) && (withinApp(path) || !isNativeLibrary(path))),
				frameworks: all.filter(({ path }) => /\.framework\//u.test(path)),
				native_libraries: all.filter(({ path }) => isNativeLibrary(path)),
				javascript: all.filter(({ format }) => format === "javascript-bundle"),
				signing: all.filter(({ path }) => anatomyTailMatches(path, ["_CodeSignature", "CodeResources"]) || anatomyNameIs(lastSegment(path), "embedded.mobileprovision") || anatomyNameIs(lastSegment(path), "embedded.provisionprofile")),
				privileged_helpers: matching((path) => anatomyTailMatches(path, [
					"Contents",
					"Library",
					"LaunchServices",
					"*"
				])),
				launchd_plists: matching((path) => path.endsWith(".plist")).flatMap((component) => {
					const domain = launchdDomain(component.path);
					return domain === undefined ? [] : [{
						...component,
						domain
					}];
				}),
				helpers: matching((path) => anatomyTailMatches(path, [
					"Contents",
					"Helpers",
					"*"
				]))
			};
		};
		deduplicateComponents = (values) => [...new Map(values.map((value) => [value.path, value])).values()].sort((left, right) => compareUnicodeCodePoints(left.path, right.path));
		identifyRuntimeFamilies = (all) => {
			const families = new Set();
			if (all.some(({ format }) => ["mach-o", "mach-o-universal"].includes(format))) families.add("native");
			if (all.some(({ path }) => isSwiftRuntimeLibrary(path))) families.add("swift-objective-c");
			if (all.some(({ format }) => format === "javascript-bundle")) families.add("javascript");
			for (const { path } of all) {
				const convention = nativeRuntimeConvention(path);
				if (convention !== null) families.add(convention);
			}
			return [...families].sort(compareUnicodeCodePoints);
		};
		identifyBridgeCandidates = (scripts, native, roots) => {
			const owner = (path) => roots.find((root) => isWithin(path, root)) ?? null;
			const scriptGroups = [];
			for (const script of scripts) {
				const root = owner(script.path);
				const last = scriptGroups.at(-1);
				if (last?.root === root) last.left.push(script);
				else scriptGroups.push({
					root,
					left: [script]
				});
			}
			const nativeByRoot = new Map();
			for (const item of native) {
				const root = owner(item.path);
				const scoped = nativeByRoot.get(root) ?? [];
				scoped.push(item);
				nativeByRoot.set(root, scoped);
			}
			const groups = scriptGroups.map(({ root, left }) => ({
				left,
				right: nativeByRoot.get(root) ?? []
			}));
			return projectCartesianCandidates({
				groups,
				createCandidate: (source_path, item) => ({
					source_path,
					native_path: item.path,
					basis: bridgeBasis(item.path)
				})
			});
		};
		bridgeBasis = (path) => {
			const convention = nativeRuntimeConvention(path);
			if (convention === "react-native") return "react-native-convention";
			if (convention === "flutter") return "flutter-convention";
			if (convention === "unity") return "unity-convention";
			return "javascript-and-native-content";
		};
		projectionLimitations = (facts) => [
			...!facts.complete ? ["Source inventory coverage is partial; absence is unknown."] : [],
			...facts.uninventoriedImage ? ["The DMG's contents were not inventoried on this host; bundle absence is unknown."] : [],
			...facts.roots.length === 0 ? ["No application bundle (Payload/*.app or *.app/Contents) was present in the supplied inventory pages."] : [],
			...facts.bundles.some(({ layout, info_plist_path: plist }) => layout === "versioned-framework" && plist === null) ? ["A versioned framework has several version directories or no Versions/*/Resources/Info.plist; the Info.plist that Versions/Current selects is unknown because symlink targets are not inventoried."] : [],
			...facts.symlinks ? ["Symlinks are reported by path only; their targets are not inventoried, so bundles are reported at their real paths."] : [],
			...facts.unattributed > 0 ? [`${facts.unattributed} inventoried entries outside every application root are not attributed to the application.`] : [],
			...facts.sidecars ? ["AppleDouble sidecar entries (._* files and __MACOSX/) describe neighbouring files and are excluded from bundle roles."] : [],
			...facts.bridgeCandidateCoverage.status === "partial" ? [`Bridge candidate pairs exceeded the projection safety budget; ${facts.bridgeCandidateCoverage.omitted_candidates} hypotheses are omitted. Component arrays still include every component from the supplied inventory pages.`] : [],
			...facts.unavailable ? ["Some inventoried files have no authenticated content identity. Their paths and limitations are retained in unavailable_components; component absence is unknown."] : [],
			"Bundle roles follow path conventions. Read each info_plist_path with inspect_plist for CFBundleExecutable, identifiers, and declared services.",
			"Bundle identifiers and signing claims require dedicated plist and CMS parsing; this projection reports only exact paths and hashes.",
			"Runtime families are inferred from inventory formats and bounded framework path conventions, not observed runtime loading.",
			"Generic framework and dylib paths do not establish Swift or Objective-C; this inventory projection does not decode language metadata.",
			"Bridge candidates are path-based hypotheses, not observed runtime calls.",
			"A bridge basis is inferred from the native path and is repeated for every managed component."
		];
	})))();
}

//#endregion
//#region dist/domain/harmony/harmonyApplication.js
var evidenceIdSchema$1, componentSchema, HARMONY_ROOT_FORMATS, harmonyApplicationProjectionInputSchema, harmonyApplicationProjectionResultSchema, projectHarmonyApplication, harmonyRootFormat, packagingModel, classify, runtimeFamilies, bridgeCandidates, napiBasis;
function init_harmonyApplication() {
	return (init_harmonyApplication = __esmMin((() => {
		init_bridgeCandidateProjection();
		init_artifactInventoryEvidence();
		init_digests();
		init_canonicalDigest();
		init_nativeConvention();
		init_mobileApplicationGraphProjection();
		init_unicodeCodePointOrder();
		evidenceIdSchema$1 = projectionEvidenceIdSchema;
		componentSchema = projectedComponentSchema;
		HARMONY_ROOT_FORMATS = [
			"hap",
			"hsp",
			"app-pack"
		];
		harmonyApplicationProjectionInputSchema = applicationInventoryProjectionInputSchema;
		harmonyApplicationProjectionResultSchema = z.strictObject({
			projection_id: prefixedDigestSchema("hmp"),
			root_sha256: digestSchema,
			root_format: z.enum(HARMONY_ROOT_FORMATS),
			source_evidence_ids: z.array(evidenceIdSchema$1).min(1),
			packaging_model: z.enum([
				"stage",
				"fa",
				"unknown"
			]),
			components: z.strictObject({
				manifests: z.array(componentSchema),
				bytecode: z.array(componentSchema),
				resources: z.array(componentSchema),
				native_libraries: z.array(componentSchema),
				javascript: z.array(componentSchema),
				signing: z.array(componentSchema)
			}),
			unavailable_components: z.array(unavailableComponentSchema),
			app_pack_children: z.array(componentSchema),
			runtime_families: z.array(z.enum([
				"ark",
				"native",
				"javascript",
				"react-native",
				"flutter",
				"unity"
			])),
			bridge_candidates: z.array(projectedBridgeCandidateSchema(["managed-and-native-content", "napi-library-convention"])),
			bridge_candidate_coverage: bridgeCandidateCoverageSchema,
			coverage: z.strictObject({
				status: z.enum(["complete-within-inventory", "partial"]),
				inventory_complete: z.boolean()
			}),
			limitations: z.array(z.string())
		});
		projectHarmonyApplication = (input) => {
			const parsed = harmonyApplicationProjectionInputSchema.parse(input);
			const { evidence, inventory } = parseArtifactInventoryEvidence(parsed.inventory_evidence);
			const rootFormat = harmonyRootFormat(inventory.manifest.root_format);
			const entries = projectedInventoryEntries(inventory);
			const all = projectedFileComponents(entries);
			const unavailable = entries.flatMap(({ unavailable }) => unavailable === undefined ? [] : [unavailable]);
			const classified = classify(all);
			const bridgeProjection = bridgeCandidates(classified.bytecode, classified.native_libraries);
			const limitations = [
				...inventory.limitations,
				...!hasCompleteInventoryCoverage(inventory, "container-entries") ? ["Source inventory coverage is partial; absence is unknown."] : [],
				...unavailable.length > 0 ? ["Some inventoried occurrences have no authenticated content identity. Their paths and limitations are retained in unavailable_components; component and runtime absence is unknown."] : [],
				"Manifest, module, resource, and signing semantics require a dedicated HarmonyOS provider; this projection reports exact inventory paths and hashes only.",
				"The packaging model is a path-presence heuristic: a Stage model is claimed only from module.json and a FA model only from config.json; both can coexist with unusual layouts.",
				"Runtime families are inferred from inventory formats and paths; filename suffixes do not establish valid Ark bytecode.",
				"The signing component lists META-INF certificate-entry suffixes only; signatures applied by the packaging tool live in the ZIP signing block rather than archive entries, so an empty signing list does not mean the package is unsigned.",
				"Bridge candidates are path-based hypotheses, not decoded N-API declarations or observed runtime calls.",
				...rootFormat === "app-pack" ? ["App Pack child packages are listed by inventory path only; their contents are not recursively inventoried by this projection.", "The app-pack root classification is a verified-ZIP-magic plus .app suffix rule; the projection does not require pack.info or child packages before reporting the root format."] : [],
				"HarmonyOS .har shared libraries are not identified by this projection; the .har suffix also names HTTP Archive JSON, so that classification requires verified ZIP bytes.",
				...bridgeProjection.coverage.status === "partial" ? [`Bridge candidate pairs exceeded the projection safety budget; ${bridgeProjection.coverage.omitted_candidates} hypotheses are omitted. Component arrays still include every component from the supplied inventory pages.`] : []
			];
			const withoutId = {
				root_sha256: inventory.manifest.root_sha256,
				root_format: rootFormat,
				source_evidence_ids: evidence.map(({ evidence_id: id }) => id).sort(compareUnicodeCodePoints),
				packaging_model: packagingModel(classified.manifests),
				components: classified,
				unavailable_components: unavailable,
				app_pack_children: rootFormat === "app-pack" ? all.filter(({ path }) => /\.(?:hap|hsp)$/iu.test(path)) : [],
				runtime_families: runtimeFamilies(all, classified),
				bridge_candidates: bridgeProjection.candidates,
				bridge_candidate_coverage: bridgeProjection.coverage,
				coverage: projectionCoverage(inventory, bridgeProjection.coverage.status === "complete" && unavailable.length === 0),
				limitations
			};
			return {
				projection: harmonyApplicationProjectionResultSchema.parse({
					...withoutId,
					projection_id: `hmp_${digestCanonicalValue(withoutId, "HarmonyOS application projection")}`
				}),
				sources: evidence
			};
		};
		harmonyRootFormat = (format) => {
			const root = HARMONY_ROOT_FORMATS.find((candidate) => candidate === format);
			if (root === undefined) throw new TypeError(`HarmonyOS application projection requires HAP, HSP, or App Pack inventory Evidence (got ${format})`);
			return root;
		};
		packagingModel = (manifests) => {
			const stage = manifests.some(({ path }) => /(?:^|\/)module\.json$/iu.test(path));
			const fa = manifests.some(({ path }) => /(?:^|\/)config\.json$/iu.test(path));
			if (stage) return "stage";
			if (fa) return "fa";
			return "unknown";
		};
		classify = (all) => ({
			manifests: all.filter(({ path }) => /(?:^|\/)(?:module\.json|config\.json|pack\.info)$/iu.test(path)),
			bytecode: all.filter(({ path }) => /\.(?:abc|pa)$/iu.test(path)),
			resources: all.filter(({ path }) => /(?:^|\/)resources\.index$/iu.test(path) || /^(?:resources\/|assets\/[^/]+\/resources\/)/iu.test(path)),
			native_libraries: all.filter(({ path, format }) => format === "elf" || /(?:^|\/)libs\/[^/]+\/[^/]+\.so$/iu.test(path)),
			javascript: all.filter(({ path, format }) => format === "javascript-bundle" || /\.(?:m?js|cjs)$/iu.test(path)),
			signing: all.filter(({ path }) => /^META-INF\/[^/]+\.(?:p7b|sig|cer|crt|pem|provision)$/iu.test(path))
		});
		runtimeFamilies = (all, components) => {
			const families = new Set();
			if (components.bytecode.length > 0) families.add("ark");
			if (all.some(({ format }) => format === "elf")) families.add("native");
			if (components.javascript.length > 0) families.add("javascript");
			for (const { path } of all) {
				const convention = nativeRuntimeConvention(path);
				if (convention !== null) families.add(convention);
			}
			return [...families].sort(compareUnicodeCodePoints);
		};
		bridgeCandidates = (managed, native) => {
			return projectCartesianCandidates({
				groups: [{
					left: managed,
					right: native
				}],
				createCandidate: (managed_path, target) => ({
					managed_path,
					native_path: target.path,
					basis: napiBasis(target.path)
				})
			});
		};
		napiBasis = (path) => /(?:^|\/)libs\/[^/]+\/lib[^/]+\.so$/iu.test(path) ? "napi-library-convention" : "managed-and-native-content";
	})))();
}

//#endregion
//#region dist/domain/reconstructionObligationLedgerIntegrity.js
var summarizeReconstructionObligations, reconstructionObligationLedgerStatus, reconstructionObligationCoverage, reconstructionObligationReports, reconstructionObligationOwnershipGraph, reconstructionObligationDependencyGraph, reconstructionObligationEvidenceIds, obligationEdgeOrder, obligationIdsWith, hasReconstructionObligationDiagnostic, reconstructionObligationLedgerClosureDigest, countBy;
function init_reconstructionObligationLedgerIntegrity() {
	return (init_reconstructionObligationLedgerIntegrity = __esmMin((() => {
		init_canonicalDigest();
		init_comparisonSemantics();
		init_evidence();
		init_unicodeCodePointOrder();
		summarizeReconstructionObligations = (obligations) => ({
			total: obligations.length,
			required: obligations.filter(({ required }) => required).length,
			verified: obligations.filter(({ status }) => status === "verified").length,
			required_open: obligations.filter(({ required, status }) => required && status !== "verified").length,
			by_status: countBy(obligations, [
				"unowned",
				"characterized",
				"implemented",
				"verified",
				"contradicted",
				"blocked",
				"out-of-scope",
				"unknown"
			], ({ status }) => status),
			by_application_layer: countBy(obligations, [
				"cli",
				"protocol",
				"electron",
				"persistence",
				"process",
				"runtime",
				"packaging",
				"native-abi",
				"application",
				"other"
			], ({ application_layer }) => application_layer),
			by_evidence_authority: countBy(obligations, evidenceAuthoritySchema.options, ({ authority_references: references }) => references.map(({ authority }) => authority)),
			by_source_state: countBy(obligations, [
				"candidate",
				"observed",
				"reviewed",
				"unknown"
			], ({ source_state }) => source_state)
		});
		reconstructionObligationLedgerStatus = (obligations, limitations) => {
			if (obligations.length === 0) return "unknown";
			const requiredOpen = obligations.filter(({ required, status }) => required && status !== "verified");
			if (requiredOpen.some(({ status, diagnostics }) => status === "contradicted" || hasReconstructionObligationDiagnostic(diagnostics, "verifier-failed"))) return "failed";
			if (limitations.length > 0) return "unknown";
			if (requiredOpen.some(({ status }) => status === "unknown")) return "unknown";
			return requiredOpen.length === 0 ? "ready" : "open";
		};
		reconstructionObligationCoverage = (limitations) => ({ status: limitations.length === 0 ? "complete" : "partial" });
		reconstructionObligationReports = (obligations) => ({
			missing_owner_obligation_ids: obligationIdsWith(obligations, "missing-owner"),
			missing_verifier_obligation_ids: obligationIdsWith(obligations, "missing-verifier"),
			contradicted_obligation_ids: obligationIdsWith(obligations, "contradiction"),
			residual_unknown_ids: [...new Set(obligations.flatMap(({ residual_unknown_ids: ids }) => ids))].sort(compareUnicodeCodePoints)
		});
		reconstructionObligationOwnershipGraph = (obligations) => obligations.flatMap((obligation) => obligation.binding === null ? [] : [{
			obligation_id: obligation.obligation_id,
			module_path: obligation.binding.owner.module_path,
			symbol: obligation.binding.owner.symbol
		}]).sort(obligationEdgeOrder);
		reconstructionObligationDependencyGraph = (obligations) => obligations.flatMap((obligation) => obligation.dependency_obligation_ids.map((dependencyId) => ({
			obligation_id: obligation.obligation_id,
			depends_on_obligation_id: dependencyId
		}))).sort(obligationEdgeOrder);
		reconstructionObligationEvidenceIds = (obligations) => [...new Set(obligations.flatMap((obligation) => [
			...obligation.authority_references.map(({ evidence_id: id }) => id),
			...obligation.observed_cases.map(({ evidence_id: id }) => id),
			...obligation.binding === null ? [] : [
				...obligation.binding.original_cases.map(({ evidence_id: id }) => id),
				...obligation.binding.fixtures.flatMap(({ evidence_ids: ids }) => ids),
				...obligation.binding.verifier === null ? [] : [obligation.binding.verifier.result_evidence_id]
			]
		]))].sort(compareUnicodeCodePoints);
		obligationEdgeOrder = (left, right) => compareUnicodeCodePoints(canonicalJson(left), canonicalJson(right));
		obligationIdsWith = (obligations, code) => obligations.filter(({ diagnostics }) => hasReconstructionObligationDiagnostic(diagnostics, code)).map(({ obligation_id: id }) => id).sort(compareUnicodeCodePoints);
		hasReconstructionObligationDiagnostic = (diagnostics, code) => diagnostics.some((diagnostic) => diagnostic.code === code);
		reconstructionObligationLedgerClosureDigest = (ledger) => digestCanonicalValue({
			schema: "ReconstructionObligationClosure",
			status: ledger.status,
			coverage: ledger.coverage,
			summary: ledger.summary,
			reports: ledger.reports,
			ownership_graph: ledger.ownership_graph,
			dependency_graph: ledger.dependency_graph,
			obligations: ledger.obligations,
			evidence_links: ledger.evidence_links,
			limitations: ledger.limitations
		}, "Reconstruction obligation ledger");
		countBy = (items, values, valuesFor) => {
			const counts = new Map();
			for (const item of items) {
				const itemValues = valuesFor(item);
				for (const value of new Set(typeof itemValues === "string" ? [itemValues] : itemValues)) counts.set(value, (counts.get(value) ?? 0) + 1);
			}
			return values.map((value) => ({
				key: value,
				count: counts.get(value) ?? 0
			}));
		};
	})))();
}

//#endregion
//#region dist/domain/reconstructionObligationLedgerSchemas.js
var evidenceIdSchema, stableIdSchema, textSchema, sameProjection, obligationStatusSchema, obligationLayerSchema, obligationCaseKindSchema, obligationProofAuthoritySchema, obligationOriginalAuthoritySchema, obligationEvidenceStateSchema, obligationTargetSchema, authorityReferenceSchema, observedCaseSchema, ownerBindingSchema, parserTypeBindingSchema, fixtureBindingSchema, nondeterminismSchema, verifierBindingSchema, reconstructionObligationManifestBindingSchema, reconstructionObligationManifestSchema, reviewedReconstructionObligationSchema, diagnosticSchema, reconstructionObligationSchema, countBySchema, countEntriesMatch, obligationSummariesMatch, reconstructionObligationLedgerSchema, reconstructionObligationLedgerInputSchema;
function init_reconstructionObligationLedgerSchemas() {
	return (init_reconstructionObligationLedgerSchemas = __esmMin((() => {
		init_stringPatterns();
		init_evidence();
		init_evidenceBundle();
		init_digests();
		init_comparisonSemantics();
		init_reconstructionObligationLedgerIntegrity();
		evidenceIdSchema = prefixedDigestSchema("ev");
		stableIdSchema = z.string().regex(STABLE_IDENTIFIER_PATTERN);
		textSchema = z.string().trim().min(1);
		sameProjection = (actual, expected) => {
			if (actual.length !== expected.length) return false;
			const counts = new Map();
			for (const value of actual) {
				const key = canonicalJson(value, "Reconstruction obligation ledger");
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
			for (const value of expected) {
				const key = canonicalJson(value, "Reconstruction obligation ledger");
				const count = counts.get(key);
				if (count === undefined) return false;
				if (count === 1) counts.delete(key);
				else counts.set(key, count - 1);
			}
			return counts.size === 0;
		};
		obligationStatusSchema = z.enum([
			"unowned",
			"characterized",
			"implemented",
			"verified",
			"contradicted",
			"blocked",
			"out-of-scope",
			"unknown"
		]);
		obligationLayerSchema = z.enum([
			"cli",
			"protocol",
			"electron",
			"persistence",
			"process",
			"runtime",
			"packaging",
			"native-abi",
			"application",
			"other"
		]);
		obligationCaseKindSchema = z.enum([
			"positive",
			"negative",
			"malformed",
			"cancellation",
			"teardown"
		]);
		obligationProofAuthoritySchema = z.enum([
			"unit",
			"integration",
			"protocol",
			"renderer",
			"packaged-process",
			"native-abi",
			"live-observation",
			"external"
		]);
		obligationOriginalAuthoritySchema = z.enum([
			"static",
			"runtime",
			"process",
			"external"
		]);
		obligationEvidenceStateSchema = z.enum([
			"candidate",
			"observed",
			"reviewed",
			"unknown"
		]);
		obligationTargetSchema = z.strictObject({
			artifact_sha256: digestSchema.nullable(),
			application_node_id: z.string().regex(/^jag_node_[a-f0-9]{64}$/u).nullable(),
			semantic_node_id: z.string().regex(/^jsrg_node_[a-f0-9]{64}$/u).nullable(),
			location: textSchema
		});
		authorityReferenceSchema = z.strictObject({
			evidence_id: evidenceIdSchema,
			authority: evidenceAuthoritySchema,
			state: obligationEvidenceStateSchema,
			location: textSchema
		});
		observedCaseSchema = z.strictObject({
			kind: obligationCaseKindSchema,
			evidence_id: evidenceIdSchema,
			location: textSchema
		});
		ownerBindingSchema = z.strictObject({
			module_path: textSchema,
			symbol: textSchema,
			owner_sha256: digestSchema
		});
		parserTypeBindingSchema = z.strictObject({
			parser: textSchema,
			schema: textSchema,
			domain_type: textSchema
		});
		fixtureBindingSchema = z.strictObject({
			fixture_id: stableIdSchema,
			case_kind: obligationCaseKindSchema,
			authority: obligationProofAuthoritySchema,
			evidence_ids: z.array(evidenceIdSchema).min(1)
		});
		nondeterminismSchema = z.strictObject({
			mode: z.enum([
				"total-order",
				"partial-order",
				"finite-traces"
			]),
			specification: textSchema
		});
		verifierBindingSchema = z.strictObject({
			verifier_id: stableIdSchema,
			claim_id: stableIdSchema,
			command: textSchema,
			authority: obligationProofAuthoritySchema,
			status: z.enum([
				"pass",
				"fail",
				"unknown",
				"unsupported",
				"skipped"
			]),
			result_evidence_id: evidenceIdSchema,
			enumerated_obligation_ids: z.array(stableIdSchema).min(1),
			nondeterminism: nondeterminismSchema
		});
		reconstructionObligationManifestBindingSchema = z.strictObject({
			obligation_id: stableIdSchema,
			owner: ownerBindingSchema,
			parser_type: parserTypeBindingSchema.nullable(),
			original_cases: z.array(observedCaseSchema),
			fixtures: z.array(fixtureBindingSchema),
			verifier: verifierBindingSchema.nullable()
		});
		reconstructionObligationManifestSchema = z.strictObject({
			bindings: z.array(reconstructionObligationManifestBindingSchema),
			contradictions: z.array(z.strictObject({
				obligation_id: stableIdSchema,
				evidence_ids: z.array(evidenceIdSchema).min(2)
			}))
		});
		reviewedReconstructionObligationSchema = z.strictObject({
			obligation_id: stableIdSchema,
			obligation_version: z.number().int().min(1),
			title: textSchema,
			application_layer: obligationLayerSchema,
			family: textSchema,
			target: obligationTargetSchema,
			required: z.boolean(),
			required_case_kinds: z.array(obligationCaseKindSchema).min(1),
			required_original_authority: obligationOriginalAuthoritySchema,
			required_fixture_authority: obligationProofAuthoritySchema,
			required_verifier_authority: obligationProofAuthoritySchema,
			requires_parser_type: z.boolean(),
			dependency_obligation_ids: z.array(stableIdSchema),
			residual_unknown_ids: z.array(stableIdSchema),
			unavailable_authority: z.array(textSchema),
			required_next_evidence: z.array(textSchema),
			disposition: z.enum([
				"active",
				"blocked",
				"out-of-scope"
			]),
			review_evidence_ids: z.array(evidenceIdSchema).min(1)
		});
		diagnosticSchema = z.strictObject({
			code: z.enum([
				"duplicate-definition",
				"missing-owner",
				"ambiguous-owner",
				"missing-parser-type",
				"missing-original-case",
				"weak-original-case-authority",
				"missing-case",
				"weak-fixture-authority",
				"missing-verifier",
				"verifier-does-not-enumerate",
				"missing-verifier-result",
				"weak-verifier-authority",
				"verifier-failed",
				"static-only",
				"contradiction",
				"contradiction-evidence-missing",
				"residual-unknown",
				"dependency-missing",
				"dependency-open",
				"unavailable-authority",
				"blocked",
				"out-of-scope"
			]),
			detail: textSchema
		});
		reconstructionObligationSchema = z.strictObject({
			obligation_id: stableIdSchema,
			obligation_version: z.number().int().min(1),
			title: textSchema,
			origin: z.enum(["generated", "reviewed"]),
			application_layer: obligationLayerSchema,
			family: textSchema,
			target: obligationTargetSchema,
			authority_references: z.array(authorityReferenceSchema).min(1),
			source_state: obligationEvidenceStateSchema,
			observed_cases: z.array(observedCaseSchema),
			required: z.boolean(),
			required_case_kinds: z.array(obligationCaseKindSchema).min(1),
			required_original_authority: obligationOriginalAuthoritySchema,
			required_fixture_authority: obligationProofAuthoritySchema,
			required_verifier_authority: obligationProofAuthoritySchema,
			requires_parser_type: z.boolean(),
			dependency_obligation_ids: z.array(stableIdSchema),
			residual_unknown_ids: z.array(stableIdSchema),
			unavailable_authority: z.array(textSchema),
			required_next_evidence: z.array(textSchema),
			binding: reconstructionObligationManifestBindingSchema.nullable(),
			status: obligationStatusSchema,
			diagnostics: z.array(diagnosticSchema)
		});
		countBySchema = (key) => z.array(z.strictObject({
			key,
			count: z.number().int().min(0)
		}));
		countEntriesMatch = (actual, expected) => {
			const actualCounts = new Map(actual.map(({ key, count }) => [key, count]));
			return actualCounts.size === actual.length && actual.length === expected.length && expected.every(({ key, count }) => actualCounts.get(key) === count);
		};
		obligationSummariesMatch = (actual, expected) => actual.total === expected.total && actual.required === expected.required && actual.verified === expected.verified && actual.required_open === expected.required_open && countEntriesMatch(actual.by_status, expected.by_status) && countEntriesMatch(actual.by_application_layer, expected.by_application_layer) && countEntriesMatch(actual.by_evidence_authority, expected.by_evidence_authority) && countEntriesMatch(actual.by_source_state, expected.by_source_state);
		reconstructionObligationLedgerSchema = z.strictObject({
			schema: z.literal("ReconstructionObligationLedger"),
			ledger_id: prefixedDigestSchema("rol"),
			closure_digest: digestSchema,
			status: z.enum([
				"ready",
				"open",
				"failed",
				"unknown"
			]),
			coverage: z.strictObject({ status: z.enum(["complete", "partial"]) }),
			summary: z.strictObject({
				total: z.number().int().min(0),
				required: z.number().int().min(0),
				verified: z.number().int().min(0),
				required_open: z.number().int().min(0),
				by_status: countBySchema(obligationStatusSchema),
				by_application_layer: countBySchema(obligationLayerSchema),
				by_evidence_authority: countBySchema(evidenceAuthoritySchema).describe("Obligations per Evidence authority. An obligation counts once under each distinct authority among its authority_references, so counts can sum above total."),
				by_source_state: countBySchema(obligationEvidenceStateSchema).describe("Obligations per source_state; each obligation counts once.")
			}),
			reports: z.strictObject({
				missing_owner_obligation_ids: z.array(stableIdSchema),
				missing_verifier_obligation_ids: z.array(stableIdSchema),
				contradicted_obligation_ids: z.array(stableIdSchema),
				residual_unknown_ids: z.array(stableIdSchema)
			}),
			ownership_graph: z.array(z.strictObject({
				obligation_id: stableIdSchema,
				module_path: textSchema,
				symbol: textSchema
			})),
			dependency_graph: z.array(z.strictObject({
				obligation_id: stableIdSchema,
				depends_on_obligation_id: stableIdSchema
			})),
			obligations: z.array(reconstructionObligationSchema),
			evidence_links: z.array(evidenceIdSchema),
			limitations: z.array(textSchema)
		}).superRefine((ledger, context) => {
			if (ledger.status !== reconstructionObligationLedgerStatus(ledger.obligations, ledger.limitations)) context.addIssue({
				code: "custom",
				path: ["status"],
				message: "Ledger status does not match its obligations"
			});
			if (!obligationSummariesMatch(ledger.summary, summarizeReconstructionObligations(ledger.obligations))) context.addIssue({
				code: "custom",
				path: ["summary"],
				message: "Ledger summary does not match its obligations"
			});
			if (ledger.closure_digest !== reconstructionObligationLedgerClosureDigest(ledger)) context.addIssue({
				code: "custom",
				path: ["closure_digest"],
				message: "Ledger closure digest does not match its contents"
			});
			if (ledger.coverage.status !== reconstructionObligationCoverage(ledger.limitations).status) context.addIssue({
				code: "custom",
				path: ["coverage"],
				message: "Ledger coverage does not match its limitations"
			});
			const expectedReports = reconstructionObligationReports(ledger.obligations);
			for (const key of [
				"missing_owner_obligation_ids",
				"missing_verifier_obligation_ids",
				"contradicted_obligation_ids",
				"residual_unknown_ids"
			]) if (!sameProjection(ledger.reports[key], expectedReports[key])) context.addIssue({
				code: "custom",
				path: ["reports", key],
				message: "Ledger report does not match its obligations"
			});
			if (!sameProjection(ledger.ownership_graph, reconstructionObligationOwnershipGraph(ledger.obligations))) context.addIssue({
				code: "custom",
				path: ["ownership_graph"],
				message: "Ownership graph does not match its obligations"
			});
			if (!sameProjection(ledger.dependency_graph, reconstructionObligationDependencyGraph(ledger.obligations))) context.addIssue({
				code: "custom",
				path: ["dependency_graph"],
				message: "Dependency graph does not match its obligations"
			});
			const ledgerEvidenceIds = new Set(ledger.evidence_links);
			if (ledgerEvidenceIds.size !== ledger.evidence_links.length) context.addIssue({
				code: "custom",
				path: ["evidence_links"],
				message: "Evidence links must be unique"
			});
			if (reconstructionObligationEvidenceIds(ledger.obligations).some((evidenceId) => !ledgerEvidenceIds.has(evidenceId))) context.addIssue({
				code: "custom",
				path: ["evidence_links"],
				message: "Evidence links omit Evidence referenced by an obligation"
			});
		});
		reconstructionObligationLedgerInputSchema = z.strictObject({
			evidence_bundle: evidenceBundleSchema,
			reviewed_obligations: z.array(reviewedReconstructionObligationSchema),
			manifest: reconstructionObligationManifestSchema
		});
	})))();
}

//#endregion
export { BINARY_ARCHITECTURES, BROWSER_SCENARIO_START_STEP_ID, CDP_CLEANUP_GRACE_MS, CDP_DISCOVERY_RESPONSE_TIMEOUT_MS, CLI_COMMANDS, CLI_COMMAND_NAMES, COMPACT_INPUT_SCHEMA_BUDGET_BYTES, DEFAULT_BROWSER_SCENARIO_CAPTURE_LIMITS, DEFAULT_CDP_COMMAND_TIMEOUT_MS, DEFAULT_DISPATCH_METADATA_INPUT_BYTES, DEFAULT_NATIVE_COMMAND_TIMEOUT_MS, DEFAULT_NATIVE_UI_DEADLINE_MS, DEFAULT_PWNTOOLS_TIMEOUT_MS, DuplicateEvidenceRecordError, ELECTRON_FUSE_SENTINEL, IDENTIFIER_PATTERN, MACHO_CPU_TYPES, MAXIMUM_DISPATCH_METADATA_INPUT_BYTES, MAX_BROWSER_DEADLINE_MS, MAX_ENHANCED_RECORDS, MAX_NATIVE_TIMER_MS, NATIVE_INVENTORY_OPERATIONS, NATIVE_UI_WAIT_STEP_MAX_MS, NonCanonicalEvidenceBundleError, PLAYWRIGHT_RESPONSE_BODY_PROVENANCE_LIMITATION, PRODUCT_IDENTITY, PROVIDER_REJECTION_CODES, RAW_ONLY_ARCHITECTURES, SDK_IDENTITY, WEB_NETWORK_CAPTURE_FORMATS, WEB_NETWORK_CAPTURE_LIMITS, WEB_RUNTIME_LIMITS, ZIP_NON_ENTRY_LIMITATION, ZIP_PACKAGE_FORMATS, absenceClaimable, absoluteLocalPathStringSchema, addressCoordinate, addressedValueSchema, analysisBookmarkSchema, analysisInputErrorFromIssues, analysisProfileSchema, analysisProfilesEqual, analysisProviderIdSchema, analysisProviderSelectorSchema, analysisStringSchema, androidApplicationProjectionInputSchema, androidApplicationProjectionResultSchema, appleApplicationProjectionInputSchema, appleApplicationProjectionResultSchema, artifactContradictionId, artifactEdgeId, artifactEdgeSchema, artifactExtractionResultSchema, artifactFormatMetadataSchema, artifactGraphDigest, artifactGraphManifestSchema, artifactIdForContent, artifactInspectionResultSchema, artifactInventoryCoverageSchema, artifactInventoryResultSchema, artifactManifestId, artifactNodeSchema, artifactOccurrenceSchema, artifactTraversalOmissionKindSchema, assessFunctionCallCoverage, availableReferenceKindSchema, browserAllowedOriginsSchema, browserCompletenessSchema, browserDeadlineIncrease, browserDeadlineRetry, browserEndpointSchema, browserObservationEndpointSchema, browserOriginSchema, browserScenarioActionSchema, browserScenarioBrowserSchema, browserScenarioCaptureSchema, browserScenarioCaptureSchema$1, browserScenarioCompletenessSchema, browserScenarioEnvironmentSchema, browserScenarioEventSchema, browserScenarioSecretSchema, browserScenarioStepSchema, browserScenarioStorageSchema, browserScenarioUrlSchema, browserStepArtifactsSchema, browserTargetListSchema, browserVersionSchema, buildInterfaceBuilderAnalysis, bundleResourceBoundResultSchema, bundleResourceRootSchema, canonicalBase64Schema, canonicalJson, canonicalJsonDigestSteps, captureSensitiveValues, captureWebScreenshotInputSchema, cdpCleanupGraceExpired, cdpCommandDeadlineRecovery, cdpCommandTimeoutIsSelectable, cdpCommandTimeoutUnrelatedControl, classifyBrowserCompleteness, classifyBrowserScenarioCompleteness, classifySwiftSymbol, cliMetadataGuidSchema, combineFunctionRelationshipCoverage, commentProjection, committedProviderSchema, compactPresentationForMcpInputSchemaProfile, compareUnicodeCodePoints, compareWebScreenshotsInputSchema, compositeKey, createAnalysisProfile, createArtifactInspection, createEvidence, createEvidenceBundle, createHistoricalSourceGraph, createHistoricalSourceManifest, createImmutableEvidenceBundle, createImmutableEvidenceSteps, createPlistNumberCollector, createPlistNumberProjection, createReferenceSourcePathLookup, createResidualUnknown, createWebScreenshotArtifact, createWebTextArtifact, decodeCanonicalBase64, describeElectronFuseFindings, describeEvidenceBundleFailure, describeValidationFailure, desktopPathConventions, digestCanonicalValue, digestProcessCommitment, digestSchema, dimensionResult, electronActiveObservationInputSchema, electronActiveObservationResultSchema, electronActiveProcessMetricSchema, electronActiveTimelineEventSchema, electronActiveWindowSchema, electronFuseName, electronFuseReportSchema, electronFuseState, electronPageInspectionSchema, electronTargetListSchema, emptyArraySchema, enhancedInputSchemas, err, evaluateReconstructionClosure, evidenceBundleForTarget, evidenceBundleSchema, evidenceInputSchema, evidenceLocationSchema, evidenceSchema, fixedNativeAllowance, fixedTupleSchema, functionBodyEntryAgrees, functionBodySchema, functionComparisonInputSchema, functionComparisonResultSchema, functionDossierSchema, functionInstructionWindowSchema, functionMatch, harmonyApplicationProjectionInputSchema, harmonyApplicationProjectionResultSchema, hasCaptureTruncation, hasCompleteInventoryCoverage, hasReconstructionObligationDiagnostic, hasZipSignature, historicalSourceGraphSchema, historicalSourceInventoryHasPartialFacts, historicalSourceLanguages, historicalSourceManifests, historicalSourceParseFailureKey, historicalSourceRelationshipKey, identityProjection, immutableEvidence, incompletePlistNumberLimitation, inferJsonShape, init_addressCoordinate, init_analysisProfile, init_androidApplication, init_appleApplication, init_artifactFormatMetadata, init_artifactGraph, init_artifactIdentity, init_artifactInspection, init_artifactInventoryEvidence, init_binaryTargetTypes, init_browserCompleteness, init_browserDeadline, init_browserNetworkEvidence, init_browserObservation, init_browserObservationSchemas, init_browserScenarioCapture, init_browserScenarioCaptureLimits, init_browserScenarioCaptureValues, init_browserScenarioValues, init_bundleResourceRoot, init_canonicalDigest, init_canonicalJsonDigestSteps, init_canonicalOrdering, init_cliCommandNames, init_comparisonSemantics, init_digests, init_electronActiveObservation, init_electronFuses, init_electronObservation, init_emptyArraySchema, init_enhancedInputs, init_evidence, init_evidenceBundle, init_evidenceReference, init_fixedTupleSchema, init_functionCallCoverage, init_functionComparisonNormalization, init_functionComparisonResults, init_functionComparisonSchemas, init_harmonyApplication, init_hopperValues, init_identity, init_inputIssueProjection, init_interfaceBuilderGraph, init_interfaceBuilderKeyedArchive, init_javascriptRuntimeObservation, init_jsonShape, init_jsonStringByteLength, init_jsonValueByteLength, init_localPath, init_machoCpuIdentity, init_machoTargetSelection, init_managedArtifact, init_mcpInputSchemaProfile, init_mcpOutputSchemaProfile, init_nativeApiBoundary, init_nativeCallReference, init_nativeConvention, init_nativeDeadlines, init_nativeInstruction, init_nativeInventory, init_nativeInvestigationGraph, init_nativeValueFlow, init_nativeValueTrace, init_objcSwiftMetadata, init_plistNumbers, init_processCapture, init_processCaptureCoverage, init_processCaptureParsing, init_processScenario, init_protobufWire, init_providerSelection, init_qlogCapture, init_reconstructionCoverage, init_reconstructionCoverageInput, init_reconstructionObligationLedgerIntegrity, init_reconstructionObligationLedgerSchemas, init_recordedTransportUrl, init_referenceSourceGraph, init_referenceSourcePathIdentity, init_relationshipCoverage, init_residualUnknown, init_result, init_safeJson, init_stringPatterns, init_swiftSymbolClassification, init_unicodeCodePointOrder, init_urlComponents, init_webContentArtifact, init_webNetworkCapture, init_webRuntime, init_webScreenshot, init_zipPackageFormat, inspectElectronFusesInputSchema, inspectElectronPageInputSchema, inspectNativeDispatchMetadata, inspectWebNetworkCaptureInputSchema, inspectWebPageInputSchema, inspectWebPageWithSourceInputSchema, integrityContradictionSchema, interfaceBuilderAnalysisSchema, interfaceBuilderConnectionFieldNames, interfaceBuilderDocumentSchema, interfaceBuilderLimitsSchema, isAppleDispatchMetadataTarget, isAutoName, isDigest, isElfMetadataArchitecture, isImmutableEvidence, isInterfaceBuilderConnectionClass, isLiteralLoopbackHostname, isMachOFormat$1 as isMachOFormat, isNativeInventoryOperation, isPaddedBase64, isPathWithinRoot, isPortableAbsoluteReferenceTarget, isSwiftMangledSymbolName, isUIKitRuntimeConnectionClass, isZipPackageFormat, iterateUrlQueryParameters, javascriptRuntimeKindSchema, javascriptRuntimeObservationSchema, javascriptRuntimeTargetListSchema, javascriptRuntimeUnresolvedLocationSchema, joinInterfaceBuilderDispatch, jsonStringByteLength, jsonValueByteLength, jsonValueType, listBrowserTargetsInputSchema, listElectronTargetsInputSchema, listJavaScriptRuntimeTargetsInputSchema, localPathStringSchema, localVariableSchema, locateTrailingZipArchive, logicalPathEscapesRoot, logicalPathNfc, machoCpuSubtypeBase, machoSelectionContainsRange, machoSliceArchitectureSchema, machoTargetSelectionMatchesArchitecture, machoTargetSelectionMatchesFormat, machoTargetSelectionSchema, managedArtifactInspectionSchema, managedMemberInspectionSchema, managedMetadataTokenSchema, managedNativeBoundaryInspectionSchema, managedNativeImportSchema, mcpInputSchemaProfileSchema, mcpOutputSchemaProfileSchema, metadataReportSubjectFormat, nativeApiBoundarySchema, nativeApiInspectionResultSchema, nativeCallClassificationSchema, nativeCallTargetsSchema, nativeCommandTimeoutField, nativeDeadlineRecovery, nativeDispatchMetadataResultSchema, nativeInstructionInputSchema, nativeInstructionSchema, nativeInventoryOperationSchema, nativeInventoryRowsSchemas, nativeInvestigationCoverageSchema, nativeInvestigationEdgeSchema, nativeInvestigationGraphSchema, nativeInvestigationNodeSchema, nativeInvestigationProviderSchema, nativeInvestigationTraceSchema, nativeUiDeadlineField, nativeValueFlowSchema, nativeValueTraceInputSchema, nativeValueTraceSchema, noRuntimeOverrideSentence, normalizeCfg, normalizeJoinedLogicalPath, nulFreeStringSchema, objcClassImportIdentitySchema, objcSwiftMetadataSchema, observeJavaScriptRuntimeInputSchema, occurrenceIdForLocation, ok, optionalBrowserDeadlineMs, overallStatus, parseArtifactInspectionInventoryResult, parseArtifactInventoryEvidence, parseArtifactInventoryResult, parseDocuments, parseEvidence, parseEvidenceBundle, parseFunctionDossier, parseImmutableEvidenceBundle, parseJsonObject, parseListCount, parseMcpInputSchemaProfile, parseMcpOutputSchemaProfile, parseProcessCapture, parseRecordedTransportUrl, parseRelatedAddresses, parseSegments, parseUrlQueryParameterNames, partialProcessCaptureObservationSchema, prefixedDigestSchema, procedureClassificationSchema, procedureIdentitySchema, processCaptureSchema, processComparisonContract, processScenarioCommitment, processScenarioSchema, processSourceTruncated, profileMachoTargetSelection, projectAndroidApplication, projectAppleApplication, projectBinaryOverview, projectHarmonyApplication, projectInputIssues, protobufCaptureCoverageSchema, protobufDecodingObjectSchema, protobufDecodingSchema, protobufFieldSchema, protobufFrameSchema, providerSchema, pwntoolsTimeoutField, qlogCaptureFactsSchema, readNativeDeadline, rebindEvidenceSubjectTargetPath, rebindEvidenceToTargetPath, reconstructionClosureResultSchema, reconstructionCoverageEvaluationInputSchema, reconstructionObligationCoverage, reconstructionObligationDependencyGraph, reconstructionObligationEvidenceIds, reconstructionObligationLedgerClosureDigest, reconstructionObligationLedgerInputSchema, reconstructionObligationLedgerSchema, reconstructionObligationLedgerStatus, reconstructionObligationOwnershipGraph, reconstructionObligationReports, recordUnknownInputSchema, recordedBrowserObservationEndpointSchema, recordedPathSegments, referenceEdgeSchema, referenceKindSchema, relationshipCoverageSchema, residualUnknownSchema, retainedEvidenceReferenceSchema, safeParseJson, safeParseOwnedWebNetworkCapture, sameMachoTargetSelection, sanitizeBrowserUrl, sanitizeEndpointCandidate, selectedBrowserDeadlineMs, selectedCdpCommandTimeoutMs, selectedSliceAgreesWithReport, selectedWebNetworkCaptureTimeoutMs, serializeEvidenceBundle, sorted, stringAndNameProjection, summarize, summarizeReconstructionObligations, swiftLiteralSitesConflict, traceNativeInvestigationGraph, uniqueSorted$1 as uniqueSorted, unresolvedCallSchema, unresolvedDimension, updateResidualUnknown, updateUnknownInputSchema, urlDeclaresQueryOrFragment, validateAnalysisProfileProvider, validateArtifactInventorySubject, validateResidualUnknownAddition, webNetworkCaptureArtifactSchema, webNetworkCaptureBinaryDescriptorSchema, webNetworkCaptureDecoderSchema, webNetworkCapturePayloadSchema, webNetworkCaptureRecordSchema, webNetworkCaptureSchema, webNetworkCaptureTimeoutRecovery, webPageInspectionSchema, webRuntimeCommandTimeoutSchema, webRuntimeLocationSchema, webRuntimeScopeSchema, webRuntimeSourceSchema, webRuntimeTargetSchema, webScreenshotDiffSchema, webScreenshotSchema, webTextArtifactMetadataSchema, webTextArtifactSchema, zipPackageFormatForPath, zipRootPackageFormat };