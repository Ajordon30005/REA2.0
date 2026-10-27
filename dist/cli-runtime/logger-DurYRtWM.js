import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { ConfigurationError, init_configurationErrors } from "./jsonSerialization-BNsB4Jxk.js";
import { err, init_result, ok } from "./reconstructionObligationLedgerSchemas-DY5ovcSC.js";
import { init_logLevel, logLevelSchema } from "./logLevel-CNLkT7V5.js";
import pino from "pino";

//#region dist/logger.js
var PROCESS_START_CONFIGURATION_SETTINGS, blocksProcessStart, parseLogLevel, createLogger, silentLogger;
function init_logger() {
	return (init_logger = __esmMin((() => {
		init_logLevel();
		init_configurationErrors();
		init_result();
		PROCESS_START_CONFIGURATION_SETTINGS = ["REA_LOG_LEVEL"];
		blocksProcessStart = (setting) => PROCESS_START_CONFIGURATION_SETTINGS.some((candidate) => candidate === setting);
		parseLogLevel = (value) => {
			const parsed = logLevelSchema.safeParse(value);
			if (parsed.success) return ok(parsed.data);
			return err(new ConfigurationError("Invalid REA environment configuration", {
				cause: parsed.error,
				settings: parsed.error.issues.map(({ message }) => ({
					setting: "REA_LOG_LEVEL",
					constraint: message
				}))
			}));
		};
		createLogger = (mode, level) => pino({
			level,
			base: {
				application: "rea",
				mode
			}
		}, pino.destination({
			dest: 2,
			sync: false
		}));
		silentLogger = pino({ level: "silent" });
	})))();
}

//#endregion
export { blocksProcessStart, createLogger, init_logger, parseLogLevel, silentLogger };