// ============================================================================
// Bright Data — Simulated Scraping Signals
// ============================================================================
// In production, these would come from Puppeteer scraping via Bright Data's
// Scraping Browser. For the hackathon, we generate realistic signals that
// correlate with real ArcGIS neighborhood data.
// ============================================================================

export interface FootTrafficSignal {
    neighborhood: string;
    level: "High" | "Moderate" | "Low";
    index: number; // 0-100
    peakHours: string;
    yoyChange: number; // e.g., +12
}

export interface ReviewSentiment {
    neighborhood: string;
    positivePercent: number;
    totalReviews: number;
    topMentions: string[];
    avgRating: number;
}

export interface RentEstimate {
    neighborhood: string;
    medianRent: number;
    yoyChange: number;
    activeListings: number;
}

export interface BrightDataSignals {
    footTraffic: FootTrafficSignal[];
    sentiment: ReviewSentiment[];
    rentEstimates: RentEstimate[];
    lastScraped: string;
}

/**
 * Generate Bright Data signals that correlate with real neighborhood data.
 * Takes actual neighborhood stats to make signals realistic.
 */
export function generateBrightDataSignals(
    neighborhoods: { name: string; businessCount: number; crimeCount: number; vacantCount: number }[]
): BrightDataSignals {
    const footTraffic: FootTrafficSignal[] = neighborhoods.map((n) => {
        // More businesses → higher foot traffic
        const bizDensity = n.businessCount / Math.max(...neighborhoods.map((x) => x.businessCount), 1);
        const index = Math.round(bizDensity * 70 + Math.random() * 20 + 10);
        const level: "High" | "Moderate" | "Low" =
            index > 70 ? "High" : index > 40 ? "Moderate" : "Low";
        return {
            neighborhood: n.name,
            level,
            index: Math.min(index, 98),
            peakHours: index > 60 ? "11AM–2PM, 5PM–8PM" : index > 40 ? "12PM–3PM" : "Sporadic",
            yoyChange: Math.round((bizDensity - 0.3) * 25 + Math.random() * 5),
        };
    });

    const sentiment: ReviewSentiment[] = neighborhoods.map((n) => {
        // Lower crime → better sentiment
        const crimeRatio = n.crimeCount / Math.max(...neighborhoods.map((x) => x.crimeCount), 1);
        const positivePercent = Math.round(Math.max(45, Math.min(92, 85 - crimeRatio * 30 + Math.random() * 10)));
        const baseReviews = n.businessCount * 3 + Math.round(Math.random() * 50);

        const mentionPool = ["parking", "service", "atmosphere", "walkability", "safety", "cleanliness", "value", "family-friendly"];
        const topMentions = mentionPool
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        return {
            neighborhood: n.name,
            positivePercent,
            totalReviews: baseReviews,
            topMentions,
            avgRating: parseFloat((3.2 + (positivePercent / 100) * 1.6 + Math.random() * 0.3).toFixed(1)),
        };
    });

    const rentEstimates: RentEstimate[] = neighborhoods.map((n) => {
        const bizFactor = n.businessCount / Math.max(...neighborhoods.map((x) => x.businessCount), 1);
        const vacFactor = n.vacantCount / Math.max(...neighborhoods.map((x) => x.vacantCount), 1);
        const baseRent = 800 + bizFactor * 600 - vacFactor * 200;
        return {
            neighborhood: n.name,
            medianRent: Math.round(baseRent + Math.random() * 100),
            yoyChange: parseFloat((bizFactor * 8 - vacFactor * 3 + Math.random() * 2).toFixed(1)),
            activeListings: Math.round(n.vacantCount * 0.3 + Math.random() * 20 + 5),
        };
    });

    return {
        footTraffic,
        sentiment,
        rentEstimates,
        lastScraped: new Date().toISOString(),
    };
}

/**
 * Get Bright Data signals for a specific neighborhood.
 */
export function getNeighborhoodBrightData(
    signals: BrightDataSignals,
    neighborhood: string
): { traffic: FootTrafficSignal | undefined; reviews: ReviewSentiment | undefined; rent: RentEstimate | undefined } {
    return {
        traffic: signals.footTraffic.find((f) => f.neighborhood === neighborhood),
        reviews: signals.sentiment.find((s) => s.neighborhood === neighborhood),
        rent: signals.rentEstimates.find((r) => r.neighborhood === neighborhood),
    };
}
