"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
    FileText, Download, TrendingUp, ShieldCheck,
    Calendar, FileJson, BrainCircuit, Loader2, Check, ToggleLeft, ToggleRight,
    Building2, AlertTriangle, Footprints, Star, Share2, CopyCheck, ChevronDown,
    Target, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DashboardMetrics, NeighborhoodProfile } from "@/lib/analytics";

// ---- Types ----

interface ReportModule {
    id: string;
    label: string;
    icon: React.ElementType;
    enabled: boolean;
    color: string;
}

const DEFAULT_MODULES: ReportModule[] = [
    { id: "executive_summary", label: "Strategic Investment Brief", icon: BrainCircuit, enabled: true, color: "text-brand-purple" },
    { id: "safety_trends", label: "Safety & Crime Trends", icon: ShieldCheck, enabled: true, color: "text-brand-green" },
    { id: "business_analysis", label: "Business License Analysis", icon: Building2, enabled: true, color: "text-brand-green" },
    { id: "development_report", label: "Development Velocity", icon: Building2, enabled: true, color: "text-brand-purple" },
    { id: "blight_report", label: "Blight Risk Report", icon: AlertTriangle, enabled: true, color: "text-brand-orange" },
    { id: "foot_traffic", label: "Foot Traffic Intelligence", icon: Footprints, enabled: true, color: "text-brand-purple" },
    { id: "sentiment_analysis", label: "Review Sentiment Analysis", icon: Star, enabled: true, color: "text-brand-amber" },
    { id: "financial_forecast", label: "Financial Forecasts", icon: TrendingUp, enabled: true, color: "text-brand-cyan" },
];

const SECTOR_OPTIONS = ["General Overview", "F&B / Retail", "Office / B2B", "Service / Health", "Tech / Innovation"];

const SECTOR_GAP_MAP: Record<string, string[]> = {
    "F&B / Retail": ["Late Night Dining", "Specialty Grocery", "Vegan Food Options", "Cafe Culture", "Boutique Retail"],
    "Office / B2B": ["Co-working Spaces", "Corporate Incubator", "Shared Office Suites"],
    "Service / Health": ["Childcare Services", "Fitness Centers", "Wellness Clinics", "Mental Health Services"],
    "Tech / Innovation": ["Tech Incubator", "Maker Spaces", "Innovation Lab", "Co-working Spaces"],
};

// ---- Executive Summary Engine ----

function generateProceduralSummary(
    metrics: DashboardMetrics,
    zone: string,
    sector: string,
    zoneProfile: NeighborhoodProfile | null
): string {
    const isAllCity = zone === "All Montgomery";
    const isGeneral = sector === "General Overview";
    const devM = (metrics.developmentVelocity / 1000000).toFixed(1);
    const gaps = SECTOR_GAP_MAP[sector] || [];
    const gapStr = gaps.length >= 2 ? `${gaps[0]} and ${gaps[1]}` : gaps[0] || "general services";

    if (isAllCity && isGeneral) {
        return `Montgomery presents a compelling investment thesis. With $${devM}M in active capital deployment, ${metrics.activeBusinesses.toLocaleString()} licensed businesses, and a revitalization index of ${metrics.revitalizationScore}/100, the market is ${metrics.safetyTrend === "Improving" ? "demonstrating strengthening fundamentals and rising investor confidence" : "pricing in near-term volatility, creating asymmetric upside for positioned entrants"}. The current blight clearance rate of ${metrics.cityBlightResolutionRate}% signals ${metrics.cityBlightResolutionRate > 50 ? "meaningful municipal commitment to corridor rehabilitation" : "early-stage gentrification corridors with significant repositioning upside"}.`;
    }

    const traffic = metrics.brightData?.footTraffic?.find(f => f.neighborhood === zone);
    const sentiment = metrics.brightData?.sentiment?.find(s => s.neighborhood === zone);
    const trafficScore = traffic?.index || 0;
    const sentimentPct = sentiment?.positivePercent || 0;
    const zoneDev = zoneProfile?.developmentVelocity || 0;
    const zoneDevM = (zoneDev / 1000000).toFixed(1);
    const zoneBiz = zoneProfile?.businessCount || 0;

    let sectorClause = "";
    if (!isGeneral) {
        sectorClause = ` The area shows severe market gaps in ${gapStr}, positioning new ${sector} entrants for immediate demand capture. ${zoneBiz > 100 ? "Competitive density is elevated, making differentiation essential for market entry." : "Low existing saturation provides a clear first-mover window."}`;
    }

    if (!isAllCity && zoneProfile) {
        const opportunity = trafficScore > 70 ? "a high-conviction entry opportunity" : trafficScore > 40 ? "a measured growth opportunity" : "an early-stage value play";
        return `The ${!isGeneral ? sector + " market in " : ""}${zone} presents ${opportunity}. Driven by a ${zoneProfile.investmentScore}/100 investment score and $${zoneDevM}M in capital deployment, the corridor maintains ${trafficScore}/100 foot traffic density and ${sentimentPct}% positive community sentiment.${sectorClause}`;
    }

    // All city + specific sector
    return `Montgomery's ${sector} landscape presents ${metrics.activeBusinesses > 300 ? "a mature, competitive market with selective entry windows" : "an emerging market with significant white-space opportunity"}. Capital deployment across the metro sits at $${devM}M with a revitalization index of ${metrics.revitalizationScore}/100.${sectorClause}`;
}

