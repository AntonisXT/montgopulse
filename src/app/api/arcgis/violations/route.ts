import { NextResponse } from "next/server";
import { fetchViolations } from "@/lib/arcgis";

export const revalidate = 300; // Re-fetch from ArcGIS every 5 minutes

export async function GET() {
    const data = await fetchViolations();
    return NextResponse.json(data);
}
