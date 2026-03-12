"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calculator, Settings2, Target, Building2, ShieldCheck, Footprints,
    ArrowRight, MapPin, Loader2, Sparkles, AlertTriangle,
    TrendingUp, TrendingDown, Minus
} from "lucide-react";
import type { DashboardMetrics, NeighborhoodProfile, SimulationState, SimulationResult } from "@/lib/analytics";
import { calculateSimulationScore } from "@/lib/analytics";
import { useAppState } from "@/lib/context";
import { Smile, Target as TargetIcon, Magnet, MessageSquare } from "lucide-react";

function ArrowIndicator({ value, avg, inverted = false }: { value: number; avg: number; inverted?: boolean }) {
    const diff = inverted ? avg - value : value - avg;
    const pct = avg > 0 ? Math.abs(Math.round((diff / avg) * 100)) : 0;
    if (Math.abs(diff) < 0.5) return <span className="inline-flex items-center gap-0.5 text-white/30 text-[9px]"><Minus className="w-2.5 h-2.5" /> avg</span>;
    if (diff > 0) return <span className="inline-flex items-center gap-0.5 text-emerald-400 text-[9px] font-bold"><TrendingUp className="w-2.5 h-2.5" /> +{pct}%</span>;
    return <span className="inline-flex items-center gap-0.5 text-red-400 text-[9px] font-bold"><TrendingDown className="w-2.5 h-2.5" /> -{pct}%</span>;
}

