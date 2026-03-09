"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText, Download, TrendingUp, ShieldCheck, Map as MapIcon,
    Calendar, FileJson, BrainCircuit, Loader2, Check, ToggleLeft, ToggleRight,
    Building2, AlertTriangle, Footprints, Star, Share2, CopyCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DashboardMetrics } from "@/lib/analytics";

interface ReportModule {
    id: string;
    label: string;
    icon: React.ElementType;
    enabled: boolean;
    color: string;
}

const DEFAULT_MODULES: ReportModule[] = [
    { id: "executive_summary", label: "AI Executive Summary", icon: BrainCircuit, enabled: true, color: "text-brand-purple" },
    { id: "map_overview", label: "Investment Map Overview", icon: MapIcon, enabled: true, color: "text-brand-cyan" },
    { id: "safety_trends", label: "Safety & Crime Trends", icon: ShieldCheck, enabled: true, color: "text-brand-green" },
    { id: "business_analysis", label: "Business License Analysis", icon: Building2, enabled: true, color: "text-brand-green" },
    { id: "vacancy_report", label: "Vacant Property Report", icon: AlertTriangle, enabled: true, color: "text-brand-amber" },
    { id: "foot_traffic", label: "Foot Traffic Intelligence", icon: Footprints, enabled: true, color: "text-brand-purple" },
    { id: "sentiment_analysis", label: "Review Sentiment Analysis", icon: Star, enabled: true, color: "text-brand-amber" },
    { id: "financial_forecast", label: "Financial Forecasts", icon: TrendingUp, enabled: true, color: "text-brand-cyan" },
];

