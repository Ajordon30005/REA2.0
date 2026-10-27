# Native HCL AI: Joplin and SQLite results

Initial comparison validated on 2026-10-23, America/New_York, with release `6.7.0-marvosa.4`. The continued-experience extension below was validated on 2026-10-24; the initial comparison and scores are preserved.

Keeping native HCL AI resident reduced the measured eight-question AI workloads from 45.40 to 8.38 seconds for Joplin and from 21.21 to 4.79 seconds for SQLite. Verified feedback improved the correct-evidence coverage within the first three results on this small workload. Generated answers to the full English questions did not pass the factual checks. These are separate results.

## Actual application work

Joplin **terminal application 3.7.1**, with `@joplin/lib` 3.7.1 and its original SQLite 3.41.1 binding, ran against a new local test profile. Nine checks passed: Unicode note storage and display, title filtering, tagging and the relationship table, rename identity, completed to-dos, Markdown export, JEX export, copying between notebooks, and trash/restore. The commands took 18.08 seconds in total. Remote sync was disabled and no desktop GUI was used. The package is AGPL-3.0-or-later; the tested files came from the published npm package with gitHead `de139fc9c1f79edd3653f6abb93bf9fe5e124005`. The captured installation lock pins dependencies.

A practical finding: the CLI's `ls` operation filters titles. A token present only in a note body returned no listing results. The matching title returned one result. This is observed application behavior, not a prediction made by HCL AI.

REA analyzed seven complete Joplin command/entry files, 24361 bytes, through its real stdio MCP server. It parsed all seven, visited 3388 AST nodes and reported 144 findings with no parse failures. The parent evidence is `ev_bb03932aad46fad79f4669796dbc200d968c9f3b28868b34bd34a1ee568ffcca`. Source selection left 217 inventoried files unexamined; both graphs correctly retain partial coverage and unknowns. The analysis call took 3.55 seconds; the evidence export call took 0.115 seconds. Joplin behavior checks and REA collection are shared preparation costs outside the AI timing table.

The separate **SQLite 3.53.1** runtime, accessed through Python's sqlite3 binding, passed eleven checks: runtime identity, transaction rollback, commit visibility from another connection, foreign-key rejection, nested savepoint rollback, WAL snapshot isolation, truncate checkpoint, FTS5 search, indexed query planning, database header/page size/integrity, and Unicode recovery after reopening. SQLite's core is public domain. This runtime is distinct from Joplin's bundled SQLite version.

The actual Joplin database (421888 bytes), SQLite database (40960 bytes), and captured live WAL (4152 bytes) also passed whole-input HVP round trips through the original native I/O organ. All **467000 bytes** recovered exactly. No intake chunking was introduced. The Joplin database's encode and verified decode took 0.677 and 0.693 seconds respectively. These byte checks are separate from the repeated-question comparison.

## Native AI and experiment

All model work used the unmodified `HCLLanguageModel`, `LivingMemory`, `hcl_memory`, `hcl_engine` and `juj` from Marvosa commit `c53cbd0b9e00db1668bae0594a9167ea19487cb8`. All five source hashes are pinned in `bridge/marvosa/UPSTREAM.json`. There was no MST, converted standard-model checkpoint, external language model, embedding service or replacement numerical engine.

Each condition ran in a separate Python process. Each model received the same complete normalized observations: nine Joplin records, **3214 UTF-8 bytes**, or eleven SQLite records, **2520 bytes**. These are verified behavioral observations with REA Evidence identities, not the complete Joplin source tree. Complete selected source files were analyzed by REA; complete binary artifacts were checked separately above. No question or expected answer was included in the initial experiences.

Each project had eight predeclared questions. The first four were learning turns; the last four were withheld from verified feedback. The conditions were:

1. **Fresh:** create a new native AI and ingest all observations before every question.
2. **Resident:** ingest once and retain the same native AI across all eight questions. Native `interact` still learns from interaction.
3. **Resident + verified feedback:** additionally reinforce independently verified evidence after each of the four learning questions and call native decay. No correct-evidence labels were given on held-out turns.

Experiences call original living-memory storage and original transition learning. Questions call original `interact`, followed by original two-sense recall. Ranking is not replaced or reordered by the answer key. The model's record results are selected from that ranking, and generated continuation accuracy is scored separately after removing the echoed question. Every original record was regenerated and checked exactly before and after the workload.

