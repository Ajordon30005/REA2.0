# Notion: a real published REA use case

Validated 2026-10-23 UTC with `6.7.0-marvosa.3`. This is a real packaged-code investigation and an isolated original-function replay, not a Notion UI/OS clipboard test.

## Why this target

[REA's official Notion showcase](https://rea.tools/showcase/notion/) documents the clipboard route in Notion Desktop 7.6.1 using REA 4.1.0. It is a published, recognizable REA use case; this does not establish that the showcase caused REA's popularity.

The public [Notion desktop download](https://www.notion.com/desktop) supplied **7.40.1**, not the showcase's older release. The installer was extracted as data; neither it nor the complete Notion app was executed. We investigated the equivalent feature in the current package and preserved the version difference.

| Artifact                                        |     Bytes | SHA-256                                                            |
| ----------------------------------------------- | --------: | ------------------------------------------------------------------ |
| Official Windows installer                      | 120020824 | `71443630105ca54ee710892ca2cda6c60c3d9c60178a1b8aea364497af9498bf` |
| `resources/app.asar`                            |  26119631 | `36cc65c5d17811f6bbe90aa0444be3f3f267f3151ea59988411e8f94dba9ff73` |
| `.webpack/renderer/tab_browser_view/preload.js` |    404474 | `a04c5cadeb049fbbf7e6755bb4e09a6682c838643c5cb1074cc742a48c503639` |

## Findings and checks

REA parsed the complete selected preload: 128 webpack modules, 94406 AST nodes and 293 reported findings, with no parse failure. A focused `trace_application_feature` from `__electronApi.copyText` recovered the static candidate route to `navigator.clipboard.writeText`. The showcase's older `notion:clipboard:write` literal is absent from the inspected preload and main bundle. This conclusion concerns the exposed `copyText` path, not every possible clipboard feature.

The actual extracted 52-character function was:

```javascript
function(e){return navigator.clipboard.writeText(e)}
```

Its SHA-256 is `de72901ebea4341ed4dcc3e9022f590721bbec19b54b8d816d478154cbcfbef9`. Six checks passed against an instrumented browser-API boundary: empty text, ordinary text, Unicode, HTML-looking text kept as text, rejected-promise propagation and synchronous-error propagation. For the four inputs, the original value and the browser API's original promise were preserved. The context-bridge exposure remains a separate static inference; no live Electron permissions or physical clipboard behavior was established.

The native HCL integration then retained five complete records: the analysis summary, focused trace, negative legacy-channel trace, original preload source and probe evidence. A fresh Node process and stdio MCP server verified and recovered **449176 bytes**, independently checked against the original per-record SHA-256 values. The complete recovered source was also compared with the extracted file. All five records had complete indexes; original derived/inferred/observed labels remained intact. The large parent analysis was retained separately in REA's export, so the small HCL case correctly reports that parent link as unresolved rather than claiming a closed evidence graph.

| Recall query                    | Observed result among five records                                   |
| ------------------------------- | -------------------------------------------------------------------- |
| `copyText`                      | Focused trace ranked first                                           |
| `navigator.clipboard.writeText` | Focused trace ranked first                                           |
| `notion:clipboard:write`        | Explicit negative trace ranked fifth; weak ranking for this question |

## What this does and does not establish

REA already has evidence export/import, integrity verification, retained analysis and comparison. Those are not new inventions here. REA's existing analyzer found the route; HCL did not discover an extra route, improve REA's parser or demonstrate greater analysis accuracy. The added behavior exercised here is the original Marvosa resonance ranking, whole-record HVP inverse recovery and HCL case identity over actual REA evidence. Ranking is useful for the two positive queries but not reliable enough here to substitute for exact channel lookup. No head-to-head speed, memory, token-cost or recall-quality advantage was established.

The original REA semantic extractor reached its existing per-file node budget in this package. That limitation remains visible in the original evidence. Broad traces also exceeded the MCP server's existing response framing budget; their full completed results were exported through REA. The narrower entry-path trace succeeded. These are disclosed REA/transport constraints, not limits on the Marvosa engine or a claim that every analysis path is complete.

## Reproduce on an authorized local copy

Build this repository and place an independently obtained Notion `app.asar` at `CASE/extracted/resources/app.asar`. Use a new writable absolute `CASE` directory. The scripts generate private source copies and evidence there; no Notion installation or login is required. Public downloads can change: inspect the generated version/hash manifest before comparing results with this report.

```sh
TURBO_TELEMETRY_DISABLED=1 DO_NOT_TRACK=1 npm run build:cached
node experiments/marvosa-notion/inspect-package.mjs /absolute/path/CASE
node experiments/marvosa-notion/investigate.mjs analyze /absolute/path/CASE
node experiments/marvosa-notion/investigate.mjs focus /absolute/path/CASE
node experiments/marvosa-notion/probe-copy-text.mjs /absolute/path/CASE
node experiments/marvosa-notion/investigate.mjs remember /absolute/path/CASE
node experiments/marvosa-notion/investigate.mjs resume /absolute/path/CASE
```

Each invocation closes its own MCP server. `resume` checks byte identity after the ingestion process exits. Drivers use a ten-minute client wait for this test, not an HCL worker deadline. The probe refuses any body other than the inspected one-return `navigator.clipboard.writeText` function; a future implementation change requires review. The distribution includes hashes and compact results, not the Notion installer, full proprietary source or the source-containing case database.
