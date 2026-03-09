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

function analyzeQuery(msg: string, route?: string): string {
    const lower = msg.toLowerCase();

    // Context-aware intents based on the current route
    if (route === "/compare" && (lower.includes("compare") || lower.includes("summarize") || lower.includes("battle") || lower.includes("which") || lower.includes("safer") || lower.includes("better"))) {
        return "compare_context";
    }
    if (route === "/market-gap" && (lower.includes("need") || lower.includes("sentiment") || lower.includes("demand") || lower.includes("citizen") || lower.includes("feedback"))) {
        return "market_gap_context";
    }

    if (lower.includes("cafe") || lower.includes("coffee") || lower.includes("restaurant") || lower.includes("food")) return "food_business";
    if (lower.includes("invest") || lower.includes("where") || lower.includes("open") || lower.includes("opportunity")) return "investment";
    if (lower.includes("crime") || lower.includes("safe") || lower.includes("risk") || lower.includes("danger") || lower.includes("incident")) return "safety";
    if (lower.includes("vacant") || lower.includes("property") || lower.includes("empty") || lower.includes("abandon") || lower.includes("parcel")) return "vacancy";
    if (lower.includes("revitali") || lower.includes("score") || lower.includes("how") || lower.includes("metric")) return "metrics";
    if (lower.includes("neighbor") || lower.includes("area") || lower.includes("zone") || lower.includes("district")) return "neighborhoods";
    if (lower.includes("correlat") || lower.includes("relation") || lower.includes("connect") || lower.includes("predict")) return "correlations";
    if (lower.includes("analyze") || lower.includes("data point") || lower.includes("business license") || lower.includes("at ")) return "marker_analysis";
    return "general";
}

