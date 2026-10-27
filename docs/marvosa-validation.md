# REA × Marvosa validation

## Current release: `6.7.0-marvosa.10`

Normal CLI output is concise; explicit export formats retain complete Evidence. MCP completion logging is opt-in, and source-memory round-trip verification requires `--verify-memory`. The original HCL arithmetic and saved-program integrity rules are preserved. Developer experiments and verification scripts are excluded from the installable package. `node scripts/verify-marvosa-quiet.mjs` exercises the actual startup, CLI and MCP boundaries.

## Previous whole-project release: `6.7.0-marvosa.9`

[Complete project qualification](hcl-projects.md) runs the unchanged Pako package through normal public exports and stateful workflows. Every compressed/decompressed value is compared with Node, with full source-absent saved-program replay. Full results and exact exercised source are in `experiments/marvosa-projects/results/`.

Both complete runs matched 12 successful outputs and two expected failures.
Their entire 85,746,198-generator words, source ranges, and call observations
were identical. Public CLI/MCP parity, retained large-result delivery, and real
worker cancellation also passed. The release retains 333 earlier real-source
comparisons, seven native Rust WebAssembly comparisons, 205 native WebAssembly
controls, Node language/workflow controls, 23 Python tests, and the successful
build, typecheck, lint, metadata, documentation, and license checks.

## Previous compiled-program qualification

[Compiled WebAssembly transcription](hcl-wasm.md) maps the unchanged Mozilla source-map binary onto the original HCL arithmetic and Boolean compositions. Its full 1,014-entry real-map task matches the native binary. Complete traces now use lossless, authenticated compression; every generator and source link remains recoverable. Captures are in `experiments/marvosa-wasm/results/`.

## Previous release: `6.7.0-marvosa.7`

The [source-map qualification](hcl-objects.md) exercises ordinary objects, classes, public fields, module bindings and shared typed-array storage through the HCL graph. The complete published package and its original TypeScript source are retained. All eight codec exports are exercised; a complete real source map supplies 1,014 mappings across 243 generated lines. The captured results distinguish unchanged OSS execution from focused language controls.

## Previous release: `6.7.0-marvosa.6`

The new `hcl-transcribe` / `hcl_transcribe` path reads complete source snapshots, performs constant analysis with original HCL arithmetic and emits the same graph later executed by `hcl-run` / `hcl_run`. The [transcription guide](hcl-transcription.md) records supported semantics and unresolved adapters.

The real-source qualification covers the full Base64 package's public codec, complete Pako CRC-32/Adler-32 modules and complete CPython `colorsys.py`: 295 primary comparisons against independent originals, plus separate saved-graph runs while source paths are unavailable. Base64/checksums match exactly; the largest observed color-conversion difference is approximately `4.4e-16`. Results and complete braids are in `experiments/marvosa-transcription/results/qualification-final/`.

Actual stdio MCP and CLI observations match, including Evidence identity. The advertised output schema validates the real replies. Changing saved source/program bytes is rejected. Cancelling an actual long CRC graph execution returns `cancelled`, exit 130 and `cleanup: complete`; the subsequent HCL calculation succeeds. All five original engine hashes remain unchanged. This verifies the new workflow, not a rewrite of every existing REA provider or universal semantic translation.

## Native refresh integration: `6.7.0-marvosa.5`

The verified native refresh scheduler is enabled by default in the resident application's `experience` and `ask` operations. Each complete request uses original trace updates and finishes native recomposition before returning its final signature or recalling evidence. All five pinned native engine files remain unchanged. The actual application comparison and its scope are recorded in [production integration](native-hcl-ai-results.md#production-integration).

Actual before/after JSON-lines CLI sessions produced 170 identical responses across the preserved Joplin case and fresh SQLite observations. Whole-session time fell from 348.59 to 32.55 seconds for the 77-request Joplin workload and 279.68 to 32.32 seconds for the 93-request SQLite workload. All 20 evidence records regenerated exactly before and after feedback; all 20 already-learned source sentences completed exactly. The fresh SQLite operations passed eleven checks. REA inspected that database and the production HCL session retained/recalled/recovered the complete 6,097-byte evidence. The integrated adapter also passed 13 complete native-state comparisons and two controlled scheduler-exception checks. Build, documentation/metadata/license/conformance and typecheck/lint checks passed. Full records are in `experiments/marvosa-native-ai/results/integration/`.

## Previous release: `6.7.0-marvosa.4`

