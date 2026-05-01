import { getRedis } from "./redis";

function mapReplacer(_key: string, value: unknown): unknown {
	if (value instanceof Map) {
		return { __map: [...value] };
	}
	return value;
}

function fullReviver(_key: string, value: unknown): unknown {
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
		const d = new Date(value);
		if (!Number.isNaN(d.getTime())) return d;
	}
	if (value && typeof value === "object" && "__map" in value) {
		return new Map((value as { __map: [unknown, unknown][] }).__map);
	}
	return value;
}

export async function withCache<T>(
	rawKey: string,
	ttlSeconds: number,
	fetcher: () => Promise<T>
): Promise<T> {
	const redis = getRedis();
	const key = `cvsa:stock:${rawKey}`;
	const cached = await redis.get(key);
	if (cached !== null) return JSON.parse(cached, fullReviver) as T;

	const result = await fetcher();
	await redis.set(key, JSON.stringify(result, mapReplacer), "EX", ttlSeconds);
	return result;
}

/** Batch Redis MGET across per-aid keys. Returns hits (parsed) and misses (aids to fetch). */
export async function perAidMget<T>(
	prefix: string,
	aids: number[],
	parse: (raw: string) => T
): Promise<{ hits: Map<number, T>; misses: number[] }> {
	if (aids.length === 0) return { hits: new Map(), misses: [] };
	const redis = getRedis();
	const keys = aids.map((aid) => `cvsa:stock:${prefix}:${aid}`);
	const values = await redis.mget(...keys);
	const hits = new Map<number, T>();
	const misses: number[] = [];
	for (let i = 0; i < aids.length; i++) {
		const raw = values[i];
		if (raw !== null) {
			hits.set(aids[i], parse(raw as string));
		} else {
			misses.push(aids[i]);
		}
	}
	return { hits, misses };
}

/** Batch Redis MSET across per-aid keys using pipeline for atomicity. */
export async function perAidMset(
	prefix: string,
	ttl: number,
	entries: Map<number, unknown>
): Promise<void> {
	if (entries.size === 0) return;
	const redis = getRedis();
	const pipeline = redis.pipeline();
	for (const [aid, value] of entries) {
		pipeline.set(`cvsa:stock:${prefix}:${aid}`, JSON.stringify(value), "EX", ttl);
	}
	await pipeline.exec();
}
