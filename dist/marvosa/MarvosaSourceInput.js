import { constants as bufferConstants } from "node:buffer";
import { createHash } from "node:crypto";
import { lstat, readdir, readlink } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { readStableArtifact } from "../artifacts/readStableArtifact.js";
import { parseJavaScriptSource } from "../domain/javascript/javascriptSourceParser.js";
import { jsonObjectSchema } from "../domain/jsonValue.js";
const digest = (value) => createHash("sha256").update(value).digest("hex");
/** Full source snapshots; parser-owned syntax only, never target execution. */
export const prepareMarvosaSourceInput = async (operation, input, scope, signal) => {
    const selected = String(input.path);
    if (operation === "hcl_run") {
        const snapshot = await readStableArtifact(selected, bufferConstants.MAX_LENGTH, signal, undefined, scope);
        const parsed = jsonObjectSchema.parse(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(snapshot.bytes)));
        const envelope = parsed.evidence === undefined
            ? parsed
            : jsonObjectSchema.parse(parsed.evidence);
        const report = envelope.normalized_result === undefined
            ? envelope
            : jsonObjectSchema.parse(envelope.normalized_result);
        const program = report.program === undefined
            ? report
            : jsonObjectSchema.parse(report.program);
        return { program, calls: input.calls ?? [] };
    }
    const sources = [];
    const pending = [{ absolute: selected, relative: basename(selected) }];
    if ((await lstat(selected)).isDirectory())
        pending[0] = { absolute: selected, relative: "" };
    while (pending.length > 0) {
        signal.throwIfAborted();
        const next = pending.pop();
        if (next === undefined)
            break;
        const info = await lstat(next.absolute);
        if (info.isDirectory()) {
            const names = (await readdir(next.absolute)).sort().reverse();
            for (const name of names)
                pending.push({
                    absolute: join(next.absolute, name),
                    relative: next.relative ? `${next.relative}/${name}` : name,
                });
            continue;
        }
        if (info.isSymbolicLink()) {
            const content = await readlink(next.absolute);
            sources.push({
                path: next.relative,
                original_path: next.absolute,
                language: "symlink",
                encoding: "utf8",
                content,
                sha256: digest(content),
                text_sha256: digest(content),
                bytes: Buffer.byteLength(content),
            });
            continue;
        }
        if (!info.isFile())
            throw new TypeError(`Source is not a regular file: ${next.absolute}`);
        const snapshot = await readStableArtifact(next.absolute, bufferConstants.MAX_LENGTH, signal, undefined, scope);
        let content;
        let encoding = "utf8";
        try {
            content = new TextDecoder("utf-8", {
                fatal: true,
                ignoreBOM: true,
            }).decode(snapshot.bytes);
        }
        catch {
            content = Buffer.from(snapshot.bytes).toString("base64");
            encoding = "base64";
        }
        const extension = extname(next.relative).toLowerCase();
        const requested = input.language ?? "auto";
        const wasm = requested === "wasm" ||
            (requested === "auto" &&
                (extension === ".wasm" ||
                    Buffer.from(snapshot.bytes.subarray(0, 4)).equals(Buffer.from([0, 97, 115, 109]))));
        if (wasm) {
            content = Buffer.from(snapshot.bytes).toString("base64");
            encoding = "base64";
        }
        const language = wasm
            ? "wasm"
            : encoding === "base64"
                ? "binary"
                : requested !== "auto"
                    ? String(requested)
                    : extension === ".py"
                        ? "python"
                        : /\.(?:[cm]?[jt]s|[jt]sx)$/u.test(extension)
                            ? "javascript"
                            : extension === ".json"
                                ? "json"
                                : "text";
        const source = {
            path: next.relative,
            original_path: next.absolute,
            language,
            encoding,
            content,
            sha256: digest(snapshot.bytes),
            text_sha256: digest(content),
            bytes: snapshot.bytes.byteLength,
        };
        if (language === "wasm" && !WebAssembly.validate(snapshot.bytes))
            source.parse_error =
                "WebAssembly binary validation failed; complete bytes retained";
        if (language === "javascript") {
            const parsed = parseJavaScriptSource(content, next.relative);
            if (parsed === null)
                source.parse_error =
                    "REA's JavaScript parser could not parse this complete source";
            else if (parsed.errors.length > 0)
                source.parse_error = parsed.errors
                    .map((error) => error.message)
                    .join("\n");
            else
                source.ast = jsonObjectSchema.parse(JSON.parse(JSON.stringify(parsed)));
        }
        sources.push(source);
    }
    return {
        sources,
        calls: input.calls ?? [],
        ...(input.verify_memory === undefined
            ? {}
            : { verify_memory: input.verify_memory }),
        ...(input.query === undefined ? {} : { query: input.query }),
    };
};
