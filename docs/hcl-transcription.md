# HCL analysis and transcription

Version `6.7.0-marvosa.6` adds a workflow that reads source, analyzes its operations and builds an executable HCL graph together. It accepts the target you supply; it is not limited to translating REA's own code.

## What happens in one operation

`hcl-transcribe` takes a file or directory. The adapter reads complete immutable file snapshots. REA's existing inert Babel parser supplies JavaScript/TypeScript syntax; Python's AST parser supplies Python syntax. Neither executes the original target. No source prefix, lesson chunk, file-count cap, depth cap, worker deadline or memory quota is introduced.

Complete source files enter Marvosa's original `LivingMemory` before the analysis walk. The walk emits source-linked functions, calls, control flow and HCL operation nodes. It evaluates literal constant expressions through the original `HCLTranscriber` while emitting those nodes. Expressions whose inputs are unknown remain symbolic nodes; analysis does not invent their values. Optional calls then execute this very graph, using the same HCL value-operation owner. There is no separate conventional numeric evaluator whose answers are subsequently copied into HCL.

The result includes the whole source, its byte/text hashes, the graph, static findings, constant-analysis braid, native working-memory signature and optional execution observations. Every runtime call has a result or a specific error/unknown, an operation-braid range and observed node coverage. Full source-memory inverse regeneration runs only with `--verify-memory` (MCP `verify_memory: true`). Without that option, `source_regeneration_verified` is null. Ordinary CLI output shows a concise result; `--json` exports the complete program and Evidence.

`hcl-run` accepts the saved graph or complete REA Evidence JSON. It verifies its digest, retained source text digests, pinned engine identity and lattice, then interprets the graph without opening the original source files. Calls in one request share initialized module state. A new request starts a fresh execution state. The saved graph is a reproducible program artifact, not a trained model checkpoint.

## Commands

```sh
node scripts/rea.mjs hcl-transcribe /absolute/path/module.py --entry convert --arguments '[0.1,0.2,0.3]' --json > converted.hcl.json
node scripts/rea.mjs hcl-run converted.hcl.json --entry convert --arguments '[0.7,0.8,0.9]' --json
```

A directory uses its captured package entry when available. To select another module, use the exact relative path returned in `program.modules`:

```sh
node scripts/rea.mjs hcl-transcribe /absolute/path/project --module codec.js --entry encode --arguments '[[1,2,3]]' --json
```

Use `--calls` for several calls in one initialized program. [Project workflows](hcl-projects.md) also support previous-result arguments, constructors, and method calls. Its JSON array has `entry`, optional `module`, `arguments_json` and optional Python `keywords_json` fields. Decimal arguments stay inside those JSON strings until Python reads their original tokens; they are not rounded through a JavaScript number first. Do not combine `--calls` with individual call options.

`--query` recalls the complete supplied source records through native LivingMemory resonance. This is source retrieval, not proof that a retrieved file implements a requested behavior. `--language` explicitly selects a frontend when a filename does not identify it. The MCP tools `hcl_transcribe` and `hcl_run` use the same application service, schemas, evidence semantics and owned worker as the CLI.

## HCL and host responsibilities

| Responsibility                                                  | Implementation                                                                                        |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Read/parse source, preserve provenance                          | REA snapshot boundary, Babel, Python AST                                                              |
| Arithmetic during analysis and execution                        | Original `HCLTranscriber`: COMP, SHIFT, AMP_MOD, INV, FISSION, growth, logarithm and phase operations |
| Bitwise data operations                                         | The Boolean compositions documented in Marvosa's `hcl_stack/hcl_bitwise.py`, with HCL accumulation    |
| Integer quotient/remainder                                      | Binary long division arranged from original COMP/SHIFT calls; no floating-point quotient              |
| Source memory and regeneration                                  | Original LivingMemory, HCLMemory and HVP engines                                                      |
| Functions, variable bindings, loops, container/index boundaries | Host interpreter control, as permitted by the HCL-pure porting guide                                  |
| Original target OS/network access                               | No adapter; reported unresolved rather than invoking the host target                                  |

`rea-hcl-program/1` is REA's JSON graph container. It is not an invented replacement for Marvosa's arithmetic or a claim that upstream Marvosa already defines this file format. The graph runner arranges calls to the unchanged original primitives. No MST, transferred standard model, external model service or new arithmetic engine is involved.

