import { Elysia } from "elysia";
import { onAfterHandler } from "./onAfterHandle";
import { getBindingInfo, logStartup } from "./startMessage";
import pkg from "../package.json";
import {
	authHandler,
	songDetailsHandler,
	songCreateHandler,
	songUpdateHandler,
	songDeleteHandler,
	songListHandler,
} from "@modules/index";
import { AppError } from "@project-cvsa/core";
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
	.use(songCreateHandler)
	.use(songUpdateHandler)
	.use(songDeleteHandler)
	.use(songListHandler)
	.use(onAfterHandler)
	.listen(16412);

export const VERSION = pkg.version;

export type App = typeof app;
