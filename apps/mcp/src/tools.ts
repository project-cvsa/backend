import { z } from "zod";
import { blacklistVideo } from "./service";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

export const stockDeleteSetup = async (server: McpServer) => {
	server.registerTool(
		"stock-delete-video",
		{
			description: "Remove a video from CVSA stock",
			inputSchema: {
				aid: z.number().describe("The bilibili video ID (aid/av number) of the video"),
			},
		},
		async ({ aid }) => {
			try {
				await blacklistVideo(aid);
				const text = `Successfully added video ${aid} to CVSA stock blacklist.`;
				return {
					content: [{ type: "text", text }],
				};
			} catch (e) {
				const text = `Error occurred when adding video ${aid} to CVSA stock blacklist:\n${Bun.inspect(e)}`;
				return {
					content: [{ type: "text", text }],
				};
			}
		}
	);
};