export default function ReportsPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [modules, setModules] = useState<ReportModule[]>(DEFAULT_MODULES);
    const [aiSummary, setAiSummary] = useState<string>("");
    const [generatingAI, setGeneratingAI] = useState(false);
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

    const generateAISummary = useCallback(async () => {
        if (!metrics) return;
        setGeneratingAI(true);
        const enabledTags = enabledModules.map(m => m.label).join(", ");
        try {
            const res = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: `Generate a professional executive investment summary for Montgomery, AL based on the following live data: ${metrics.activeBusinesses} active business licenses, ${metrics.totalCrimeIncidents} crime incidents, ${metrics.totalVacantProperties} vacant properties, vacancy rate ${metrics.vacancyRate}%, revitalization score ${metrics.revitalizationScore}/100, safety trend ${metrics.safetyTrend}. Only focus on these selected report modules: ${enabledTags}. Include top investment zones and actionable recommendations based strictly on the selected modules.`,
                }),
            });
            const data = await res.json();
            setAiSummary(data.message || "Unable to generate summary.");
        } catch {
            setAiSummary("Error connecting to AI Copilot. Summary unavailable.");
        }
        setGeneratingAI(false);
    }, [metrics, enabledModules]);

    // Auto-generate AI summary when metrics load, only initially
    useEffect(() => {
        if (metrics && !aiSummary && !generatingAI) {
            generateAISummary();
        }
    }, [metrics, aiSummary, generatingAI, generateAISummary]);

    const handlePrint = () => window.print();

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadJSON = () => {
        if (!metrics) return;
        const enabledIds = new Set(enabledModules.map(m => m.id));
        const reportData: Record<string, unknown> = {
            title: "MontgoPulse — Dynamic Investment Report",
            generatedAt: new Date().toISOString(),
            includedModules: enabledModules.map(m => m.label),
        };
        if (enabledIds.has("executive_summary")) reportData.executiveSummary = aiSummary;
        if (enabledIds.has("safety_trends")) reportData.safetyMetrics = { trend: metrics.safetyTrend, totalIncidents: metrics.totalCrimeIncidents };
        if (enabledIds.has("business_analysis")) reportData.businessMetrics = { activeBusinesses: metrics.activeBusinesses, survivalRate: metrics.businessSurvivalData?.[0]?.value };
        if (enabledIds.has("vacancy_report")) reportData.vacancyMetrics = { totalVacant: metrics.totalVacantProperties, vacancyRate: metrics.vacancyRate };
        if (enabledIds.has("foot_traffic")) reportData.footTraffic = metrics.brightData?.footTraffic;
        if (enabledIds.has("sentiment_analysis")) reportData.sentiment = metrics.brightData?.sentiment;
        if (enabledIds.has("financial_forecast")) reportData.forecast = { gentrificationData: metrics.gentrificationData, topNeighborhoods: metrics.topNeighborhoods };
        reportData.metadata = { revitalizationScore: metrics.revitalizationScore, dataSources: metrics.dataSources };

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
    const enabledIds = new Set(enabledModules.map(m => m.id));

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6 print:p-0 print:bg-white print:text-black">
            {/* Header - Screen Only */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 print:hidden">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <FileText className="w-6 h-6 text-brand-purple" />
                        Dynamic <span className="gradient-text">Report Builder</span>
                    </h1>
                    <p className="text-sm text-white/40 mt-1">AI-generated investment briefs from live ArcGIS & Bright Data</p>
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

            {/* Module Toggles - Screen Only */}
            <Card className="glass-card print:hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Check className="w-4 h-4 text-brand-green" />
                        Report Modules — Toggle sections to include
                    </CardTitle>
                </CardHeader>
                <CardContent>
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

            {/* A4 Print Layout */}
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
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1" suppressHydrationWarning>
                            <Calendar className="w-3 h-3" />
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                            Modules included: {enabledModules.length}/{modules.length}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="inline-block p-3 rounded-lg bg-slate-50 border border-slate-100 mb-2">
                            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Revitalization Score</span>
                            <span className="block text-3xl font-black text-indigo-600">{metrics.revitalizationScore}<span className="text-lg text-slate-400">/100</span></span>
                        </div>
                    </div>
                </div>

                {/* AI Executive Summary */}
                {enabledIds.has("executive_summary") && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-indigo-500 pl-3 mb-4 flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                                AI Executive Summary
                                <Badge className="text-[10px] bg-indigo-100 text-indigo-600 border-indigo-200">Copilot Generated</Badge>
                            </span>
                            <Button variant="outline" size="sm" onClick={generateAISummary} disabled={generatingAI} className="print:hidden h-7 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50">
                                Regenerate
                            </Button>
                        </h2>
                        {generatingAI ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400 p-4 bg-slate-50 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                AI Copilot is analyzing live datasets and generating summary...
                            </div>
                        ) : (
                            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 rounded-lg p-4 border border-slate-100">
                                {aiSummary.replace(/\*\*/g, "").replace(/[#]/g, "")}
                            </div>
                        )}
                    </section>
                )}

                {/* ArcGIS Metrics */}
                {(enabledIds.has("safety_trends") || enabledIds.has("business_analysis") || enabledIds.has("vacancy_report")) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-emerald-500 pl-3 mb-4">Live ArcGIS Metrics</h2>
                            <ul className="space-y-3">
                                {enabledIds.has("safety_trends") && (
                                    <li className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Safety Trend
                                        </span>
                                        <span className="text-sm font-bold">{metrics.safetyTrend} ({metrics.totalCrimeIncidents.toLocaleString()} incidents)</span>
                                    </li>
                                )}
                                {enabledIds.has("business_analysis") && (
                                    <li className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-emerald-500" /> Active Licenses
                                        </span>
                                        <span className="text-sm font-bold">{metrics.activeBusinesses.toLocaleString()}</span>
                                    </li>
                                )}
                                {enabledIds.has("vacancy_report") && (
                                    <li className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-500" /> Vacancy Rate
                                        </span>
                                        <span className="text-sm font-bold">{metrics.vacancyRate}% ({metrics.totalVacantProperties.toLocaleString()} parcels)</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        <div>
                            <h2 className="text-lg font-bold text-slate-800 border-l-4 border-blue-500 pl-3 mb-4">Bright Data Signals</h2>
                            <ul className="space-y-3">
                                {enabledIds.has("sentiment_analysis") && (
                                    <li className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-600">Avg. Review Sentiment</span>
                                        <span className="text-sm font-bold text-emerald-600">
                                            {Math.round(brightSentiment.reduce((s, v) => s + v.positivePercent, 0) / Math.max(brightSentiment.length, 1))}% Positive
                                        </span>
                                    </li>
                                )}
                                {enabledIds.has("foot_traffic") && (
                                    <li className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-600">Avg. Foot Traffic Index</span>
                                        <span className="text-sm font-bold text-emerald-600">
                                            {Math.round(brightTraffic.reduce((s, f) => s + f.index, 0) / Math.max(brightTraffic.length, 1))} / 100
                                        </span>
                                    </li>
                                )}
                                {enabledIds.has("financial_forecast") && (
                                    <li className="flex justify-between items-center p-3 rounded-lg bg-slate-50">
                                        <span className="text-sm font-semibold text-slate-600">Avg. Median Rent</span>
                                        <span className="text-sm font-bold text-slate-900">
                                            ${Math.round(brightRent.reduce((s, r) => s + r.medianRent, 0) / Math.max(brightRent.length, 1)).toLocaleString()}
                                        </span>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Top Investment Zones */}
                {enabledIds.has("map_overview") && topZones.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-violet-500 pl-3 mb-4">Top Investment Zones</h2>
                        <div className="space-y-2">
                            {topZones.slice(0, 5).map((n, i) => (
                                <div key={n.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-black text-indigo-600">#{i + 1}</span>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">{n.name}</p>
                                            <p className="text-[11px] text-slate-400">{n.businessCount} biz · {n.crimeCount} crime · {n.vacantCount} vacant</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-indigo-600">{n.investmentScore}</span>
                                        <span className="text-xs text-slate-400">/100</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Foot Traffic Details */}
                {enabledIds.has("foot_traffic") && brightTraffic.length > 0 && (
                    <section className="mb-10">
                        <h2 className="text-lg font-bold text-slate-800 border-l-4 border-purple-500 pl-3 mb-4">Foot Traffic Intelligence</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {brightTraffic.slice(0, 6).map(ft => (
                                <div key={ft.neighborhood} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                                    <p className="text-xs font-bold text-slate-700">{ft.neighborhood}</p>
                                    <p className={`text-lg font-black mt-1 ${ft.level === "High" ? "text-emerald-600" : ft.level === "Moderate" ? "text-amber-600" : "text-red-500"}`}>{ft.level}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">Peak: {ft.peakHours} · YoY: {ft.yoyChange > 0 ? "+" : ""}{ft.yoyChange}%</p>
                                </div>
                            ))}
                        </div>
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
