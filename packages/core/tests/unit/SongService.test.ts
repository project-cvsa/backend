import { describe, expect, mock, test } from "bun:test";
import { SongService, AppError } from "@cvsa/core/internal";
import type { SongDetailsResponseDto, ISongRepository, SongSearchService } from "@cvsa/core";
import { createMockRepository } from "../utils";

const mockSongDetails: SongDetailsResponseDto = {
	id: 1,
	type: "ORIGINAL",
	name: "Test Song",
	language: "zh",
	duration: 180,
	description: "A test song",
	coverUrl: "https://example.com/cover.jpg",
	publishedAt: new Date("2024-01-01").toISOString(),
	deletedAt: null,
	createdAt: new Date().toISOString(),
	updatedAt: new Date().toISOString(),
	originalSongId: null,
	localizedNames: {},
	localizedDescriptions: {},
	bilibiliAid: null,
	bilibiliBvid: null,
	vocadbId: null,
	vcpediaId: null,
	moegirlId: null,
	singers: [],
	artists: [],
	lyrics: [],
};

describe("SongService", () => {
	const mockRepository = createMockRepository<ISongRepository>({
		getById: async (id: number) => {
			if (id === 1) {
				return mockSongDetails;
			}
			return null;
		},
		getDetailsById: async (id: number) => {
			if (id === 1) {
				return mockSongDetails;
			}
			return null;
		},
		create: async () => mockSongDetails,
		update: async () => mockSongDetails,
		softDelete: async () => {},
	});

	const mockSearchService = {
		sync: mock(async (_id: number) => {}),
	};

	const songService = new SongService(
		mockRepository as unknown as ISongRepository,
		mockSearchService as unknown as SongSearchService
	);

	describe("getDetails", () => {
		test("returns song details when song exists", async () => {
			const result = await songService.getDetails(1);

			expect(result).toEqual(mockSongDetails);
			expect(mockRepository.getDetailsById).toHaveBeenCalledWith(1);
		});
		
		test("throws NOT_FOUND error when song does not exist", async () => {
			mockRepository.getDetailsById.mockResolvedValue(null);

			expect(songService.getDetails(999)).rejects.toThrow(AppError);
			expect(songService.getDetails(999)).rejects.toThrow("error.song.notfound");
			expect(songService.getDetails(999)).rejects.toMatchObject({
				code: "NOT_FOUND",
				statusCode: 404,
			});
		});
	});

	describe("create", () => {
		const createInput = {
			name: "New Song",
			type: "ORIGINAL" as const,
			duration: 200,
		};

		test("creates song and calls search.sync", async () => {
			const result = await songService.create(createInput);

			expect(result).toMatchObject({
				name: "Test Song",
				type: "ORIGINAL",
				duration: 180,
			});
			expect(mockRepository.create).toHaveBeenCalledWith(createInput);
		});

		test("create song even when search.sync throws", async () => {
			mockSearchService.sync.mockImplementationOnce(async () => {
				throw new Error("Search service unavailable");
			});

			const result = await songService.create(createInput);

			expect(result).toMatchObject({
				name: "Test Song",
				type: "ORIGINAL",
				duration: 180,
			});
			expect(mockRepository.create).toHaveBeenCalledWith(createInput);
		});
	});

	describe("update", () => {
		const updateInput = { name: "Updated Song" };

		test("updates song and calls search.sync on success", async () => {
			const result = await songService.update(1, updateInput);

			expect(result).toMatchObject({
				name: "Test Song",
				type: "ORIGINAL",
				duration: 180,
			});
			expect(mockRepository.getById).toHaveBeenCalledWith(1);
			expect(mockRepository.update).toHaveBeenCalledWith(1, updateInput);
		});

		test("throws NOT_FOUND error when song does not exist", async () => {
			mockRepository.getById.mockResolvedValueOnce(null);

			expect(songService.update(999, updateInput)).rejects.toThrow(AppError);
			expect(songService.update(999, updateInput)).rejects.toThrow("error.song.notfound");
			expect(songService.update(999, updateInput)).rejects.toMatchObject({
				code: "NOT_FOUND",
				statusCode: 404,
			});
		});

		test("updates song even when search.sync throws", async () => {
			mockSearchService.sync.mockImplementationOnce(async () => {
				throw new Error("Search service unavailable");
			});

			const result = await songService.update(1, updateInput);

			expect(result).toMatchObject({
				name: "Test Song",
				type: "ORIGINAL",
				duration: 180,
			});
			expect(mockRepository.update).toHaveBeenCalledWith(1, updateInput);
		});
	});

	describe("delete", () => {
		test("soft deletes song and calls search.sync on success", async () => {
			await songService.delete(1);

			expect(mockRepository.getById).toHaveBeenCalledWith(1);
			expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
		});

		test("throws NOT_FOUND error when song does not exist", async () => {
			mockRepository.getById.mockResolvedValueOnce(null);

			expect(songService.delete(999)).rejects.toThrow(AppError);
			expect(songService.delete(999)).rejects.toThrow("error.song.notfound");
			expect(songService.delete(999)).rejects.toMatchObject({
				code: "NOT_FOUND",
				statusCode: 404,
			});
		});

		test("deletes song even when search.sync throws", async () => {
			mockSearchService.sync.mockImplementationOnce(async () => {
				throw new Error("Search service unavailable");
			});

			await songService.delete(1);

			expect(mockRepository.softDelete).toHaveBeenCalledWith(1);
		});
	});
});
