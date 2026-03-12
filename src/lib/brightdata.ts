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
    marketGaps: string[];
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

function seededRandom(seed: string, offset: number = 0): number {
    let hash = offset;
    for (let i = 0; i < seed.length; i++) {
        hash = Math.imul(31, hash) + seed.charCodeAt(i) | 0;
    }
    hash = hash ^ (hash >>> 16);
    hash = Math.imul(hash, 0x45d9f3b);
    hash = hash ^ (hash >>> 16);
    return (Math.abs(hash) >>> 0) / 0xFFFFFFFF;
}

/**
 * Generate Bright Data signals that correlate with real neighborhood data.
 * Takes actual neighborhood stats to make signals realistic.
 */
export function generateBrightDataSignals(
    neighborhoods: { name: string; businessCount: number; crimeCount: number; permitsCount: number; violationsCount: number; developmentVelocity: number }[]
): BrightDataSignals {
    const footTraffic: FootTrafficSignal[] = neighborhoods.map((n) => {
        // More businesses → higher foot traffic
        const bizDensity = n.businessCount / Math.max(...neighborhoods.map((x) => x.businessCount), 1);
        const index = Math.round(bizDensity * 70 + seededRandom(n.name, 1) * 20 + 10);
        const level: "High" | "Moderate" | "Low" =
            index > 70 ? "High" : index > 40 ? "Moderate" : "Low";
        return {
            neighborhood: n.name,
            level,
            index: Math.min(index, 98),
            peakHours: index > 60 ? "11AM–2PM, 5PM–8PM" : index > 40 ? "12PM–3PM" : "Sporadic",
            yoyChange: Math.round((bizDensity - 0.3) * 25 + seededRandom(n.name, 2) * 5),
        };
    });

    const sentiment: ReviewSentiment[] = neighborhoods.map((n) => {
        // Lower crime → better sentiment
        const crimeRatio = n.crimeCount / Math.max(...neighborhoods.map((x) => x.crimeCount), 1);
        const positivePercent = Math.round(Math.max(45, Math.min(92, 85 - crimeRatio * 30 + seededRandom(n.name, 3) * 10)));
        const baseReviews = n.businessCount * 3 + Math.round(seededRandom(n.name, 4) * 50);

        const mentionPool = ["parking", "service", "atmosphere", "walkability", "safety", "cleanliness", "value", "family-friendly"];

        // Deterministic Fisher-Yates shuffle
        const shuffledPool = [...mentionPool];
        for (let i = shuffledPool.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(n.name, 5 + i) * (i + 1));
            [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
        }
        const topMentions = shuffledPool.slice(0, 3);

        // Populate business-sector gaps
        const gapPool = [
            "Dining", "Cafe", "Nightlife", 
            "Specialty Grocery", "Boutique", 
            "Wellness", "Clinic", 
            "Co-working", "Incubator"
        ];
        const marketGaps: string[] = [];
        const gapCount = Math.floor(seededRandom(n.name, 10) * 3) + 1; // 1 to 3 gaps
        for (let i = 0; i < gapCount; i++) {
            const gapIdx = Math.floor(seededRandom(n.name, 11 + i) * gapPool.length);
            if (!marketGaps.includes(gapPool[gapIdx])) {
                marketGaps.push(gapPool[gapIdx]);
            }
        }

        return {
            neighborhood: n.name,
            positivePercent,
            totalReviews: baseReviews,
            topMentions,
            avgRating: parseFloat((3.2 + (positivePercent / 100) * 1.6 + seededRandom(n.name, 6) * 0.3).toFixed(1)),
            marketGaps,
        };
    });

    const rentEstimates: RentEstimate[] = neighborhoods.map((n) => {
        const bizFactor = n.businessCount / Math.max(...neighborhoods.map((x) => x.businessCount), 1);
        const vacFactor = n.violationsCount / Math.max(...neighborhoods.map((x) => x.violationsCount), 1);
        const devFactor = n.developmentVelocity / Math.max(...neighborhoods.map((x) => x.developmentVelocity), 1);
        const baseRent = 800 + bizFactor * 600 + devFactor * 400 - vacFactor * 200;
        return {
            neighborhood: n.name,
            medianRent: Math.round(baseRent + seededRandom(n.name, 7) * 100),
            yoyChange: parseFloat((bizFactor * 8 + devFactor * 5 - vacFactor * 3 + seededRandom(n.name, 8) * 2).toFixed(1)),
            activeListings: Math.round(n.permitsCount * 1.5 + n.violationsCount * 0.3 + seededRandom(n.name, 9) * 20 + 5),
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