## Measured comparison

Times include AI initialization, evidence ingestion, learning, questions, applicable feedback and final exact recovery. They exclude application installation, the shared application/REA collection, and host orchestration. CPU is user plus system CPU in the native worker. Each worker had no children, so the process-family RSS is its own measured peak.

| Project | Condition                    | Eight-task time | CPU time |  Peak RSS | Held-out top 1 | Held-out top 3 |
| ------- | ---------------------------- | --------------: | -------: | --------: | -------------: | -------------: |
| Joplin  | Fresh                        |         45.40 s |  45.37 s | 15.12 MiB |            1/4 |            1/4 |
| Joplin  | Resident                     |          8.38 s |   8.38 s | 15.58 MiB |            1/4 |            1/4 |
| Joplin  | Resident + verified feedback |          9.23 s |   9.23 s | 15.73 MiB |            1/4 |            3/4 |
| SQLite  | Fresh                        |         21.21 s |  21.21 s | 15.11 MiB |            1/4 |            3/4 |
| SQLite  | Resident                     |          4.79 s |   4.79 s | 15.59 MiB |            1/4 |            3/4 |
| SQLite  | Resident + verified feedback |          5.50 s |   5.50 s | 15.63 MiB |            0/4 |            4/4 |

Resident control was **5.4× faster on Joplin and 4.4× on SQLite for these eight-task AI workloads**, because it avoided seven repeated initializations and ingestions. It did not make individual questions faster: median query time grew from 174 to 260 ms for Joplin and from 161 to 237 ms for SQLite as native interaction accumulated more traces. Peak RAM rose slightly. The feedback condition paid additional native reinforcement/decay costs, improved top-three coverage, and lowered SQLite's top-one score. More experience did not improve every metric.

The feedback sample is only four held-out questions per project. It demonstrates a useful measured change in retrieval on this capture, not a general recall-quality result or a comparative speed claim against plain REA. Model token counts were not measured; the native model uses its own braid/trace representation. External model calls were zero.

## Generated answers and extra diagnostic

Generated continuations passed **0/4 held-out factual checks in every condition**. A retrieved relevant record was not counted as a generated answer, and repeating the user's prompt was not counted as success. The correct next implementation decision cannot be inferred from ranking scores alone: this configuration supplies useful evidence retrieval but did not answer those complete English questions correctly.

An additional native continuation diagnostic withheld the last word of each experienced observation description. Strict complete-word matching passed 0/9 for Joplin and 0/11 for SQLite. Inspection showed JSON quote/comma delimiters on many otherwise matching generated words. A separately labelled, post-hoc diagnostic that strips only those trailing JSON delimiters matched 5/9 and 9/11. Both scores and all raw continuations are preserved. This is trained-text continuation, not unseen semantic reasoning, and it does not replace the frozen question results.

## Delivered implementation

`python3 -I -B scripts/hcl-ai.py` runs a resident native AI using JSON-line requests for `experience`, `ask`, `feedback`, `get` and `status`. A real subprocess check passed 24 requests in one process, including exact recovery of all nine Joplin records, duplicate reinforcement, conflicting-identity rejection, continued use after rejection, native integrity and confirmed exit at EOF. Large native integers are transported as decimal strings when JSON/JavaScript would otherwise lose precision.

The existing seven REA CLI/MCP forensic tools remain separate and compatible. This experiment does not claim that their one-shot workers were converted to resident AI or that native HCL AI independently operated Joplin/SQLite. The producers exercised the applications, REA supplied static analysis and Evidence provenance, and native HCL AI learned from the verified observations.

All captured observations, frozen questions, outputs and timings are under `experiments/marvosa-native-ai/`. See its [reproduction guide](../experiments/marvosa-native-ai/README.md). Installer binaries, dependency trees and test profiles are not redistributed.

## Continued experience and order

Native interaction improved learned sentence order in both real application cases. With complete readable observations supplied as additional experience, clean source completion rose from **0/20 to 20/20 after two extra passes** and held through eight. Repeating the existing training-only intake remained at 0/20. Every original evidence record continued to regenerate exactly.