The [native HCL AI Joplin/SQLite comparison](native-hcl-ai-results.md) executes real open-source application workflows and the full original native HCL AI. Nine Joplin checks and eleven SQLite checks passed. Six isolated model conditions exercised 48 questions, comparing fresh instances with resident memory and verified feedback. Resident eight-task AI workloads took 8.38 versus 45.40 seconds for Joplin and 4.79 versus 21.21 seconds for SQLite. Held-out top-three evidence coverage changed from 1/4 to 3/4 for Joplin and 3/4 to 4/4 for SQLite with feedback; generated English answers passed none of the held-out checks. Individual query latency and peak RAM increased slightly as the native model accumulated traces. All original records regenerated exactly.

The full five-file native HCL AI is vendored unchanged with hash and import-origin verification; MST and standard-model translation components are excluded. The new resident JSON-line session passed 24 subprocess requests, including duplicate reinforcement, conflicting identity rejection, precision-safe native integer delivery and recovery after rejection. Complete actual database/WAL inputs also passed HVP round trips, totaling 467000 bytes. The existing seven forensic case tools retain their original public contracts. See the linked report for measurement scope and the captured experiment.

On 2026-10-24, a separate developmental experiment completed 540 scored native generations across six conditions and five experience checkpoints. Clean completion of previously experienced descriptions improved from 0/9 to 9/9 for Joplin and 0/11 to 11/11 for SQLite after two readable interaction passes, holding through eight. Repeating the training-only intake did not improve these completion scores. Every original record regenerated exactly at every checkpoint. The original English-question checks still failed; source inspection identifies unlearned question-ending continuations in this setup. These are distinct from novel problem-solving or general semantic understanding claims.

