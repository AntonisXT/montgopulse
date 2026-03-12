// ============================================================================
// Montgomery Open Data Portal — ArcGIS REST API Utilities
// ============================================================================
// Fetches GeoJSON data from Montgomery, AL's ArcGIS-powered open data portal.
// All endpoints return FeatureCollections conforming to the GeoJSON spec.
// ============================================================================

export interface GeoJSONGeometry {
    type: "Point" | "MultiPoint" | "LineString" | "Polygon";
    coordinates: number[] | number[][] | number[][][];
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

// ---- Domain Interfaces ----

export interface IncidentProperties {
    OBJECTID: number;
    incident_type: string;
    incident_date: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    latitude: number;
    longitude: number;
    status: string;
    priority: string;
    description?: string;
}

export interface BusinessLicenseProperties {
    OBJECTID: number;
    business_name: string;
    business_type: string;
    license_number: string;
    status: string;
    issue_date: string;
    expiration_date: string;
    address: string;
    owner_name?: string;
}

export interface BuildingPermitProperties {
    OBJECTID: number;
    permit_number: string;
    permit_type: string;
    status: string;
    issue_date: string;
    address: string;
    description: string;
    estimated_cost?: number;
    contractor?: string;
}

// ---- ArcGIS Endpoint Configuration ----

const ARCGIS_BASE =
    "https://services7.arcgis.com/xNUwUjOJ8GnBcUzP/arcgis/rest/services";

const ENDPOINTS = {
    incidents:
        `${ARCGIS_BASE}/Montgomery_Police_Incidents/FeatureServer/0/query`,
    businessLicenses:
        `${ARCGIS_BASE}/Montgomery_Business_Licenses/FeatureServer/0/query`,
    buildingPermits:
        `${ARCGIS_BASE}/Montgomery_Building_Permits/FeatureServer/0/query`,
} as const;

// ---- Fetch Utilities ----

async function fetchArcGIS<T>(
    endpoint: string,
    params: Record<string, string> = {}
): Promise<GeoJSONFeatureCollection<T>> {
    const searchParams = new URLSearchParams({
        where: "1=1",
        outFields: "*",
        f: "geojson",
        resultRecordCount: "500",
        ...params,
    });

    const url = `${endpoint}?${searchParams.toString()}`;

    try {
        const response = await fetch(url, {
            cache: 'no-store', // Disable caching for large payloads
        });

        if (!response.ok) {
            console.error(`ArcGIS fetch failed: ${response.status} ${response.statusText}`);
            return { type: "FeatureCollection", features: [] };
        }

        const data = await response.json();

        // ArcGIS sometimes wraps errors in a response body
        if (data.error) {
            console.error("ArcGIS API error:", data.error);
            return { type: "FeatureCollection", features: [] };
        }

        return data as GeoJSONFeatureCollection<T>;
    } catch (error) {
        console.error("ArcGIS fetch error:", error);
        return { type: "FeatureCollection", features: [] };
    }
}

// ---- Public API ----

/**
 * Fetch 911/police incident data from Montgomery's ArcGIS portal.
 * Returns GeoJSON FeatureCollection with incident properties and coordinates.
 */
export async function fetch911Calls(
    maxRecords = 500
): Promise<GeoJSONFeatureCollection<IncidentProperties>> {
    return fetchArcGIS<IncidentProperties>(ENDPOINTS.incidents, {
        resultRecordCount: String(maxRecords),
        orderByFields: "incident_date DESC",
    });
}

/**
 * Fetch business license data from Montgomery's ArcGIS portal.
 */
export async function fetchBusinessLicenses(
    maxRecords = 500
): Promise<GeoJSONFeatureCollection<BusinessLicenseProperties>> {
    return fetchArcGIS<BusinessLicenseProperties>(ENDPOINTS.businessLicenses, {
        resultRecordCount: String(maxRecords),
    });
}

/**
 * Fetch building permit data from Montgomery's ArcGIS portal.
 */
export async function fetchBuildingPermits(
    maxRecords = 500
): Promise<GeoJSONFeatureCollection<BuildingPermitProperties>> {
    return fetchArcGIS<BuildingPermitProperties>(ENDPOINTS.buildingPermits, {
        resultRecordCount: String(maxRecords),
    });
}

// ---- Fallback / Demo Data ----

export function generateDemoIncidents(): GeoJSONFeatureCollection<IncidentProperties> {
    const types = [
        "Traffic Stop", "Burglary", "Assault", "Noise Complaint", "Vandalism",
        "Domestic Disturbance", "Theft", "Suspicious Activity", "Medical Emergency",
        "Fire Response", "Drug Activity", "Trespassing", "Fraud", "DUI",
    ];
    const statuses = ["Responded", "In Progress", "Resolved", "Pending"];
    const priorities = ["High", "Medium", "Low", "Critical"];
    const streets = [
        "Dexter Ave", "Perry St", "Court St", "Monroe St", "Madison Ave",
        "Hull St", "Lawrence St", "Decatur St", "Clayton St", "Adams Ave",
        "Fairview Ave", "Mobile Hwy", "Atlanta Hwy", "Troy Hwy", "Northern Blvd",
    ];

    // Montgomery, AL bounding box: ~32.33-32.43 lat, ~-86.35 to -86.23 lon
    const features = Array.from({ length: 200 }, (_, i) => ({
        type: "Feature" as const,
        geometry: {
            type: "Point" as const,
            coordinates: [
                -86.29 + (Math.random() - 0.5) * 0.12,
                32.38 + (Math.random() - 0.5) * 0.10,
            ],
        },
        properties: {
            OBJECTID: i + 1,
            incident_type: types[Math.floor(Math.random() * types.length)],
            incident_date: new Date(
                Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
            ).toISOString(),
            address: `${100 + Math.floor(Math.random() * 900)} ${streets[Math.floor(Math.random() * streets.length)]}`,
            city: "Montgomery",
            state: "AL",
            zip: `3610${Math.floor(Math.random() * 10)}`,
            latitude: 32.38 + (Math.random() - 0.5) * 0.10,
            longitude: -86.29 + (Math.random() - 0.5) * 0.12,
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            description: `Incident report #${1000 + i}`,
        },
    }));

    return { type: "FeatureCollection", features };
}
