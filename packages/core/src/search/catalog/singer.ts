import { ISearchService } from "../interface";
import { unique, keys } from "remeda";
import type { SingerDetailsResponseDto } from "../../modules";
import { appLogger } from "@cvsa/logger";

export interface SingerSearchIndex {
	id: number;
	name?: string;
	description?: string;
	language?: string;
	_vectors?: {
		"potion-multilingual-128M": number[] | null;
	};
}

export class SingerSearchService extends ISearchService<SingerDetailsResponseDto> {
	private async getDocument(
		singer: SingerDetailsResponseDto,
		language: string
	): Promise<SingerSearchIndex> {
		const getDesc = () => {
			if (language === singer.language) return singer.description;
			return singer.localizedDescriptions?.[language];
		};
		const getName = () => {
			if (language === singer.language) return singer.name;
			return singer.localizedNames?.[language];
		};

		const vectors = await this.embeddingManager.embeddings.post({
			texts: [
				`Name: ${getName() ?? ""}
Description: ${getDesc() ?? ""}
`,
			],
		});
		return {
			id: singer.id,
			name: getName() ?? undefined,
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
		const singer = await this.repository.getDetailsById(id);

		if (!singer) {
			const indexesToBeDeleted =
				await this.searchManager.getLocalizedIndexesOfEntity("singer");
			for (const index of indexesToBeDeleted) {
				const adminIndex = await this.searchManager.getAdminIndex(index);
				const task = await adminIndex.deleteDocument(id);
				await this.searchManager.waitForTask(task.taskUid);
			}
			return;
		}

		const languages = unique([
			...keys(singer.localizedNames ?? []),
			...keys(singer.localizedDescriptions ?? []),
			singer.language,
		]);
		for (const language of languages) {
			const indexUid = `singer_${language}`;
			const index = await this.searchManager.getAdminIndex<SingerSearchIndex>(indexUid);
			const document = await this.getDocument(singer, language);
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

		const index = await this.searchManager.getSearchIndex(`singer_${language}`);
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
