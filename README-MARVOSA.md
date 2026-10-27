# REA × Marvosa — HCL Edition

A complete REA source tree with nine Marvosa capabilities in the existing CLI and MCP server, including integrated source analysis and executable HCL transcription. The HCL arithmetic, memory and byte transducer are copied **without modification** from Anthony Jordon's Marvosa repository. Existing REA analysis providers remain available.

This is version `6.7.0-marvosa.10`, a private, locally installable derivative. It is not an npm release or an upstream REA release.

## Everyday use

Ordinary HCL commands display their requested result without parameter echoes, engine constants, or operation-trace dumps. Use `--json` to export complete Evidence or save a replayable program. Explicit `--format`, `--full-output`, and `--filter-output` options retain the complete output contract. MCP responses also retain that contract for agents.

Opening REA, reading help, or connecting an MCP client does not launch the HCL worker or run test suites. Source calls execute only when requested through `--entry` or `--calls`. Diagnostics, benchmarks, and case verification are explicit commands. Necessary integrity checks, including the original 1/137 check and saved-program authentication, run silently during the operation that needs them; failures remain visible.

Complete source-memory regeneration is opt-in: `hcl-transcribe PATH
--verify-memory` or MCP `verify_memory: true`. Without it, the full JSON result
reports `source_regeneration_verified: null`, meaning not requested. This does
not change HCL mathematics, source intake, or the complete recorded operation
history. The explicit development qualification runners enable this check.

The installable npm package excludes development experiments, benchmark captures, and integration verification scripts. These remain in the full source distribution for reviewers and explicit developer verification.

MCP logging defaults to warnings and errors; normal CLI logging stays silent.
Set `REA_LOG_LEVEL=info` or `debug` when investigating a problem. These logging
settings do not enable benchmarks or verification runs.

## Whole packages and connected workflows

Supply a complete project directory and call its normal exports. The captured package entry and dependencies resolve automatically. Calls can pass live results to later calls, construct source objects, and invoke their methods without a handwritten target driver. Analysis and execution use the original HCL arithmetic; complete operation words are compressed as they are emitted. See [the project workflow and real compression qualification](docs/hcl-projects.md).

## Analyze and transcribe together

REA can now read complete Python or JavaScript/TypeScript source and build its HCL operation graph while analyzing it. Numeric constant analysis uses the original HCL engine. Supplied calls execute that same graph with HCL values, including loops, branches, functions and Boolean/word operations. Full source files enter native LivingMemory during analysis. JSON data also has a lowering path.

After building, this runs the complete installed Base64 module through HCL:

```sh
node scripts/rea.mjs hcl-transcribe node_modules/base64-js/index.js --entry fromByteArray --arguments '[[72,67,76]]' --json > codec.hcl.json
node scripts/rea.mjs hcl-run codec.hcl.json --entry toByteArray --arguments '["SENM"]' --json
```

The first result contains `SENM`, its operation braid, the executable graph and complete source. The second runs the saved graph and recovers the three bytes. A directory input reads all its files; the package entry is selected automatically when known, and `--module` can choose an exact relative module path. See [the transcription guide](docs/hcl-transcription.md) for multi-call use, supported behavior and real-source verification.

This is a source analysis/transcription path with original HCL arithmetic. Host code still reads syntax and handles containers/control. It does not replace all existing REA provider internals. Unimplemented source constructs, binary semantics and natural-language instructions remain explicit unknowns with their complete content retained; this release does not claim a universal executable translator.

## Objects, classes and connected source modules

Version `.7` adds JavaScript/TypeScript classes and public fields, method receivers and lexical arrows, destructuring, property descriptors, shared typed-array views and live named module bindings. These are general interpreter capabilities; the product contains no source-map-specific algorithm.

The real-source qualification runs the complete `@jridgewell/sourcemap-codec` package through HCL, including its original TypeScript files. It decodes all 1,014 entries in a complete `resolve-uri` source map and re-encodes exactly the original mapping string. See [the executed case and scope](docs/hcl-objects.md).

## Start with HCL immediately

Python 3.10 or newer, standard library only:

```sh
python3 scripts/marvosa.py calculate 'E = m * c^2 + 0.1 + 0.2' --variable m=2 --variable c=3
```

On Windows, use `py` or `python` instead of `python3` and double quotes around the expression. This produces `18.3000000000000000000000000000000000000000`, the fixed-point integer, scale, operation braid and three engine integrity reports.

The standalone entry point runs the HCL tools in the current Python process. It never launches analysis targets. It is useful when only case access or arithmetic is needed.

## Build the full REA integration

Use the Node version in `.nvmrc` and npm version in `package.json` for reproducible builds. The implementation was built with Node 24.19.0. Python 3.10+ is required when an HCL operation runs.

```sh
npm ci
npm run build:cached
node scripts/rea.mjs hcl-calculate 'E = m * c^2' --variable m=2 --variable c=3 --json
```