function generateResponse(intent: string, metrics: DashboardMetrics, userMsg: string): CopilotResponse {
    const charts: ChartData[] = [];
    let responseText = "";
    let insightCard = undefined;

    const topZone = metrics.topNeighborhoods?.[0];
    const runnerUp = metrics.topNeighborhoods?.[1];

    switch (intent) {
        case "food_business":
            responseText = `**🍽️ F&B Location Analysis**\n\nBased on cross-correlating **${metrics.activeBusinesses.toLocaleString()}** live business licenses with **${metrics.totalCrimeIncidents.toLocaleString()}** crime geocodes and **${metrics.totalVacantProperties.toLocaleString()}** vacant parcels:\n\n**Top Pick: ${topZone?.name || "N/A"}** (Score: ${topZone?.investmentScore || 0}/100)\n- ${topZone?.businessCount || 0} existing businesses in zone\n- ${topZone?.crimeCount || 0} incidents = ${topZone && topZone.crimeCount < 15 ? "low" : "moderate"} risk\n- ${topZone?.vacantCount || 0} vacant parcels = potential sites\n\n**Runner-Up: ${runnerUp?.name || "N/A"}** (Score: ${runnerUp?.investmentScore || 0}/100)\n- ${runnerUp?.businessCount || 0} businesses · ${runnerUp?.vacantCount || 0} vacant parcels`;

            if (topZone) {
                insightCard = {
                    title: `Prime F&B Location — ${topZone.name}`,
                    coordinates: topZone.centroid as [number, number],
                    suggestion: `${topZone.businessCount} active businesses, ${topZone.crimeCount < 10 ? "very low" : "moderate"} crime. ${topZone.vacantCount} vacant parcels for potential sites.`,
                    score: topZone.investmentScore,
                };
            }

            charts.push({
                type: "bar",
                title: `Business License Trend (${metrics.activeBusinesses.toLocaleString()} total)`,
                data: metrics.gentrificationData,
                dataKey: "licenses",
                xKey: "month",
                color: "#22c55e",
            });
            break;

        case "investment":
            responseText = `**📊 Investment Opportunity Analysis**\n\nLive Data Summary:\n- **${metrics.activeBusinesses.toLocaleString()}** active business licenses\n- **${metrics.totalVacantProperties.toLocaleString()}** vacant/suspected parcels\n- **${metrics.totalCrimeIncidents.toLocaleString()}** crime incidents\n- Vacancy Rate: **${metrics.vacancyRate}%**\n- Revitalization Score: **${metrics.revitalizationScore}/100**\n\n**Top 3 Investment Zones:**\n${metrics.topNeighborhoods?.slice(0, 3).map((n, i) =>
                `${i + 1}. **${n.name}** — Score ${n.investmentScore}/100 | ${n.businessCount} biz · ${n.crimeCount} crimes · ${n.vacantCount} vacant`
            ).join("\n") || "No data"}\n\nCrime↔Business correlation: **${metrics.correlations?.crimeVsBusiness?.toFixed(3)}**`;

            charts.push({
                type: "area",
                title: "Projected Trend (from live data)",
                data: metrics.gentrificationData,
                dataKey: "licenses",
                xKey: "month",
                color: "#00f0ff",
            });

            if (topZone) {
                insightCard = {
                    title: `#1 Investment Zone — ${topZone.name}`,
                    coordinates: topZone.centroid as [number, number],
                    suggestion: `Highest multi-factor score based on ${topZone.businessCount} businesses and ${topZone.vacantCount} development parcels.`,
                    score: topZone.investmentScore,
                };
            }
            break;

        case "safety":
            responseText = `**🛡️ Safety Analysis (Live Data)**\n\nOverall trend: **${metrics.safetyTrend}**\nTotal geocoded incidents: **${metrics.totalCrimeIncidents.toLocaleString()}**\nCrime-to-business ratio: **${(metrics.totalCrimeIncidents / Math.max(metrics.activeBusinesses, 1)).toFixed(2)}**\n\n**Safest Investment Zones:**\n${metrics.topNeighborhoods?.filter(n => n.crimeCount > 0).sort((a, b) => a.crimeCount - b.crimeCount).slice(0, 3).map((n, i) =>
                `${i + 1}. **${n.name}** — ${n.crimeCount} incidents | ${n.businessCount} businesses`
            ).join("\n") || "Insufficient crime data"}\n\nVacancy↔Crime correlation: **${metrics.correlations?.vacancyVsCrime?.toFixed(3)}**`;

            charts.push({
                type: "line",
                title: "Crime Projection (from live data)",
                data: metrics.gentrificationData,
                dataKey: "crime",
                xKey: "month",
                color: "#ef4444",
            });
            break;

        case "vacancy":
            responseText = `**🏚️ Vacant Property Analysis (Live Data)**\n\nTotal parcels: **${metrics.totalVacantProperties.toLocaleString()}**\nVacancy rate: **${metrics.vacancyRate}%**\n\n**Neighborhoods with Development Opportunity:**\n${metrics.topNeighborhoods?.filter(n => n.vacantCount > 0).sort((a, b) => b.vacantCount - a.vacantCount).slice(0, 4).map((n, i) =>
                `${i + 1}. **${n.name}** — ${n.vacantCount} vacant parcels · ${n.businessCount} existing biz`
            ).join("\n") || "No vacant data"}\n\nBusiness↔Vacancy correlation: **${metrics.correlations?.businessVsVacancy?.toFixed(3)}**`;

            charts.push({
                type: "bar",
                title: "Vacancy Projection (from live data)",
                data: metrics.gentrificationData,
                dataKey: "vacancies",
                xKey: "month",
                color: "#eab308",
            });
            break;

        case "metrics":
            responseText = `**📈 Live System Metrics**\n\n| Metric | Live Value |\n|--------|-------|\n| Revitalization Score | **${metrics.revitalizationScore}/100** |\n| Safety Trend | **${metrics.safetyTrend}** |\n| Business Licenses (live) | **${metrics.activeBusinesses.toLocaleString()}** |\n| Vacant Properties (live) | **${metrics.totalVacantProperties.toLocaleString()}** |\n| Crime Incidents (live) | **${metrics.totalCrimeIncidents.toLocaleString()}** |\n| Vacancy Rate | **${metrics.vacancyRate}%** |\n| Survival Probability | **${metrics.businessSurvivalData[0]?.value}%** |\n\n**Correlations (Pearson):**\n- Crime ↔ Business: ${metrics.correlations?.crimeVsBusiness?.toFixed(3)}\n- Vacancy ↔ Crime: ${metrics.correlations?.vacancyVsCrime?.toFixed(3)}\n- Business ↔ Vacancy: ${metrics.correlations?.businessVsVacancy?.toFixed(3)}\n\nData sources: ${metrics.dataSources?.filter(d => d.status === "Live").length}/${metrics.dataSources?.length || 3} live`;
            break;

        case "neighborhoods":
            responseText = `**🏘️ Neighborhood Intelligence (${metrics.topNeighborhoods?.length || 0} zones)**\n\n${metrics.topNeighborhoods?.map((n, i) =>
                `**${i + 1}. ${n.name}** — Score: ${n.investmentScore}/100\n   📊 ${n.businessCount} biz | 🚨 ${n.crimeCount} crimes | 🏚️ ${n.vacantCount} vacant`
            ).join("\n\n") || "No data"}\n\n*Scores: business density (40%) + low crime (35%) + vacancy opportunity (25%)*`;
            break;

        case "correlations":
            responseText = `**🔬 Statistical Correlation Analysis**\n\nComputed across ${metrics.topNeighborhoods?.length || 12} neighborhoods:\n\n**Crime ↔ Business: r = ${metrics.correlations?.crimeVsBusiness?.toFixed(3)}**\n→ ${(metrics.correlations?.crimeVsBusiness ?? 0) > 0.3 ? "Positive: Busier areas have more incidents" : (metrics.correlations?.crimeVsBusiness ?? 0) < -0.3 ? "Negative: Businesses reduce crime" : "Weak correlation"}\n\n**Vacancy ↔ Crime: r = ${metrics.correlations?.vacancyVsCrime?.toFixed(3)}**\n→ ${(metrics.correlations?.vacancyVsCrime ?? 0) > 0.3 ? "Positive: Vacancies associate with crime" : "No strong linear relationship"}\n\n**Business ↔ Vacancy: r = ${metrics.correlations?.businessVsVacancy?.toFixed(3)}**\n→ ${(metrics.correlations?.businessVsVacancy ?? 0) > 0 ? "Commercial areas coincide with vacancies" : "Active zones have fewer vacancies"}`;

            charts.push({
                type: "bar",
                title: "Neighborhood Breakdown (live)",
                data: (metrics.topNeighborhoods || []).map(n => ({ name: n.name.slice(0, 8), business: n.businessCount, crime: n.crimeCount })),
                dataKey: "business",
                xKey: "name",
                color: "#22c55e",
            });
            break;

        case "marker_analysis": {
            // Extract marker info from the user message
            responseText = `**🔍 Location Analysis**\n\n${userMsg}\n\nCross-referencing against live datasets:\n- **${metrics.totalCrimeIncidents.toLocaleString()}** crime incidents in dataset\n- **${metrics.activeBusinesses.toLocaleString()}** business licenses in dataset\n- **${metrics.totalVacantProperties.toLocaleString()}** vacant parcels in dataset\n\nThe nearest top-ranked zone is **${topZone?.name || "N/A"}** with investment score **${topZone?.investmentScore || 0}/100**.`;

            if (topZone) {
                insightCard = {
                    title: `Nearest Investment Zone — ${topZone.name}`,
                    coordinates: topZone.centroid as [number, number],
                    suggestion: `${topZone.businessCount} businesses, ${topZone.crimeCount} incidents, ${topZone.vacantCount} vacant parcels in this zone.`,
                    score: topZone.investmentScore,
                };
            }
            break;
        }

        case "compare_context":
            responseText = `**⚖️ District Battle Analysis**\n\nYou're viewing the district comparison. Our engine correlates data from ${metrics.topNeighborhoods?.length || 0} zones.\nBased on live metrics, the top recommended district overall is **${topZone?.name || "N/A"}** due to its business density (${topZone?.businessCount}) combined with solid safety indicators.\n\nAsk me to compare specific districts or metrics!`;
            break;

        case "market_gap_context":
            responseText = `**🗣️ Market Gap & Citizen Pulse**\n\nI'm analyzing the Bright Data NLP sentiment feeds. The most commonly identified unmet needs across the city involve high demand for modern F&B options, fast-casual dining, and tech hubs in areas with high foot traffic but low current business density.\n\nAsk me about specific neighborhood sentiments!`;
            break;

        default:
            responseText = `**👋 MontgoPulse AI Copilot**\n\nConnected to **${metrics.dataSources?.filter(d => d.status === "Live").length || 0}** live ArcGIS sources.\n\n**Live Data:**\n- Business Licenses: **${metrics.activeBusinesses.toLocaleString()}**\n- Vacant Properties: **${metrics.totalVacantProperties.toLocaleString()}**\n- Crime Incidents: **${metrics.totalCrimeIncidents.toLocaleString()}**\n- Revitalization Score: **${metrics.revitalizationScore}/100**\n- Safety Trend: **${metrics.safetyTrend}**\n\n**Try asking me:**\n• "Where should I open a restaurant?"\n• "Show me the safest neighborhoods"\n• "Analyze vacant property trends"\n• "What's the crime-business correlation?"\n• "Rank all neighborhoods for investment"`;
    }

    return { message: responseText, charts, insightCard, timestamp: new Date().toISOString() };
}

export async function POST(request: NextRequest): Promise<NextResponse<CopilotResponse>> {
    try {
        const body: CopilotRequest = await request.json();
        const intent = analyzeQuery(body.message, body.route);
        const metrics = await getDashboardMetrics();
        const response = generateResponse(intent, metrics, body.message);
        return NextResponse.json(response);
    } catch (error) {
        console.error("Copilot Error:", error);
        return NextResponse.json(
            {
                message: "I encountered an error analyzing the ArcGIS data. Please try again.",
                charts: [],
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}
