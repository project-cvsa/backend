import type { IDetailsRepository } from "@cvsa/core/common";
import type { SearchManager } from "./manager";
import type { SearchResponse } from "meilisearch";
import type { EmbeddingAppApi } from "@cvsa/embedding";

export abstract class ISearchService<T> {
	constructor(
		protected readonly repository: IDetailsRepository<T>,
		protected readonly manager: SearchManager | undefined,
		protected readonly embeddingManager: EmbeddingAppApi
	) {}
	abstract sync(id: number): Promise<void>;
	abstract search(query: string, language: string): Promise<SearchResponse>;
}