The initial scheduling verification passed 13 complete-state/output equivalence checks and two exception-restoration checks. The eight-pass Joplin control retained identical runtime signatures and 85 identical generated outputs across all five checkpoints, using 6.31 versus 183.42 CPU seconds for extra training. That `.4` capture preceded production integration; `.5` enables it in the application. Full costs, memory scope, raw outputs, executed-source snapshots and interrupted earlier schedules are retained with the [ordering results](native-hcl-ai-results.md#continued-experience-and-order).

The extended package also passed documentation/metadata/license checks, six onboarding conformance checks, ten focused product-catalog checks, and typecheck/lint. The generated catalog now includes the existing HCL application tools, CLI help covers their inputs, and local derivative installation guidance is checked separately from the pinned original npm example.

## Previous release: `6.7.0-marvosa.3`

Validated 2026-10-23 UTC. The earlier integration's imposed intake, indexing, batch/record/case, work-time, memory and concurrency restrictions were mistakes and are removed. Complete inputs remain whole records through the unchanged original Marvosa engines. Read-only v1 case compatibility is preserved; explicit writes transactionally migrate verified records to complete indexing without changing their bytes or IDs. Actual host and MCP transport constraints are separate and remain observable.

The [Notion investigation](notion-real-case.md) uses an official published REA showcase target, not a synthetic ZIP inventory. The current official Notion 7.40.1 preload differs from the showcase's 7.6.1 example. REA recovered the `__electronApi.copyText` → `navigator.clipboard.writeText` route; six checks of the extracted original function passed against an instrumented API boundary. Native HCL ingestion and a separate-process restart recovered all five selected evidence records, 449176 bytes, exactly. Both positive recall queries ranked the focused trace first. The negative old-channel query ranked its explicit negative record fifth, which is a real ranking weakness. No claim of improved REA analysis accuracy or live Notion UI testing follows from these results.

| Executed check                                   | Current result                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Production build                                 | Passed TypeScript compilation and CLI/MCP artifacts with build telemetry explicitly disabled               |
| Typecheck and lint                               | `check:fast` passed                                                                                        |
| Python adapter regression suite                  | 20 passed, including whole-content indexing, batches above the former cap, and verified v1 migration       |
| Shared deadline/command owner and HCL service    | 27 focused tests passed                                                                                    |
| Public MCP contract                              | All seven HCL tools exercised against the real worker                                                      |
| Native CLI and stdio MCP                         | All seven HCL operations passed; byte equality and original session Evidence ID resolution checked         |
| Caller-cancelled native owner without work timer | Owned leader and descendant exited, unrelated sentinel survived, exact caller cancellation reason retained |
| Notion packaged function                         | Six behavior checks passed; no live Electron UI or physical clipboard claimed                              |
| Notion case after process restart                | Five records / 449176 bytes, exact SHA-256 equality, verified HVP inverse and complete indexes             |

The latest native verifier took 19.341 seconds excluding the build. Caller CPU was 7.182 seconds user and 0.357 seconds system; subprocess CPU, peak family memory and model-token costs were not measured. This is not a comparative benchmark. The separately labelled intake regression checks removal of the old byte budgets; it is not the real-case usefulness test.

Use the telemetry-disabled forms when reproducing this environment:

```sh
TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 npm run verify:marvosa
TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 npm run verify:marvosa-intake
```

The compact original Notion results and reproducible drivers are under `experiments/marvosa-notion/`. No full proprietary application, extracted source-containing case or installer is redistributed.

## Previous release: `6.7.0-marvosa.2`

Version `6.7.0-marvosa.2` corrects the Linux PID namespace mismatch that previously prevented native HCL worker launch. Native CLI and stdio MCP workflows now complete on the affected host. Validation date: 2026-10-22, America/New_York.

## Native execution

`npm run verify:marvosa` built the production runtime and passed all seven HCL operations through both the public CLI and a separate stdio MCP server. It checked exact decimal arithmetic, atomic retention, recall, byte-identical recovery, case inspection, deep verification and case comparison. MCP retention resolved an actual earlier session Evidence ID and recovered the original complete Evidence JSON.

The affected Linux namespace path was exercised with `PATH` pointing to an empty location and Python selected by absolute path. No ps executable was available to the CLI, server or workers. Kernel procfs facts supplied all process identities and relations.

A real cancellation control launched an owned Node worker with a child and a separate unrelated sentinel. Cancellation preserved the caller's exact reason, confirmed terminal exit of the owned leader and descendant, and left the sentinel alive. The verifier then closed the sentinel and removed its temporary cases.

## Executed checks

| Check                                     | Result and scope                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production build                          | Passed: TypeScript compilation, CLI/MCP bundles and package metadata.                                                                                    |
| `npm run check:fast`                      | Passed: repository typecheck and lint. Warning-level findings remain.                                                                                    |
| Process ownership and MCP regressions     | 246 tests passed across 21 files, including native HCL worker transport.                                                                                 |
| Additional terminal namespace regressions | Two new controls passed: a zombie whose namespace link disappeared remains terminal; an unreadable live namespace remains unresolved.                    |
| Namespace reader controls                 | Kernel ID translation, sibling PID collisions, nested lineage, ambiguous IDs, malformed vectors, stale mappings, aligned procfs and opaque cancellation. |
| Test discovery                            | Every repository test file is discovered exactly once. The entire repository suite was not executed.                                                     |
| Original Python HCL integration suite     | 17 tests passed in the preceding release; its mathematical engines and evidence format are unchanged.                                                    |
| Public native CLI and stdio MCP           | All seven tools passed; the production server advertises 220 tools.                                                                                      |

The original engine qualification covers vendor byte hashes; exact decimals and integers beyond JavaScript's safe range; precedence and native-operation agreement; domain errors; fresh-process recovery; Unicode and whitespace; duplicates and provenance; native recall order; confidence and incomplete indexing; tampered bytes, HVP addresses and memory lines; rollback; ambiguous comparisons; concurrent writers; and missing-case reads without creation.

## Measurements

The complete native verifier, excluding its build prerequisite, completed in 18.568 seconds. Its caller CPU counters were 7.206 seconds user and 0.363 seconds system. These counters exclude CPU consumed by CLI, MCP and Python child processes. Peak process-family memory and agent token usage were not measured. The earlier blocked build could not complete an equivalent workflow, so this is no comparative speed claim.

The prior real-report control also preserved all 9278 original bytes from REA's `inspect-artifact` output for an archive of three actual source files. Its report SHA-256 is `7bea73c98d9a839d67a4a7f9d41e31005d8be785345be592309011bf10c58a9c`; observed confidence and evidence links were retained.

## Qualification boundary

Native execution and cancellation were qualified on this Linux host with an ancestor-mounted procfs. Windows Job Object behavior and macOS process supervision were not executed here. Optional REA decompilers, debugger-specific readers and diagnostic samplers were not exhaustively retested. The native ownership checks remain required; unreadable or inconsistent identity facts still prevent unverified signaling.

## Reproduce

```sh
npm ci
npm run verify:marvosa
npm run test:marvosa
npm run check:fast
npm run verify:test-discovery
node scripts/rea.mjs hcl-calculate '0.1 + 0.2' --json
```

The complete source, build artifacts, integration patch and validation logs are included. See [the installation guide](../README-MARVOSA.md) and [namespace design](marvosa-integration.md#linux-pid-namespace-compatibility).
