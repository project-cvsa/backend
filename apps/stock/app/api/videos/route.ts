import { NextResponse } from "next/server";
import { getStocks, getVideos } from "@/lib/stock-service";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
	try {
		const stocks = await getStocks();
		const bvids = stocks.map((item) => item.symbol);
		const videos = await getVideos(bvids);
		return NextResponse.json({ videos });
	} catch (error) {
		console.error("Failed to fetch stocks:", error);
		return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
	}
}
