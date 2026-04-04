import { env } from "@cvsa/env";
import pino, { stdTimeFunctions } from "pino";

function createPinoLogger(env: { LOG_LEVEL: string; NODE_ENV: string | undefined }): pino.Logger {
	const isProduction = env.NODE_ENV === "production";
	const isTest = env.NODE_ENV === "test";

	const redact = ["authorization", "cookie", "password", "token"];

	const timestamp = stdTimeFunctions.isoTime;

	const baseOptions = {
		level: env.LOG_LEVEL || "info",
		redact,
		timestamp,
		formatters: {
			level: (label: string) => ({ level: label }),
		},
	};

	if (isProduction) {
		return pino(baseOptions);
	}

	if (isTest) {
		return pino({
			...baseOptions,
			level: "warn",
			transport: {
				target: "pino-pretty",
				options: { colorize: true },
			},
		});
	}

	return pino({
		...baseOptions,
		level: "debug",
		transport: {
			target: "pino-pretty",
			options: { colorize: true },
		},
	});
}

export const pinoLogger = createPinoLogger({
	LOG_LEVEL: env.LOG_LEVEL,
	NODE_ENV: env.NODE_ENV,
});
