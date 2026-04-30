import { getSql } from "./db";
import type { MarketIndex, Stock } from "./stock-data";

interface EtaRow {
	aid: number;
	eta: number;
	speed: number;
	current_views: number;
	updated_at: Date;
}

interface SnapshotRow {
	id: number;
	created_at: Date;
	views: number;
	aid: number;
}

interface NewCacheEntry {
	aid: number;
	end_time: Date;
	views_increment: number;
}

const WINDOW_COUNT = 28;
const STEP_HOURS = 6;
const WINDOW_HOURS = 24;
const INDEX_FACTOR = 1000;

/** Total span: from now to the start of the oldest window, plus one extra day margin for findNearest. */
const TOTAL_LOOKBACK_HOURS = WINDOW_COUNT * STEP_HOURS + WINDOW_HOURS + 24;

function findNearest(snapshots: SnapshotRow[], target: Date): SnapshotRow | null {
	if (snapshots.length === 0) return null;

	let nearest = snapshots[0];
	let minDiff = Math.abs(nearest.created_at.getTime() - target.getTime());

	for (let i = 1; i < snapshots.length; i++) {
		const diff = Math.abs(snapshots[i].created_at.getTime() - target.getTime());
		if (diff < minDiff) {
			minDiff = diff;
			nearest = snapshots[i];
		}
	}

	return nearest;
}

const SIX_HOURS_MS = STEP_HOURS * 3600 * 1000;

function snapToGrid(ts: number): Date {
	return new Date(Math.floor(ts / SIX_HOURS_MS) * SIX_HOURS_MS);
}