This extension replays the same captured, independently checked Joplin and SQLite observations. It does not rerun application installation or claim that native AI autonomously operated either application. All five original native source files remain unchanged, with no MST, converted checkpoint or external model.

The initial experiment stored source language while native context depth was one. Its questions subsequently grew depth, but it never revisited those source examples at the grown depths. Feedback reinforced evidence records rather than specifically revisiting their ordered language paths. The extension measures that missing developmental loop.

### What the new test measures

All six workers first received every complete normalized observation, retaining the exact original text. Three conditions then received eight extra passes:

1. **Repeated training:** call the existing `experience` intake on each complete original record. Native `train` reinforces or stores transitions but does not itself grow context depth.
2. **Native interaction with raw records:** call original `interact` on each complete normalized JSON record, following the native `talk.py` train/generate behavior. Depth grows through original self-tuning.
3. **Native interaction with readable descriptions:** use original `interact` with each complete verified description as additional language experience. The complete raw evidence remains stored. This changes the representation and byte count of the extra input; it is not an equal-byte comparison with raw JSON.

No depth, amplitude or output-length setting was imposed. The zero, one, two, four and eight extra passes are measurement points. Native `interact` has no decay call, so this protocol adds none.

For each source sentence, the test supplied its first half and required the model to generate the entire remaining half in order. These targets were previously experienced source text. The content score permits precisely the JSON closing quote/comma on the final word. The **clean** score requires the exact remaining sentence and no added output. This tests learned ordering and sentence termination, not an unfamiliar solution.

The eight earlier English questions per project were scored separately. Their question-answer pairs were never taught. Every scored generation used its own deep copy of the current learner; evaluation supplied no extra target or correctness feedback to the learner. Identity checks and exact evidence recovery surrounded each checkpoint. In total, six complete conditions produced **540 scored generations** and **480 extra whole-input learning turns**, plus initial ingestion.

### Learning curve

| Project and additional experience   | Score            | Before | 1 pass | 2 passes | 4 passes | 8 passes |
| ----------------------------------- | ---------------- | -----: | -----: | -------: | -------: | -------: |
| Joplin: raw native interaction      | Ordered content  |    0/9 |    8/9 |      9/9 |      9/9 |      9/9 |
| Joplin: readable native interaction | Clean completion |    0/9 |    7/9 |      9/9 |      9/9 |      9/9 |
| SQLite: raw native interaction      | Ordered content  |   0/11 |  10/11 |    11/11 |    11/11 |    11/11 |
| SQLite: readable native interaction | Clean completion |   0/11 |  10/11 |    11/11 |    11/11 |    11/11 |

Training-only repetition stayed at zero in both projects at every checkpoint. Raw JSON interaction learned the sentence content but produced no clean completions: output continued into JSON fields. Readable interaction learned both the sequence and where to stop. Original-record recovery stayed at 9/9 and 11/11 in every condition and checkpoint. This is exact byte retention; it does not establish retention of unpracticed language skills after learning unrelated work.

An actual Joplin example used this prompt:

> Default deletion uses the trash: deleted_time becomes nonzero;

Before additional experience, its generated continuation was:

> restore resets it to Archive creates a note body in the note

After two readable passes, it generated:

> restore resets it to zero and keeps the body.

This is a measured correction from mixing source fragments to completing a source explanation correctly. It is not evidence that the model independently discovered the restore behavior.

### Cost and memory

The table includes initial model creation/ingestion and all eight extra learning passes. Scored evaluation, deep copying and its identity checks are separate. Application collection and host orchestration are excluded. Each native worker has no child processes; worker peak RSS includes isolated scoring copies and must not be described as learner-only RAM. Model token counts were not measured. External model calls were zero.

| Project | Extra experience            | Training wall / CPU | Evaluation wall | Peak worker RSS | Depth before → after | Live traces before → after |
| ------- | --------------------------- | ------------------: | --------------: | --------------: | -------------------: | -------------------------: |
| Joplin  | Repeated training           |       7.59 / 7.58 s |          9.40 s |       16.63 MiB |                1 → 1 |                  254 → 254 |
| Joplin  | Raw native interaction      |   242.57 / 242.55 s |        201.45 s |       77.09 MiB |               1 → 30 |                 254 → 5140 |
| Joplin  | Readable native interaction |     45.94 / 45.93 s |         45.58 s |       23.01 MiB |               1 → 15 |                 254 → 1030 |
| SQLite  | Repeated training           |       8.01 / 8.01 s |         10.27 s |       16.74 MiB |                1 → 1 |                  239 → 239 |
| SQLite  | Raw native interaction      |   189.24 / 189.22 s |        159.41 s |       49.54 MiB |               1 → 21 |                 239 → 3458 |
| SQLite  | Readable native interaction |     31.51 / 31.51 s |         28.56 s |       21.12 MiB |               1 → 10 |                  239 → 812 |

