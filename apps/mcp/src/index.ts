import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { stockDeleteSetup } from "./tools";

const app = new Hono();

const mcpServer = new McpServer({
	name: "CVSA MCP",
	version: "1.0.0",
});

stockDeleteSetup(mcpServer);

app.use(async (c, next) => {
	const token = c.req.header("Authorization")?.split(" ")[1];
	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	const storedToken = import.meta.env.TOKEN;
	if (storedToken !== token) {
		return c.json({ error: "Unauthorized" }, 401);
	}
	await next();
});

app.all("/mcp", async (c) => {
	const transport = new StreamableHTTPTransport();
	await mcpServer.connect(transport);
	return transport.handleRequest(c);
});

export default {
	fetch: app.fetch,
	port: 15800
};
