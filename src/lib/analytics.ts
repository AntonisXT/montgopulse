// ============================================================================
// MontgoPulse Analytics Engine — Real-Data Cross-Correlation + Bright Data
// ============================================================================
// ALL ArcGIS metrics are derived from actual fetched data.
// Bright Data signals are generated to correlate with real neighborhood data.
// ============================================================================

import { fetchCrimeData, fetchBusinessLicenses, fetchVacantProperties, GeoJSONFeature, normalizeToPoint } from "./arcgis";
import { generateBrightDataSignals, type BrightDataSignals } from "./brightdata";

// ---- Types ----

export interface NeighborhoodProfile {
    name: string;
    crimeCount: number;
    businessCount: number;
    vacantCount: number;
    investmentScore: number;
    centroid: [number, number];
}

export interface DashboardMetrics {
    revitalizationScore: number;
    safetyTrend: "Improving" | "Stable" | "Declining";
    activeBusinesses: number;
    vacancyRate: number;
    totalCrimeIncidents: number;
    totalVacantProperties: number;
    businessSurvivalData: { name: string; value: number; fill: string }[];
    gentrificationData: { month: string; rent: number; licenses: number; crime: number; vacancies: number }[];
    topNeighborhoods: NeighborhoodProfile[];
    correlations: {
        crimeVsBusiness: number;
        vacancyVsCrime: number;
        businessVsVacancy: number;
    };
    brightData: BrightDataSignals;
    dataTimestamp: string;
    dataSources: { name: string; featureCount: number; status: string }[];
}

// ---- Spatial Utilities ----

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function featureLatLng(feature: GeoJSONFeature): [number, number] | null {
    const pt = normalizeToPoint(feature.geometry);
    if (!pt) return null;
    return [pt[1], pt[0]];
}

// ---- Neighborhood Grid ----

const NEIGHBORHOODS: { name: string; lat: number; lng: number }[] = [
    { name: "Downtown", lat: 32.3792, lng: -86.3077 },
    { name: "Midtown", lat: 32.3621, lng: -86.2953 },
    { name: "Cloverdale", lat: 32.3565, lng: -86.3031 },
    { name: "Old Cloverdale", lat: 32.3505, lng: -86.3085 },
    { name: "Capitol Heights", lat: 32.3670, lng: -86.2800 },
    { name: "Garden District", lat: 32.3513, lng: -86.2886 },
    { name: "Highland Park", lat: 32.3890, lng: -86.2760 },
    { name: "Normandale", lat: 32.3452, lng: -86.3210 },
    { name: "Woodley Park", lat: 32.3380, lng: -86.2950 },
    { name: "East Montgomery", lat: 32.3780, lng: -86.2550 },
    { name: "West Montgomery", lat: 32.3720, lng: -86.3450 },
    { name: "Pike Road Area", lat: 32.3290, lng: -86.2500 },
];

const NEIGHBORHOOD_RADIUS_KM = 1.8;

function assignToNeighborhoods(
    crimes: GeoJSONFeature[],
    businesses: GeoJSONFeature[],
    vacants: GeoJSONFeature[]
): NeighborhoodProfile[] {
    const profiles: NeighborhoodProfile[] = NEIGHBORHOODS.map((n) => ({
        name: n.name,
        crimeCount: 0,
        businessCount: 0,
        vacantCount: 0,
        investmentScore: 50,
        centroid: [n.lat, n.lng],
    }));

    function assignFeatures(features: GeoJSONFeature[], key: "crimeCount" | "businessCount" | "vacantCount") {
        for (const f of features) {
            const pt = featureLatLng(f);
            if (!pt) continue;
            let minDist = Infinity;
            let closest = -1;
            for (let i = 0; i < NEIGHBORHOODS.length; i++) {
                const d = haversineKm(pt[0], pt[1], NEIGHBORHOODS[i].lat, NEIGHBORHOODS[i].lng);
                if (d < minDist) {
                    minDist = d;
                    closest = i;
                }
            }
            if (closest >= 0 && minDist <= NEIGHBORHOOD_RADIUS_KM) {
                profiles[closest][key]++;
            }
        }
    }

    assignFeatures(crimes, "crimeCount");
    assignFeatures(businesses, "businessCount");
    assignFeatures(vacants, "vacantCount");

    const maxCrime = Math.max(...profiles.map((p) => p.crimeCount), 1);
    const maxBiz = Math.max(...profiles.map((p) => p.businessCount), 1);
    const maxVacant = Math.max(...profiles.map((p) => p.vacantCount), 1);

    for (const p of profiles) {
        const bizFactor = (p.businessCount / maxBiz) * 40;
        const crimeFactor = (1 - p.crimeCount / maxCrime) * 35;
        const vacFactor = p.vacantCount > 0 ? Math.max(0, 25 - (p.vacantCount / maxVacant) * 20) : 10;
        p.investmentScore = Math.round(Math.max(5, Math.min(98, bizFactor + crimeFactor + vacFactor)));
    }

    return profiles.sort((a, b) => b.investmentScore - a.investmentScore);
}

