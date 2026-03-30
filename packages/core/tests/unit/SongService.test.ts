import { describe, expect, mock, test } from "bun:test";
import { SongService, AppError } from "@cvsa/core";
import type {
	SongDetailsResponseDto,
	ISongRepository,
	SongSearchService,
	Serialized,
} from "@cvsa/core";
import type { Song } from "@cvsa/db";
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
		getById: async () => null,
		getDetailsById: async () => mockSongDetails,
		create: async () => Promise.resolve(null as unknown as Serialized<Song>),
		update: async () => Promise.resolve(null as unknown as Serialized<Song>),
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
			expect(songService.getDetails(999)).rejects.toThrow("Song not found");
			expect(songService.getDetails(999)).rejects.toMatchObject({
				code: "NOT_FOUND",
				statusCode: 404,
			});
		});
	});
});
