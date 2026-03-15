import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { treaty } from "@elysiajs/eden";
import { app } from "@/index";
import { prisma } from "@common/prisma";

const api = treaty(app);

describe("Song E2E Tests", () => {
	beforeEach(async () => {
		await prisma.session.deleteMany();
		await prisma.user.deleteMany();
		await prisma.song.deleteMany();
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

	describe("PUT /v2/song/:id - Update Song", () => {
		test("should update a song with authentication", async () => {
			const token = await getAuthToken();

			const song = await prisma.song.create({
				data: {
					name: "Original Name",
				},
			});

			const { data, status } = await api.v2.song({ id: song.id }).put(
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

			const { status } = await api.v2.song({ id: song.id }).put({
				name: "Updated Name",
			});

			expect(status).toBe(401);
		});

		test("should return 404 for non-existent song", async () => {
			const token = await getAuthToken();

			const { error, status } = await api.v2.song({ id: 999999 }).put(
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

	describe("GET /v2/song - List Songs", () => {
		test("should list songs without authentication", async () => {
			await prisma.song.create({
				data: { name: "Song 1" },
			});
			await prisma.song.create({
				data: { name: "Song 2" },
			});

			const { data, status } = await api.v2.song.get();

			expect(status).toBe(200);
			expect(data?.songs).toHaveLength(2);
			expect(data?.total).toBe(2);
		});

		test("should support pagination", async () => {
			for (let i = 1; i <= 5; i++) {
				await prisma.song.create({
					data: { name: `Song ${i}` },
				});
			}

			const { data, status } = await api.v2.song.get({
				query: { offset: 0, limit: 2 },
			});

			expect(status).toBe(200);
			expect(data?.songs).toHaveLength(2);
			expect(data?.total).toBe(5);
		});

		test("should filter by search term", async () => {
			await prisma.song.create({
				data: { name: "Unique Song Name" },
			});
			await prisma.song.create({
				data: { name: "Another Song" },
			});

			const { data, status } = await api.v2.song.get({
				query: { search: "Unique" },
			});

			expect(status).toBe(200);
			expect(data?.songs).toHaveLength(1);
			expect(data?.songs[0]?.name).toBe("Unique Song Name");
		});

		test("should filter by type", async () => {
			await prisma.song.create({
				data: { name: "Original Song", type: "ORIGINAL" },
			});
			await prisma.song.create({
				data: { name: "Cover Song", type: "COVER" },
			});

			const { data, status } = await api.v2.song.get({
				query: { type: "ORIGINAL" },
			});

			expect(status).toBe(200);
			expect(data?.songs).toHaveLength(1);
			expect(data?.songs[0]?.type).toBe("ORIGINAL");
		});

		test("should exclude soft-deleted songs", async () => {
			await prisma.song.create({
				data: { name: "Active Song" },
			});
			const deletedSong = await prisma.song.create({
				data: { name: "Deleted Song" },
			});
			await prisma.song.update({
				where: { id: deletedSong.id },
				data: { deletedAt: new Date() },
			});

			const { data, status } = await api.v2.song.get();

			expect(status).toBe(200);
			expect(data?.songs).toHaveLength(1);
			expect(data?.songs[0]?.name).toBe("Active Song");
		});
	});
});
