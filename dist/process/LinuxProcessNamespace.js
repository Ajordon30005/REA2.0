import { readFile, readdir, readlink } from "node:fs/promises";
import { join } from "node:path";
import { parseLinuxProcessStat, } from "./LinuxProcessStat.js";
import { parseLinuxProcessIds, parseLinuxNamespaceIds, } from "./LinuxProcessStatus.js";
const gone = (cause) => cause instanceof Error &&
    "code" in cause &&
    (cause.code === "ENOENT" || cause.code === "ESRCH");
class ProcessSnapshotChanged extends Error {
}
/**
 * An ancestor-mounted procfs names processes differently from kill/getpid.
 * Translate kernel NSpid/NSpgid/NSsid facts at this one owning boundary.
 * Namespace identity and parent lineage exclude sibling PID namespaces.
 */
export class LinuxProcessNamespaceReader {
    root;
    depth;
    namespace;
    #pending = new Map();
    constructor(root, depth, namespace) {
        this.root = root;
        this.depth = depth;
        this.namespace = namespace;
    }
    async #read(directory, signal) {
        try {
            const raw = await readFile(join(directory, "stat"), {
                encoding: "utf8",
                signal,
            });
            const stat = parseLinuxProcessStat(raw);
            if (stat === undefined)
                throw new Error("Malformed procfs process stat");
            const status = await readFile(join(directory, "status"), {
                encoding: "utf8",
                signal,
            });
            let namespace;
            try {
                namespace = await readlink(join(directory, "ns/pid"));
            }
            catch (cause) {
                if (!(gone(cause) ||
                    (cause instanceof Error &&
                        "code" in cause &&
                        (cause.code === "EACCES" || cause.code === "EPERM"))))
                    throw cause;
            }
            const state = raw
                .slice(raw.lastIndexOf(")") + 1)
                .trim()
                .split(/\s+/u)[0] ?? "";
            // Kernel comm is display only; it never authorizes signaling.
            const command = raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")"));
            return { procfsPid: stat.pid, stat, status, namespace, state, command };
        }
        catch (cause) {
            signal?.throwIfAborted();
            if (gone(cause))
                return undefined;
            throw cause;
        }
    }
    async #snapshot(signal) {
        signal?.throwIfAborted();
        const directories = (await readdir(this.root)).filter((name) => /^[1-9]\d*$/u.test(name));
        const records = new Map();
        // Bound concurrent filesystem work without retaining an ambient environment.
        let cursor = 0;
        const completed = await Promise.allSettled(Array.from({ length: Math.min(16, directories.length) }, async () => {
            while (cursor < directories.length) {
                signal?.throwIfAborted();
                const name = directories[cursor++];
                if (name === undefined)
                    continue;
                const record = await this.#read(join(this.root, name), signal);
                if (record === undefined)
                    continue;
                if (record.procfsPid !== Number(name))
                    throw new Error("Procfs directory/PID mismatch");
                records.set(record.procfsPid, record);
            }
        }));
        const failure = completed.find((entry) => entry.status === "rejected");
        if (failure?.status === "rejected")
            throw failure.reason;
        const visible = new Map([...records].filter(([, value]) => value.namespace === this.namespace));
        // A nested namespace remains visible in the caller's namespace. Include it
        // only through an observed parent chain, never a coincident inner PID.
        let changed = true;
        while (changed) {
            changed = false;
            for (const [pid, record] of records) {
                if (visible.has(pid) || !visible.has(record.stat.parentPid))
                    continue;
                if (record.namespace === undefined &&
                    record.stat.lifecycle !== "zombie" &&
                    record.stat.lifecycle !== "dead")
                    throw new Error("Process PID namespace is unreadable");
                visible.set(pid, record);
                changed = true;
            }
        }
        const localIds = new Map();
        const usedIds = new Set();
        for (const [pid, record] of visible) {
            const pids = parseLinuxNamespaceIds(record.status, "NSpid");
            const local = pids?.[this.depth];
            if (pids?.[0] !== pid || local === undefined || local <= 0)
                throw new Error("Process has no validated caller-namespace PID");
            if (usedIds.has(local))
                throw new Error("Ambiguous caller-namespace PID");
            localIds.set(pid, local);
            usedIds.add(local);
        }
        const result = new Map();
        for (const [pid, record] of visible) {
            const local = localIds.get(pid);
            const groups = parseLinuxNamespaceIds(record.status, "NSpgid");
            const sessions = parseLinuxNamespaceIds(record.status, "NSsid");
            const group = groups?.[this.depth];
            const session = sessions?.[this.depth];
            const parent = localIds.get(record.stat.parentPid) ?? (local === 1 ? 0 : undefined);
            const uids = parseLinuxProcessIds(record.status, "Uid");
            if (parent === undefined)
                throw new ProcessSnapshotChanged("Process parent changed during namespace observation");
            if (group === undefined ||
                session === undefined ||
                parent === undefined ||
                uids === undefined ||
                groups?.[0] !== record.stat.processGroupId ||
                sessions?.[0] !== record.stat.sessionId)
                throw new Error("Incomplete caller-namespace process relations or credentials");
            const directory = join(this.root, String(pid));
            const command = (await readFile(join(directory, "cmdline"), {
                encoding: "utf8",
                signal,
            }))
                .split("\0")
                .filter(Boolean)
                .join(" ") || record.command;
            const after = parseLinuxProcessStat(await readFile(join(directory, "stat"), { encoding: "utf8", signal }));
            if (after === undefined ||
                after.pid !== pid ||
                after.startTime !== record.stat.startTime ||
                after.parentPid !== record.stat.parentPid ||
                after.processGroupId !== record.stat.processGroupId ||
                after.sessionId !== record.stat.sessionId)
                throw new ProcessSnapshotChanged("Process generation or relations changed during namespace observation");
            const stat = {
                ...after,
                pid: local,
                parentPid: parent,
                processGroupId: group,
                sessionId: session,
            };
            result.set(local, {
                directory,
                stat,
                status: record.status,
                table: {
                    pid: local,
                    parentPid: parent,
                    processGroupId: group,
                    uid: uids[1],
                    state: record.state,
                    command,
                },
            });
        }
        signal?.throwIfAborted();
        return result;
    }
    /** Only simultaneous observations share work; a later observation is fresh. */
    async snapshot(signal) {
        signal?.throwIfAborted();
        const pending = this.#pending.get(signal) ?? this.#freshSnapshot(signal);
        this.#pending.set(signal, pending);
        try {
            return await pending;
        }
        finally {
            if (this.#pending.get(signal) === pending)
                this.#pending.delete(signal);
        }
    }
    async #freshSnapshot(signal) {
        for (let attempt = 0;; attempt += 1) {
            try {
                return await this.#snapshot(signal);
            }
            catch (cause) {
                signal?.throwIfAborted();
                if (attempt >= 2 ||
                    !(gone(cause) || cause instanceof ProcessSnapshotChanged))
                    throw cause;
            }
        }
    }
    async process(pid, signal) {
        const observed = (await this.snapshot(signal)).get(pid);
        if (observed === undefined)
            throw Object.assign(new Error("Process is absent from caller PID namespace"), { code: "ENOENT" });
        return observed;
    }
}
/** Aligned procfs retains the existing direct paths and procps inspector. */
export const loadLinuxProcessNamespaceReader = async (root = "/proc", callerPid = process.pid, signal) => {
    const stat = parseLinuxProcessStat(await readFile(join(root, "self/stat"), { encoding: "utf8", signal }));
    if (stat === undefined)
        throw new Error("Cannot establish REA's procfs identity");
    if (stat.pid === callerPid)
        return undefined;
    const status = await readFile(join(root, "self/status"), {
        encoding: "utf8",
        signal,
    });
    const pids = parseLinuxNamespaceIds(status, "NSpid");
    if (pids === undefined || pids[0] !== stat.pid || pids.at(-1) !== callerPid)
        throw new Error("Cannot map REA's PID namespace to procfs");
    const namespace = await readlink(join(root, "self/ns/pid"));
    if (!/^pid:\[\d+\]$/u.test(namespace))
        throw new Error("Malformed kernel PID namespace identity");
    return new LinuxProcessNamespaceReader(root, pids.length - 1, namespace);
};
