import {
	env,
	createPinoLogger,
	createApplicationLogger,
	initializeOtelSdk,
} from "@cvsa/core/common";
import { logs } from "@opentelemetry/api-logs";

export interface Observability {
	pinoLogger: ReturnType<typeof createPinoLogger>;
	appLogger: ReturnType<typeof createApplicationLogger>;
	otelAvailable: boolean;
}

async function initializeObservability(): Promise<Observability> {
	const pinoLogger = createPinoLogger({
		LOG_LEVEL: env.LOG_LEVEL,
		NODE_ENV: env.NODE_ENV,
	});

	const otelResult = await initializeOtelSdk({
		OTEL_ENABLED: env.OTEL_ENABLED,
		OTEL_EXPORTER_OTLP_ENDPOINT: env.OTEL_EXPORTER_OTLP_ENDPOINT,
		OTEL_EXPORTER_OTLP_PROTOCOL: env.OTEL_EXPORTER_OTLP_PROTOCOL,
		OTEL_SERVICE_NAME: env.OTEL_SERVICE_NAME,
		OTEL_SERVICE_VERSION: env.OTEL_SERVICE_VERSION,
		OTEL_COLLECTOR_TIMEOUT_MS: env.OTEL_COLLECTOR_TIMEOUT_MS,
		OTEL_RETRY_ON_FAILURE: env.OTEL_RETRY_ON_FAILURE,
		OTEL_QUEUE_SIZE: env.OTEL_QUEUE_SIZE,
		OTEL_DEV_MODE_SKIP_EXPORTER: env.OTEL_DEV_MODE_SKIP_EXPORTER,
		NODE_ENV: env.NODE_ENV || "development",
	});

	const otelLogger = otelResult.isAvailable
		? logs.getLogger(env.OTEL_SERVICE_NAME || "@cvsa/core")
		: undefined;

	const appLogger = createApplicationLogger(pinoLogger, otelLogger, otelResult.isAvailable);

	return {
		pinoLogger,
		appLogger,
		otelAvailable: otelResult.isAvailable,
	};
}

export const observability = await initializeObservability();
export const appLogger = observability.appLogger;
export const pinoLogger = observability.pinoLogger;
