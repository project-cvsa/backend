import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/index";
import { prisma } from "@lib/prisma";

const api = treaty(app);

describe("Song E2E Tests - POST /v2/song", () => {
	let singerId: number;
	let artistId: number;

	beforeEach(async () => {
		// Clean up in dependency order
		await prisma.artistRole.deleteMany();
		await prisma.singerOfSong.deleteMany();
		await prisma.lyrics.deleteMany();
		await prisma.song.deleteMany();
		await prisma.voicebank.deleteMany();
		await prisma.singerSvsEngineVersion.deleteMany();
		await prisma.singerSvsEngine.deleteMany();
		await prisma.svsEngineVersion.deleteMany();
		await prisma.svsEngine.deleteMany();
		await prisma.singer.deleteMany();
		await prisma.artist.deleteMany();

		// Seed a singer and an artist for relation tests
		const singer = await prisma.singer.create({ data: { name: "Test Singer" } });
		singerId = singer.id;

		const artist = await prisma.artist.create({ data: { name: "Test Artist" } });
		artistId = artist.id;
	});

	afterAll(async () => {
		await prisma.$disconnect();
	});

	test("should create a song with no relations", async () => {
		const { data, status } = await api.v2.song.post({
			name: "Test Song",
			type: "ORIGINAL",
			duration: 240,
		});

		expect(status).toBe(201);
		const id = data?.data.id;
		expect(id).toBeNumber();

		const dbSong = await prisma.song.findUnique({ where: { id } });
		expect(dbSong).not.toBeNull();
		expect(dbSong?.name).toBe("Test Song");
	});

	test("should create a song with singers", async () => {
		const { data, status } = await api.v2.song.post({
			name: "Song With Singer",
			singers: [{ singerId }],
		});

		expect(status).toBe(201);

		const relations = await prisma.singerOfSong.findMany({
			where: { songId: data?.data.id },
		});
		expect(relations).toHaveLength(1);
		expect(relations[0].singerId).toBe(singerId);
	});

	test("should create a song with artists", async () => {
		const { data, status } = await api.v2.song.post({
			name: "Song With Artist",
			artists: [{ artistId, role: "composer" }],
		});

		expect(status).toBe(201);

		const roles = await prisma.artistRole.findMany({
			where: { songId: data?.data.id },
		});
		expect(roles).toHaveLength(1);
		expect(roles[0].artistId).toBe(artistId);
		expect(roles[0].role).toBe("composer");
	});

	test("should create a song with lyrics", async () => {
		const { data, status } = await api.v2.song.post({
			name: "Song With Lyrics",
			lyrics: [{ language: "zh", plainText: "歌词内容" }],
		});

		expect(status).toBe(201);

		const lyricsRows = await prisma.lyrics.findMany({
			where: { songId: data?.data.id },
		});
		expect(lyricsRows).toHaveLength(1);
		expect(lyricsRows[0].language).toBe("zh");
		expect(lyricsRows[0].plainText).toBe("歌词内容");
	});

	test("should create a song with all relations at once", async () => {
		const { data, status } = await api.v2.song.post({
			name: "Full Song",
			type: "ORIGINAL",
			duration: 180,
			description: "A test song",
			singers: [{ singerId }],
			artists: [{ artistId, role: "lyricist" }],
			lyrics: [
				{ language: "en", plainText: "Hello world" },
				{ language: "zh", plainText: "你好世界" },
			],
		});

		expect(status).toBe(201);
		const id = data?.data.id;
		expect(id).toBeNumber();

		const [dbSong, singers, artists, lyrics] = await Promise.all([
			prisma.song.findUnique({ where: { id } }),
			prisma.singerOfSong.findMany({ where: { songId: id } }),
			prisma.artistRole.findMany({ where: { songId: id } }),
			prisma.lyrics.findMany({ where: { songId: id } }),
		]);

		expect(dbSong?.name).toBe("Full Song");
		expect(dbSong?.type).toBe("ORIGINAL");
		expect(singers).toHaveLength(1);
		expect(artists).toHaveLength(1);
		expect(lyrics).toHaveLength(2);
	});

	test("should fail with invalid body (artist role empty string)", async () => {
		const { status } = await api.v2.song.post({
			artists: [{ artistId, role: "" }],
		});

		expect(status).toBe(422);
	});

	test("should create a song with empty body (all fields optional)", async () => {
		const { data, status } = await api.v2.song.post({});

		expect(status).toBe(201);
		expect(data?.data.id).toBeNumber();
	});

	test("should return 422 when duration is negative", async () => {
		const { status } = await api.v2.song.post({
			name: "Bad Song",
			duration: -1,
		});

		expect(status).toBe(422);
	});

	test("should return 422 when singerId does not exist", async () => {
		const { status, error } = await api.v2.song.post({
			singers: [{ singerId: 999999 }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INVALID_RELATION_ID");
	});

	test("should return 422 when artistId does not exist", async () => {
		const { status, error } = await api.v2.song.post({
			artists: [{ artistId: 999999, role: "composer" }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INVALID_RELATION_ID");
	});

	test("should return 422 when voicebank does not belong to singer", async () => {
		// Create a second singer and a voicebank that belongs to them
		const otherSinger = await prisma.singer.create({ data: { name: "Other Singer" } });
		const engine = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
		const version = await prisma.svsEngineVersion.create({
			data: { versionString: "5.0", svsEngineId: engine.id },
		});
		const voicebank = await prisma.voicebank.create({
			data: { singerId: otherSinger.id, svsEngineVersionId: version.id, language: "zh" },
		});

		// Try to attach the other singer's voicebank to our singer
		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, voicebankId: voicebank.id }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INCONSISTENT_SINGER_RELATION");
	});

	test("should return 422 when voicebankId and svsEngineVersionId are mismatched", async () => {
		const engine = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
		const version1 = await prisma.svsEngineVersion.create({
			data: { versionString: "5.0", svsEngineId: engine.id },
		});
		const version2 = await prisma.svsEngineVersion.create({
			data: { versionString: "6.0", svsEngineId: engine.id },
		});
		const voicebank = await prisma.voicebank.create({
			data: { singerId, svsEngineVersionId: version1.id, language: "zh" },
		});

		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, voicebankId: voicebank.id, svsEngineVersionId: version2.id }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INCONSISTENT_SINGER_RELATION");
	});

	test("should return 422 when svsEngineVersionId does not belong to svsEngineId", async () => {
		const engine1 = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
		const engine2 = await prisma.svsEngine.create({ data: { name: "Synthesizer V" } });
		const version = await prisma.svsEngineVersion.create({
			data: { versionString: "1.0", svsEngineId: engine1.id },
		});

		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, svsEngineVersionId: version.id, svsEngineId: engine2.id }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INCONSISTENT_SINGER_RELATION");
	});

	test("should return 422 when singerId does not exist (with valid voicebankId)", async () => {
		const engine = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
		const version = await prisma.svsEngineVersion.create({
			data: { versionString: "5.0", svsEngineId: engine.id },
		});
		// voicebank belongs to the real singerId, not 999999
		const voicebank = await prisma.voicebank.create({
			data: { singerId, svsEngineVersionId: version.id, language: "zh" },
		});

		const { status, error } = await api.v2.song.post({
			singers: [{ singerId: 999999, voicebankId: voicebank.id }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INVALID_RELATION_ID");
	});

	test("should return 422 when svsEngineVersionId is not associated with singer", async () => {
		const engine = await prisma.svsEngine.create({ data: { name: "Synthesizer V" } });
		const version = await prisma.svsEngineVersion.create({
			data: { versionString: "2.0", svsEngineId: engine.id },
		});
		// Deliberately skip creating SingerSvsEngineVersion link

		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, svsEngineVersionId: version.id }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INCONSISTENT_SINGER_RELATION");
	});

	test("should return 422 when svsEngineId is not associated with singer", async () => {
		const engine = await prisma.svsEngine.create({ data: { name: "UTAU" } });
		// Deliberately skip creating SingerSvsEngine link

		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, svsEngineId: engine.id }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INCONSISTENT_SINGER_RELATION");
	});

	test("should create successfully with engine version linked to singer via join table", async () => {
		const engine = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
		const version = await prisma.svsEngineVersion.create({
			data: { versionString: "5.0", svsEngineId: engine.id },
		});
		await prisma.singerSvsEngineVersion.create({
			data: { singerId, svsEngineVersionId: version.id },
		});

		const { data, status } = await api.v2.song.post({
			singers: [{ singerId, svsEngineVersionId: version.id, svsEngineId: engine.id }],
		});

		expect(status).toBe(201);
		expect(data?.data.id).toBeNumber();
	});

	test("should create successfully with consistent voicebank and engine version", async () => {
		const engine = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
		const version = await prisma.svsEngineVersion.create({
			data: { versionString: "5.0", svsEngineId: engine.id },
		});
		const voicebank = await prisma.voicebank.create({
			data: { singerId, svsEngineVersionId: version.id, language: "zh" },
		});

		const { data, status } = await api.v2.song.post({
			singers: [
				{
					singerId,
					voicebankId: voicebank.id,
					svsEngineVersionId: version.id,
					svsEngineId: engine.id,
				},
			],
		});

		expect(status).toBe(201);
		expect(data?.data.id).toBeNumber();
	});

	test("should return 422 when voicebankId does not exist", async () => {
		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, voicebankId: 999999 }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INVALID_RELATION_ID");
	});

	test("should return 422 when svsEngineId does not exist", async () => {
		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, svsEngineId: 999999 }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INVALID_RELATION_ID");
	});

	test("should return 422 when svsEngineVersionId does not exist", async () => {
		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, svsEngineVersionId: 999999 }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INVALID_RELATION_ID");
	});

	test("should return 422 when voicebank engine does not match explicit svsEngineId", async () => {
		const engine1 = await prisma.svsEngine.create({ data: { name: "VOCALOID" } });
		const engine2 = await prisma.svsEngine.create({ data: { name: "Synthesizer V" } });
		const version = await prisma.svsEngineVersion.create({
			data: { versionString: "5.0", svsEngineId: engine1.id },
		});
		const voicebank = await prisma.voicebank.create({
			data: { singerId, svsEngineVersionId: version.id, language: "zh" },
		});

		// voicebank belongs to engine1, but we claim engine2 — no svsEngineVersionId provided
		const { status, error } = await api.v2.song.post({
			singers: [{ singerId, voicebankId: voicebank.id, svsEngineId: engine2.id }],
		});

		expect(status).toBe(422);
		// @ts-expect-error – tracked in elysiajs/elysia#1248 (error type inference still broken for custom onError)
		expect(error?.value?.code).toBe("INCONSISTENT_SINGER_RELATION");
	});

	test("should not persist any data when creation fails due to invalid relation", async () => {
		const songsBefore = await prisma.song.count();

		const { status } = await api.v2.song.post({
			name: "Should Not Exist",
			artists: [{ artistId: 999999, role: "composer" }],
		});

		expect(status).toBe(422);
		const songsAfter = await prisma.song.count();
		expect(songsAfter).toBe(songsBefore);
	});
});
