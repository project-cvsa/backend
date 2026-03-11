import { Elysia } from "elysia";
import { onAfterHandler } from "./onAfterHandle";
import { getBindingInfo, logStartup } from "./startMessage";
import pkg from "../package.json";
import { authHandler, songDetailsHandler } from "@modules/index";
import { AppError } from "@common/error";
import { errorHandler } from "./errorHandler";

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
	.use(authHandler)
	.use(songDetailsHandler)
	.use(onAfterHandler)
	.listen(16412);

export const VERSION = pkg.version;

export type App = typeof app;
