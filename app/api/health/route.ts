import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const timestamp = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", timestamp });
  } catch {
    return NextResponse.json(
      { status: "degraded", timestamp },
      { status: 503 }
    );
  }
}