The implementation follows the full HCL-pure skill, all seven references, the complete current arithmetic engine, the native memory implementation and the stack's Boolean/adder/ALU examples. Those sources distinguish host control and input/output representation from substrate computation. The five vendored engine files retain their pinned SHA-256 values from `bridge/marvosa/UPSTREAM.json`.

JavaScript word operations use 32 bits because that is the source language's contract. Python word width follows the represented integers. This is not an imposed HCL capacity ceiling. Full operation words are retained; they can be much larger than input/output data. The current interpreter is not a proof of faster execution or lower memory use than a source runtime.

Version `.8` also decodes compiled WebAssembly integer programs and preserves complete operation words in a lossless, authenticated compressed format. See [compiled programs on HCL](hcl-wasm.md), including the real binary qualification and trace extraction commands.

## Current coverage

The frontends handle scalar arithmetic, comparisons, short-circuit selection, assignments, arrays/tuples/objects, ordinary functions and closures, returns, branches, loops, local module dependencies and declared mathematical/container boundary operations. TypeScript type-only declarations are erased while their full source remains. JSON becomes data nodes with numeric tokens converted at the boundary.

This is not complete Python or JavaScript language emulation. Class inheritance, private/computed class members, async/generator behavior, broader prototype mutation, many dynamic coercions, arbitrary external libraries and operating-system effects still need adapters. Version `.7` adds ordinary JavaScript classes/public fields, receiver-aware calls, descriptors, destructuring, shared typed-array views and named module re-exports; see [object and module qualification](hcl-objects.md). Unsupported AST constructs carry source locations; unresolved runtime calls return `unsupported`. Ordinary documents, images, binaries and other unimplemented formats retain complete content and an explicit unknown. Storing those bytes does not count as translating their meaning into an executable algorithm.

The engine uses its native fixed-point semantics, not IEEE-754 emulation. Source results, equality tests and branch decisions can therefore differ near numerical boundaries. The alpha check and digests establish substrate/representation consistency, not general semantic equivalence. A successful call proves that observed input and path; syntax coverage alone does not prove every possible behavior.

The existing REA decompiler, browser, native and application-analysis providers keep their own implementations. This release adds the integrated HCL source-analysis path; it does not claim to have rewritten every provider in HCL or made native HCL AI understand every document automatically.

## Real-source verification

The qualification driver reads complete, unchanged installed open-source inputs and invokes the actual compiled REA CLI. It also runs the originals as independent oracles. It does not inject a provider or manually translate the test algorithms.

| Input                                            | Observed task                                                                                                                                       | Checks                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Full `base64-js` 1.5.1 package                   | Run its complete `index.js` codec on RFC-style strings, all 256 byte values, URL-safe encoding and a complete 866-byte repository manifest          | 29 cases: 28 exact results plus the matching malformed-input error              |
| Complete Pako 1.0.11 CRC-32 and Adler-32 modules | Build the original CRC table and calculate both checksums over empty data, the conventional check string, all byte values and the complete manifest | 8 exact results                                                                 |
| Complete CPython `colorsys.py`                   | Execute all six public conversions on color corners, greys and 32 deterministic varied triples                                                      | 258 results within `1e-14`; measured largest difference approximately `4.4e-16` |

Saved programs are also exercised by a separate `hcl-run` process while the originally selected source path is temporarily unavailable. Package documentation and license files remain visible as non-executable content. The `.6` capture leaves the minified browser wrapper's `this` binding unresolved. Version `.7` lowers that syntax; the Base64 qualification still exercises its public `index.js` codec.

Run the source qualification after installing the locked dependencies and building:

```sh
python3 experiments/marvosa-transcription/verify.py --output /absolute/new/result-directory
npm run verify:marvosa-transcription
```

The results preserve the input manifests, exact implementation hashes, original outputs, complete emitted graphs and gzip-compressed CLI responses with every operation braid. Metrics cover whole CLI tasks, including process startup, HCL execution, evidence projection and output serialization. `wait4` peak RSS includes inherited pre-exec process memory and is not a simultaneous process-family memory measurement. No model-token or general compute-efficiency claim is derived from these runs.
