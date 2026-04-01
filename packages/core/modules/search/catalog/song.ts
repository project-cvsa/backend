import type { SongType } from "@cvsa/db";
import { ISearchService } from "../search.interface";
import { unique, keys } from "remeda";
import type { SongDetailsResponseDto } from "@cvsa/core";

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
		if (!this.embeddingManager) {
			// TODO: Use unified Error object
			throw new Error("Embedding service not available");
		}
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
		const vectors = await this.embeddingManager.getEmbedding([
			`Name: ${song.name ?? ""}
Lyrics: ${song.lyrics ?? ""}
Description: ${getDesc() ?? ""}
Singers: ${getSingers().join(", ")}
Artists: ${getArtists().join(", ")}
`,
		]);
		return {
			id: song.id,
			name: song.name ?? undefined,
			lyrics: getLyrics() ?? undefined,
			description: getDesc() ?? undefined,
			singers: getSingers(),
			artists: getArtists(),
			bilibiliAid: Number(song.bilibiliAid) ?? undefined,
			bilibiliBvid: song.bilibiliBvid ?? undefined,
			type: song.type ?? undefined,
			engine: song.singers
				.map((item) => item.engine ?? undefined)
				.filter(Boolean) as string[],
			publishedAt: song.publishedAt ? new Date(song.publishedAt).getTime() : undefined,
			_vectors: {
				"potion-multilingual-128M": vectors[0],
			},
		};
	}

	public async sync(id: number) {
		if (!this.manager) {
			throw new Error("Search service not available");
		}
		const song = await this.repository.getDetailsById(id);

		if (!song) {
			const indexesToBeDeleted = await this.manager.getLocalizedIndexesOfEntity("song");
			for (const index of indexesToBeDeleted) {
				await this.manager.getAdminIndex(index).deleteDocument(id);
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
			const index = this.manager.getAdminIndex<SongSearchIndex>(indexUid);
			const document = await this.getDocument(song, language);
			index.addDocuments([document], {
				primaryKey: "id",
			});
		}
	}

	public async search(query: string, language: string = "zh") {
		if (!this.manager || !this.embeddingManager) {
			throw new Error("Search or embedding service not available");
		}

		const index = this.manager.getSearchIndex(`song_${language}`);
		return index.search(query, {
			vector: (await this.embeddingManager.getEmbedding([query]))[0],
			hybrid: {
				embedder: "potion-multilingual-128M",
				semanticRatio: 0.25,
			},
			showRankingScore: true,
		});
	}
}
