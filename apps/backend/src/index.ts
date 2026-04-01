import { Elysia } from "elysia";
import { onAfterHandler } from "./onAfterHandle";
import { getBindingInfo, logStartup } from "./startMessage";
import pkg from "../package.json";
import { authHandler, songHandler } from "@modules/index";
import { AppError } from "@cvsa/core";
import { errorHandler } from "./errorHandler";
import { openapi } from "@elysiajs/openapi";

const [host, port] = getBindingInfo();
logStartup(host, port);

export const app = new Elysia({
	serve: {
		hostname: host,
	},
	prefix: "/v2",
})
	.error({
		AppError,
	})
	.onError(errorHandler)
	.use(openapi())
	.use(authHandler)
	.use(songHandler)
	.use(onAfterHandler)
	.listen(16412);

export const VERSION = pkg.version;

export type App = typeof app;
