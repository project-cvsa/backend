import { describe, expect, test, mock } from "bun:test";
import { SongService, AppError } from "@cvsa/core";
import type { SongRepository, SongDetailsResponseDto } from "@cvsa/core";

describe("SongService", () => {
	const mockGetDetailsById = mock<SongRepository["getDetailsById"]>();
	const mockRepository = {
		getDetailsById: mockGetDetailsById,
	} as unknown as SongRepository;
	const songService = new SongService(mockRepository);

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
		lyrics: []
	};

	describe("getDetails", () => {
		test("returns song details when song exists", async () => {
			mockGetDetailsById.mockResolvedValue(mockSongDetails);

			const result = await songService.getDetails(1);

			expect(result).toEqual(mockSongDetails);
			expect(mockGetDetailsById).toHaveBeenCalledWith(1);
		});

		test("throws NOT_FOUND error when song does not exist", async () => {
			mockGetDetailsById.mockResolvedValue(null);

			expect(songService.getDetails(999)).rejects.toThrow(AppError);
			expect(songService.getDetails(999)).rejects.toThrow("Song not found");
			expect(songService.getDetails(999)).rejects.toMatchObject({
				code: "NOT_FOUND",
				statusCode: 404,
			});
		});
	});
});