If the release includes prebuilt `dist/`, dependency installation is still required. `npm link` can expose the local `rea` executable; alternatively keep using the explicit script path. Do not use `npx rea-marvosa` or `rea update`: this derivative has not been published to a package registry. Update from a reviewed replacement source bundle.

`npm run verify:marvosa` exercises the seven forensic HCL commands through the native CLI and stdio MCP server, exact case recovery, and Linux cancellation with an unrelated-process control. `npm run verify:marvosa-transcription` exercises the new integrated workflow and saved-program runner through the real CLI/MCP server. The forensic verifier also checks ancestor-mounted Linux procfs without a replacement `ps`.

## Investigation workflow

Run an existing REA analysis command and save its JSON evidence. For example, inspect an authorized ZIP application bundle:

```sh
node scripts/rea.mjs inspect-artifact /absolute/path/application.zip --json > application-evidence.json
node scripts/rea.mjs hcl-remember-evidence ./cases/build-v1 application-evidence.json --source application-inventory --json
node scripts/rea.mjs hcl-recall-evidence ./cases/build-v1 'search database' --json
node scripts/rea.mjs hcl-verify-case ./cases/build-v1 --json
```

Use the returned `record_id` with `hcl-get-evidence CASE RECORD_ID --json` to recover complete, byte-identical JSON through Marvosa's verified HVP inverse. Use the same `--source` label when importing the next version, then:

```sh
node scripts/rea.mjs hcl-compare-cases ./cases/build-v1 ./cases/build-v2 --json
```

The standalone equivalents are `python3 scripts/marvosa.py remember`, `recall`, `get`, `inspect`, `verify` and `compare`. Run each with `--help` for arguments. The two interfaces use the same case format and engine.

## Native commands and tools

| CLI                               | MCP tool                | Result                                                                   |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------ |
| `hcl-transcribe PATH`             | `hcl_transcribe`        | Joint source analysis and executable HCL graph, with optional calls      |
| `hcl-run PROGRAM`                 | `hcl_run`               | Execute a saved graph with exact lattice results and source-linked braid |
| `hcl-calculate EXPRESSION`        | `hcl_calculate`         | Integer HCL arithmetic, decimal display, braid and alpha checks          |
| `hcl-remember-evidence CASE FILE` | `hcl_remember_evidence` | Atomic evidence retention and composite memory identity                  |
| `hcl-recall-evidence CASE QUERY`  | `hcl_recall_evidence`   | Native HCL resonance ranking, excerpts and provenance                    |
| `hcl-get-evidence CASE RECORD_ID` | `hcl_get_evidence`      | Complete original JSON with HVP and digest verification                  |
| `hcl-inspect-case CASE`           | `hcl_inspect_case`      | Coverage, confidence categories and unresolved source links              |
| `hcl-verify-case CASE`            | `hcl_verify_case`       | Recomputed HVP addresses, byte recovery, digests and memory line         |
| `hcl-compare-cases LEFT RIGHT`    | `hcl_compare_cases`     | Added, removed and changed evidence sets, preserving ambiguity           |

MCP remembering can select existing session evidence through `evidence_ids`. It resolves those IDs through REA's actual ledger and preserves the original records and links. This avoids copying full evidence back through the agent context. Raw imports accept `{ "source": "stable-label", "raw_json": "original JSON object" }` entries. Confidence labels are retained as supplied, and missing labels remain `unknown`.

## Connect to an MCP client

Configure the local source build directly:

```json
{
  "mcpServers": {
    "rea-marvosa": {
      "command": "node",
      "args": ["/absolute/path/rea-marvosa/scripts/rea.mjs", "mcp"],
      "env": { "REA_MARVOSA_PYTHON": "python3" }
    }
  }
}
```

On Windows, select `python` or the absolute path to your Python executable. Existing REA tools and the nine HCL tools share one server. MCP outputs retain REA's evidence and untrusted-target-content framing. Configuration is manual; this package does not change your client settings automatically.

## What was re-engineered

The new shared application service connects REA Evidence to Marvosa's `HCLMemory`, `HCLTranscriber` and HVP transducer. CLI and MCP use the same contracts, output schemas, input validation, evidence semantics and worker adapter. Worker lifetime uses REA's existing process ownership and cancellation machinery. New cases are transactionally stored; duplicate imports are idempotent; simultaneous writers cannot overwrite each other's records.

For the seven forensic case tools, Marvosa's memory line is the compact composite identity. Their per-record terms are recreated in RAM from retained forensic evidence. Original JSON bytes remain in the case because the line alone does not reconstruct them. No converted standard-model checkpoint, embeddings, remote API, substitute arithmetic engine or invented HCL formulas are used.

This release adds an HCL layer to REA. It does not port every existing decompiler or parser to HCL, and does not establish universal reverse-engineering accuracy or performance superiority. See [architecture and operation mapping](docs/marvosa-integration.md) and [executed validation](docs/marvosa-validation.md).

