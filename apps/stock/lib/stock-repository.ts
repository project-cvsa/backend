import type { Sql } from "postgres";

// ---------------------------------------------------------------------------
// Row types (internal to the repository layer)
// ---------------------------------------------------------------------------

export interface EtaRow {
	aid: number;
	eta: number;
	speed: number;
	current_views: number;
	updated_at: Date;
}

export interface SnapshotRow {
	id: number;
	created_at: Date;
	views: number;
	aid: number;
}

export interface NewCacheEntry {
	aid: number;
	end_time: Date;
	views_increment: number;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Single ETA row for a specific AID. Returns null if not found. */
export async function fetchEtaEntry(
	sql: Sql,
	aid: number,
): Promise<EtaRow | null> {
	const raw = (await sql`
		SELECT e.aid::bigint, e.eta::real, e.speed::real,
		       e.current_views::integer, e.updated_at
		FROM public.eta e
		WHERE e.aid = ${aid}
		LIMIT 1
	`) as Record<string, unknown>[];

	if (raw.length === 0) return null;
	const r = raw[0];
	return {
		aid: Number(r.aid),
		eta: Number(r.eta),
		speed: Number(r.speed),
		current_views: Number(r.current_views),
		updated_at: r.updated_at as Date,
	};
}

/** Top-500 videos by speed, not blacklisted, active within last 3 days. */
export async function fetchEtaEntries(sql: Sql): Promise<EtaRow[]> {
	const raw = (await sql`
		SELECT e.aid::bigint, e.eta::real, e.speed::real,
		       e.current_views::integer, e.updated_at
		FROM public.eta e
		LEFT JOIN public.video_blacklist vb ON e.aid = vb.aid
		WHERE e.updated_at > NOW() - INTERVAL '3 days'
		  AND vb.aid IS NULL
		ORDER BY e.speed DESC
		LIMIT 500
	`) as Record<string, unknown>[];

	return raw.map((r) => ({
		aid: Number(r.aid),
		eta: Number(r.eta),
		speed: Number(r.speed),
		current_views: Number(r.current_views),
		updated_at: r.updated_at as Date,
	}));
}

/** Pre-computed window increments keyed by `aid_endTime`. */
export async function fetchCacheMap(
	sql: Sql,
	aids: number[],
	lookback: Date,
): Promise<Map<string, number>> {
	const raw = (await sql`
		SELECT aid::bigint, end_time, views_increment::integer
		FROM internal.increment_cache_day
		WHERE aid = ANY(${aids})
		  AND end_time >= ${lookback}
	`) as Record<string, unknown>[];

	const map = new Map<string, number>();
	for (const r of raw) {
		const aid = Number(r.aid);
		const endTime = r.end_time as Date;
		const inc = Number(r.views_increment);
		map.set(`${aid}_${endTime.toISOString()}`, inc);
	}
	return map;
}

/** Title and BVid lookup for the given AIDs. */
export async function fetchTitleMap(
	sql: Sql,
	aids: number[],
): Promise<Map<number, { title: string; bvid: string | null }>> {
	const raw = (await sql`
		SELECT bm.aid::bigint, COALESCE(s.name, bm.title) AS title, bm.bvid
		FROM public.bilibili_metadata bm
		LEFT JOIN public.songs s ON bm.aid = s.aid
		WHERE bm.aid = ANY(${aids})
	`) as Record<string, unknown>[];

	const map = new Map<number, { title: string; bvid: string | null }>();
	for (const r of raw) {
		const aid = Number(r.aid);
		map.set(aid, {
			title: (r.title as string) ?? `AV${aid}`,
			bvid: r.bvid as string | null,
		});
	}
	return map;
}

/** Raw snapshots for uncached AIDs, grouped by AID. */
export async function fetchSnapshotsByAid(
	sql: Sql,
	aids: number[],
	lookback: Date,
): Promise<Map<number, SnapshotRow[]>> {
	if (aids.length === 0) return new Map();

	const raw = (await sql`
		SELECT id::integer, created_at, views::integer, aid::bigint
		FROM public.video_snapshot
		WHERE aid = ANY(${aids})
		  AND created_at >= ${lookback}
		ORDER BY aid, created_at
	`) as Record<string, unknown>[];

	const map = new Map<number, SnapshotRow[]>();
	for (const r of raw) {
		const s: SnapshotRow = {
			id: Number(r.id),
			created_at: r.created_at as Date,
			views: Number(r.views),
			aid: Number(r.aid),
		};
		const arr = map.get(s.aid);
		if (arr) {
			arr.push(s);
		} else {
			map.set(s.aid, [s]);
		}
	}
	return map;
}

/** Batch-insert newly computed cache entries that aren't already persisted. */
export async function insertCacheEntries(
	sql: Sql,
	entries: NewCacheEntry[],
	existingKeys: Set<string>,
): Promise<number> {
	const trulyNew = entries.filter(
		(e) => !existingKeys.has(`${e.aid}_${e.end_time.toISOString()}`),
	);
	if (trulyNew.length === 0) return 0;

	const values = trulyNew.map(
		(e) => `(${e.aid}, '${e.end_time.toISOString()}', ${e.views_increment})`,
	);

	const chunkSize = 1000;
	for (let i = 0; i < values.length; i += chunkSize) {
		const chunk = values.slice(i, i + chunkSize);
		await sql.unsafe(
			`INSERT INTO internal.increment_cache_day (aid, end_time, views_increment) VALUES ${chunk.join(", ")}`,
		);
	}

	return trulyNew.length;
}
