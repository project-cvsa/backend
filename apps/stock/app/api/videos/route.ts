import { type NextRequest, NextResponse } from "next/server";
import { getStocks, getVideos } from "@/lib/stock-service";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
        const rawLimit = searchParams.get("limit");
        const rawOffset = searchParams.get("offset");
        let limit = parseInt(rawLimit || "50", 10);
        let offset = parseInt(rawOffset || "0", 10);

        if (Number.isNaN(limit) || limit < 1) limit = 50;
        if (limit > 1000) limit = 1000;
        
        if (Number.isNaN(offset) || offset < 0) offset = 0;

		const stocks = await getStocks();
		const bvids = stocks.map((item) => item.symbol);
		const videos = await getVideos(bvids, limit, offset);
		return NextResponse.json({ videos });
	} catch (error) {
		console.error("Failed to fetch stocks:", error);
		return NextResponse.json({ error: "Failed to fetch stock data" }, { status: 500 });
	}
}