// ---- Correlation ----

function pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 3) return 0;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;
    let num = 0, denomX = 0, denomY = 0;
    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        num += dx * dy;
        denomX += dx * dx;
        denomY += dy * dy;
    }
    const denom = Math.sqrt(denomX * denomY);
    return denom === 0 ? 0 : parseFloat((num / denom).toFixed(3));
}

// ---- Main ----

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
    const [crime, business, vacant] = await Promise.all([
        fetchCrimeData(),
        fetchBusinessLicenses(),
        fetchVacantProperties(),
    ]);

    const crimes = crime.features || [];
    const businesses = business.features || [];
    const vacants = vacant.features || [];

    const activeBusinesses = businesses.length;
    const totalCrimeIncidents = crimes.length;
    const totalVacantProperties = vacants.length;

    const totalParcels = activeBusinesses + totalVacantProperties;
    const vacancyRate = totalParcels > 0
        ? parseFloat(((totalVacantProperties / totalParcels) * 100).toFixed(1))
        : 0;

    let safetyTrend: "Improving" | "Stable" | "Declining" = "Stable";
    if (totalCrimeIncidents > 0 && activeBusinesses > 0) {
        const ratio = totalCrimeIncidents / activeBusinesses;
        if (ratio < 0.3) safetyTrend = "Improving";
        else if (ratio > 1.0) safetyTrend = "Declining";
    }

    const neighborhoods = assignToNeighborhoods(crimes, businesses, vacants);
    const topNeighborhoods = neighborhoods.slice(0, 5);

    // Generate Bright Data signals correlated with real neighborhood data
    const brightData = generateBrightDataSignals(neighborhoods);

    const crimeVals = neighborhoods.map((n) => n.crimeCount);
    const bizVals = neighborhoods.map((n) => n.businessCount);
    const vacVals = neighborhoods.map((n) => n.vacantCount);

    const correlations = {
        crimeVsBusiness: pearsonCorrelation(crimeVals, bizVals),
        vacancyVsCrime: pearsonCorrelation(vacVals, crimeVals),
        businessVsVacancy: pearsonCorrelation(bizVals, vacVals),
    };

    const bizDensity = Math.min(activeBusinesses / 500, 1);
    const safetyScore = totalCrimeIncidents > 0 ? Math.max(0, 1 - (totalCrimeIncidents / (activeBusinesses + totalCrimeIncidents))) : 0.5;
    const vacancyPenalty = vacancyRate / 100;

    // Factor in Bright Data foot traffic average
    const avgTrafficIndex = brightData.footTraffic.reduce((s, f) => s + f.index, 0) / Math.max(brightData.footTraffic.length, 1);
    const trafficBoost = (avgTrafficIndex / 100) * 10;

    let revScore = Math.round((bizDensity * 30) + (safetyScore * 30) + ((1 - vacancyPenalty) * 25) + trafficBoost);
    revScore = Math.max(5, Math.min(98, revScore));

    // Survival: weighted by biz density, safety, AND Bright Data sentiment
    const avgSentiment = brightData.sentiment.reduce((s, r) => s + r.positivePercent, 0) / Math.max(brightData.sentiment.length, 1);
    const survivalBase = Math.round(
        (revScore * 0.35) +
        (safetyScore * 20) +
        (bizDensity * 20) +
        (avgSentiment / 100 * 25)
    );
    const survivalData = [{
        name: "Survival Probability",
        value: Math.min(Math.max(survivalBase, 15), 97),
        fill: "url(#colorSurvival)",
    }];

    // Trend projection from real counts + Bright Data rent estimates
    const avgRent = brightData.rentEstimates.reduce((s, r) => s + r.medianRent, 0) / Math.max(brightData.rentEstimates.length, 1);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const gentrificationData = months.map((month, i) => ({
        month,
        rent: Math.round(avgRent * (1 + i * 0.02)),
        licenses: Math.round(activeBusinesses * (0.85 + i * 0.03)),
        crime: Math.round(totalCrimeIncidents * (1.05 - i * 0.02)),
        vacancies: Math.round(totalVacantProperties * (1.02 - i * 0.015)),
    }));

    const dataSources = [
        { name: "911 Crime Calls", featureCount: totalCrimeIncidents, status: totalCrimeIncidents > 0 ? "Live" : "No Data" },
        { name: "Business Licenses", featureCount: activeBusinesses, status: activeBusinesses > 0 ? "Live" : "No Data" },
        { name: "Vacant Properties", featureCount: totalVacantProperties, status: totalVacantProperties > 0 ? "Live" : "No Data" },
        { name: "Bright Data Proxy", featureCount: brightData.footTraffic.length, status: "Simulated" },
    ];

    return {
        revitalizationScore: revScore,
        safetyTrend,
        activeBusinesses,
        vacancyRate,
        totalCrimeIncidents,
        totalVacantProperties,
        businessSurvivalData: survivalData,
        gentrificationData,
        topNeighborhoods,
        correlations,
        brightData,
        dataTimestamp: new Date().toISOString(),
        dataSources,
    };
}
