import { z } from "zod";
/** Routine completion logs are opt-in; operational warnings remain visible. */
export const logLevelSchema = z
    .enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"])
    .default("warn");
