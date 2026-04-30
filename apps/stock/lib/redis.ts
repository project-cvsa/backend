import Redis from "ioredis";

let instance: Redis | null = null;

export function getRedis(): Redis {
	if (instance) return instance;

	const url = process.env.REDIS_URL;
	if (!url) {
		throw new Error("REDIS_URL environment variable is not set");
	}

	instance = new Redis(url, {
		maxRetriesPerRequest: 3,
		lazyConnect: false,
	});

	return instance;
}
