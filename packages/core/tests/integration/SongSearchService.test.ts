import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { songRepository } from "@cvsa/core";
import { prisma } from "@cvsa/db";
import { SongSearchService } from "../../src/search/catalog/song";
import type { EmbeddingAppApi } from "@cvsa/embedding";
import { SearchManager } from "../../src/search/manager";
import { env } from "@cvsa/env";
import { MeiliSearch } from "meilisearch";
// import { OriginalMeiliSearch } from "../utils";
// import type { MeiliSearch as MeiliType } from "meilisearch";

// const MeiliSearch = OriginalMeiliSearch.MeiliSearch;
// console.debug("CCCCCCC", MeiliSearch);
// type MeiliSearch = MeiliType;

const MEILI_HOST = env.MEILI_API_URL ?? "http://127.0.0.1:7700";
const MEILI_MASTER_KEY = env.MEILI_MASTER_KEY ?? "";

const waitForTask = async (client: MeiliSearch, taskUid: number) => {
	return client.tasks.waitForTask(taskUid, { timeout: 10000, interval: 100 });
};

const cleanupIndex = async (client: MeiliSearch, indexName: string) => {
	try {
		const task = await client.deleteIndex(indexName);
		await waitForTask(client, task.taskUid);
	} catch {
		// Index may not exist
	}
};

const createIndexIfNotExists = async (client: MeiliSearch, indexName: string) => {
	try {
		await client.getIndex(indexName);
	} catch {
		const task = await client.createIndex(indexName, { primaryKey: "id" });
		await waitForTask(client, task.taskUid);
	}
};

describe("SongSearchService Integration Tests", () => {
	const client = new MeiliSearch({ host: MEILI_HOST, apiKey: MEILI_MASTER_KEY });
	let searchManager: SearchManager;
	let mockEmbeddingManager: EmbeddingAppApi;

	beforeAll(async () => {
		await prisma.$connect();
		await cleanupIndex(client, "song_zh");
		await cleanupIndex(client, "song_en");
		await createIndexIfNotExists(client, "song_zh");
		await createIndexIfNotExists(client, "song_en");

		searchManager = await SearchManager.create();

		mockEmbeddingManager = {
			embeddings: {
				post: async ({ texts }: { texts: string[] }) => {
					const dimensions = 256;
					const embeddings = texts.map(() =>
						Array.from({ length: dimensions }, () => Math.random())
					);
					return { data: { embeddings } } as never;
				},
			},
		} as never;
	});

	beforeEach(async () => {
		const indexZh = client.index("song_zh");
		const indexEn = client.index("song_en");
		try {
			await indexZh.deleteAllDocuments();
			await indexEn.deleteAllDocuments();
		} catch {
			// Ignore
		}
	});

	afterAll(async () => {
		await prisma.creation.deleteMany();
		await prisma.artistRole.deleteMany();
		await prisma.artist.deleteMany();
		await prisma.performance.deleteMany();
		await prisma.lyrics.deleteMany();
		await prisma.singer.deleteMany();
		await prisma.song.deleteMany();
		await prisma.$disconnect();
	});

	describe("sync", () => {
		test("syncs song to search index", async () => {
			const singer = await prisma.singer.create({
				data: { name: "测试歌手", language: "zh" },
			});
			const artistRole = await prisma.artistRole.create({
				data: { name: "作曲" },
			});
			const artist = await prisma.artist.create({
				data: { name: "测试艺术家", language: "zh" },
			});

			const song = await songRepository.create({
				name: "测试歌曲",
				type: "ORIGINAL",
				language: "zh",
				description: "这是一首测试歌曲",
				performances: [{ singerId: singer.id }],
				creations: [{ artistId: artist.id, roleId: artistRole.id }],
			});

			const service = new SongSearchService(
				songRepository,
				searchManager,
				mockEmbeddingManager
			);
			await service.sync(song.id);

			const index = client.index("song_zh");
			const documents = await index.getDocuments<SongSearchDocument>();
			expect(documents.results.length).toBeGreaterThan(0);

			const doc = documents.results.find((d) => d.id === song.id);
			expect(doc).toBeDefined();
			expect(doc?.name).toBe("测试歌曲");
		});

		test("deletes song from search index when song is removed", async () => {
			const song = await songRepository.create({ name: "待删除歌曲" });

			const service = new SongSearchService(
				songRepository,
				searchManager,
				mockEmbeddingManager
			);
			await service.sync(song.id);

			const index = client.index("song_zh");
			let documents = await index.getDocuments<SongSearchDocument>();
			let doc = documents.results.find((d) => d.id === song.id);
			expect(doc).toBeDefined();

			await songRepository.softDelete(song.id);

			await service.sync(song.id);

			documents = await index.getDocuments<SongSearchDocument>();
			doc = documents.results.find((d) => d.id === song.id);
			expect(doc).toBeUndefined();
		});

		test("handles song with localized content", async () => {
			const song = await songRepository.create({
				name: "多语言歌曲",
				language: "zh",
				localizedNames: { en: "Multi-language Song", ja: "多言語曲" },
				localizedDescriptions: { en: "English description" },
			});

			const service = new SongSearchService(
				songRepository,
				searchManager,
				mockEmbeddingManager
			);
			await service.sync(song.id);

			const zhIndex = client.index("song_zh");
			const enIndex = client.index("song_en");

			const zhDocs = await zhIndex.getDocuments<SongSearchDocument>();
			const enDocs = await enIndex.getDocuments<SongSearchDocument>();

			const zhDoc = zhDocs.results.find((d) => d.id === song.id);
			const enDoc = enDocs.results.find((d) => d.id === song.id);

			expect(zhDoc).toBeDefined();
			expect(enDoc).toBeDefined();
			expect(enDoc?.name).toBe("Multi-language Song");
			expect(enDoc?.description).toBe("English description");
		});
	});

	describe("search", () => {
		test("performs hybrid search", async () => {
			const song = await songRepository.create({
				name: "混合搜索测试",
				language: "zh",
				description: "用于测试混合搜索功能",
			});

			const service = new SongSearchService(
				songRepository,
				searchManager,
				mockEmbeddingManager
			);
			await service.sync(song.id);

			const result = await service.search("混合搜索", "zh");

			expect(result).toBeDefined();
			expect(result.hits).toBeDefined();
		});

		test("throws error when search manager is not available", async () => {
			const serviceWithoutManager = new SongSearchService(
				songRepository,
				undefined as never,
				mockEmbeddingManager
			);

			expect(serviceWithoutManager.search("test")).rejects.toThrow(
				"Search or embedding service not available"
			);
		});
	});
});

type SongSearchDocument = {
	id: number;
	name?: string;
	description?: string;
	singers?: string[];
	artists?: string[];
};
