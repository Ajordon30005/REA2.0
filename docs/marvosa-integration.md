# Marvosa integration design

Version `.9` completes [connected project workflows](hcl-projects.md): captured package/dependency resolution, live result references, constructors/method calls, and incremental complete-word storage. One captured-project resolver serves both the analysis inventory and runtime imports.

Version `.6` adds [integrated HCL source analysis and executable transcription](hcl-transcription.md). `hcl_transcribe` reads complete source snapshots, keeps them in native LivingMemory during one analysis/lowering walk, evaluates constant expressions with the original HCL arithmetic, and optionally executes the emitted graph. `hcl_run` executes saved graphs independently. Both share the existing application service, canonical CLI/MCP contracts and owned worker. The host owns parsing/control; numerical analysis and graph execution share `transcription/kernel.py`. Unsupported source semantics remain explicit unknowns.

REA already exports/imports, validates, discovers and compares canonical evidence bundles. The added surface is native HCL-ranked recall across a retained case, HCL transduction/topology verification and traced HCL arithmetic. Those additions do not replace REA's analyzers or establish superior findings or performance.

## Operation mapping

Version `.4` adds a separately owned resident native HCL AI session in `bridge/marvosa/native_ai.py`, exposed by `scripts/hcl-ai.py`. The full original `HCLLanguageModel` composes `LivingMemory`, HCL arithmetic and the HVP I/O organ. Vendoring preserves the upstream `mind/` and `engine/` layout; all five files are pinned and unmodified. Runtime origin checks reject mixed engine modules and MST/standard-model components. This path keeps the same AI instance across JSON-line requests; the existing seven forensic tools retain their case semantics and one-shot worker transport.

Native AI experiences are complete normalized observations with stable REA Evidence identities. Their record text goes through original living-memory storage and native transition learning. Verified feedback calls original reinforcement and decay. The adapter owns identity checks, JSON transport and scheduling of native summary refreshes; it introduces no new ranking formula, model checkpoint or numerical substitute. Direct native generation and evidence retrieval are evaluated independently so a retrieved record or echoed prompt cannot masquerade as a correct generated answer.

Version `.5` moves the verified refresh scheduler into `bridge/marvosa/native_refresh.py` and enables it automatically in the resident `experience` and `ask` methods. A synchronous turn updates every individual trace with the original methods, then runs the original `_recompose` once. Only redundant intermediate composite/signature refreshes are deferred. `experience` replaces the training report's intermediate signature with the final native signature; `ask` finishes recomposition before evidence recall. The context restores the original bound methods and refreshes any partial mutation on exceptions. The single resident request loop owns the model; no global class or original engine file is patched. Feedback, exact recovery and status continue through their original paths.

| Responsibility                                   | Owning implementation                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Scalar addition/subtraction                      | Original `HCLTranscriber.add/sub` → COMP / COMP with SHIFT                          |
| Multiplication/division and integer powers       | Original transcriber → AMP_MOD / inverse composition                                |
| Roots, growth, logarithms, phase projections     | Original FISSION, MOBIUS_GROWTH, LOG_EXTRACT, PHASE_SIN/COS                         |
| Per-record encoding, composite state and ranking | Original `HCLMemory.store/recall/to_expression/from_expression`                     |
| Byte transduction and inverse verification       | Original `juj.bytes_to_hvp/hvp_to_bytes(verify=True)`                               |
| Evidence identity and provenance                 | REA Evidence; exact-byte host envelope and SHA-256                                  |
| On-disk case transaction                         | Python standard-library SQLite transport; not a model-memory replacement            |
| Native process ownership and cancellation        | REA shared command owner (`runOwnedCommandUntilCancelled`) and `PrivateRuntimeRoot` |
| Input/output contracts                           | `src/domain/marvosa.ts`, canonical tool catalog and shared service                  |

No arithmetic engine was reimplemented. The expression parser only routes syntax to the original transcriber. Decimal tokens pass through the original string-to-fixed-point input boundary. JSON scores and large fixed-point values are decimal strings, preventing JavaScript integer rounding. The caller-facing scalar API rejects undefined real-domain operations rather than interpreting a complex FBit as a scalar.

## Case identity and exact content

`evidence.sqlite3` stores original JSON bytes, an explicit source label, deterministic metadata/index text, and the derived HVP address. Its `state` table contains the format version and one native composite memory line. The identity includes the source label and exact bytes, so identical content from distinct sources retains distinct provenance.

Before recall, the worker checks each original-content digest and recomputes its metadata. It creates a fresh native HCL memory, stores terms in deterministic record-ID order, loads the retained line with the native parser, and compares it to the re-derived line. Per-record terms stay in RAM. The HCL line is not represented as an unlimited byte store.