export async function getTopStocks(): Promise<{
	stocks: Stock[];
	marketIndex: MarketIndex;
}> {
	console.time("getTopStocks: total");

	const sql = getSql();
	const now = snapToGrid(Date.now());

	console.time("getTopStocks: eta query");
	const etaRaw = await sql`	
		SELECT e.aid::bigint, e.eta::real, e.speed::real, e.current_views::integer, e.updated_at
		FROM public.eta e
		LEFT JOIN public.video_blacklist vb ON e.aid = vb.aid
		WHERE e.updated_at > NOW() - INTERVAL '3 days'
		  AND vb.aid IS NULL
		ORDER BY e.speed DESC
		LIMIT 500
	`;
	console.timeEnd("getTopStocks: eta query");

	const etaEntries: EtaRow[] = (etaRaw as Record<string, unknown>[]).map((r) => ({
		aid: Number(r.aid),
		eta: Number(r.eta),
		speed: Number(r.speed),
		current_views: Number(r.current_views),
		updated_at: r.updated_at as Date,
	}));

	console.log(`getTopStocks: eta returned ${etaEntries.length} rows`);

	const emptyMarket: MarketIndex = {
		name: "中V指数",
		value: 0,
		change: 0,
		changePercent: 0,
		history: [],
		baseTime: now.toISOString(),
	};

	if (etaEntries.length === 0) {
		console.timeEnd("getTopStocks: total");
		return { stocks: [], marketIndex: emptyMarket };
	}

	const aids = etaEntries.map((e) => e.aid);

	const lookback = new Date(
		now.getTime() - TOTAL_LOOKBACK_HOURS * 3600 * 1000,
	);

	console.time("getTopStocks: cache query");
	const cacheRaw = await sql`
		SELECT aid::bigint, end_time, views_increment::integer
		FROM internal.increment_cache_day
		WHERE aid = ANY(${aids})
		  AND end_time >= ${lookback}
	`;
	console.timeEnd("getTopStocks: cache query");

	console.log(`getTopStocks: cache returned ${cacheRaw.length} rows`);

	const cacheMap = new Map<string, number>();
	for (const r of cacheRaw as Record<string, unknown>[]) {
		const aid = Number(r.aid);
		const endTime = r.end_time as Date;
		const inc = Number(r.views_increment);
		cacheMap.set(`${aid}_${endTime.toISOString()}`, inc);
	}

	function isFullyCached(aid: number): boolean {
		for (let i = 0; i < WINDOW_COUNT; i++) {
			const endTime = new Date(now.getTime() - i * STEP_HOURS * 3600 * 1000);
			const key = `${aid}_${endTime.toISOString()}`;
			if (!cacheMap.has(key)) return false;
		}
		return true;
	}

	const cachedAids: number[] = [];
	const uncachedAids: number[] = [];
	for (const aid of aids) {
		if (isFullyCached(aid)) {
			cachedAids.push(aid);
		} else {
			uncachedAids.push(aid);
		}
	}
	console.log(`getTopStocks: cache split — ${cachedAids.length} fully cached, ${uncachedAids.length} need snapshots`);

	console.time("getTopStocks: title query");
	const titleRaw = await sql`
		SELECT bm.aid::bigint, COALESCE(s.name, bm.title) AS title, bm.bvid
		FROM public.bilibili_metadata bm
		LEFT JOIN public.songs s ON bm.aid = s.aid
		WHERE bm.aid = ANY(${aids})
	`;
	console.timeEnd("getTopStocks: title query");

	const titleMap = new Map<number, { title: string; bvid: string | null }>();
	for (const r of titleRaw as Record<string, unknown>[]) {
		const aid = Number(r.aid);
		titleMap.set(aid, {
			title: (r.title as string) ?? `AV${aid}`,
			bvid: r.bvid as string | null,
		});
	}

	const snapshotsByAid = new Map<number, SnapshotRow[]>();

	if (uncachedAids.length > 0) {
		console.time("getTopStocks: snapshot query");
		const snapshotRaw = await sql`
			SELECT id::integer, created_at, views::integer, aid::bigint
			FROM public.video_snapshot
			WHERE aid = ANY(${uncachedAids})
			  AND created_at >= ${lookback}
			ORDER BY aid, created_at
		`;
		console.timeEnd("getTopStocks: snapshot query");
		console.log(`getTopStocks: snapshot returned ${snapshotRaw.length} rows`);

		for (const r of snapshotRaw as Record<string, unknown>[]) {
			const s: SnapshotRow = {
				id: Number(r.id),
				created_at: r.created_at as Date,
				views: Number(r.views),
				aid: Number(r.aid),
			};
			const arr = snapshotsByAid.get(s.aid);
			if (arr) {
				arr.push(s);
			} else {
				snapshotsByAid.set(s.aid, [s]);
			}
		}
	}

	console.time("getTopStocks: window computation");
	const existingCacheKeys = new Set(cacheMap.keys());
	const newCacheEntries: NewCacheEntry[] = [];
	const stocks: Stock[] = [];

	for (const entry of etaEntries) {
		const aid = entry.aid;
		const meta = titleMap.get(aid);
		const name = meta?.title ?? `AV${aid}`;
		const symbol = meta?.bvid ?? `AV${aid}`;

		const snapshots = snapshotsByAid.get(aid) ?? [];

		const increments: number[] = [];

		for (let i = 0; i < WINDOW_COUNT; i++) {
			const endTime = new Date(now.getTime() - i * STEP_HOURS * 3600 * 1000);
			const startTime = new Date(endTime.getTime() - WINDOW_HOURS * 3600 * 1000);

			const cacheKey = `${aid}_${endTime.toISOString()}`;
			const cached = cacheMap.get(cacheKey);

			if (cached !== undefined) {
				if (cached >= 0) increments.push(cached);
				continue;
			}

			let computed = false;
			const snapStart = findNearest(snapshots, startTime);
			const snapEnd = findNearest(snapshots, endTime);

			if (snapStart && snapEnd && snapStart.id !== snapEnd.id) {
				const viewsDiff = snapEnd.views - snapStart.views;
				const hoursDiff =
					(snapEnd.created_at.getTime() - snapStart.created_at.getTime()) / 3600000;

				if (hoursDiff > 0) {
					const increment = Math.round((viewsDiff / hoursDiff) * WINDOW_HOURS);
					increments.push(increment);

					cacheMap.set(cacheKey, increment);
					newCacheEntries.push({
						aid,
						end_time: endTime,
						views_increment: increment,
					});
					computed = true;
				}
			}

			if (!computed) {
				cacheMap.set(cacheKey, -1);
				newCacheEntries.push({
					aid,
					end_time: endTime,
					views_increment: -1,
				});
			}
		}

		if (increments.length === 0) continue;

		const change = increments[0] ?? 0;
		const change2 = increments[increments.length - 1] ?? 0;
		const changePercent = change2 !== 0 ? ((change - change2) / change2) * 100 : 0;

		stocks.push({
			id: aid.toString(),
			name,
			symbol,
			price: change,
			change,
			changePercent: Number.isNaN(changePercent) ? 0 : changePercent,
			sparkline: increments.slice().reverse(),
		});
	}

	console.timeEnd("getTopStocks: window computation");
	const realEntries = newCacheEntries.filter((e) => e.views_increment >= 0).length;
	const sentinelEntries = newCacheEntries.filter((e) => e.views_increment === -1).length;
	console.log(
		`getTopStocks: computed ${stocks.length} stocks, ${realEntries} new + ${sentinelEntries} sentinel cache entries`,
	);

	const trulyNew = newCacheEntries.filter(
		(e) => !existingCacheKeys.has(`${e.aid}_${e.end_time.toISOString()}`),
	);

	if (trulyNew.length > 0) {
		console.time("getTopStocks: cache insert");
		console.log(`getTopStocks: inserting ${trulyNew.length} truly new entries (filtered ${newCacheEntries.length - trulyNew.length} already in DB)`);
		const values = trulyNew.map(
			(e) => `(${e.aid}, '${e.end_time.toISOString()}', ${e.views_increment})`
		);

		const chunkSize = 1000;
		for (let i = 0; i < values.length; i += chunkSize) {
			const chunk = values.slice(i, i + chunkSize);
			const query = `
				INSERT INTO internal.increment_cache_day
					(aid, end_time, views_increment)
				VALUES ${chunk.join(", ")}
			`;
			await sql.unsafe(query);
		}
		console.timeEnd("getTopStocks: cache insert");
	}

	stocks.sort((a, b) => b.change - a.change);

	const INDEX_SIZE = 100;
	const marketHistory = new Array<number>(WINDOW_COUNT).fill(0);

	for (let w = 0; w < WINDOW_COUNT; w++) {
		const top = stocks
			.map((s) => s.sparkline[w] ?? 0)
			.filter((v) => v > 0)
			.sort((a, b) => b - a)
			.slice(0, INDEX_SIZE);

		marketHistory[w] =
			top.reduce((sum, v) => sum + v, 0) / INDEX_FACTOR;
	}

	const lastValue = marketHistory[marketHistory.length - 1] ?? 0;
	const firstValue = marketHistory[0] ?? 0;
	const marketChange = lastValue - firstValue;
	const marketChangePercent =
		firstValue !== 0 ? Number(((marketChange / firstValue) * 100).toFixed(2)) : 0;

	const marketIndex: MarketIndex = {
		name: "中V指数",
		value: lastValue,
		change: marketChange,
		changePercent: marketChangePercent,
		history: marketHistory,
		baseTime: now.toISOString(),
	};

	console.timeEnd("getTopStocks: total");
	return { stocks, marketIndex };
}
