import { logs } from "@opentelemetry/api-logs";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { env, createPinoLogger, createApplicationLogger } from "@cvsa/core/common";

export async function initOtelSdk() {
	const resource = resourceFromAttributes({
		"service.name": env.OTEL_SERVICE_NAME,
		"service.version": env.OTEL_SERVICE_VERSION,
		"deployment.environment": env.NODE_ENV ?? "development",
	});

	const sdk = new NodeSDK({
		resource,
	});

	sdk.start();
}

export interface Observability {
	pinoLogger: ReturnType<typeof createPinoLogger>;
	appLogger: ReturnType<typeof createApplicationLogger>;
}

async function initializeObservability(): Promise<Observability> {
	const pinoLogger = createPinoLogger({
		LOG_LEVEL: env.LOG_LEVEL,
		NODE_ENV: env.NODE_ENV,
	});

	await initOtelSdk();

	const otelLogger = logs.getLogger(env.OTEL_SERVICE_NAME || "@cvsa/core");

	const appLogger = createApplicationLogger(pinoLogger, otelLogger);

	return {
		pinoLogger,
		appLogger,
	};
}

export const observability = await initializeObservability();
export const appLogger = observability.appLogger;
export const pinoLogger = observability.pinoLogger;
