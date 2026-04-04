import Elysia from "elysia";
import { createSongHandler } from "./create";

export const songHandler = new Elysia().use(createSongHandler);
