import { NextRequest, NextResponse } from "next/server";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/analytics";

interface CopilotRequest {
    message: string;
    route?: string;
}

interface ChartData {
    type: "area" | "bar" | "line";
    title: string;
    data: Record<string, unknown>[];
    dataKey: string;
    xKey: string;
    color?: string;
}

interface CopilotResponse {
    message: string;
    charts: ChartData[];
    insightCard?: {
        title: string;
        coordinates: [number, number];
        suggestion: string;
        score: number;
    };
    timestamp: string;
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
        throw new Error("AI_API_KEY is not set in the environment.");
    }

    const payload = {
        contents: [
            {
                role: "user",
                parts: [
                    { text: systemPrompt },
                    { text: `User message: ${userMessage}` }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
        }
    };

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        const errortext = await res.text();
        throw new Error(`Gemini API Error: ${res.status} ${errortext}`);
    }

    const data = await res.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
    }

    return "I couldn't generate a response at this time.";
}

export async function POST(request: NextRequest): Promise<NextResponse<CopilotResponse>> {
    let metrics: DashboardMetrics | null = null;
    try {
        const body: CopilotRequest = await request.json();
        metrics = await getDashboardMetrics(false);

        // ENRICHED LEAN CONTEXT: Providing deep heuristics while maintaining a lightweight footprint.
        const leanContext = {
            overallScore: metrics.revitalizationScore,
            safetyTrend: metrics.safetyTrend,
            totalBusinesses: metrics.activeBusinesses,
            developmentVelocity: metrics.developmentVelocity,
            blightIndex: metrics.blightIndex,
            totalCrimes: metrics.totalCrimeIncidents,
            topInvestmentZones: (metrics.topNeighborhoods || []).slice(0, 3).map(n => ({
                name: n.name,
                score: n.investmentScore
            })),
            correlations: metrics.correlations,
            sentimentAnalysis: metrics.brightData?.sentiment || [],
            rentProjections: metrics.brightData?.rentEstimates || [],
            sixMonthForecast: metrics.gentrificationData || []
        };

        const systemPrompt = `You are MontgoPulse AI, an elite B2B urban investment intelligence assistant for Montgomery, Alabama. 
Here is the live aggregated market intelligence (JSON):
${JSON.stringify(leanContext)}

User Context (Current Route): ${body.route || "Global Dashboard"}

CRITICAL RULES:

Act as an Expert: Speak naturally, professionally, and confidently like a Senior Real Estate Analyst.

Leverage Deep Data: When asked about where to invest or open a business, heavily utilize the \`sentimentAnalysis\` (citizen feedback), \`correlations\`, and \`sixMonthForecast\` arrays to provide highly specific, data-driven advice.

Format Numbers Beautifully: Never output raw JSON keys. Format financial numbers as millions with a dollar sign (e.g., "$221.6M").

Conversational Awareness: If the user asks a general question, briefly introduce your capabilities (analyzing safety, market gaps, development momentum, and 6-month forecasts) before giving a market snapshot.

Brevity: Keep responses punchy (3-4 sentences max). Use bolding for key metrics and zone names.`;

        let message = "";
        try {
            message = await callGemini(systemPrompt, body.message);
        } catch (geminiError: any) {
            console.error("Gemini context fallback:", geminiError);
            const errMsg = geminiError?.message || "";
            if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED")) {
                message = `**System Notice:** The AI analysis engine is experiencing peak demand. Please retry your query in a few moments.\n\n**Live Montgomery Snapshot:**\n• **Active Businesses:** ${metrics.activeBusinesses}\n• **Development Velocity:** $${(metrics.developmentVelocity / 1000000).toFixed(1)}M\n• **Revitalization Index:** ${metrics.revitalizationScore}/100\n• **Prime Investment Zone:** ${metrics.topNeighborhoods[0]?.name || "N/A"}`;
            } else {
                message = `**System Notice:** The AI analysis engine is momentarily offline, but your live data feed is fully operational.\n\n**Live Montgomery Snapshot:**\n• **Active Businesses:** ${metrics.activeBusinesses}\n• **Development Velocity:** $${(metrics.developmentVelocity / 1000000).toFixed(1)}M\n• **Revitalization Index:** ${metrics.revitalizationScore}/100\n• **Prime Investment Zone:** ${metrics.topNeighborhoods[0]?.name || "N/A"}`;
            }
        }

        const charts: ChartData[] = [];
        const lowerResponse = message.toLowerCase();

        if (lowerResponse.includes("crime") || lowerResponse.includes("safety") || lowerResponse.includes("incident")) {
            charts.push({
                type: "line",
                title: "Crime Projection (from live data)",
                data: metrics.gentrificationData,
                dataKey: "crime",
                xKey: "month",
                color: "#ef4444",
            });
        }
        if (lowerResponse.includes("business") || lowerResponse.includes("license") || lowerResponse.includes("company")) {
            charts.push({
                type: "bar",
                title: "Business License Trend (live)",
                data: metrics.gentrificationData,
                dataKey: "licenses",
                xKey: "month",
                color: "#22c55e",
            });
        }
        if (lowerResponse.includes("permit") || lowerResponse.includes("development") || lowerResponse.includes("velocity")) {
            charts.push({
                type: "bar",
                title: "Capital Inflow Projection (live)",
                data: metrics.gentrificationData,
                dataKey: "permits",
                xKey: "month",
                color: "#eab308",
            });
        }
        if (lowerResponse.includes("blight") || lowerResponse.includes("violation") || lowerResponse.includes("code")) {
            charts.push({
                type: "bar",
                title: "Blight Index Projection (live)",
                data: metrics.gentrificationData,
                dataKey: "violations",
                xKey: "month",
                color: "#f97316",
            });
        }

        let insightCard = undefined;
        const lowerUserMsg = body.message.toLowerCase();
        if (
            lowerUserMsg.includes("invest") || lowerUserMsg.includes("open") ||
            lowerUserMsg.includes("where") || lowerUserMsg.includes("location") ||
            lowerUserMsg.includes("zone") || lowerUserMsg.includes("neighborhood")
        ) {
            const topZone = metrics.topNeighborhoods?.[0];
            if (topZone) {
                insightCard = {
                    title: `Prime Location — ${topZone.name}`,
                    coordinates: topZone.centroid as [number, number],
                    suggestion: `${topZone.businessCount} active businesses, ${topZone.crimeCount} crime incidents. Capital inflow of $${(topZone.developmentVelocity / 1000000).toFixed(1)}M.`,
                    score: topZone.investmentScore,
                };
            }
        }

        return NextResponse.json({
            message,
            charts,
            insightCard,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Copilot Error:", error);

        let message = "AI analysis is temporarily unavailable.";
        if (metrics) {
            if (error.message?.includes('429') || error.status === 429) {
                message = `AI analysis is currently experiencing high demand. Please try again in a few moments.\n\nIn the meantime, here is your live market summary:\n- Active Businesses: ${metrics.activeBusinesses}\n- Development Velocity: $${(metrics.developmentVelocity / 1000000).toFixed(1)}M\n- Revitalization Score: ${metrics.revitalizationScore}/100\n- Top Investment Zone: ${metrics.topNeighborhoods[0]?.name || "N/A"}`;
            } else {
                message = `AI analysis is temporarily unavailable, but your live data feed remains active.\n\nHere is the current market summary:\n- Active Businesses: ${metrics.activeBusinesses}\n- Development Velocity: $${(metrics.developmentVelocity / 1000000).toFixed(1)}M\n- Revitalization Score: ${metrics.revitalizationScore}/100\n- Top Investment Zone: ${metrics.topNeighborhoods[0]?.name || "N/A"}`;
            }
        }

        return NextResponse.json({
            message: message,
            charts: [],
            timestamp: new Date().toISOString()
        });
    }
}
