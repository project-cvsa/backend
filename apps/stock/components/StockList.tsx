"use client";

import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { StockMiniChart } from "./StockMiniChart";
import {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
} from "@/components/ui/context-menu";
import { Trash2 } from "lucide-react";
import type { Stock } from "@/lib/stock-data";

interface StockListProps {
	stocks: Stock[];
	isAuthenticated: boolean;
	onDelete: (id: string) => void;
}

function formatPercentage(value: number): string {
	const absValue = Math.abs(value);

	if (absValue >= 10000) {
		return `${(value / 1000).toFixed(1)}k`;
	}

	if (absValue >= 1000) {
		return Math.round(value).toString();
	}

	if (absValue >= 10) {
		return value.toFixed(1);
	}

	return value.toFixed(2);
}

export function StockList({ stocks, isAuthenticated, onDelete }: StockListProps) {
	const handleDelete = useCallback(
		(id: string) => {
			onDelete(id);
		},
		[onDelete]
	);

	return (
		<Card className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden py-0 max-sm:border-none">
			<CardContent className="p-0">
				<div className="divide-y divide-white/5">
					{stocks.map((stock) => {
						const isPositive = stock.changePercent >= 0;
						const changeColor = isPositive ? "bg-green-600" : "bg-red-500";
						const link = `https://www.bilibili.com/video/${stock.symbol}`;

						return (
							<ContextMenu key={stock.id}>
								<ContextMenuTrigger asChild>
									<div className="flex items-center justify-between max-sm:mx-5 px-5 py-4 hover:bg-white/2 transition-colors cursor-default">
										<div className="flex-1 min-w-0">
											<div>
												<a
													className="text-white font-semibold block text-ellipsis truncate"
													href={link}
												>
													{stock.name}
												</a>
											</div>
											<div>
												<a
													className="text-neutral-500 text-sm font-mono block text-ellipsis truncate"
													href={link}
												>
													{stock.symbol}
												</a>
											</div>
										</div>

										<div className="shrink-0 mx-2 sm:hidden">
											<StockMiniChart
												data={stock.sparkline}
												change={stock.changePercent}
											/>
										</div>
										<div className="shrink-0 mx-6 max-sm:hidden">
											<StockMiniChart
												data={stock.sparkline}
												change={stock.changePercent}
												width={120}
											/>
										</div>

										<div className="shrink-0 text-right min-w-16 flex flex-col items-end md:ml-5 gap-1">
											<div className="text-white font-[Inter] tabular-nums font-semibold">
												{Math.round(stock.price).toLocaleString("en-US")}
											</div>
											<div
												className={`font-[Inter] tabular-nums text-xs ${changeColor} w-16 px-1 py-0.5 rounded-[3px] font-bold text-white`}
											>
												{isPositive ? "+" : ""}
												{formatPercentage(stock.changePercent)}%
											</div>
										</div>
									</div>
								</ContextMenuTrigger>
								{isAuthenticated && (
									<ContextMenuContent>
										<ContextMenuItem
											variant="destructive"
											onClick={() => handleDelete(stock.id)}
										>
											<Trash2 className="size-4" />
											删除
										</ContextMenuItem>
									</ContextMenuContent>
								)}
							</ContextMenu>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
