// @ts-check
import { defineConfig } from "astro/config";
import UnoCSS from "unocss/astro";
import react from "@astrojs/react";
import node from "@astrojs/node";

export default defineConfig({
	integrations: [UnoCSS({ injectReset: true }), react()],
	adapter: node({
		mode: "standalone",
	}),
	devToolbar: {
		enabled: false,
	},
	output: "server",
});
