import type { IRepositoryWithGetDetails } from "@cvsa/core/internal";
import type { SearchManager } from "./manager";
import type { SearchResponse } from "meilisearch";
import type { EmbeddingAppApi } from "@cvsa/embedding";

export abstract class ISearchService<T> {
	constructor(
		protected readonly repository: IRepositoryWithGetDetails<T>,
		protected readonly searchManager: SearchManager | undefined,
		protected readonly embeddingManager: EmbeddingAppApi
	) {}
	abstract sync(id: number): Promise<void>;
	abstract search(query: string, language: string): Promise<SearchResponse>;
}
