"use client";

import type { MarketIndex } from "@/lib/stock-data";
import { MarketIndexChart } from "@/components/MarketIndexChart";

interface MarketIndexCardProps {
	marketIndex: MarketIndex | null;
	loading: boolean;
}

export function MarketIndexCard({ marketIndex, loading }: MarketIndexCardProps) {
	return (
		<div className="rounded-2xl bg-[#0a0a0a] overflow-hidden">
			{loading && !marketIndex && (
				<div className="px-6 py-5">
					<div className="h-8 w-24 bg-white/5 rounded animate-pulse" />
					<div className="h-10 w-48 bg-white/5 rounded mt-2 animate-pulse" />
				</div>
			)}

			{marketIndex && (
				<>
					<div className="px-2 py-5">
						<div className="flex items-end justify-between mt-1">
							<div className="flex flex-col">
								<div className="text-secondary-foreground font-bold">
									{marketIndex.name}
								</div>
								<div className="text-3xl sm:text-4xl font-[Inter] tabular-nums font-semibold text-white">
									{marketIndex.value.toLocaleString("en-US", {
										minimumFractionDigits: 0,
										maximumFractionDigits: 2,
									})}
								</div>
							</div>
							<div className="text-right">
								<div
									className={`text-lg font-[Inter] tabular-nums font-semibold ${
										marketIndex.change >= 0 ? "text-green-500" : "text-red-500"
									}`}
								>
									{marketIndex.change >= 0 ? "↑" : "↓"}{" "}
									{marketIndex.change >= 0 ? "+" : ""}
									{marketIndex.changePercent.toFixed(2)}%
								</div>
								<div
									className={`text-sm font-[Inter] tabular-nums ${
										marketIndex.change >= 0 ? "text-green-500" : "text-red-500"
									} opacity-80`}
								>
									{marketIndex.change >= 0 ? "+" : ""}
									{marketIndex.change.toFixed(0)}
								</div>
							</div>
						</div>
					</div>
					<div className="h-80 sm:h-100">
						<MarketIndexChart data={marketIndex} />
					</div>
				</>
			)}
		</div>
	);
}
