export { createPinoLogger } from "./pinoSetup";
export { createApplicationLogger } from "./appLogger";

export type {
	Severity,
	LogAttributes,
	RequestLogAttrs,
	ApplicationLogger,
	RequestLogger,
	OtelSdkInitResult,
} from "./types";