The [real Notion case](docs/notion-real-case.md) repeats a published REA feature investigation against the current shipped package: an extracted-function replay, native HCL retention, a fresh-process byte-identity check, and the actual recall results, including a weak negative-query ranking.

## Resident native HCL AI

The resident AI includes the original `HCLLanguageModel` and `LivingMemory`, with all five native source files verified against the pinned Marvosa commit. MST and translated standard-model components are excluded. The native AI has a separate resident JSON-lines entry point:

```sh
python3 -I -B scripts/hcl-ai.py
```

Each input line is one JSON request. The same instance handles every request until EOF:

```jsonl
{"operation":"experience","evidence_id":"example","text":"Joplin stores notes in database.sqlite."}
{"operation":"ask","prompt":"Joplin stores notes"}
{"operation":"feedback","evidence_ids":["example"]}
{"operation":"get","evidence_id":"example"}
{"operation":"status"}
```

The native AI stores the complete supplied text, learns through its own `train`, answers through `interact`, recalls through its two-sense living memory, and regenerates through the verified native inverse. Repeated evidence reinforces the existing trace; feedback strengthens selected evidence and applies the native decay cycle. Live state stays in RAM for the session. Arbitrary-precision integers cross the JSON boundary as decimal strings when needed by JavaScript clients. This standalone session is separate from the existing seven CLI/MCP forensic tools; it does not silently replace their case format or advertise a new MCP tool.

Version `.5` enables the verified refresh scheduler in normal `experience` and `ask` requests. Every original trace update still runs; the native composite and signature are rebuilt once at the end of the complete turn. The final signature is ready before the reply or evidence recall. This is automatic in the application, with no experimental flag. The five original engine files are unchanged.

The [Joplin and SQLite results](docs/native-hcl-ai-results.md) include actual application workflows, fresh-versus-resident native AI timings, verified-feedback results, memory measurements and generated answers. Reproducible drivers and captured evidence are in `experiments/marvosa-native-ai/`.

The continued-experience experiment measures learning at one, two, four and eight additional passes. Native interaction with complete readable descriptions improved clean completion from 0/20 to 20/20 after two passes and retained that score through eight. This measures learned sentence order; the separate unfamiliar English-question checks remain unsuccessful. All original evidence remained exact. The verified scheduler reduced the earlier repeated-training control from 183.42 to 6.31 CPU seconds with identical checked states and outputs. It is now integrated into the resident application; actual command-line before/after measurements are recorded separately in the [integration results](docs/native-hcl-ai-results.md#production-integration).

## Operational bounds

Version `.3` removes the integration-added record/case/batch quotas and the 4096-character indexing cutoff. Each complete input is passed through the original byte transducer as one record, not split into intake chunks. Native HCL memory receives the complete selected normalized content. Case comparison groups by source, operation and subject path; ambiguous multiple observations are never silently paired. Existing v1 cases remain readable and verifiable; an explicit remember request atomically upgrades their verified evidence to full-content indexing without changing record IDs or original bytes.

Native workers have no integration-imposed work deadline, memory cap or concurrency quota. Complete requests and replies use owned private files, independently of bounded process diagnostics. Caller cancellation and confirmed cleanup remain enforced; unresolved cleanup blocks new admission. Python/Node/SQLite, available memory/disk and the actual MCP client's request/response constraints still apply and are not represented as Marvosa capacity limits. Large MCP results can be retained and exported through REA's existing evidence facilities. On Linux, REA detects ancestor-mounted procfs and maps kernel PID, parent and group facts into the caller's PID namespace. That path reads procfs directly and does not require `ps`. Hosts with an aligned procfs keep the existing procps inspector. An interrupted save may already have committed: inspect the case or repeat the identical idempotent request.

Arithmetic uses the original 40-digit fixed-point substrate and its series implementations. Reproducibility means the same operations produce the same integer results; it is not a claim of infinite-precision real arithmetic. Scalar domain errors are explicit. Resonance scores are rankings, not calibrated probabilities. Integrity checks establish consistency, not the truth of an inferred conclusion or an external author's authenticity.

## Validation and provenance

```sh
python3 -m unittest discover -s bridge/marvosa -p 'test_*.py' -v
npm run test:focused -- tests/boundary/mcp/marvosaMcp.test.ts src/application/marvosa/MarvosaService.test.ts
npm run check:fast
npm run verify:marvosa
```

- Marvosa: `https://github.com/Ajordon30005/marvosa`, commit `c53cbd0b9e00db1668bae0594a9167ea19487cb8`.
- REA: `https://github.com/morluto/rea`, commit `bd5d189a8f8aeea669bcb93e68af6c046b567939`.
- Exact vendored-file SHA-256 values: `bridge/marvosa/UPSTREAM.json`.

The combined derivative is distributed under GPL-3.0-only. Original REA MIT notices and Marvosa's license are included. See `THIRD_PARTY_NOTICES.md` and `licenses/REA-MIT.txt`.
