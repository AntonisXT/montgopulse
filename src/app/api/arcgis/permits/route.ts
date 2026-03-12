import { NextResponse } from "next/server";
import { fetchPermits } from "@/lib/arcgis";

export const revalidate = 300; // Re-fetch from ArcGIS every 5 minutes

export async function GET() {
    const data = await fetchPermits();
    return NextResponse.json(data);
}
