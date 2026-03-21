import { Elysia } from "elysia";
import { songCreateHandler } from "./create";
import { songUpdateHandler } from "./update";
import { songDeleteHandler } from "./delete";
import { songListHandler } from "./list";
import { songDetailsHandler } from "./details";

export const songHandler = new Elysia({ name: "songHandler" })
	.use(songDetailsHandler)
	.use(songCreateHandler)
	.use(songUpdateHandler)
	.use(songDeleteHandler)
	.use(songListHandler);