Exact recovery constructs the complete HVP signature from retained bytes, compares its address to the saved address, and expands the braid using the native verified inverse. The original bytes are returned as `raw_json`, preserving Unicode, decimal spelling, whitespace and key order. The evidence field in a CLI envelope is indexed when present; the entire original envelope remains recoverable.

SHA-256 belongs to the forensic envelope, outside HCL arithmetic. It guards byte identity and metadata corruption. Alpha checks test the engine's own consistency. Neither is presented as proof of arbitrary factual claims.

## Consistency and concurrency

Writes use `BEGIN IMMEDIATE`; all new records and the replacement memory line commit together. A failed batch rolls back completely. Repeat imports are idempotent. Readers use one SQLite read transaction to keep records and the composite line on the same snapshot. The bridge owns every admitted worker until work and cleanup settle. Failed cleanup owners are retained for retry.

Case format v2 indexes complete normalized content without a prefix or record/case/batch quota. Whole-record byte intake is unchanged native `bytes_to_hvp`, the same direct transducer used by HCL AI perception; there is no integration chunking. Verified v1 cases remain readable under their original index semantics. An explicit remember operation upgrades their metadata/index and composite line in one transaction; original bytes, record IDs and HVP addresses remain unchanged.

Version `.3` removes the added 30-second work deadline and 512 MiB address-space/Job limits. The shared command owner now also supports caller-cancelled work without arming a work timer; existing callers with explicit deadlines keep them. Requests/replies are complete private files rather than a 4/8 MiB JSON pipe budget. Diagnostic retention remains separate. Actual host and MCP transport constraints are reported as such; removal of invented quotas is a correction, not an enhancement claim.

Native cancellation is a transport event, not an HCL halting law. If cancellation occurs after SQLite commits but before the reply arrives, publication is explicitly unknown; identical retries are safe. Readback and verification determine the committed state. Unresolved cleanup blocks new work until its owner confirms release.

The native bridge invokes the pinned local Python file without a shell, with Python isolated mode. It uses private temporary requests rather than placing evidence in process arguments. No target execution, injection, network access or additional authority is introduced by the HCL tools. Existing REA tools retain their established authority.

## Source and validation boundaries

Unmodified engine files live under `bridge/marvosa/vendor/`; the manifest pins their originating Git commit and byte hashes. The new integration is independently testable with the original engines. Native CLI/MCP builds, typed schemas and in-memory protocol tests are separate from a platform's actual subprocess supervision. The validation report records native Linux CLI/MCP and cancellation qualification, including operation without ps.

## Linux PID namespace compatibility

Some containers mount procfs from an ancestor PID namespace. Their `/proc/self/stat` PID differs from `getpid()`, and procps may fail with `lookup self`. `LinuxProcessNamespaceReader` detects that mismatch, verifies the caller against the kernel NSpid vector and namespace inode, and derives namespace-local PIDs, parents, process groups and sessions. Sibling namespace collisions are excluded. Nested namespace processes require an observed parent chain.

The shared ownership host uses this same view for listing, start identity, credentials and run-token reads. Signals still use kernel namespace-local group IDs after REA's existing identity/token checks. No fake process rows, unconditional ownership acceptance, shell shim or disabled cleanup is introduced. Simultaneous observations with the same cancellation signal share only in-flight work; subsequent observations are fresh. Process disappearance and relation changes get bounded snapshot retries. Unknown live namespace facts stay unresolved; terminal zombie facts retain their native lifecycle.

This correction covers the shared ownership path used by HCL workers. Independent diagnostic sampling and debugger-specific procfs adapters are outside this HCL qualification; they do not participate in the HCL worker's launch or cancellation path.

## Object and module transcription, version .7

`transcription/javascript_values.py` owns JavaScript property descriptors, class prototypes and shared typed-array storage. `runtime.py` evaluates getters, setters, methods, initializers, imports and callbacks through the same graph and HCL Kernel. It preserves `this`, lexical arrow bindings, module export identity and full UTF-16 string results, including isolated surrogate code units in escaped JSON. Numeric source operations still call the unchanged upstream transcriber. The module schema now retains source mode and strictness explicitly.

The native engine identity includes the object-storage arrangement alongside the Kernel/runtime digests. Older saved graphs keep their original identity and require their original runner; use `hcl-transcribe` again to produce a `.7` graph. The complete original source remains inside every saved graph. See [the source-map case](hcl-objects.md).

## Compiled programs and trace transport, version .8

`transcription/wasm.py` owns binary-to-graph decoding. `wasm_runtime.py` consumes that representation with the existing Kernel and original HCL transcriber. Source functions, compiled functions and callbacks share the same value operations and trace. The `hcl:wasm` boundary owns explicit memory transfers and graph-function imports. `trace.py` encodes the complete native word and source ranges as deterministic gzip JSONL with decoded digests and counts. See [compiled-program qualification](hcl-wasm.md).
