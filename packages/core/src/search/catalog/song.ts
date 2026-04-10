import type { SongType } from "@cvsa/db";
import { ISearchService } from "../interface";
import { unique, keys } from "remeda";
import type { SongDetailsResponseDto } from "../../modules";
import { appLogger } from "@cvsa/logger";

export interface SongSearchIndex {
	id: number;
	name?: string;
	lyrics?: string;
	description?: string;
	singers?: string[];
	artists?: string[];
	bilibiliAid?: number;
	bilibiliBvid?: string;
	type?: SongType;
	tags?: string[];
	engine?: string[];
	publishedAt?: number;
	bilibiliViews?: number;
	_vectors?: {
		"potion-multilingual-128M": number[];
	};
}

// TODO: Integration test
export class SongSearchService extends ISearchService<SongDetailsResponseDto> {
	private async getDocument(
		song: SongDetailsResponseDto,
		language: string
	): Promise<SongSearchIndex> {
		const getDesc = () => {
			if (language === song.language) return song.description;
			return song.localizedDescriptions?.[language];
		};
		const getLyrics = () => {
			return song.lyrics.find((item) => item.language === language)?.plainText;
		};
		const getLocalizedName = (attr: "singers" | "artists") => {
			const data = song[attr].map((item) => {
				if (item.language === language) {
					return item.name;
				}
				return item.localizedNames?.[language];
			});
			return data.filter(Boolean) as string[];
		};
		const getSingers = () => {
			return getLocalizedName("singers");
		};
		const getArtists = () => {
			return getLocalizedName("artists");
		};
		const getName = () => {
			if (language === song.language) return song.name;
			return song.localizedNames?.[language];
		}
		const vectors = await this.embeddingManager.embeddings.post({
			texts: [
				`Name: ${getName() ?? ""}
Lyrics: ${song.lyrics ?? ""}
Description: ${getDesc() ?? ""}
Singers: ${getSingers().join(", ")}
Artists: ${getArtists().join(", ")}
`,
			],
		});
		return {
			id: song.id,
			name: getName() ?? undefined,
			lyrics: getLyrics() ?? undefined,
			description: getDesc() ?? undefined,
			singers: getSingers(),
			artists: getArtists(),
			bilibiliAid: song.bilibiliAid ?? undefined,
			bilibiliBvid: song.bilibiliBvid ?? undefined,
			type: song.type ?? undefined,
			engine: song.singers
				.map((item) => item.engine ?? undefined)
				.filter(Boolean) as string[],
			publishedAt: song.publishedAt ? new Date(song.publishedAt).getTime() : undefined,
			// TODO: Error handling.
			_vectors: vectors.data?.embeddings[0]
				? {
						"potion-multilingual-128M": vectors.data?.embeddings[0],
					}
				: undefined,
		};
	}

	public async sync(id: number) {
		if (!this.searchManager) {
			appLogger.warn("Search service not available");
			return;
		}
		const song = await this.repository.getDetailsById(id);

		if (!song) {
			const indexesToBeDeleted = await this.searchManager.getLocalizedIndexesOfEntity("song");
			for (const index of indexesToBeDeleted) {
				const adminIndex = await this.searchManager.getAdminIndex(index);
				const task = await adminIndex.deleteDocument(id);
				await this.searchManager.waitForTask(task.taskUid);
			}
			return;
		}
		
		const languages = unique([
			...keys(song.localizedNames ?? []),
			...keys(song.localizedDescriptions ?? []),
			song.language,
		]);
		for (const language of languages) {
			const indexUid = `song_${language}`;
			const index = await this.searchManager.getAdminIndex<SongSearchIndex>(indexUid);
			const document = await this.getDocument(song, language);
			const task = await index.addDocuments([document], {
				primaryKey: "id",
			});
			await this.searchManager.waitForTask(task.taskUid);
		}
	}

	public async search(query: string, language: string = "zh") {
		if (!this.searchManager) {
			throw new Error("Search or embedding service not available");
		}

		const index = await this.searchManager.getSearchIndex(`song_${language}`);
		const embeddingResponse = await this.embeddingManager.embeddings.post({
			texts: [query],
		});
		return index.search(query, {
			vector: embeddingResponse?.data?.embeddings[0],
			hybrid: {
				embedder: "potion-multilingual-128M",
				semanticRatio: 0.25,
			},
			showRankingScore: true,
		});
	}
}
