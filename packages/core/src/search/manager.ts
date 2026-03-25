import { MeiliSearch, type Settings, type RecordAny } from "meilisearch";
import { env } from "@cvsa/env";
import { INDEX_SETTINGS } from "./config";
import { deepEqualUnordered } from "../utils";
import { appLogger } from "@cvsa/logger";

interface SearchManagerConstructor {
	client: MeiliSearch;
	adminClient: MeiliSearch;
}

// TODO: Error handling & integration test
export class SearchManager {
	private readonly client: MeiliSearch;
	private readonly adminClient: MeiliSearch;

	private constructor({ client, adminClient }: SearchManagerConstructor) {
		this.client = client;
		this.adminClient = adminClient;
		this.syncAllSettings();
	}

	/**
	 * Creates a new SearchManager instance with separate search and admin clients.
	 * Initializes MeiliSearch clients using API keys retrieved from the master client.
	 * The search client has only search permissions, while the admin client has full permissions.
	 * @returns A promise that resolves to a new SearchManager instance
	 */
	public static async create() {
		try {
			const masterClient = new MeiliSearch({
				host: env.MEILI_API_URL,
				apiKey: env.MEILI_MASTER_KEY,
			});
			const adminKey = await SearchManager.getAdminKey(masterClient);
			const searchKey = await SearchManager.getSearchKey(masterClient);
			const client = new MeiliSearch({
				host: env.MEILI_API_URL,
				apiKey: searchKey,
			});
			const adminClient = new MeiliSearch({
				host: env.MEILI_API_URL,
				apiKey: adminKey,
			});
			return new SearchManager({ client, adminClient });
		} catch (e) {
			appLogger.warn("Cannot create SearchManager.");
			appLogger.error(Bun.inspect(e));
			return;
		}
	}

	private static async getOrCreateKey(
		client: MeiliSearch,
		params: { actions: string[]; indexes: string[]; name: string }
	): Promise<string> {
		const { results: keys } = await client.getKeys({ limit: 1000 });

		const existingKey = keys.find(
			(key) =>
				deepEqualUnordered(key.actions, params.actions) &&
				deepEqualUnordered(key.indexes, params.indexes)
		);

		if (existingKey) {
			return existingKey.key;
		}

		const newKey = await client.createKey({
			...params,
			expiresAt: null,
		});

		return newKey.key;
	}

	private static async getAdminKey(client: MeiliSearch): Promise<string> {
		return SearchManager.getOrCreateKey(client, {
			actions: ["*"],
			indexes: ["*"],
			name: "Admin API Key",
		});
	}

	private static async getSearchKey(client: MeiliSearch): Promise<string> {
		return SearchManager.getOrCreateKey(client, {
			actions: ["search"],
			indexes: ["*"],
			name: "Search API Key",
		});
	}

	/**
	 * Waits for a MeiliSearch task to complete.
	 * @param taskUid - The unique identifier of the task to wait for
	 * @returns A promise that resolves to the completed task
	 */
	public async waitForTask(taskUid: number) {
		return await this.adminClient.tasks.waitForTask(taskUid, {
			timeout: 10000,
			interval: 100,
		});
	}

	/**
	 * Retrieves a specific task by its UID.
	 * @param taskUid - The unique identifier of the task
	 * @returns A promise that resolves to the task details
	 */
	public async getTask(taskUid: number) {
		return await this.adminClient.tasks.getTask(taskUid);
	}

	/**
	 * Returns an admin-index for the specified index name.
	 * Admin index has full permissions including write and delete operations.
	 * @param indexName - The name of the index
	 * @returns The admin MeiliSearch index instance
	 */
	public getAdminIndex<T extends RecordAny = RecordAny>(indexName: string) {
		return this.adminClient.index<T>(indexName);
	}

	/**
	 * Returns a search-index for the specified index name.
	 * Search index has read-only permissions for search operations only.
	 * @param indexName - The name of the index
	 * @returns The search-only MeiliSearch index instance
	 */
	public getSearchIndex<T extends RecordAny = RecordAny>(indexName: string) {
		return this.client.index<T>(indexName);
	}

	/**
	 * Lists all indexes in the MeiliSearch instance.
	 * @returns A promise that resolves to the list of all indexes
	 */
	public async listIndexes() {
		return this.adminClient.getIndexes();
	}

	/**
	 * Gets all localized indexes for a given entity name.
	 *
	 * Expects index UIDs in the format `{entityName}_{locale}` (e.g., `artist_zh-CN`).
	 * @param name - The entity name to filter indexes by
	 * @returns A promise that resolves to an array of matching index UIDs
	 */
	public async getLocalizedIndexesOfEntity(name: string) {
		const { results: indexes } = await this.adminClient.getIndexes({
			limit: 1000,
		});
		const results: string[] = [];
		for (const index of indexes) {
			const [indexName, _] = index.uid.split("_");
			if (indexName === name) results.push(index.uid);
		}
		return results;
	}

	/**
	 * Synchronizes settings for all indexes with the configured INDEX_SETTINGS.
	 * Only updates settings that differ from current values and triggers reindex
	 * for settings that require it (non-displayedAttributes and non-rankingRules).
	 * Skips indexes without a corresponding entry in INDEX_SETTINGS.
	 */
	public async syncAllSettings() {
		const { results: indexes } = await this.listIndexes();
		for (const index of indexes) {
			const uid = index.uid;
			const [name, lang] = uid.split("_");
			if (lang === undefined) continue;
			if (!(name in INDEX_SETTINGS)) continue;
			const settings = INDEX_SETTINGS[name as keyof typeof INDEX_SETTINGS];
			const currentSettings = await index.getSettings();
			for (const [key, value] of Object.entries(settings)) {
				if (deepEqualUnordered(value, currentSettings[key as keyof Settings])) continue;
				// These settings do not trigger a full reindex
				if (["displayedAttributes", "rankingRules"].includes(key)) continue;
				await index.resetSettings();
				await index.updateSettings(settings);
				break;
			}
		}
	}
}
