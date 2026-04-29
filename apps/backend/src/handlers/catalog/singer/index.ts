import { Elysia } from "elysia";
import { singerCreateHandler } from "./create";
import { singerUpdateHandler } from "./update";
import { singerDeleteHandler } from "./delete";
import { singerGetHandler } from "./get";

export const singerHandler = new Elysia({ name: "singerHandler" })
	.use(singerGetHandler)
	.use(singerCreateHandler)
	.use(singerUpdateHandler)
	.use(singerDeleteHandler);
