import { resolveAsarHeaderAdmission } from "../artifacts/AsarHeader.js";
import { CdpElectronProvider } from "../browser/CdpElectronProvider.js";
/** Construct a fresh provider without opening a target or acquiring an engine. */
export const createElectronObservationProvider = (environment) => new CdpElectronProvider(resolveAsarHeaderAdmission(environment));