export default function SimulatorPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [simState, setSimState] = useState<SimulationState>({
        profile: "",
        riskTolerence: "",
        budget: "",
        safetyImportance: 5,
        footTrafficLevel: "",
    });
    const { dispatchSimulationToAI } = useAppState();
    const [isSimulating, setIsSimulating] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState(0);
    const [results, setResults] = useState<SimulationResult[]>([]);

    useEffect(() => {
        fetch("/api/analytics/dashboard")
            .then(res => res.json())
            .then(data => setMetrics(data))
            .catch(console.error);
    }, []);

    const isFormValid = simState.profile && simState.riskTolerence && simState.budget && simState.footTrafficLevel;

    // City averages for comparison arrows
    const cityAvg = useMemo(() => {
        if (!metrics?.topNeighborhoods) return { traffic: 50, crime: 0, business: 0, blight: 0 };
        const ns = metrics.topNeighborhoods;
        const trafficData = metrics.brightData?.footTraffic || [];
        const avgTraffic = trafficData.reduce((s, t) => s + t.index, 0) / Math.max(trafficData.length, 1);
        return {
            traffic: Math.round(avgTraffic),
            crime: Math.round(ns.reduce((s, n) => s + n.crimeCount, 0) / ns.length),
            business: Math.round(ns.reduce((s, n) => s + n.businessCount, 0) / ns.length),
            blight: Math.round(ns.reduce((s, n) => s + n.violationsCount, 0) / ns.length),
        };
    }, [metrics]);

    const handleSimulate = async () => {
        if (!metrics || !isFormValid) return;
        setIsSimulating(true);
        setResults([]);
        setLoadingPhase(1);

        // Phase 1: "ArcGIS"
        await new Promise(r => setTimeout(r, 1000));
        setLoadingPhase(2);

        // Phase 2: "Bright Data"
        await new Promise(r => setTimeout(r, 1000));

        const calculated = calculateSimulationScore(metrics, simState);
        setResults(calculated);
        setIsSimulating(false);
        setLoadingPhase(0);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Calculator className="w-8 h-8 text-brand-cyan" />
                    Investment <span className="gradient-text">Simulator</span>
                </h1>
                <p className="text-white/40 mt-2 max-w-2xl">
                    Configure your business profile to dynamically calculate the optimal
                    Montgomery neighborhoods for your next commercial venture. Our engine cross-correlates
                    live ArcGIS data with Bright Data market signals.
                </p>
            </motion.div>

            <div className="neon-line" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Simulator Form */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5 space-y-4">
                    <Card className="glass-card sticky top-6">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Settings2 className="w-5 h-5 text-brand-cyan" />
                                Simulation Parameters
                            </CardTitle>
                            <CardDescription>Adjust variables to find your ideal location</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* Profile Selection */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-brand-purple" /> Business Type
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["F&B / Retail", "Office / B2B", "Service / Health", "Tech / Innovation"].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setSimState(s => ({ ...s, profile: p }))}
                                            className={`p-3 rounded-lg text-sm font-medium transition-all text-left border ${simState.profile === p
                                                ? "bg-brand-purple/20 border-brand-purple/50 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                                                : "bg-glass-100 border-glass-border text-white/50 hover:bg-glass-200"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Risk Tolerance */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-brand-green" /> Risk Tolerance
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Low", "Medium", "High"].map(r => (
                                        <button
                                            key={r}
                                            onClick={() => setSimState(s => ({ ...s, riskTolerence: r }))}
                                            className={`p-3 rounded-lg text-sm font-medium transition-all text-center border ${simState.riskTolerence === r
                                                ? "bg-brand-green/20 border-brand-green/50 text-white shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                                                : "bg-glass-100 border-glass-border text-white/50 hover:bg-glass-200"
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Budget */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                    <Target className="w-4 h-4 text-brand-amber" /> Capital / Budget
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {["Under $50k", "$50k - $250k", "$250k - $1M", "$1M+"].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setSimState(s => ({ ...s, budget: d }))}
                                            className={`p-3 rounded-lg text-sm font-medium transition-all text-left border ${simState.budget === d
                                                ? "bg-brand-amber/20 border-brand-amber/50 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                                : "bg-glass-100 border-glass-border text-white/50 hover:bg-glass-200"
                                                }`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Safety Slider */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center justify-between">
                                    <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-brand-green" /> Importance of Safety</span>
                                    <span className="text-brand-green">{simState.safetyImportance}/10</span>
                                </label>
                                <input
                                    type="range"
                                    min="1" max="10"
                                    value={simState.safetyImportance}
                                    onChange={(e) => setSimState(s => ({ ...s, safetyImportance: Number(e.target.value) }))}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-glass-100 accent-brand-green"
                                    style={{ background: `linear-gradient(to right, #22c55e ${(simState.safetyImportance - 1) * 11.1}%, rgba(255,255,255,0.1) ${(simState.safetyImportance - 1) * 11.1}%)` }}
                                    aria-label="Importance of safety slider"
                                />
                            </div>

                            {/* Foot Traffic */}
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                    <Footprints className="w-4 h-4 text-brand-orange" /> Desired Foot Traffic
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {["Low", "Medium", "High"].map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setSimState(s => ({ ...s, footTrafficLevel: t }))}
                                            className={`p-2 rounded-lg text-xs font-medium transition-all text-center border ${simState.footTrafficLevel === t
                                                ? "bg-brand-orange/20 border-brand-orange/50 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                                                : "bg-glass-100 border-glass-border text-white/50 hover:bg-glass-200"
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                className="w-full mt-4 bg-brand-cyan hover:bg-brand-cyan/80 text-black font-bold text-sm h-12"
                                disabled={!isFormValid || isSimulating || !metrics}
                                onClick={handleSimulate}
                            >
                                {isSimulating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        {loadingPhase === 1 ? "Processing ArcGIS Spatial Data..." : "Cross-Referencing Bright Data Signals..."}
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-5 h-5 mr-2" />
                                        Generate Strategic Recommendations
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Results Panel */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7">
                    <Card className="glass-card h-full bg-black/20">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-brand-purple" />
                                Top 3 Recommended Zones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[calc(100%-5rem)]">
                            {!metrics ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-cyan" />
                                    <p className="uppercase tracking-widest text-xs">Connecting to Data Hive...</p>
                                </div>
                            ) : isSimulating ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4 min-h-[300px]">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-brand-purple animate-pulse" />
                                        </div>
                                    </div>
                                    <p className="uppercase tracking-widest text-xs text-brand-purple font-bold">
                                        {loadingPhase === 1 ? "Processing ArcGIS & Spatial Data..." : "Cross-Referencing Bright Data Signals..."}
                                    </p>
                                    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: loadingPhase === 1 ? "45%" : "90%" }}
                                            transition={{ duration: 0.8 }}
                                            className="h-full bg-brand-purple rounded-full"
                                        />
                                    </div>
                                </div>
                            ) : results.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-white/30 space-y-4 min-h-[300px]">
                                    <Calculator className="w-12 h-12 opacity-20" />
                                    <p className="uppercase tracking-widest text-xs max-w-xs text-center">Configure parameters and run simulator to view personalized neighborhood matches.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 relative">
                                    <AnimatePresence>
                                        {results.map((res, idx) => (
                                            <motion.div
                                                key={res.name}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.15 }}
                                                className="relative group overflow-hidden rounded-xl border border-glass-border bg-glass-100 p-4 hover:bg-glass-200 transition-colors"
                                            >
                                                {/* Medal */}
                                                <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full flex items-start justify-end p-3 ${idx === 0 ? "bg-brand-amber/20" : idx === 1 ? "bg-slate-300/20" : "bg-amber-700/20"
                                                    }`}>
                                                    <span className={`font-black text-lg ${idx === 0 ? "text-brand-amber" : idx === 1 ? "text-slate-300" : "text-amber-700"
                                                        }`}>#{idx + 1}</span>
                                                </div>

                                                <div className="flex gap-4">
                                                    {/* Score — Decimal */}
                                                    <div className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-full border-[3px] border-brand-cyan bg-brand-cyan/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                                                        <span className="text-2xl font-black text-white">{res.matchScore}</span>
                                                        <span className="text-[9px] text-brand-cyan uppercase tracking-widest font-bold">/10</span>
                                                    </div>

                                                    <div className="flex-1 w-full pt-1 pr-12">
                                                        <h3 className="text-xl font-bold text-white mb-1">{res.name}</h3>
                                                        <p className="text-xs text-brand-green flex items-center gap-1.5 mb-3">
                                                            <Sparkles className="w-3.5 h-3.5" />
                                                            {res.keyFactor}
                                                        </p>                                                        {/* Dynamic Stats Row 1 */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                                                            <div className="bg-black/30 p-2 rounded border border-white/5">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><Footprints className="inline w-3 h-3 mr-1" />Traffic</span>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-mono font-bold">{res.traffic}/100</span>
                                                                    <ArrowIndicator value={res.traffic} avg={cityAvg.traffic} />
                                                                </div>
                                                            </div>
                                                            <div className="bg-black/30 p-2 rounded border border-white/5">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><ShieldCheck className="inline w-3 h-3 mr-1 text-red-400" />Crime</span>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-mono font-bold">{res.crimeCount}</span>
                                                                    <ArrowIndicator value={res.crimeCount} avg={cityAvg.crime} inverted />
                                                                </div>
                                                            </div>
                                                            <div className="bg-black/30 p-2 rounded border border-white/5">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><Building2 className="inline w-3 h-3 mr-1" />Business</span>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-mono font-bold">{res.businessCount}</span>
                                                                    <ArrowIndicator value={res.businessCount} avg={cityAvg.business} />
                                                                </div>
                                                            </div>
                                                            <div className="bg-black/30 p-2 rounded border border-white/5">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><AlertTriangle className="inline w-3 h-3 mr-1 text-orange-400" />Blight</span>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-mono font-bold">{res.violationsCount}</span>
                                                                    <ArrowIndicator value={res.violationsCount} avg={cityAvg.blight} inverted />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* New Data Tiles Row 2 */}
                                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                                            <div className="bg-brand-cyan/5 p-2 rounded border border-brand-cyan/20 flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] text-brand-cyan uppercase font-bold flex items-center gap-1">
                                                                        <Smile className="w-2.5 h-2.5" /> Sentiment
                                                                    </span>
                                                                    <span className="text-sm font-bold text-white">{res.sentiment}%</span>
                                                                </div>
                                                                <Badge variant="ghost" className={`text-[9px] ${res.sentiment > 70 ? "text-emerald-400 border-emerald-400/30" : "text-amber-400 border-amber-400/30"}`}>
                                                                    {res.sentiment > 70 ? "Positive" : "Stable"}
                                                                </Badge>
                                                            </div>
                                                            <div className="bg-brand-purple/5 p-2 rounded border border-brand-purple/20 flex items-center justify-between">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[9px] text-brand-purple uppercase font-bold flex items-center gap-1">
                                                                        <TargetIcon className="w-2.5 h-2.5" /> Market Gap
                                                                    </span>
                                                                    <span className={`text-sm font-bold ${res.gapStatus === "High Opportunity" ? "text-emerald-400" : res.gapStatus === "Saturated" ? "text-red-400" : "text-white"}`}>
                                                                        {res.gapStatus}
                                                                    </span>
                                                                </div>
                                                                {res.gapStatus === "High Opportunity" ? <Magnet className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-white/20" />}
                                                            </div>
                                                        </div>

                                                        {/* Hand-off Button */}
                                                        <Button 
                                                            variant="default" 
                                                            className="w-full h-10 bg-brand-cyan/10 border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/20 font-bold group"
                                                            onClick={() => dispatchSimulationToAI({
                                                                profile: simState.profile,
                                                                zoneName: res.name,
                                                                score: res.matchScore,
                                                                gapStatus: res.gapStatus,
                                                                sentiment: res.sentiment
                                                            })}
                                                        >
                                                            Consult AI Strategist
                                                            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
