import { describe, expect, test } from "bun:test";
import { SongService, AppError } from "@cvsa/core";
import type { SongDetailsResponseDto, ISongRepository } from "@cvsa/core";
import type { Song } from "@cvsa/db";
import { createMockRepository } from "../utils";

const mockSongDetails: SongDetailsResponseDto = {
	id: 1,
	type: "ORIGINAL",
	name: "Test Song",
	duration: 180,
	description: "A test song",
	coverUrl: "https://example.com/cover.jpg",
	publishedAt: new Date("2024-01-01"),
	deletedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
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
		getById: async () => null,
		getDetailsById: async () => mockSongDetails,
		list: async () => ({ songs: [], total: 0 }),
		create: async () => Promise.resolve(null as unknown as Song),
		update: async () => Promise.resolve(null as unknown as Song),
		softDelete: async () => {},
	});
	const songService = new SongService(mockRepository as unknown as ISongRepository);

	describe("getDetails", () => {
		test("returns song details when song exists", async () => {
			const result = await songService.getDetails(1);

			expect(result).toEqual(mockSongDetails);
			expect(mockRepository.getDetailsById).toHaveBeenCalledWith(1);
		});

		test("throws NOT_FOUND error when song does not exist", async () => {
			mockRepository.getDetailsById.mockResolvedValue(null);

			expect(songService.getDetails(999)).rejects.toThrow(AppError);
			expect(songService.getDetails(999)).rejects.toThrow("Song not found");
			expect(songService.getDetails(999)).rejects.toMatchObject({
				code: "NOT_FOUND",
				statusCode: 404,
			});
		});
	});
});
