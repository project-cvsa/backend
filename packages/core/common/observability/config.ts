export interface OtelEnv {
	OTEL_ENABLED: boolean;
	OTEL_EXPORTER_OTLP_ENDPOINT: string;
	OTEL_EXPORTER_OTLP_PROTOCOL: string;
	OTEL_SERVICE_NAME: string;
	OTEL_SERVICE_VERSION: string;
	OTEL_COLLECTOR_TIMEOUT_MS: number;
	OTEL_RETRY_ON_FAILURE: boolean;
	OTEL_QUEUE_SIZE: number;
	OTEL_DEV_MODE_SKIP_EXPORTER: boolean;
	NODE_ENV: string;
}

export interface OtelInitResult {
	isAvailable: boolean;
	sdk?: unknown;
	reason?: string;
}

const warnedAboutCollector = Symbol("warnedAboutCollector");

export async function checkOtelCollector(endpoint: string): Promise<boolean> {
	const url = `${endpoint.replace(/\/$/, "")}/v1/logs`;
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 2000);
		const response = await fetch(url, { method: "HEAD", signal: controller.signal });
		clearTimeout(timeoutId);
		return response.ok || response.status === 0;
	} catch {
		return false;
	}
}

export async function initializeOtelSdk(env: OtelEnv): Promise<OtelInitResult> {
	if (!env.OTEL_ENABLED) {
		return { isAvailable: false, reason: "OTEL_ENABLED is false" };
	}

	const isDev = env.NODE_ENV === "development";

	if (isDev) {
		const collectorReachable = true; //await checkOtelCollector(env.OTEL_EXPORTER_OTLP_ENDPOINT);
		if (!collectorReachable) {
			if (env.OTEL_DEV_MODE_SKIP_EXPORTER) {
				return {
					isAvailable: false,
					reason: "Collector unreachable, skipping exporter (OTEL_DEV_MODE_SKIP_EXPORTER=true)",
				};
			}
			if (!(globalThis as Record<symbol, boolean>)[warnedAboutCollector]) {
				console.warn(
					`[OTel] Development mode: OpenTelemetry collector not reachable at ${env.OTEL_EXPORTER_OTLP_ENDPOINT}. ` +
						`Set OTEL_DEV_MODE_SKIP_EXPORTER=true to suppress this warning.`
				);
				(globalThis as Record<symbol, boolean>)[warnedAboutCollector] = true;
			}
		}
	}

	try {
		const { NodeSDK } = await import("@opentelemetry/sdk-node");
		const { BatchLogRecordProcessor } = await import("@opentelemetry/sdk-logs");
		const { Resource } = await import("@opentelemetry/resources");
		const { OTLPLogExporter } = await import("@opentelemetry/exporter-logs-otlp-http");

		const resource = new Resource({
			"service.name": env.OTEL_SERVICE_NAME,
			"service.version": env.OTEL_SERVICE_VERSION,
			"deployment.environment": isDev ? "development" : "production",
		});

		const logExporter = new OTLPLogExporter({
			url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/logs`,
			timeoutMillis: env.OTEL_COLLECTOR_TIMEOUT_MS,
		});

		const _processor = new BatchLogRecordProcessor(logExporter, {
			maxQueueSize: env.OTEL_QUEUE_SIZE,
		});

		const sdk = new NodeSDK({
			resource,
		});

		sdk.start();

		return { isAvailable: true, sdk };
	} catch (error) {
		return {
			isAvailable: false,
			reason: error instanceof Error ? error.message : "Unknown error starting OTel SDK",
		};
	}
}
