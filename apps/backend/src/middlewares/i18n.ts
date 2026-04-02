import { Elysia } from "elysia";

export const i18nMiddleware = new Elysia({ name: "i18nMiddleware" }).derive(
	{ as: "scoped" },
	async ({ headers }) => {
		const locale = headers["x-locale"] || headers["accept-language"]?.split(",")[0] || "en";

		return {
			locale,
		};
	}
);
