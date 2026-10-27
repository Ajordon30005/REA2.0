# HCL objects, classes and connected modules

Version `6.7.0-marvosa.7` lets the existing combined analysis/transcription workflow run programs built from ordinary JavaScript objects and classes. The useful change is that a package can keep its original organization: constructors, methods, state, imports and callbacks travel into the executable graph together. The product does not contain a rewritten source-map algorithm.

## What was added

- Ordinary classes, constructors, public instance/static fields and shared class methods.
- Calls that preserve `this`, lexical arrow receivers and arguments, and function `call`/`apply`.
- Nested object/array destructuring, defaults, and declaration/assignment scope checks.
- Ordinary object property descriptors, graph-executed getters/setters and property enumeration.
- Typed-array subarrays with shared storage, copying slices, overlapping `set`, and callback sorting whose numeric comparisons execute through HCL.
- Named imports/exports and re-exports that preserve changing binding values.
- UTF-16 string indexing, slicing and search, including isolated surrogate code units in escaped JSON.

`javascript_values.py` owns object and typed-array representation. `runtime.py` controls bindings, containers and graph execution. `kernel.py` still routes numerical work through the original Marvosa primitives. Every supplied source file enters original LivingMemory whole. The five native engine files remain byte-identical to their pinned Marvosa versions. There is no MST or external model call.

Arrays can carry named properties in JavaScript. When a returned array has them, the JSON result preserves both parts as `{ "type": "array", "items": [...], "properties": {...} }`; ordinary arrays still return plain lists. Numbers retain the existing exact integer/scale/decimal representation. Cyclic/callable results and accessors requiring evaluation during output remain explicit unsupported results.

## Complete open-source case

The actual production CLI took the complete installed `@jridgewell/sourcemap-codec` 1.6.0 package, including its documentation, declarations, original TypeScript files and published JavaScript distributions. This package reads and writes source maps: the records that connect compiled code positions to original source positions.

The real payload was the complete, unchanged `resolve-uri.umd.js.map` from `@jridgewell/resolve-uri` 3.1.2: 14,298 bytes, 243 generated lines and **1,014 mapping entries**. HCL execution decoded every entry and encoded the decoded map back to exactly the original mapping string.

| Observed workflow                                                   | Result                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Complete published UMD distribution                                 | 28 exact comparisons                                                   |
| Five original TypeScript source modules                             | 8 exact comparisons against the independently executed published build |
| Complete ESM distribution                                           | 2 exact encode/decode comparisons                                      |
| Independent saved-program process, original source directory absent | Complete real map decoded exactly                                      |
| Object/module behavior controls against Node                        | 20 matched cases, including expected errors                            |
| Unresolved host access and class inheritance controls               | 2 explicit unsupported results                                         |
| Previous Base64/Pako/CPython qualification                          | All 295 comparisons passed again                                       |
| Actual CLI/MCP, source tamper and CRC cancellation                  | Passed; cancellation reported complete cleanup                         |

All eight codec exports are exercised, including original scopes, generated ranges and range mappings. Small verification adapters only construct the package's public input shapes and call its unchanged functions; they are themselves transcribed. No target-specific implementation is installed in the product. The independent oracle executes the original published package under Node. TypeScript and ESM results are compared with that published build.

The 34 supplied files contain 98,511 bytes. The executed UMD, ESM and TypeScript code and verification adapters have zero unknown syntax. Fourteen documentation/source-map files are retained as explicitly unresolved text; their presence is not claimed as executable semantic translation. The full call batch observes 4,527 graph nodes and retains 3,667,207 native operation generators. Those counts describe this run, not all possible execution paths.

The main batch took 68.58 seconds elapsed and 72.44 CPU seconds, producing 268,297,979 uncompressed output bytes. Independent replay took 48.18 seconds. These are complete CLI tasks, including native execution and full trace delivery. Some checks ran concurrently. The recorded `wait4` peak RSS includes inherited pre-exec memory and is **not** simultaneous process-family peak memory. No speed or efficiency advantage is established by these measurements.

## Reproduce

After installing locked dependencies and building:

```sh
node scripts/rea.mjs hcl-transcribe node_modules/@jridgewell/sourcemap-codec/src --module sourcemap-codec.ts --entry decode --arguments '["AAAA,CAAC;AACA"]' --json > source-map.hcl.json
node scripts/rea.mjs hcl-run source-map.hcl.json --module sourcemap-codec.ts --entry encode --arguments '[[[[0,0,0,0],[1,0,0,1]],[[0,0,1,1]]]]' --json
```

The second call returns `AAAA,CAAC;AACA` from the saved graph. The original input directory is unnecessary for `hcl-run`.

```sh
npm run verify:marvosa-objects -- --output /absolute/new/qualification-directory
python3 experiments/marvosa-objects/verify_semantics.py /absolute/new/control-directory
npm run verify:marvosa-transcription
```

Captured graphs, complete gzip-compressed braids, inputs, licenses, oracle results, exact executed source and measurements are under `experiments/marvosa-objects/results/`. Historical `.6` results remain in their original location.

## Remaining coverage

This expands the source-language implementation. Class inheritance, private/computed class members, arbitrary prototype mutation, asynchronous behavior, many dynamic coercions and external OS/library calls still require adapters. Cyclic ESM linking is not qualified. The native fixed-point arithmetic is not IEEE-754 emulation. The tests establish the recorded inputs and paths, not universal source equivalence or learned understanding of arbitrary documents.

Existing REA native/decompiler/application providers have not all been rewritten in HCL. The original resident native HCL AI remains available with its prior learning and refresh behavior. This release extends the combined source-analysis/transcription path.

Saved graphs bind their engine and arrangement hashes. A `.6` graph requires the `.6` runner; re-transcribe its original retained source to create a `.7` graph. This prevents changed execution semantics from being applied silently to an old artifact.
