# Complete project workflows

The project workflow accepts an entire supplied directory, analyzes and transcribes its supported source together, resolves its captured modules, and runs a sequence of connected calls through the original HCL primitives. The same workflow is available through `hcl-transcribe`, `hcl-run`, and their MCP tools. Source files and dependencies remain in the saved program, so replay does not need the original directory.

## Run a package directly

```sh
node scripts/rea.mjs hcl-transcribe /absolute/path/pako --entry gzip --arguments '["A complete input message"]' --json > package.hcl.json
node scripts/rea.mjs hcl-run package.hcl.json --entry deflate --arguments '[[72,67,76]]' --json
```

When `module` is omitted, the project uses its captured root `package.json` main, root index, or sole executable module. Ambiguous projects require an explicit module path. Captured relative imports, package main/index files, and nearest supplied `node_modules` dependencies use one resolver shared by analysis and execution. Resolution never installs packages or reads uncaptured files. `program.project` contains the selected entry, compiler-owned package metadata, and the dependency inventory. Dynamic and unavailable imports remain explicitly identified. Conditional/wildcard package export maps still require an adapter. The static inventory records literal reference candidates; locally rebound names such as Browserify’s `require` can appear there. Actual execution resolves the live lexical binding. A static unresolved candidate is not proof that an executed dependency is missing.

An input directory is retained completely, including documentation and other non-executable files. There is no file-count, source-prefix, intake-chunk, execution-time, or HCL memory quota added by this integration. Available host resources and actual language/transport constraints still apply.

## Connect calls without a target-specific driver

Pass this array with `--calls`, or as the MCP `calls` field:

```json
[
  {
    "entry": "gzip",
    "arguments_json": "[\"A complete input message\"]",
    "result_id": "compressed"
  },
  {
    "entry": "ungzip",
    "arguments_json": "[null,{\"to\":\"string\"}]",
    "arguments_from": [{ "index": 0, "result_id": "compressed" }]
  }
]
```

The second call receives the first call's live HCL value. Its `null` is an explicit argument slot to replace; there is no stringification, host execution, or fresh analysis between the calls. `arguments_from.path` optionally reads properties of the retained value. Result names must be unique and refer to successful earlier calls in this request. A new request starts fresh module and object state.

Stateful source APIs work through the same mechanism:

```json
[
  {
    "entry": "Deflate",
    "construct": true,
    "arguments_json": "[{\"gzip\":true}]",
    "result_id": "compressor",
    "return_value": false
  },
  {
    "receiver_id": "compressor",
    "entry": "push",
    "arguments_json": "[\"The complete input\",true]"
  },
  {
    "entry": "ungzip",
    "arguments_json": "[null,{\"to\":\"string\"}]",
    "arguments_from": [
      { "index": 0, "result_id": "compressor", "path": ["result"] }
    ]
  }
]
```

`construct` invokes a lowered JavaScript constructor/class. `receiver_id` calls a method on the retained instance. `return_value:false` returns a named handle and keeps the actual instance inside the request, allowing objects containing methods or cycles to participate without pretending they are plain JSON. Every operation still contributes its original generator and source range to the returned trace. A failed call has its own error and does not replace an existing result binding.

## Runtime completion and trace storage

Ordinary function constructors, writable function properties/prototypes, `instanceof`, nested labeled break/continue, try/catch/finally completion, 8/16/32-bit signed/unsigned buffers, array length changes, and generic array slice/shift now run inside the graph. Exceptions originating in source can be caught by source; unavailable adapters cannot be converted into successful answers by a catch or finally block.

The original Marvosa transcriber's full-trace mode remains on. Its append-only word is stored as lossless compressed records as generators arrive, together with compressed source ranges. The five vendored engine files remain unchanged. This changes representation storage, not primitive mathematics. There is no light/count-only mode, sampling, omitted generator, or target-runtime fallback. Snapshots preserve the live encoder so later calls append to the same complete word. The public `hcl-braid.py` reader authenticates and expands it.

The paired real-binary regression reproduces every one of 283,984 original generators and 35,974 source ranges, including their order and values. The larger 1,014-entry Rust binary case also preserves all 7,612,301 generators, all source ranges, and all call observations identically. Its recorded peak `wait4` RSS fell from 2,200,220 to 505,432 KiB, about 77%. That run took longer (112 seconds versus 81 seconds) and overlapped other verification, so it does not establish a speed improvement. Memory is still required for the source graph, target state, and compressed trace; this is not a claim that arbitrary work has constant memory cost.

## Real-project verification

`experiments/marvosa-projects/verify.py` uses the unchanged installed Pako 1.0.11 package, including all its supplied files and license. It exercises the public package exports directly. The inputs include the complete 6,066-byte Pako README and complete 8,270-byte REA architecture document. The workflow covers gzip, raw DEFLATE, dictionaries, custom gzip headers, a stateful compressor, decoding, and malformed input/options.

The first complete workflow matched all 14 original outcomes (12 successes and two expected errors), producing 85,746,198 native generators. Its full generator history expands to 7,043,852,518 JSONL bytes; the encoded trace is 113,481,980 bytes. The whole CLI task took 1,145 seconds and reported 1,268,336 KiB peak `wait4` RSS, including final delivery. This is a correctness/coverage qualification, not a claim of practical speed parity with native zlib.

The separate saved-program run also matched all 14 outcomes with the original
input directory unavailable. Its complete generator word, source ranges, and
call observations were identical to the first run. It took 3,375 seconds and
reported 1,213,376 KiB peak `wait4` RSS. Verification overlapped other work; these
measurements do not establish a replay speed advantage. The explicit native
`Error:` display prefix is removed when comparing the thrown Error's message;
both original exception texts and HCL source messages remain in the evidence.

The independent oracle runs the unchanged package in Node. Python zlib additionally checks the real compressed documents. The production path runs only the transcribed graph and native HCL arithmetic. Qualification compares every output byte, saves the full program, makes the original input directory unavailable, and repeats the complete workflow in a separate public `hcl-run` process. Reports retain input hashes, exact executed implementation, native outputs, full traces, and measurements.

```sh
npm run build:cached
python3 experiments/marvosa-projects/verify.py --output /absolute/new/qualification
python3 experiments/marvosa-projects/verify_controls.py /absolute/new/controls
node scripts/verify-marvosa-transcription.mjs
```

The installed MCP SDK client defaults to a 60-second request timeout. Whole-package work can exceed that client deadline. The verifier explicitly configures its client timeout to Node’s largest valid timer and still exercises caller cancellation; the HCL worker has no work deadline. Other MCP clients need an appropriate request-timeout setting, or the same workflow can run through the CLI. Large responses use REA’s existing retained-Evidence export path with their complete contents.

The Node language/workflow controls are separate from the unchanged-package qualification. Earlier Python, JavaScript/TypeScript and compiled WebAssembly cases remain regression checks. Qualification results and resource measurements are in `experiments/marvosa-projects/results/`.

## Scope

The delivered workflow is complete for the exercised package jobs and supported frontends. It does not claim that arbitrary documents, images, native machine code, async programs, or unknown APIs have acquired executable semantics merely because their bytes are retained. Existing REA providers remain available; their internals are not all rewritten. Unsupported paths remain source-linked unknowns. Native HCL fixed-point semantics remain distinct from IEEE-754, so exact source equivalence is verified for the reported inputs, not assumed universally.
