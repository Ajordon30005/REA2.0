# Compiled programs on HCL

Version `6.7.0-marvosa.8` transcribes WebAssembly binaries into executable HCL graphs. This extends the same analysis/transcription workflow to compiled programs. The original binary stays inside the graph, and every decoded instruction has its original byte offsets. A saved graph executes without reopening that binary.

## Arithmetic and logic

The unchanged Marvosa `HCLTranscriber` remains the arithmetic owner. Addition uses COMP, subtraction uses COMP/SHIFT, multiplication uses AMP_MOD, and integer quotient/remainder uses the existing composition of COMP/SHIFT. AND, OR and XOR use Marvosa's Boolean compositions. Shifts and rotations permute word bits and accumulate them through the original primitives. Bit counts accumulate through COMP. Numeric comparisons use native subtraction.

WebAssembly's 32-bit and 64-bit word interpretation, integer overflow wrapping, division traps and memory bounds are properties of the input format. They do not alter the HCL engine or set its precision. Decoding bytes, organizing the operand stack, selecting branches and indexing memory are host representation/control, following the full `hcl-pure` porting guide. No native WebAssembly instance, target process, MST or external model supplies the HCL result. Node's WebAssembly validation builtin checks input syntax only.

Implemented graph instructions include structured blocks and parameter-carrying loops, branches and branch tables, calls and checked indirect calls, globals, integer loads/stores, memory growth, bulk-memory copy/fill/init, data segments, function tables, integer comparisons, arithmetic, Boolean gates, shifts, rotations, counts, wrapping and sign extension. Floating-point instructions are retained with an explicit unknown; IEEE-754 emulation is not supplied by the integer adapter. Additional WebAssembly proposals and non-function imports require adapters.

The binary decoder owns interpretation once. The runner consumes its graph and never reparses or executes the original binary. Original source/text hashes and all five upstream engine pins are retained. Engine identity includes the word/runtime/trace arrangements; older saved graphs require their matching runner or retranscription.

## Commands and memory boundary

For a module whose exports need no imports:

```sh
node scripts/rea.mjs hcl-transcribe /absolute/program.wasm --entry exported_function --arguments '[123]' --json > program.hcl.json
node scripts/rea.mjs hcl-run program.hcl.json --entry exported_function --arguments '[456]' --json
```

`.wasm` files and the binary magic are recognized automatically; `--language wasm` also selects the frontend. The public CLI and MCP use the same service, ownership/cleanup and exact schemas. When a complete result exceeds the MCP client’s existing receive buffer, use `export_evidence_bundle` with an absolute output path to recover the retained Evidence. The stdio qualification exercises that existing workflow and compares the recovered complete result and Evidence ID with the CLI. The target is not rerun or truncated for delivery.

Programs that need callbacks or byte buffers can supply a JavaScript graph driver. The declared `hcl:wasm` boundary provides `instantiate`, `read` and `write`. `require('./program.wasm')` resolves a supplied decoded module. `instantiate(module, imports)` returns `{exports}`; imported functions must be supplied graph functions. `read(memory, offset, length)` and `write(memory, offset, bytes)` transfer bytes without adding a numerical fallback. Callback computations still execute through the same HCL runtime. See `experiments/marvosa-wasm/driver.cjs` for the complete source-map ABI driver.

## Complete, compressed operation words

The first larger binary case exceeded Node's single-string limit when the full braid was expanded as JSON objects. Version `.8` introduced complete lossless encoding. Version `.9` performs the same encoding as each original generator arrives, avoiding the expanded in-memory word. Both `braid` and `braid_sources` use `rea-hcl-trace/1`: deterministic gzip JSONL, base64 transport, codec version, decoded byte length, record count and SHA-256. No generators or source links are sampled or discarded. Input still enters as complete files.

Recover and authenticate every original generator or source range:

```sh
python3 scripts/hcl-braid.py result.json --output generators.jsonl
python3 scripts/hcl-braid.py result.json --sources --output source-ranges.jsonl
python3 scripts/hcl-braid.py result.json --analysis --output analysis-generators.jsonl
```

The reader accepts plain or gzip-compressed saved reports and historical expanded arrays. It verifies the complete decoded stream before publishing the requested output file. Each source range refers to unchanged indices in the complete generator sequence. The format is transport for the original braid, not a new arithmetic representation.

The paired trace check recovered all 283,984 generators and 35,974 source ranges identically. The complete response fell from 30,155,254 bytes to 6,809,634 bytes for that case. Other verification work was running, so this is a content/byte comparison rather than a controlled speed benchmark.

## Actual open-source qualification

`experiments/marvosa-wasm/verify.py` supplies the unchanged Rust-compiled `mappings.wasm` distributed by Mozilla's `source-map` package. All 67 defined binary functions decode, with no unknown instructions in the binary or its ABI driver. The independent oracle executes the identical binary in Node's native WebAssembly engine. Only the oracle uses native WebAssembly execution.

The task parses the complete published `@jridgewell/resolve-uri` source map: 1,014 mapping entries across 243 generated lines. It compares every mapping in generated and original order, every calculated column span, byte-buffer transfers, and original/reverse/all-position lookups at selected real entries. A second unchanged declaration map exercises every one of its 19 entries with four lookup variants. Invalid-character, incomplete-VLQ, negative-position, overflow and empty inputs also go through the real binary. The Rust allocator, parser, sorting, queries and free routines execute through HCL. Retained `.map` documents are explicitly non-executable text; their full mapping strings are the actual function arguments.

The qualification saves the graph and repeats the entire 1,014-entry case in a separate `hcl-run` process while the originally supplied directory is unavailable. It decompresses and verifies every generator and source range, and retains original results, exact input and implementation hashes, full responses, licenses and measured task costs.

Separately, `verify_controls.py` compares 205 word/control/memory cases with Node, including 64-bit values beyond JavaScript's exact-number range, signed division/remainder, wraparound, rotations, sign extension, parameter-carrying loops, branch tables, indirect-call type checks, overlapping memory copy and growth. Sixteen expected traps match. These generated controls establish specific semantics; the unchanged source-map binary is the real-project evidence.

```sh
npm run build:cached
python3 experiments/marvosa-wasm/verify.py --output /absolute/new/results
python3 experiments/marvosa-wasm/verify_controls.py /absolute/new/controls
node scripts/verify-marvosa-transcription.mjs
```

This adds compiled integer-program coverage to the existing Python/JavaScript/TypeScript/JSON frontends. It does not establish universal transcription, rewrite every existing REA provider, or prove a general speed/memory advantage. The complete native word remains retained; version `.9` stores it incrementally in compressed form instead of accumulating expanded Python records. Task timing includes analysis, execution, trace encoding and delivery; reported `wait4` RSS is not simultaneous process-family memory.
