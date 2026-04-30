import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getSql } from "@/lib/db";

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ aid: string }> },
) {
	try {
		const authHeader = request.headers.get("authorization");
		const token = authHeader?.replace("Bearer ", "");

		if (!token || !(await verifyToken(token))) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const { aid } = await params;
		const aidNum = Number(aid);

		if (Number.isNaN(aidNum)) {
			return NextResponse.json(
				{ error: "Invalid aid" },
				{ status: 400 },
			);
		}

		const sql = getSql();
		await sql`
			INSERT INTO public.video_blacklist (aid)
			SELECT ${aidNum}
			WHERE NOT EXISTS (
				SELECT 1 FROM public.video_blacklist WHERE aid = ${aidNum}
			)
		`;

		return NextResponse.json({ success: true });
	} catch {
		return NextResponse.json(
			{ error: "Failed to blacklist" },
			{ status: 500 },
		);
	}
}
