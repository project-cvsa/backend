import { Elysia } from "elysia";
import { onAfterHandler } from "./onAfterHandle";
import { getBindingInfo, logStartup } from "./startMessage";
import pkg from "../package.json";
import { authHandler, songHandler, engineHandler } from "@handlers/index";
import { errorHandler } from "./errorHandler";
import { openapi } from "@elysiajs/openapi";
import { requestLoggerMiddleware } from "@/middlewares";
import { opentelemetry } from "@elysiajs/opentelemetry";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { devHandler } from "./handlers";

const [host, port] = getBindingInfo();

logStartup(host, port);

export const app = new Elysia({
	serve: {
		hostname: host,
	},
	prefix: "/v2",
})
	.use(
		opentelemetry({
			spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
		})
	)
	.use(onAfterHandler)
	.use(requestLoggerMiddleware)
	.use(errorHandler)
	.use(openapi())
	.use(authHandler)
	.use(songHandler)
	.use(engineHandler)
	.use(devHandler)
	.listen(16412);

export const VERSION = pkg.version;

export type App = typeof app;
