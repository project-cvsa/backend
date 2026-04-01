import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z.url(),
		NODE_ENV: z.enum(["development", "test", "production"]).optional(),
		MEILI_MASTER_KEY: z.string().optional().default(""),
		MEILI_API_URL: z.url().optional().default("http://127.0.0.1:7700"),

		OTEL_ENABLED: z.boolean().optional().default(true),
		OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default("http://127.0.0.1:4318"),
		OTEL_EXPORTER_OTLP_PROTOCOL: z
			.enum(["grpc", "http/protobuf"])
			.optional()
			.default("http/protobuf"),
		OTEL_SERVICE_NAME: z.string().optional().default("cvsa-backend"),
		OTEL_SERVICE_VERSION: z.string().optional().default("0.0.0"),
		OTEL_COLLECTOR_TIMEOUT_MS: z.number().optional().default(5000),
		OTEL_RETRY_ON_FAILURE: z.boolean().optional().default(true),
		OTEL_QUEUE_SIZE: z.number().optional().default(2048),
		OTEL_DEV_MODE_SKIP_EXPORTER: z.boolean().optional().default(false),

		LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error"]).optional().default("info"),
	},

	runtimeEnv: import.meta.env,

	emptyStringAsUndefined: true,
});