Joplin extra input totaled 25712 bytes for raw-record conditions or 6464 bytes for readable descriptions. SQLite extra input totaled 20160 or 6592 bytes respectively. Initial raw intake was identical across conditions. The readable route achieved clean completion with fewer language traces and lower measured costs than teaching the JSON representation. Its changed input representation is part of that result. Further experience did not reduce the grown trace count or establish steadily decreasing compute costs.

### Native refresh scheduling

The original memory recomposes the whole composite after each reinforced trace and refreshes its signature after each store. Inside these synchronous `train`/`interact` paths, generation decisions use individual traces and input invariants. Those repeated summary rebuilds can be scheduled at the end of a complete turn using the same native recomposition routine.

The experiment's `NativeRefreshBatch` changes only that scheduling. Native store, reinforcement, transition selection, generation and halting still run. No original source file is edited. A differential check compared **13 complete native states and outputs**, including individual amplitudes, composite fields, HVP records and operation logs; all matched. Two controlled exceptions checked method restoration before and after a learning mutation.

The complete original eight-pass Joplin training control was also compared against the final scheduled control. All five runtime checkpoints and all **85 generated outputs** matched exactly. Extra training fell from **183.43 to 6.32 seconds wall time**, and **183.42 to 6.31 seconds CPU**, approximately **29×** on that repeated-training control. This compares two schedules of the same native computation. It does not measure a speedup against standard AI or plain REA, and does not imply every workload receives that ratio.

Scheduling was also used in isolated scoring copies. At the time of this capture, the production `scripts/hcl-ai.py` adapter had not yet adopted it. Version `.5` now integrates the verified schedule; its actual application checks are recorded below. Original schedules stopped during the first native-interaction extra pass are explicitly marked incomplete and are not included as completed growth results.

### Remaining question-to-answer gap

The separate English-question checks remained **0/8 per project in every condition**. Source inspection explains a concrete block in this setup: `_collapse` looks for a learned continuation of a suffix of the current prompt. None of the sixteen question-ending words appears as a word in the experience corpus. Training an isolated question adds its final word as a target but teaches no continuation after it. The evaluated generator therefore stops at those endings. Evidence recall is scored separately in the earlier experiment and is not automatically supplied as an answer continuation.

This is a question-to-answer connection missing from the tested curriculum/path. It does not negate the observed ordering improvement, establish a limit on further development, or evaluate the separate exact-arithmetic reasoning organ. The results show that native HCL AI can improve and retain source sentence order through experience on these cases. Unfamiliar problem solving, broad semantic transfer, learning with fewer examples than another AI, and reduced compute at matched task accuracy remain unmeasured.

All raw outputs, source/case hashes, frozen protocols, executed-source snapshots, timing records, equivalence checks and interruption history are under `experiments/marvosa-native-ai/results/development/`. The executed snapshot and capture remain unchanged. The current driver now uses the integrated production scheduler and records a new protocol version and adapter hash. Source-completion targets are intentionally experienced; evaluation supplies no additional target feedback.

### Packaging verification

The extended bundle also registers the existing seven HCL contracts in the generated application-tool catalog, describes every HCL CLI argument/option, and aligns derivative notices and license links across the bundled READMEs. Installation guidance and conformance checks distinguish the original pinned npm package from this unpublished build's local executable. No nonexistent registry release is advertised.

The rebuilt runtime and documentation metadata checks passed, including the license inventory and six onboarding conformance checks. Typecheck/lint passed; the ten focused product-catalog checks passed. The five native source pins, original case-file bytes and executed-script snapshot were verified. At the `.4` capture, an AST comparison verified that its single subsequent edit only clarified descriptive evaluation metadata. The later `.5` driver integration is documented separately below. The full repository test suite and new Windows/macOS runs were not executed for this extension.

