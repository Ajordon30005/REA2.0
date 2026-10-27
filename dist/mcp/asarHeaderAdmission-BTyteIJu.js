import { t as __esmMin } from "./rolldown-runtime-BjeaiXFo.js";
import { a as init_result, i as err, o as ok } from "./analysisErrorBase-C1inc3JA.js";
import { i as init_configurationErrors, n as ConfigurationError } from "./configurationErrors-CUPdDkdb.js";
import { z } from "zod";

//#region dist/config/asarHeaderAdmission.js
var ASAR_HEADER_ADMISSION_SETTING, DEFAULT_ASAR_MAX_HEADER_BYTES, MAXIMUM_ASAR_MAX_HEADER_BYTES, DEFAULT_ASAR_HEADER_ADMISSION, asarMaxHeaderBytesConstraint, asarMaxHeaderBytesSchema, parseAsarHeaderAdmission;
function init_asarHeaderAdmission() {
	return (init_asarHeaderAdmission = __esmMin((() => {
		init_configurationErrors();
		init_result();
		ASAR_HEADER_ADMISSION_SETTING = "REA_ASAR_MAX_HEADER_BYTES";
		DEFAULT_ASAR_MAX_HEADER_BYTES = 16 * 1024 * 1024;
		MAXIMUM_ASAR_MAX_HEADER_BYTES = 256 * 1024 * 1024;
		DEFAULT_ASAR_HEADER_ADMISSION = {
			maximumBytes: DEFAULT_ASAR_MAX_HEADER_BYTES,
			source: "default"
		};
		asarMaxHeaderBytesConstraint = `${ASAR_HEADER_ADMISSION_SETTING} must be a positive decimal integer of at most ${String(MAXIMUM_ASAR_MAX_HEADER_BYTES)} bytes (256 MiB); the default is ${String(DEFAULT_ASAR_MAX_HEADER_BYTES)} bytes (16 MiB).`;
		asarMaxHeaderBytesSchema = z.string().regex(/^[1-9]\d*$/u, { error: asarMaxHeaderBytesConstraint }).transform(Number).pipe(z.number().int().max(MAXIMUM_ASAR_MAX_HEADER_BYTES, { error: asarMaxHeaderBytesConstraint }));
		parseAsarHeaderAdmission = (value) => {
			if (value === undefined) return ok(DEFAULT_ASAR_HEADER_ADMISSION);
			const parsed = asarMaxHeaderBytesSchema.safeParse(value);
			return parsed.success ? ok({
				maximumBytes: parsed.data,
				source: "setting"
			}) : err(new ConfigurationError(asarMaxHeaderBytesConstraint, { settings: [{
				setting: ASAR_HEADER_ADMISSION_SETTING,
				constraint: asarMaxHeaderBytesConstraint
			}] }));
		};
	})))();
}

//#endregion
export { asarMaxHeaderBytesSchema as a, MAXIMUM_ASAR_MAX_HEADER_BYTES as i, DEFAULT_ASAR_HEADER_ADMISSION as n, init_asarHeaderAdmission as o, DEFAULT_ASAR_MAX_HEADER_BYTES as r, parseAsarHeaderAdmission as s, ASAR_HEADER_ADMISSION_SETTING as t };