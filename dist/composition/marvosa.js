import { MarvosaBridge } from "../marvosa/MarvosaBridge.js";
import { MarvosaService } from "../application/marvosa/MarvosaService.js";
/** Construct without starting Python or opening a case. */
export const createMarvosaService = (environment) => new MarvosaService(new MarvosaBridge(environment));
