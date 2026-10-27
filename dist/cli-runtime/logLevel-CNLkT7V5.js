import { __esmMin } from "./rolldown-runtime-DXoylpqc.js";
import { z } from "zod";

//#region dist/config/logLevel.js
var logLevelSchema;
function init_logLevel() {
	return (init_logLevel = __esmMin((() => {
		logLevelSchema = z.enum([
			"trace",
			"debug",
			"info",
			"warn",
			"error",
			"fatal",
			"silent"
		]).default("warn");
	})))();
}

//#endregion
export { init_logLevel, logLevelSchema };