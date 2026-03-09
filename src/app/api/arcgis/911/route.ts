import { NextResponse } from "next/server";
import { fetchCrimeData } from "@/lib/arcgis";

export const revalidate = 300;

export async function GET() {
    const raw = await fetchCrimeData();
    return NextResponse.json(raw);
}
