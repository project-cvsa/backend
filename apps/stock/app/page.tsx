"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketIndex, Stock } from "@/lib/stock-data";
import { MarketIndexCard } from "@/components/MarketIndexCard";
import { StockList } from "@/components/StockList";
import { SearchBox } from "@/components/SearchBox";
import { HeaderMenu } from "@/components/HeaderMenu";
import { LoginDialog } from "@/components/LoginDialog";
import { DescDialog } from "@/components/DescDialog";

export default function Home() {
	const [marketIndex, setMarketIndex] = useState<MarketIndex | null>(null);
	const [stocks, setStocks] = useState<Stock[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [token, setToken] = useState<string | null>(() => {
		if (typeof window !== "undefined") {
			return localStorage.getItem("cvsa_token");
		}
		return null;
	});
	const [showLogin, setShowLogin] = useState(false);

	const fetchStocks = useCallback(() => {
		setLoading(true);
		fetch("/api/stocks")
			.then((res) => {
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				return res.json();
			})
			.then((data) => {
				setStocks(data.stocks);
				setMarketIndex(data.marketIndex);
			})
			.catch((err: Error) => {
				console.error("Failed to load stocks:", err);
				setError(err.message);
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		fetchStocks();
	}, [fetchStocks]);

	const handleLogin = useCallback((newToken: string) => {
		setToken(newToken);
		localStorage.setItem("cvsa_token", newToken);
	}, []);

	const handleLogout = useCallback(() => {
		setToken(null);
		localStorage.removeItem("cvsa_token");
	}, []);

	const handleDelete = useCallback(
		async (id: string) => {
			setStocks((prev) => prev.filter((s) => s.id !== id));

			try {
				const res = await fetch(`/api/stocks/${id}`, {
					method: "DELETE",
					headers: { Authorization: `Bearer ${token}` },
				});
				if (!res.ok && res.status === 401) {
					handleLogout();
					fetchStocks();
				}
			} catch {
				fetchStocks();
			}
		},
		[token, fetchStocks, handleLogout]
	);

	const isAuthenticated = token !== null;

	return (
		<div>
			<div className="max-w-4xl mx-auto max-sm:px-0 px-4 py-6">
				<header className="max-sm:px-2 mb-6 flex items-center justify-between">
					<h1 className="text-3xl font-bold tracking-wide">中V大盘</h1>
					<div className="flex items-center gap-2">
						<DescDialog />
						<HeaderMenu
							isAuthenticated={isAuthenticated}
							onLoginClick={() => setShowLogin(true)}
							onLogout={handleLogout}
						/>
					</div>
				</header>

				<MarketIndexCard marketIndex={marketIndex} loading={loading} />

				<SearchBox isAuthenticated={isAuthenticated} onDelete={handleDelete}>
					{loading && (
						<div className="rounded-2xl bg-[#0a0a0a] border border-white/5 p-8 text-center">
							<div className="text-zinc-500 font-mono text-sm">正在加载...</div>
						</div>
					)}

					{error && (
						<div className="rounded-2xl bg-[#0a0a0a] border border-red-500/20 p-8 text-center">
							<div className="text-red-400 font-mono text-sm">无法加载: {error}</div>
						</div>
					)}

					{!loading && !error && stocks.length > 0 && (
						<StockList
							stocks={stocks}
							isAuthenticated={isAuthenticated}
							onDelete={handleDelete}
						/>
					)}

					{!loading && !error && stocks.length === 0 && (
						<div className="rounded-2xl bg-[#0a0a0a] border border-white/5 p-8 text-center">
							<div className="text-zinc-500 font-mono text-sm">暂无数据</div>
						</div>
					)}
				</SearchBox>
			</div>

			<LoginDialog open={showLogin} onOpenChange={setShowLogin} onLogin={handleLogin} />
		</div>
	);
}
