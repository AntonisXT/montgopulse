// ============================================================================
// ArcGIS REST API — Direct URL Fetchers + Geometry Normalizer
// ============================================================================
// Fetches GeoJSON data from Montgomery's ArcGIS portal and normalizes
// geometry. Handles Point, Polygon, and MultiPolygon by computing
// centroids so every feature can be plotted as a map marker.
// ============================================================================

// ---- GeoJSON Types ----

export interface GeoJSONGeometry {
    type: "Point" | "MultiPoint" | "LineString" | "Polygon" | "MultiPolygon";
    coordinates: number[] | number[][] | number[][][] | number[][][][];
}

export interface GeoJSONFeature<T = Record<string, unknown>> {
    type: "Feature";
    geometry: GeoJSONGeometry;
    properties: T;
}

export interface GeoJSONFeatureCollection<T = Record<string, unknown>> {
    type: "FeatureCollection";
    features: GeoJSONFeature<T>[];
}

// ---- Geometry Helpers ----

/**
 * Compute the centroid of a polygon ring (array of [lng, lat] coordinate pairs).
 * Uses the simple average of vertices — fast and good enough for small urban parcels.
 */
function polygonCentroid(ring: number[][]): [number, number] {
    let sumLng = 0;
    let sumLat = 0;
    const n = ring.length;
    for (let i = 0; i < n; i++) {
        sumLng += ring[i][0];
        sumLat += ring[i][1];
    }
    return [sumLng / n, sumLat / n];
}

/**
 * Normalize any geometry type into Point coordinates [lng, lat].
 * - Point → use directly
 * - Polygon → centroid of outer ring
 * - MultiPolygon → centroid of first polygon's outer ring
 * Returns null if geometry can't be converted.
 */
export function normalizeToPoint(geometry: GeoJSONGeometry | null | undefined): [number, number] | null {
    if (!geometry || !geometry.coordinates) return null;

    switch (geometry.type) {
        case "Point": {
            const coords = geometry.coordinates as number[];
            if (coords.length >= 2 && isFinite(coords[0]) && isFinite(coords[1])) {
                return [coords[0], coords[1]];
            }
            return null;
        }
        case "Polygon": {
            const rings = geometry.coordinates as number[][][];
            if (rings.length > 0 && rings[0].length >= 3) {
                return polygonCentroid(rings[0]);
            }
            return null;
        }
        case "MultiPolygon": {
            const polys = geometry.coordinates as number[][][][];
            if (polys.length > 0 && polys[0].length > 0 && polys[0][0].length >= 3) {
                return polygonCentroid(polys[0][0]);
            }
            return null;
        }
        case "LineString": {
            const pts = geometry.coordinates as number[][];
            if (pts.length > 0) {
                const mid = pts[Math.floor(pts.length / 2)];
                if (mid && mid.length >= 2) return [mid[0], mid[1]];
            }
            return null;
        }
        default:
            return null;
    }
}

/**
 * Transform a FeatureCollection so every feature has Point geometry.
 * Polygons and MultiPolygons are converted to their centroid.
 * Features with unconvertible geometry are dropped.
 */
export function normalizeFeaturesToPoints<T = Record<string, unknown>>(
    fc: GeoJSONFeatureCollection<T>
): GeoJSONFeatureCollection<T> {
    const normalized: GeoJSONFeature<T>[] = [];

    for (const feature of fc.features) {
        const point = normalizeToPoint(feature.geometry);
        if (point) {
            normalized.push({
                ...feature,
                geometry: {
                    type: "Point",
                    coordinates: point,
                },
            });
        }
    }

    return { type: "FeatureCollection", features: normalized };
}

// ---- Core Fetch Utility ----

async function fetchGeoJSON<T = Record<string, unknown>>(
    fullUrl: string
): Promise<GeoJSONFeatureCollection<T>> {
    try {
        const response = await fetch(fullUrl, {
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`[ArcGIS] HTTP ${response.status}: ${response.statusText}`);
            return { type: "FeatureCollection", features: [] };
        }

        const data = await response.json();

        if (data.error) {
            console.error("[ArcGIS] API error:", data.error.message || data.error);
            return { type: "FeatureCollection", features: [] };
        }

        if (data.type !== "FeatureCollection" || !Array.isArray(data.features)) {
            console.error("[ArcGIS] Unexpected response — expected FeatureCollection");
            return { type: "FeatureCollection", features: [] };
        }

        return data as GeoJSONFeatureCollection<T>;
    } catch (error) {
        console.error("[ArcGIS] Fetch error:", error instanceof Error ? error.message : error);
        return { type: "FeatureCollection", features: [] };
    }
}

// ---- Public API ----

export async function fetchCrimeData<T = Record<string, unknown>>(): Promise<GeoJSONFeatureCollection<T>> {
    const url = process.env.ARCGIS_CRIME_URL;
    if (!url) {
        console.warn("[ArcGIS] ARCGIS_CRIME_URL not set");
        return { type: "FeatureCollection", features: [] };
    }
    return fetchGeoJSON<T>(url);
}

export async function fetchBusinessLicenses<T = Record<string, unknown>>(): Promise<GeoJSONFeatureCollection<T>> {
    const url = process.env.ARCGIS_BUSINESS_LICENSE_URL;
    if (!url) {
        console.warn("[ArcGIS] ARCGIS_BUSINESS_LICENSE_URL not set");
        return { type: "FeatureCollection", features: [] };
    }
    return fetchGeoJSON<T>(url);
}

export async function fetchPermits<T = Record<string, unknown>>(): Promise<GeoJSONFeatureCollection<T>> {
    const url = process.env.ARCGIS_PERMITS_URL;
    if (!url) {
        console.warn("[ArcGIS] ARCGIS_PERMITS_URL not set");
        return { type: "FeatureCollection", features: [] };
    }
    return fetchGeoJSON<T>(url);
}

export async function fetchViolations<T = Record<string, unknown>>(): Promise<GeoJSONFeatureCollection<T>> {
    const url = process.env.ARCGIS_VIOLATIONS_URL;
    if (!url) {
        console.warn("[ArcGIS] ARCGIS_VIOLATIONS_URL not set");
        return { type: "FeatureCollection", features: [] };
    }
    return fetchGeoJSON<T>(url);
}
