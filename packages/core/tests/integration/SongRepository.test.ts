import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { songRepository, type CreateSongRequestDto, type UpdateSongRequestDto } from "@cvsa/core";
import { prisma } from "@cvsa/core/common";

const repository = songRepository;

describe("SongRepository Integration Tests", () => {
	beforeAll(async () => {
		await prisma.$connect();
	});

	afterAll(async () => {
		await prisma.song.deleteMany({ where: { deletedAt: null } });
		await prisma.$disconnect();
	});

	beforeEach(async () => {
		await prisma.song.deleteMany({ where: { deletedAt: null } });
	});

	describe("create", () => {
		test("should create a song with all fields", async () => {
			const input: CreateSongRequestDto = {
				type: "ORIGINAL",
				name: "Test Song",
				duration: 180,
				description: "A test song",
				coverUrl: "https://example.com/cover.jpg",
				publishedAt: new Date("2024-01-01").toISOString(),
			};

			const result = await repository.create(input);

			expect(result).toBeDefined();
			expect(result.id).toBeGreaterThan(0);
			expect(result.type).toBe("ORIGINAL");
			expect(result.name).toBe("Test Song");
			expect(result.duration).toBe(180);
			expect(result.description).toBe("A test song");
			expect(result.coverUrl).toBe("https://example.com/cover.jpg");
			expect(result.deletedAt).toBeNull();
		});

		test("should create a song with minimal fields", async () => {
			const input: CreateSongRequestDto = {
				name: "Minimal Song",
			};

			const result = await repository.create(input);

			expect(result).toBeDefined();
			expect(result.id).toBeGreaterThan(0);
			expect(result.name).toBe("Minimal Song");
			expect(result.type).toBeNull();
			expect(result.duration).toBeNull();
		});
	});

	describe("getById", () => {
		test("should return song when exists", async () => {
			const created = await repository.create({ name: "Find Me Song" });
			const result = await repository.getById(created.id);

			expect(result).toBeDefined();
			expect(result?.id).toBe(created.id);
			expect(result?.name).toBe("Find Me Song");
		});

		test("should return null when song does not exist", async () => {
			const result = await repository.getById(999999);
			expect(result).toBeNull();
		});
	});

	describe("update", () => {
		test("should update all fields", async () => {
			const created = await repository.create({ name: "Old Name", type: "ORIGINAL" });

			const input: UpdateSongRequestDto = {
				name: "New Name",
				type: "COVER",
				duration: 200,
			};

			const result = await repository.update(created.id, input);

			expect(result.name).toBe("New Name");
			expect(result.type).toBe("COVER");
			expect(result.duration).toBe(200);
		});

		test("should update only specified fields", async () => {
			const created = await repository.create({
				name: "Original Name",
				type: "ORIGINAL",
				duration: 100,
			});

			const result = await repository.update(created.id, { name: "Updated Name" });

			expect(result.name).toBe("Updated Name");
			expect(result.type).toBe("ORIGINAL");
			expect(result.duration).toBe(100);
		});
	});

	describe("softDelete", () => {
		test("should soft delete a song", async () => {
			const created = await repository.create({ name: "Song to Delete" });

			await repository.softDelete(created.id);

			const result = await repository.getById(created.id);
			expect(result).toBeNull();
		});
	});
});
