import { ISearchService } from "../interface";
import { unique, keys } from "remeda";
import type { ArtistDetailsResponseDto } from "../../modules";
import { appLogger } from "@cvsa/logger";

export interface ArtistSearchIndex {
	id: number;
	name?: string;
	description?: string;
	aliases?: string[];
	_vectors?: {
		"potion-multilingual-128M": number[] | null;
	};
}

export class ArtistSearchService extends ISearchService<ArtistDetailsResponseDto> {
	private async getDocument(
		artist: ArtistDetailsResponseDto,
		language: string
	): Promise<ArtistSearchIndex> {
		const getDesc = () => {
			if (language === artist.language) return artist.description;
			return artist.localizedDescriptions?.[language];
		};
		const getName = () => {
			if (language === artist.language) return artist.name;
			return artist.localizedNames?.[language];
		};

		const vectors = await this.embeddingManager.embeddings.post({
			texts: [
				`Name: ${getName() ?? ""}
Description: ${getDesc() ?? ""}
Name Aliases: ${artist.aliases.join(", ")}
`,
			],
		});
		return {
			id: artist.id,
			name: getName() ?? undefined,
			aliases: artist.aliases,
			description: getDesc() ?? undefined,
			_vectors: vectors.data?.embeddings[0]
				? {
						"potion-multilingual-128M": vectors.data?.embeddings[0],
					}
				: {
						"potion-multilingual-128M": null,
					},
		};
	}

	public async sync(id: number) {
		if (!this.searchManager) {
			appLogger.warn("Search service not available");
			return;
		}
		const artist = await this.repository.getDetailsById(id);

		if (!artist) {
			const indexesToBeDeleted =
				await this.searchManager.getLocalizedIndexesOfEntity("artist");
			for (const index of indexesToBeDeleted) {
				const adminIndex = await this.searchManager.getAdminIndex(index);
				const task = await adminIndex.deleteDocument(id);
				await this.searchManager.waitForTask(task.taskUid);
			}
			return;
		}

		const languages = unique([
			...keys(artist.localizedNames ?? []),
			...keys(artist.localizedDescriptions ?? []),
			artist.language,
		]);
		for (const language of languages) {
			const indexUid = `artist_${language}`;
			const index = await this.searchManager.getAdminIndex<ArtistSearchIndex>(indexUid);
			const document = await this.getDocument(artist, language);
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

		const index = await this.searchManager.getSearchIndex(`artist_${language}`);
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
