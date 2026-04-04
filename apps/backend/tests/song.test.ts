import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/index";
import { prisma } from "@cvsa/core";

const api = treaty(app);

describe("Song E2E Tests", () => {
	beforeEach(async () => {
		await prisma.creation.deleteMany();
		await prisma.performance.deleteMany();
		await prisma.lyrics.deleteMany();
		await prisma.song.deleteMany();
		await prisma.voicebank.deleteMany();
		await prisma.svsEngineVersion.deleteMany();
		await prisma.svsEngine.deleteMany();
		await prisma.singer.deleteMany();
		await prisma.artistRole.deleteMany();
		await prisma.artist.deleteMany();
		await prisma.session.deleteMany();
		await prisma.user.deleteMany();
	});

	afterAll(async () => {
		await prisma.session.deleteMany();
		await prisma.user.deleteMany();
		await prisma.$disconnect();
	});

	async function getAuthToken() {
		const signup = await api.v2.user.post({
			username: "test_user",
			password: "password123",
			email: "test@example.com",
		});
		return signup.data?.data.token;
	}

	describe("POST /v2/song - Create Song with relations", () => {
		let singerId: number;
		let artistId: number;
		let roleId: number;

		beforeEach(async () => {
			const singer = await prisma.singer.create({ data: { name: "Test Singer" } });
			singerId = singer.id;

			const artist = await prisma.artist.create({ data: { name: "Test Artist" } });
			artistId = artist.id;

			const role = await prisma.artistRole.create({ data: { role: "composer" } });
			roleId = role.id;
		});

		test("should create a song with lyrics", async () => {
			const { data, status } = await api.v2.song.post({
				name: "Song With Lyrics",
				lyrics: [{ language: "zh", plainText: "歌词内容" }],
			});

			expect(status).toBe(201);
			const lyricsRows = await prisma.lyrics.findMany({ where: { songId: (data as any).id } });
			expect(lyricsRows).toHaveLength(1);
			expect(lyricsRows[0].language).toBe("zh");
			expect(lyricsRows[0].plainText).toBe("歌词内容");
		});

		test("should create a song with performances (singers)", async () => {
			const { data, status } = await api.v2.song.post({
				name: "Song With Singer",
				performances: [{ singerId }],
			});

			expect(status).toBe(201);
			const rows = await prisma.performance.findMany({ where: { songId: (data as any).id } });
			expect(rows).toHaveLength(1);
			expect(rows[0].singerId).toBe(singerId);
		});

		test("should create a song with creations (artists)", async () => {
			const { data, status } = await api.v2.song.post({
				name: "Song With Artist",
				creations: [{ artistId, roleId }],
			});

			expect(status).toBe(201);
			const rows = await prisma.creation.findMany({ where: { songId: (data as any).id } });
			expect(rows).toHaveLength(1);
			expect(rows[0].artistId).toBe(artistId);
			expect(rows[0].artistRoleId).toBe(roleId);
		});

		test("should create a song with all relations at once", async () => {
			const { data, status } = await api.v2.song.post({
				name: "Full Song",
				type: "ORIGINAL",
				duration: 180,
				performances: [{ singerId }],
				creations: [{ artistId, roleId }],
				lyrics: [
					{ language: "en", plainText: "Hello world" },
					{ language: "zh", plainText: "你好世界" },
				],
			});

			expect(status).toBe(201);
			const id = (data as any).id;
			const [perfs, creations, lyrics] = await Promise.all([
				prisma.performance.findMany({ where: { songId: id } }),
				prisma.creation.findMany({ where: { songId: id } }),
				prisma.lyrics.findMany({ where: { songId: id } }),
			]);
			expect(perfs).toHaveLength(1);
			expect(creations).toHaveLength(1);
			expect(lyrics).toHaveLength(2);
		});

		test("should return 422 when singerId does not exist", async () => {
			const { status, error } = await api.v2.song.post({
				performances: [{ singerId: 999999 }],
			});

			expect(status).toBe(422);
			// @ts-expect-error – tracked in elysiajs/elysia#1248
			expect(error?.value?.code).toBe("INVALID_RELATION_ID");
		});

		test("should return 422 when voicebank does not belong to singer", async () => {
			const otherSinger = await prisma.singer.create({ data: { name: "Other Singer" } });
			const engine = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
			const version = await prisma.svsEngineVersion.create({
				data: { versionString: "5.0", svsEngineId: engine.id },
			});
			const voicebank = await prisma.voicebank.create({
				data: { singerId: otherSinger.id, svsEngineVersionId: version.id, language: "zh" },
			});

			const { status, error } = await api.v2.song.post({
				performances: [{ singerId, voicebankId: voicebank.id }],
			});

			expect(status).toBe(422);
			// @ts-expect-error – tracked in elysiajs/elysia#1248
			expect(error?.value?.code).toBe("INCONSISTENT_SINGER_RELATION");
		});
	});

	describe("POST /v2/song - Create Song", () => {
		test("should create a song with authentication", async () => {
			const token = await getAuthToken();

			const payload = {
				name: "Test Song",
				type: "ORIGINAL" as const,
				duration: 180,
			};

			const { data, status } = await api.v2.song.post(payload, {
				headers: {
					authorization: `Bearer ${token}`,
				},
			});

			expect(status).toBe(201);
			expect(data).toMatchObject({
				id: expect.any(Number),
				name: "Test Song",
				type: "ORIGINAL",
				duration: 180,
			});
		});

		test("should return 401 without authentication", async () => {
			const payload = {
				name: "Test Song",
			};

			const { error, status } = await api.v2.song.post(payload);

			expect(status).toBe(401);
			expect(error?.value).toMatchObject({
				code: "UNAUTHORIZED",
			});
		});
	});

	describe("PATCH /v2/song/:id - Update Song", () => {
		test("should update a song with authentication", async () => {
			const token = await getAuthToken();

			const song = await prisma.song.create({
				data: {
					name: "Original Name",
				},
			});

			const { data, status } = await api.v2.song({ id: song.id }).patch(
				{ name: "Updated Name" },
				{
					headers: {
						authorization: `Bearer ${token}`,
					},
				}
			);

			expect(status).toBe(200);
			expect(data?.name).toBe("Updated Name");
		});

		test("should return 401 without authentication", async () => {
			const song = await prisma.song.create({
				data: {
					name: "Test Song",
				},
			});

			const { status } = await api.v2.song({ id: song.id }).patch({
				name: "Updated Name",
			});

			expect(status).toBe(401);
		});

		test("should return 404 for non-existent song", async () => {
			const token = await getAuthToken();

			const { error, status } = await api.v2.song({ id: 999999 }).patch(
				{ name: "Updated Name" },
				{
					headers: {
						authorization: `Bearer ${token}`,
					},
				}
			);

			expect(status).toBe(404);
			expect(error?.value).toMatchObject({
				code: "NOT_FOUND",
			});
		});
	});

	describe("DELETE /v2/song/:id - Delete Song", () => {
		test("should soft delete a song with authentication", async () => {
			const token = await getAuthToken();

			const song = await prisma.song.create({
				data: {
					name: "Song to Delete",
				},
			});

			const { status } = await api.v2.song({ id: song.id }).delete(
				{},
				{
					headers: {
						authorization: `Bearer ${token}`,
					},
				}
			);

			expect(status).toBe(204);

			const deletedSong = await prisma.song.findUnique({
				where: { id: song.id },
			});
			expect(deletedSong?.deletedAt).not.toBeNull();
		});

		test("should return 401 without authentication", async () => {
			const song = await prisma.song.create({
				data: {
					name: "Test Song",
				},
			});

			const { status } = await api.v2.song({ id: song.id }).delete({}, {});

			expect(status).toBe(401);
		});

		test("should return 404 for non-existent song", async () => {
			const token = await getAuthToken();

			const { status } = await api.v2.song({ id: 999999 }).delete(
				{},
				{
					headers: {
						authorization: `Bearer ${token}`,
					},
				}
			);

			expect(status).toBe(404);
		});
	});
});