// ---- Component ----

export default function ReportsPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [modules, setModules] = useState<ReportModule[]>(DEFAULT_MODULES);
    const [targetZone, setTargetZone] = useState("All Montgomery");
    const [targetSector, setTargetSector] = useState("General Overview");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetch("/api/analytics/dashboard")
            .then(res => res.json())
            .then(data => setMetrics(data))
            .catch(console.error);
    }, []);

    const toggleModule = (id: string) => {
        setModules(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
    };

    const enabledModules = modules.filter(m => m.enabled);
    const enabledIds = new Set(enabledModules.map(m => m.id));

    // Derived zone data
    const zoneProfile = useMemo(() => {
        if (!metrics || targetZone === "All Montgomery") return null;
        return metrics.topNeighborhoods?.find(n => n.name === targetZone) || null;
    }, [metrics, targetZone]);

    const zoneTraffic = useMemo(() => {
        if (!metrics) return null;
        if (targetZone === "All Montgomery") return null;
        return metrics.brightData?.footTraffic?.find(f => f.neighborhood === targetZone) || null;
    }, [metrics, targetZone]);

    const zoneSentiment = useMemo(() => {
        if (!metrics) return null;
        if (targetZone === "All Montgomery") return null;
        return metrics.brightData?.sentiment?.find(s => s.neighborhood === targetZone) || null;
    }, [metrics, targetZone]);

    const zoneRent = useMemo(() => {
        if (!metrics) return null;
        if (targetZone === "All Montgomery") return null;
        return metrics.brightData?.rentEstimates?.find(r => r.neighborhood === targetZone) || null;
    }, [metrics, targetZone]);

    // Procedural summary
    const aiSummary = useMemo(() => {
        if (!metrics) return "";
        return generateProceduralSummary(metrics, targetZone, targetSector, zoneProfile);
    }, [metrics, targetZone, targetSector, zoneProfile]);

    const handlePrint = () => window.print();

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadJSON = () => {
        if (!metrics) return;
        const reportData: Record<string, unknown> = {
            title: "MontgoPulse — Dynamic Investment Report",
            targetZone,
            targetSector,
            generatedAt: new Date().toISOString(),
            includedModules: enabledModules.map(m => m.label),
            executiveSummary: aiSummary,
        };
        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `montgopulse-report-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center mt-20 gap-4">
                <div className="w-10 h-10 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
                <p className="text-xs text-white/30 uppercase tracking-widest">Loading Report Data...</p>
            </div>
        );
    }

    const topZones = metrics.topNeighborhoods || [];
    const brightTraffic = metrics.brightData?.footTraffic || [];
    const brightSentiment = metrics.brightData?.sentiment || [];
    const brightRent = metrics.brightData?.rentEstimates || [];
    const isAllCity = targetZone === "All Montgomery";
    const isGeneralSector = targetSector === "General Overview";
    const sectorGaps = SECTOR_GAP_MAP[targetSector] || [];

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 print:p-0 print:bg-white print:text-black">
            {/* Header - Screen Only */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <FileText className="w-6 h-6 text-brand-purple" />
                        Dynamic <span className="gradient-text">Report Builder</span>
                    </h1>
                    <p className="text-sm text-white/40 mt-1">Parametric investment briefs from live ArcGIS & Bright Data</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleShare} variant="ghost" className="border border-glass-border">
                        {copied ? <CopyCheck className="w-4 h-4 mr-2 text-brand-green" /> : <Share2 className="w-4 h-4 mr-2" />}
                        {copied ? "Link Copied" : "Share View"}
                    </Button>
                    <Button onClick={handleDownloadJSON} variant="ghost" className="border border-glass-border" aria-label="Download report as JSON">
                        <FileJson className="w-4 h-4 mr-2" />
                        Export JSON
                    </Button>
                    <Button onClick={handlePrint} className="bg-brand-cyan text-black hover:bg-brand-cyan/80" aria-label="Print or export as PDF">
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                </div>
            </motion.div>

            {/* Report Scope Dropdowns + Module Toggles - Screen Only */}
            <Card className="glass-card print:hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="w-4 h-4 text-brand-cyan" />
                        Report Scope & Modules
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Scope Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Target Zone</label>
                            <div className="relative">
                                <select
                                    value={targetZone}
                                    onChange={e => setTargetZone(e.target.value)}
                                    className="w-full appearance-none bg-glass-100 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-brand-cyan/50 cursor-pointer"
                                >
                                    <option value="All Montgomery" className="bg-slate-900 text-white">All Montgomery</option>
                                    {(metrics?.topNeighborhoods || []).map(n => <option key={n.name} value={n.name} className="bg-slate-900 text-white">{n.name}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Target Sector</label>
                            <div className="relative">
                                <select
                                    value={targetSector}
                                    onChange={e => setTargetSector(e.target.value)}
                                    className="w-full appearance-none bg-glass-100 border border-glass-border rounded-lg px-3 py-2.5 text-sm text-white/90 focus:outline-none focus:border-brand-purple/50 cursor-pointer"
                                >
                                    {SECTOR_OPTIONS.map(s => <option key={s} value={s} className="bg-slate-900 text-white">{s}</option>)}
                                </select>
                                <ChevronDown className="w-4 h-4 text-white/30 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Active Scope Badge */}
                    <div className="flex items-center gap-2 text-[10px] text-white/40">
                        <Sparkles className="w-3 h-3 text-brand-purple" />
                        Scoped to: <span className="text-brand-cyan font-bold">{targetZone}</span> · <span className="text-brand-purple font-bold">{targetSector}</span>
                    </div>

                    {/* Module Toggles */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {modules.map(m => (
                            <button
                                key={m.id}
                                onClick={() => toggleModule(m.id)}
                                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all ${m.enabled
                                    ? 'bg-brand-cyan/10 border border-brand-cyan/30 text-white'
                                    : 'bg-glass-100 border border-glass-border text-white/30'
                                    }`}
                            >
                                {m.enabled ? <ToggleRight className="w-4 h-4 text-brand-cyan shrink-0" /> : <ToggleLeft className="w-4 h-4 shrink-0" />}
                                <span className="truncate">{m.label}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ========== A4 Print Layout ========== */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white text-slate-900 rounded-xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none max-w-[210mm] mx-auto min-h-[297mm] p-6 md:p-10"
            >
                {/* PDF Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start border-b-2 border-slate-200 pb-6 mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">MONTGOPULSE</h1>
                        <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">Dynamic Investment Report</p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Badge className="text-[10px] bg-indigo-50 text-indigo-600 border-indigo-200">
                                ZONE: {targetZone}
                            </Badge>
                            <Badge className="text-[10px] bg-violet-50 text-violet-600 border-violet-200">
                                SECTOR: {targetSector}
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1" suppressHydrationWarning>
                            <Calendar className="w-3 h-3" />
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="inline-block p-3 rounded-lg bg-slate-50 border border-slate-100 mb-2">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                {isAllCity ? "Revitalization Score" : "Investment Score"}
                            </span>
                            <span className="block text-3xl font-black text-indigo-600">
                                {isAllCity ? metrics.revitalizationScore : (zoneProfile?.investmentScore || "—")}
                                <span className="text-lg text-slate-400">/100</span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* ===== AI Executive Summary ===== */}
                {enabledIds.has("executive_summary") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-indigo-500 pl-3 mb-4">
                            Strategic Investment Brief
                        </h2>
                        <div className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-100">
                            {aiSummary}
                        </div>
                    </section>
                )}

                {/* ===== Safety & Crime Trends ===== */}
                {enabledIds.has("safety_trends") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-emerald-500 pl-3 mb-4">Safety & Crime Analysis</h2>
                        {isAllCity ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="Safety Trend" value={metrics.safetyTrend} color="emerald" />
                                <StatCard label="Total Incidents" value={metrics.totalCrimeIncidents.toLocaleString()} color="red" />
                                <StatCard label="Blight Index" value={`${metrics.blightIndex.toFixed(1)}/10`} color="orange" />
                                <StatCard label="Blight Clearance" value={`${metrics.cityBlightResolutionRate}%`} color="emerald" />
                            </div>
                        ) : zoneProfile ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="Zone Crime Count" value={zoneProfile.crimeCount.toLocaleString()} color="red" />
                                <StatCard label="Active Violations" value={zoneProfile.violationsCount.toLocaleString()} color="orange" />
                                <StatCard label="Blight Resolution" value={`${zoneProfile.blightResolutionRate}%`} color="emerald" />
                                <StatCard label="Closed Violations" value={zoneProfile.closedViolationsCount.toLocaleString()} color="emerald" />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No data available for this zone.</p>
                        )}
                    </section>
                )}

                {/* ===== Business License Analysis ===== */}
                {enabledIds.has("business_analysis") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-emerald-500 pl-3 mb-4">Business License Analysis</h2>
                        {isAllCity ? (
                            <div className="grid grid-cols-2 gap-3">
                                <StatCard label="Active Licenses" value={metrics.activeBusinesses.toLocaleString()} color="emerald" />
                                <StatCard label="Survival Rate" value={`${metrics.businessSurvivalData?.[0]?.value || "—"}%`} color="indigo" />
                            </div>
                        ) : zoneProfile ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatCard label={`${targetZone} Licenses`} value={zoneProfile.businessCount.toLocaleString()} color="emerald" />
                                    <StatCard label="Investment Score" value={`${zoneProfile.investmentScore}/100`} color="indigo" />
                                </div>
                            </div>
                        ) : null}

                        {/* Sector-specific Market Gaps */}
                        {!isGeneralSector && sectorGaps.length > 0 && (
                            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <Target className="w-3 h-3 text-violet-500" />
                                    Identified Market Gaps — {targetSector}
                                </h3>
                                <div className="space-y-2.5">
                                    {sectorGaps.map((gap, i) => {
                                        const demand = Math.round(95 - i * 12 - (zoneProfile ? (zoneProfile.businessCount / 10) : 0));
                                        const clampedDemand = Math.max(15, Math.min(98, demand));
                                        return (
                                            <div key={gap}>
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-semibold text-slate-700">Missing: {gap}</span>
                                                    <span className="text-[10px] font-bold text-indigo-600">{clampedDemand} Demand</span>
                                                </div>
                                                <div className="w-full bg-slate-200 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all duration-500 ${clampedDemand > 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" : clampedDemand > 40 ? "bg-gradient-to-r from-amber-400 to-amber-600" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                                                        style={{ width: `${clampedDemand}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ===== Development Velocity ===== */}
                {enabledIds.has("development_report") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-purple-500 pl-3 mb-4">Development Velocity</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {isAllCity ? (
                                <>
                                    <StatCard label="Total Permits" value={metrics.totalPermits.toLocaleString()} color="purple" />
                                    <StatCard label="Capital Inflow" value={`$${(metrics.developmentVelocity / 1000000).toFixed(1)}M`} color="indigo" />
                                    <StatCard label="City Investment" value={`$${(metrics.cityInvestmentVolume / 1000000).toFixed(1)}M`} color="emerald" />
                                </>
                            ) : zoneProfile ? (
                                <>
                                    <StatCard label="Zone Permits" value={zoneProfile.permitsCount.toLocaleString()} color="purple" />
                                    <StatCard label="Zone Capital" value={`$${(zoneProfile.developmentVelocity / 1000000).toFixed(1)}M`} color="indigo" />
                                    <StatCard label="Investment Score" value={`${zoneProfile.investmentScore}/100`} color="emerald" />
                                </>
                            ) : null}
                        </div>
                    </section>
                )}

                {/* ===== Blight Risk Report ===== */}
                {enabledIds.has("blight_report") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-orange-500 pl-3 mb-4">Blight Risk Report</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {isAllCity ? (
                                <>
                                    <StatCard label="Total Violations" value={metrics.totalViolations.toLocaleString()} color="orange" />
                                    <StatCard label="Blight Index" value={`${metrics.blightIndex.toFixed(1)}/10`} color="red" />
                                    <StatCard label="Clearance Rate" value={`${metrics.cityBlightResolutionRate}%`} color="emerald" />
                                </>
                            ) : zoneProfile ? (
                                <>
                                    <StatCard label="Active Violations" value={zoneProfile.violationsCount.toLocaleString()} color="orange" />
                                    <StatCard label="Closed" value={zoneProfile.closedViolationsCount.toLocaleString()} color="emerald" />
                                    <StatCard label="Resolution Rate" value={`${zoneProfile.blightResolutionRate}%`} color="emerald" />
                                </>
                            ) : null}
                        </div>
                    </section>
                )}

                {/* ===== Foot Traffic Intelligence ===== */}
                {enabledIds.has("foot_traffic") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-purple-500 pl-3 mb-4">Foot Traffic Intelligence</h2>
                        {isAllCity ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {brightTraffic.slice(0, 6).map(ft => (
                                    <div key={ft.neighborhood} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-700">{ft.neighborhood}</p>
                                        <p className={`text-lg font-black mt-1 ${ft.level === "High" ? "text-emerald-600" : ft.level === "Moderate" ? "text-amber-600" : "text-red-500"}`}>{ft.level}</p>
                                        <p className="text-[10px] text-slate-400 mt-1">Index: {ft.index}/100 · YoY: {ft.yoyChange > 0 ? "+" : ""}{ft.yoyChange}%</p>
                                    </div>
                                ))}
                            </div>
                        ) : zoneTraffic ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <StatCard label="Traffic Level" value={zoneTraffic.level} color={zoneTraffic.level === "High" ? "emerald" : "amber"} />
                                <StatCard label="Traffic Index" value={`${zoneTraffic.index}/100`} color="indigo" />
                                <StatCard label="Peak Hours" value={zoneTraffic.peakHours} color="purple" />
                                <StatCard label="YoY Change" value={`${zoneTraffic.yoyChange > 0 ? "+" : ""}${zoneTraffic.yoyChange}%`} color={zoneTraffic.yoyChange > 0 ? "emerald" : "red"} />
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No traffic data available for this zone.</p>
                        )}
                    </section>
                )}

                {/* ===== Review Sentiment Analysis ===== */}
                {enabledIds.has("sentiment_analysis") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-amber-500 pl-3 mb-4">Review Sentiment Analysis</h2>
                        {isAllCity ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {brightSentiment.slice(0, 6).map(s => (
                                    <div key={s.neighborhood} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <p className="text-xs font-bold text-slate-700">{s.neighborhood}</p>
                                        <p className={`text-lg font-black mt-1 ${s.positivePercent > 70 ? "text-emerald-600" : "text-amber-600"}`}>{s.positivePercent}% Positive</p>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {s.totalReviews} reviews · Top: {s.topMentions.slice(0, 2).join(", ")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : zoneSentiment ? (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <StatCard label="Positive Sentiment" value={`${zoneSentiment.positivePercent}%`} color={zoneSentiment.positivePercent > 70 ? "emerald" : "amber"} />
                                    <StatCard label="Total Reviews" value={zoneSentiment.totalReviews.toLocaleString()} color="indigo" />
                                    <StatCard label="Avg Rating" value={`${zoneSentiment.avgRating}/5.0`} color="amber" />
                                    <StatCard label="Top Mention" value={zoneSentiment.topMentions[0] || "—"} color="purple" />
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Top Keywords</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {zoneSentiment.topMentions.map(m => (
                                            <span key={m} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100">{m}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No sentiment data available for this zone.</p>
                        )}
                    </section>
                )}

                {/* ===== Financial Forecasts ===== */}
                {enabledIds.has("financial_forecast") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-cyan-500 pl-3 mb-4">6-Month Predictive Outlook</h2>
                        {metrics.gentrificationData && metrics.gentrificationData.length > 0 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                    {metrics.gentrificationData.map(d => (
                                        <div key={d.month} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{d.month}</p>
                                            <p className="text-sm font-black text-indigo-600 mt-1">${(d.permits * 15000 / 1000000).toFixed(1)}M</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">{d.licenses} lic · {d.crime} crime</p>
                                        </div>
                                    ))}
                                </div>
                                {zoneRent && (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                        <StatCard label="Median Rent" value={`$${zoneRent.medianRent.toLocaleString()}`} color="cyan" />
                                        <StatCard label="Rent YoY" value={`${zoneRent.yoyChange > 0 ? "+" : ""}${zoneRent.yoyChange}%`} color={zoneRent.yoyChange > 0 ? "emerald" : "red"} />
                                        <StatCard label="Active Listings" value={zoneRent.activeListings.toLocaleString()} color="indigo" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-400 italic">No forecast data available.</p>
                        )}
                    </section>
                )}



                {/* Footer */}
                <div className="mt-16 pt-6 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                    <p>Confidential — Generated by MontgoPulse AI</p>
                    <p>{enabledModules.length} modules · {metrics.dataSources?.filter(d => d.status === "Live").length || 0} live sources</p>
                </div>
            </motion.div>
        </div>
    );
}

// ---- Reusable Stat Card (A4 Style) ----

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    const colorMap: Record<string, string> = {
        emerald: "text-emerald-600",
        red: "text-red-500",
        orange: "text-orange-500",
        amber: "text-amber-600",
        indigo: "text-indigo-600",
        purple: "text-purple-600",
        cyan: "text-cyan-600",
    };
    return (
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-black mt-1 ${colorMap[color] || "text-slate-900"}`}>{value}</p>
        </div>
    );
}
