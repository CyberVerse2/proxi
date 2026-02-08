import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db/queries";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 50);

  const data = await getLeaderboard(limit);
  return NextResponse.json(data);
}
