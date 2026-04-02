import Elysia from "elysia";
import type { Logger } from "pino";
import { appLogger, pinoLogger } from "@cvsa/core";
import { ip } from "elysia-ip";

interface RequestMeta {
	startTime: number;
}

function getLogLevel(status: number): "error" | "warn" | "info" {
	if (status >= 500) return "error";
	if (status >= 400) return "warn";
	return "info";
}

function getHeader(headers: Headers, name: string): string | undefined {
	const value = headers.get(name);
	return value ?? undefined;
}

export interface RequestLoggerOptions {
	excludePaths?: string[];
}

const requestMeta = new WeakMap<Request, RequestMeta>();

export function createRequestLoggerMiddleware(
	pinoLogger: Logger<never>,
	options: RequestLoggerOptions = {}
) {
	const excludePaths = options.excludePaths ?? ["/health", "/metrics"];

	return new Elysia()
		.onRequest(function setRequestMeta({ request }) {
			requestMeta.set(request, {
				startTime: Bun.nanoseconds() / 1_000_000,
			});
		})
		.use(ip())
		.onError({ as: "global" }, function errorLog({ request, set, error, code, ip }) {
			const meta = requestMeta.get(request);
			if (!meta) return;

			const requestPath = new URL(request.url).pathname;
			if (excludePaths.includes(requestPath)) {
				requestMeta.delete(request);
				return;
			}

			const status = typeof set.status === "number" ? set.status : 500;
			const userAgent = getHeader(request.headers, "user-agent");
			const data = {
				type: "http_request",
				method: request.method,
				path: requestPath,
				status,
				latency: `${(Bun.nanoseconds() / 1_000_000 - meta.startTime).toFixed(3)}ms`,
				userAgent,
				ip,
				error: error instanceof Error ? error.message : String(error),
				code,
			};

			pinoLogger[getLogLevel(status)](data);

			appLogger[getLogLevel(status)](data.error, data);

			requestMeta.delete(request);
		})
		.onAfterResponse({ as: "global" }, function afterResponseLog({ request, set, ip }) {
			const meta = requestMeta.get(request);
			if (!meta) return;

			const requestPath = new URL(request.url).pathname;
			if (excludePaths.includes(requestPath)) {
				requestMeta.delete(request);
				return;
			}

			const status = typeof set.status === "number" ? set.status : 200;
			const userAgent = getHeader(request.headers, "user-agent");

			const logData: Record<string, unknown> = {
				method: request.method,
				path: requestPath,
				status,
				latency: `${(Bun.nanoseconds() / 1_000_000 - meta.startTime).toFixed(3)}ms`,
				userAgent,
				ip,
			};

			pinoLogger[getLogLevel(status)](logData);

			requestMeta.delete(request);
		});
}

export const requestLoggerMiddleware = createRequestLoggerMiddleware(pinoLogger);
