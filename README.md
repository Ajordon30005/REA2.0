# REA2.0

### Understand software. Work through its logic in HCL. Keep what you learn.

REA2.0 brings REA's software investigation tools together with Anthony Jordon's native Harmonic Computational Language from Marvosa. It helps you move from an unfamiliar application or codebase to an explanation you can use, an operation you can inspect, and a saved body of knowledge you can return to.

You can investigate how an application handles a feature, follow the relevant code, transcribe supported source into an executable HCL graph, and work with its results. You can keep the evidence from that investigation, find it again through HCL memory, and compare it with a later version. An agent can use these tools to help explain a system, debug a behavior, plan an integration, or build and test an implementation for your own project. The same workflows are available from your terminal.

The practical goal is to help people get work done with software they need to understand. A developer taking over a project needs more than a list of files. Someone building an importer needs to understand the original format. A maintainer tracing a regression needs to connect today's behavior to yesterday's findings. REA2.0 gives those investigations a place to become executable, inspectable, reusable work.

[Get started](#get-started) · [Working in HCL](#working-in-hcl) · [Project workflows](#work-with-a-whole-project) · [Memory](#keep-an-investigation-alive) · [Agent setup](#connect-your-agent) · [Supported targets](#what-you-can-work-with) · [Guides](#go-deeper)

REA2.0 is an independent derivative of [REA](https://github.com/morluto/rea) and [Marvosa](https://github.com/Ajordon30005/marvosa). This repository distributes the prebuilt HCL runtime, version `6.7.0-marvosa.10`. The command remains `rea`, and the package identity remains `rea-marvosa` for compatibility. REA2.0 is the project name; it is not an upstream REA release.

## What it can help you do

### Find the logic behind a feature

Start with the question that brought you to the software. How does an Electron application move clipboard data between processes? Which module encodes the saved file? Where does a search result come from? REA's existing analyzers expose modules, references, application boundaries, strings, and other evidence that lets you follow those questions into the implementation.

With an MCP agent, you can ask it to follow the evidence, explain what it found, and use that understanding to help write your own implementation. REA2.0 supplies the inspection and execution tools; your agent coordinates the investigation and the work in your project.

### Work with the computation itself

For supported source, analysis and HCL transcription happen together. The resulting graph retains the source and describes its functions, branches, loops, and operations. When you supply a call, the graph runs through the original HCL arithmetic primitives. You can give it another input, connect its output to a second call, or save it for later replay.

This is useful when you need to follow a codec, understand a numerical transformation, inspect a compiled integer routine, or explore how a package's public API behaves on your own data.

### Carry knowledge into the next session

Keep findings as a case instead of rebuilding your investigation every time. HCL memory ranks retained evidence against a query, while exact recovery gives you the original saved JSON. Stable source labels let you compare observations between versions and see which evidence was added, removed, or changed.

That makes it easier to pick up unfinished work, hand findings to another developer, and connect a new observation to an existing explanation.

## Get started

Use Node.js **22.19+ within 22.x, 24.11+ within 24.x, or 26+**, npm, and **Python 3.10+** for HCL operations. The Python HCL components use the standard library. Additional analysis providers are installed separately when your task needs them.

Clone this repository and install the runtime dependencies:

```sh
git clone https://github.com/Ajordon30005/REA2.0.git
cd REA2.0
npm install --omit=dev
node scripts/rea.mjs --help
```

The JavaScript runtime is already built. Installation does not run the development test suites, and ordinary startup does not launch HCL calculations or probe functions in your project.

Try a calculation:

```sh
node scripts/rea.mjs hcl-calculate '0.1 + 0.2'
```

```text
result: "0.3000000000000000000000000000000000000000"
```

To expose the existing `rea` command on your PATH:

```sh
npm link --omit=dev
rea --help
```

If another REA installation already owns that command, use `node scripts/rea.mjs` from this checkout to select REA2.0 explicitly.

On Windows, point `REA_MARVOSA_PYTHON` to `python` or the full path of your Python executable. Shell quoting varies; the examples below use POSIX shell quoting. Paths containing spaces should be quoted.

For arithmetic and evidence-memory operations without the Node interface, the Python entry point is also available:

```sh
python3 scripts/marvosa.py calculate 'E = m * c^2' --variable m=2 --variable c=3
```

The standalone Python interface returns its detailed native result. The integrated CLI provides the concise everyday display.

## Working in HCL

HCL in this project means Marvosa's native HCL-pure arithmetic, memory, and byte transduction. The runtime vendors the original engine files unchanged and records their source identities in [UPSTREAM.json](bridge/marvosa/UPSTREAM.json). It uses the native HCL path, separate from Marvosa's MST components.

REA handles file access, syntax, integration, and the surrounding investigation workflow. The HCL graph arranges the original computational primitives. Arithmetic during source analysis and arithmetic during execution share that same owner: a constant expression and a later function call are evaluated through the same substrate.

Host code organizes syntax trees, variable bindings, containers, and control flow. This division follows the HCL-pure porting approach. Existing REA providers continue to perform their specialized analysis; HCL transcription is the integrated path for working with supported source and compiled integer programs.

HCL uses its original 40-digit fixed-point substrate. Decimal inputs retain their spelling at the input boundary, and results preserve their decimal representation in output. Its numerical semantics differ from JavaScript's floating-point arithmetic, which matters when investigating rounding, equality, or a branch near a numerical boundary.

Each executed operation contributes to the operation braid. Complete braids and their source links are retained in a lossless compressed representation, so detailed inspection remains available without filling the terminal with internal steps.

## Analyze, transcribe, and run

Give REA2.0 a file or a complete project directory. It reads complete input snapshots, places source in native LivingMemory, and builds the HCL graph while analyzing the source.

For a Python module with an exported `convert` function:

```sh
node scripts/rea.mjs hcl-transcribe ./module.py \
  --entry convert --arguments '[0.1,0.2,0.3]' --json > module.hcl.json
```

The saved result contains the graph, complete source, analysis, and requested execution. You can run the saved program with new inputs:

```sh
node scripts/rea.mjs hcl-run module.hcl.json \
  --entry convert --arguments '[0.7,0.8,0.9]'
```

Replay uses the captured program and source. It does not need to reopen the original source directory. Calls within one request share initialized module state; another request starts a fresh execution state.

Leave out `--entry` and `--calls` when you only want analysis and transcription. REA2.0 does not invent calls to your functions. Use ordinary output to read the answer and `--json` when you want to save the complete program or pass it to another tool.

### A real codec workflow

Given a local copy of the open-source `base64-js` package:

```sh
node scripts/rea.mjs hcl-transcribe ./base64-js/index.js \
  --entry fromByteArray --arguments '[[72,67,76]]' --json > codec.hcl.json

node scripts/rea.mjs hcl-run codec.hcl.json \
  --entry toByteArray --arguments '["SENM"]'
```

The first call encodes the three bytes as `SENM`. The second decodes the string through the saved HCL graph. You can inspect the original implementation and its operations alongside the result, then reuse the captured codec on another input.

## Work with a whole project

A directory input retains all supplied files, including supporting documents. Captured package entries and dependencies are resolved together. When a package entry is known, you can call its exports directly; use `--module` to select an exact relative module path when needed.

For a supplied Pako package:

```sh
node scripts/rea.mjs hcl-transcribe ./pako \
  --entry gzip --arguments '["A complete input message"]' --json > pako.hcl.json
```

Connected calls let one operation use another operation's live result. For example, pass this JSON array as the value of `--calls` to compress a message and recover it in the same request:

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
    "arguments_from": [{"index": 0, "result_id": "compressed"}]
  }
]
```

The result reference passes the actual retained value. You can also construct supported source objects and call their methods, which makes stateful APIs usable without flattening them into independent examples. The [project guide](docs/hcl-projects.md) covers constructors, receiver references, and property selection.

Captured imports resolve only within the supplied project. Include the dependencies your workflow needs. Resolution does not silently install missing packages or reach outside the captured inputs.

### Compiled integer programs

Supported WebAssembly integer modules use the same transcription and replay interface:

```sh
node scripts/rea.mjs hcl-transcribe ./program.wasm \
  --entry exported_function --arguments '[123]' --json > program.hcl.json

