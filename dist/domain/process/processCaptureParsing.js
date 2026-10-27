import { processCaptureSchema, } from "./processCapture.js";
const verifiedCaptures = new WeakSet();
const isVerifiedCapture = (capture) => verifiedCaptures.has(capture);
const attachProof = (capture) => {
    verifiedCaptures.add(capture);
    if (isVerifiedCapture(capture))
        return capture;
    throw new TypeError("Process Capture proof ownership failed");
};
/**
 * Parse unknown input and reject invalid commitments or semantics. Failures
 * throw the schema's ZodError so structural and semantic issues stay together.
 */
export const parseProcessCapture = (input) => attachProof(processCaptureSchema.parse(input));