## Production integration

Version `6.7.0-marvosa.5`, validated on 2026-10-24, enables the verified scheduler in normal resident `experience` and `ask` requests. The application owns the scheduling; no experimental flag or test wrapper is required. It flushes the original native recomposition before returning the learning signature or recalling evidence. The scheduler class is identical to the previously verified implementation, and all five original native engine files remain byte-identical to their pins.

The before/after comparison starts actual JSON-lines application processes. The baseline is the captured `.4` adapter and entrypoint, copied unchanged into an isolated installation using the same pinned native sources. Both versions receive the same complete records and requests. Each case starts with a new native instance, then retains it through initial learning, two repeated-learning passes, two readable-description interaction passes, source completion, exact recovery, conflict rejection, feedback, and recovery afterward. No native engine or response is mocked. These completions use previously experienced material and share the normal live application state.

The inputs are nine observations from the previously executed Joplin CLI 3.7.1 case and eleven newly executed SQLite 3.53.1 checks. The fresh SQLite run created a real database, exercised commit/rollback, foreign keys, savepoints, WAL snapshots/checkpoint, FTS5, index selection and Unicode recovery, and passed all eleven checks. Joplin is a replay of its actual captured evidence; it was not reinstalled for this integration run.

All **170 public responses matched exactly**: 77 for Joplin and 93 for SQLite. Every one of the 20 original evidence records regenerated byte-for-byte both before and after feedback. Duplicate evidence reinforced the existing record; both identity conflicts were rejected and the sessions continued normally. All 20 source-sentence completions were exact in the integrated application and its baseline. Those completion targets had already been experienced.

| Actual resident CLI workload        | Previous wall / CPU | Integrated wall / CPU | Whole-session wall speedup | Previous / integrated peak RSS |
| ----------------------------------- | ------------------- | --------------------- | -------------------------- | ------------------------------ |
| Joplin evidence replay, 77 requests | 348.59 / 348.36 s   | 32.55 / 32.50 s       | 10.71×                     | 14.63 / 14.59 MiB              |
| Fresh SQLite evidence, 93 requests  | 279.68 / 279.36 s   | 32.32 / 32.27 s       | 8.65×                      | 13.98 / 14.21 MiB              |

These are complete application sessions, including process startup, transport, learning, generation, native recall, feedback and exact recovery. Each child is one resident process with no children. Application capture and host orchestration are excluded; model token counts were not measured and external model calls were zero. Initial intake starts a fresh process; later requests use the same resident model. There was one timing run per case/version on this host, with some concurrent build and verification work. The separately measured child CPU time shows the same reduction. The results compare `.4` with `.5` on these workloads, not another AI, and the small RSS differences do not establish a memory-efficiency improvement.

Within those sessions, repeated-learning wall time fell from 61.20 to 2.71 seconds for Joplin and 50.99 to 3.11 seconds for SQLite. The earlier 29× result used a different eight-pass training-only workload; it is preserved above rather than substituted for these whole-application measurements.

REA also inspected the fresh database through its actual `inspect-sqlite-database` CLI, using Node's SQLite 3.53.4 reader. The three returned rows included the committed note and exact Unicode body. The complete 6,097-byte REA Evidence JSON was then learned, recalled and regenerated exactly by the updated HCL CLI. That four-request native session took 1.214 seconds, including startup and EOF exit; database creation and the REA inspection are separate from that timing.

An additional native-state comparison passed all 13 operations, comparing the integrated adapter against the captured previous adapter with complete trace, amplitude, composite, HVP, signature and operation-log state hashes. The two controlled scheduler-exception restoration checks passed. Runtime compilation, generated documentation/metadata/license checks, six onboarding conformance checks, and typecheck/lint passed. Python syntax and the relocated measurement driver's import/CLI were checked. The earlier development captures remain byte-identical. Qualification here is Linux, Python 3.12.14 and Node 24.22.1; the full repository suite and new Windows/macOS runs were not executed.

The reproduction command, original baseline sources, full requests/responses, fresh SQLite observations, REA inspection evidence, state comparison and timing records are in `experiments/marvosa-native-ai/results/integration/` and its [reproduction guide](../experiments/marvosa-native-ai/README.md#verify-the-actual-application-integration).
