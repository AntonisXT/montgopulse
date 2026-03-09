import { NextResponse } from "next/server";
import { getDashboardMetrics } from "@/lib/analytics";

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
    try {
        const metrics = await getDashboardMetrics();
        return NextResponse.json(metrics);
    } catch (error) {
        console.error("[API] Failed to fetch analytics:", error);
        return NextResponse.json({ error: "Failed to generate analytics" }, { status: 500 });
    }
}
