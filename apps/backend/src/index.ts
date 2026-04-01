import { Elysia } from "elysia";
import { onAfterHandler } from "./onAfterHandle";
import { getBindingInfo, logStartup } from "./startMessage";
import pkg from "../package.json";
import { authHandler, songHandler } from "@handlers/index";
import { AppError, observability } from "@cvsa/core";
import { errorHandler } from "./errorHandler";
import { openapi } from "@elysiajs/openapi";
import { requestLoggerMiddleware } from "@common/middlewares";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";

const [host, port] = getBindingInfo();

logStartup(host, port, observability.otelAvailable);

export const app = new Elysia({
	serve: {
		hostname: host,
	},
	prefix: "/v2",
})
	.error({
		AppError,
	})
	.use(
		opentelemetry({
			spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
		})
	)
	.use(requestLoggerMiddleware)
	.onError(errorHandler)
	.use(onAfterHandler)
	.use(openapi())
	.use(authHandler)
	.use(songHandler)
	.listen(16412);

export const VERSION = pkg.version;

export type App = typeof app;