node scripts/rea.mjs hcl-run program.hcl.json \
  --entry exported_function --arguments '[456]'
```

The decoder preserves instruction locations and the original binary. The runner executes the graph through HCL; imported callbacks must be supplied through supported graph boundaries. See the [WebAssembly guide](docs/hcl-wasm.md) for memory transfers, callbacks, and instruction coverage.

## Keep an investigation alive

An investigation becomes more useful when its findings remain connected. Start by capturing evidence through the existing REA tools:

```sh
node scripts/rea.mjs inspect-artifact ./application.zip --json > application.json

node scripts/rea.mjs hcl-remember-evidence ./cases/build-v1 application.json \
  --source application-inventory

node scripts/rea.mjs hcl-recall-evidence ./cases/build-v1 'search database'
```

Recall returns ranked evidence with its identity and provenance. Use a returned record ID to recover the exact original JSON:

```sh
node scripts/rea.mjs hcl-get-evidence ./cases/build-v1 RECORD_ID --json
```

Keep the same source label when importing observations from the next build, then compare the cases:

```sh
node scripts/rea.mjs hcl-compare-cases ./cases/build-v1 ./cases/build-v2
```

The comparison preserves ambiguity when several observations could correspond. Recall scores express resonance ranking; source evidence remains the basis for deciding whether a finding answers your question.

In MCP, remembering can use existing session `evidence_ids`. An agent can retain findings already held by REA without copying their complete contents back through its own context. Original evidence bytes stay in the case alongside the native memory identity, supporting exact recovery later.

## Connect your agent

Register this checkout directly in your MCP client's configuration. Replace the absolute path with your actual location:

```json
{
  "mcpServers": {
    "rea2": {
      "command": "node",
      "args": ["/absolute/path/REA2.0/scripts/rea.mjs", "mcp"],
      "env": {"REA_MARVOSA_PYTHON": "python3"}
    }
  }
}
```

Restart the client after saving its configuration. The server exposes the existing REA tools and the nine HCL tools through the same interface. For clients that need the expanded schema guidance, set `REA_MCP_INPUT_SCHEMA_PROFILE=full` in the server environment.

A useful starting request is:

> Investigate how this application stores and searches notes. Follow the relevant modules, explain the behavior from the evidence, and help me implement an importer for my project. Retain the findings in a case so we can continue later.

For a source package:

> Analyze this complete codec package, transcribe its supported operations into HCL, and run its public encode and decode functions on my sample. Save the program so we can repeat the work with another input.

Your agent can use the results to help write code, suggest changes, and plan further investigation. The HCL tools themselves operate locally and do not require an external model API. An agent connected to a remote model may send tool results to that model according to its own configuration.

Whole-package work can run longer than an MCP client's default timeout. Configure your client for the task, or use the CLI for long jobs. Large retained results can be delivered through REA's evidence-export tools.

## What you can work with

| Target or task | How REA2.0 helps | Requirements |
| --- | --- | --- |
| Python source | Analyze and transcribe supported functions, arithmetic, branches, loops, and local modules | Python 3.10+ |
| JavaScript / TypeScript source | Build and execute HCL graphs, including supported objects, classes, typed arrays, and connected modules | Node.js and Python |
| JSON | Preserve complete content and lower data with native numeric input handling | HCL runtime |
| WebAssembly integer programs | Decode and execute supported instructions with binary locations retained | HCL runtime; imports need supported adapters |
| JavaScript / Electron applications | Inspect modules, imports, source maps, routes, and IPC relationships | Node.js; host process prerequisites apply |
| Native binaries | Inspect pseudocode, assembly, symbols, strings, calls, and references | Configured Hopper, Ghidra, IDA, or another supported provider |
| .NET assemblies | Inspect metadata, CIL, dependencies, and build differences | Built-in static analysis |
| Android packages and devices | Inspect packages, resources, decompiled methods, and selected device behavior | JADX/JDK, Apktool, or adb as appropriate |
| Websites and captured traffic | Follow page structure, scripts, network observations, and saved requests | Browser or capture-specific tooling |
| SQLite databases | Inspect schemas and selected rows from local snapshots | Node.js 24.15+ within 24.x, or 26+ |
| Archives and application resources | Inventory files, digests, bundle structure, and extracted resources | Format-specific built-in tools |
| Saved investigation evidence | Retain, recall, recover, and compare observations through HCL memory | HCL runtime |

The source frontends implement a defined set of language operations. Async behavior, unsupported APIs, some class features, and WebAssembly floating-point instructions need additional adapters. Complete content is retained even when it has no executable interpretation; source-linked unknowns tell you where more work is needed. The [transcription guide](docs/hcl-transcription.md) describes the current coverage in detail.

The integration reads whole inputs without adding intake chunks or record-count quotas. Available host resources, the source format, and the selected client's transport still determine what a particular machine can complete.

## Native learning sessions

The runtime also includes Marvosa's native `HCLLanguageModel` and `LivingMemory` as a resident session:

```sh
python3 -I -B scripts/hcl-ai.py
```

Send one JSON request per line:

```jsonl
{"operation":"experience","evidence_id":"notes-storage","text":"Joplin stores notes in database.sqlite."}
{"operation":"ask","prompt":"Joplin stores notes"}
{"operation":"feedback","evidence_ids":["notes-storage"]}
{"operation":"get","evidence_id":"notes-storage"}
```

The same native instance receives experiences, answers through its interaction method, and incorporates feedback until the process closes. Complete supplied text enters its living memory. Repeated experience reinforces existing traces, and feedback invokes native reinforcement and decay.

This is a separate resident interface, with live state held for that session. Persistent investigation cases use the case commands above. Generated language and exact evidence recovery serve different purposes: recovered evidence preserves the input, while generation reflects what the native model has learned. The [native learning guide](docs/native-hcl-ai-results.md) describes the exercised workflows and observed behavior.

## Comfortable everyday operation

Normal commands show the requested result. Opening the CLI or connecting an MCP client does not start a demonstration, benchmark, or project verification run.

Use `--json` to export complete evidence and saved programs. Explicit output options such as `--format`, `--full-output`, and `--filter-output` remain available for scripting and detailed inspection. MCP keeps the structured evidence contract for agents.

Extra full source-memory regeneration is requested with `hcl-transcribe --verify-memory`. Case verification is an explicit `hcl-verify-case CASE` operation. The original 1/137 integrity check and checks needed to read saved programs remain quiet during their relevant operations. If an operation cannot complete, its failure is still reported.

For troubleshooting, set `REA_LOG_LEVEL=info` or `debug`. Developer test suites live in the corresponding source archive, outside the installed runtime workflow.

## Work already exercised

The HCL path has been used with unchanged open-source packages: Base64 conversion through `base64-js`, color transformations through CPython's `colorsys.py`, source-map encoding through `@jridgewell/sourcemap-codec`, and compiled source-map processing through Mozilla's Rust-built WebAssembly module.

The complete Pako package has also been exercised through its public compression and decompression APIs, including connected calls, dictionary use, and a stateful compressor. Saved-program replay repeated that workflow with the original source directory unavailable. These cases show concrete ways to use the system; the linked guides record the exact inputs and coverage. They are not startup jobs and do not claim every program will behave identically under a different numerical substrate.

For application investigation, the [Notion clipboard case](docs/notion-real-case.md) connects an established REA workflow with native HCL retention and recovery. The useful progression is from finding relevant behavior to keeping it available for further work.

## Commands at a glance

| CLI | MCP | Purpose |
| --- | --- | --- |
| `hcl-transcribe PATH` | `hcl_transcribe` | Analyze and build an HCL graph; optionally execute supplied calls |
| `hcl-run PROGRAM` | `hcl_run` | Run a saved graph |
| `hcl-calculate EXPRESSION` | `hcl_calculate` | Calculate with native HCL arithmetic |
| `hcl-remember-evidence CASE FILE` | `hcl_remember_evidence` | Retain investigation evidence |
| `hcl-recall-evidence CASE QUERY` | `hcl_recall_evidence` | Find retained evidence through HCL ranking |
| `hcl-get-evidence CASE RECORD_ID` | `hcl_get_evidence` | Recover complete original evidence |
| `hcl-inspect-case CASE` | `hcl_inspect_case` | Inspect case coverage and links |
| `hcl-verify-case CASE` | `hcl_verify_case` | Explicitly verify retained case integrity |
| `hcl-compare-cases LEFT RIGHT` | `hcl_compare_cases` | Compare retained observations |

Run any command with `--help` for its options. Existing REA investigation commands remain available alongside these tools.

## Updates and development

Update this runtime from this repository and reinstall its runtime dependencies. Keep saved work and cases outside the checkout. Saved graphs identify their engine arrangement; preserve a matching runtime when you need to replay older graphs.

Use this repository's distribution rather than `npx rea-agents` or `rea update`, which belong to the upstream package workflow. This derivative is not published to npm.

The [corresponding source archive](source/rea-marvosa-source.zip) contains the implementation, build configuration, dependency lock, tests, and development scripts for this runtime. Extract it into a separate directory for development. Large historical experiment captures and the upstream marketing website are omitted from that source archive; normal runtime use does not require them. Read the source tree's contribution and build instructions before changing the implementation.

Please report REA2.0 issues in this repository with the command, runtime version, target type, and enough input to reproduce the behavior. Useful contributions include frontend coverage, practical workflows, clearer guides, and improvements grounded in real software tasks.

## Go deeper

- [HCL transcription](docs/hcl-transcription.md): source capture, execution, supported semantics, and numeric boundaries.
- [Whole-project workflows](docs/hcl-projects.md): module resolution, connected calls, and stateful APIs.
- [Objects and source modules](docs/hcl-objects.md): classes, receivers, typed arrays, and source-map work.
- [Compiled WebAssembly](docs/hcl-wasm.md): binary graphs, memory, callbacks, and complete operation traces.
- [Native learning sessions](docs/native-hcl-ai-results.md): resident experiences, feedback, and recovery.
- [CLI and evidence](docs/cli.md): existing REA commands and evidence workflows.
- [Provider installation](docs/installation.md): prerequisites for specialized REA analyzers; use the local REA2.0 registration above for this derivative.
- [Integration architecture](docs/marvosa-integration.md): where REA and native Marvosa responsibilities meet.

Some retained technical guides describe earlier integration milestones or development commands. Use this README for runtime installation and the separate source tree for developer workflows.

## Origins and license

REA2.0 builds on the investigation tooling of [morluto/rea](https://github.com/morluto/rea) and the HCL work of Anthony Jordon in [Ajordon30005/marvosa](https://github.com/Ajordon30005/marvosa). Their original identities and notices are retained.

The combined derivative is distributed under [GPL-3.0-only](LICENSE). Original REA-authored code retains its [MIT notice](licenses/REA-MIT.txt); other components retain their own licenses in [Third-party notices](THIRD_PARTY_NOTICES.md). External commercial analysis tools require their own valid licenses.

REA2.0 is for software you own or are authorized to investigate, including interoperability, maintenance, education, and preservation. See [DISCLAIMER.md](DISCLAIMER.md).
