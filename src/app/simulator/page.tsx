"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Calculator, Settings2, Target, Building2, ShieldCheck, Footprints,
    ArrowRight, MapPin, Loader2, Sparkles, AlertTriangle
} from "lucide-react";
import type { DashboardMetrics } from "@/lib/analytics";

interface SimulationState {
    profile: string;
    riskTolerence: string;
    budget: string;
}

export default function SimulatorPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [simState, setSimState] = useState<SimulationState>({
        profile: "",
        riskTolerence: "",
        budget: "",
    });
    const [isSimulating, setIsSimulating] = useState(false);
    const [results, setResults] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/analytics/dashboard")
            .then(res => res.json())
            .then(data => setMetrics(data))
            .catch(console.error);
    }, []);

    const handleSimulate = () => {
        if (!metrics || !simState.profile || !simState.riskTolerence || !simState.budget) return;
        setIsSimulating(true);

        // Simulate processing delay for dramatic effect
        setTimeout(() => {
            const calculated = calculateRecommendations(metrics, simState);
            setResults(calculated);
            setIsSimulating(false);
        }, 1800);
    };

    const calculateRecommendations = (data: DashboardMetrics, config: SimulationState) => {
        const neighborhoods = data.topNeighborhoods || [];
        const trafficData = data.brightData?.footTraffic || [];
        const sentimentData = data.brightData?.sentiment || [];

        const scored = neighborhoods.map(n => {
            const traffic = trafficData.find(t => t.neighborhood === n.name);
            const sentiment = sentimentData.find(s => s.neighborhood === n.name);

            let score = n.investmentScore;
            const isHighRisk = config.riskTolerence === "High";
            const isLowRisk = config.riskTolerence === "Low";

            // Risk Adjustments
            if (isLowRisk) {
                // Penalize high crime, reward high safety
                score -= (n.crimeCount * 0.5);
                score += (n.investmentScore * 0.2);
            } else if (isHighRisk) {
                // Reward potentially up-and-coming areas with high vacancy but good traffic
                score += (n.vacantCount * 0.3);
            }

            // Profile Adjustments
            if (config.profile === "F&B / Retail") {
                score += (traffic?.index || 0) * 0.4; // Heavy weight on foot traffic
            } else if (config.profile === "Office / B2B") {
                score += (n.businessCount * 0.5); // Heavy weight on existing business density
            } else if (config.profile === "Tech / Innovation") {
                score += (sentiment?.positivePercent || 0) * 0.3; // Weight on positive sentiment
            }

            // Budget Adjustments
            if (config.budget === "$1M+") {
                score += (n.businessCount * 0.2); // Can afford established, dense areas
            } else if (config.budget === "Under $50k") {
                score += (n.vacantCount * 0.4); // Needs cheaper, high vacancy opportunity zones
            }

            return {
                ...n,
                matchScore: Math.min(Math.max(Math.round(score), 10), 99),
                keyFactor: config.profile === "F&B / Retail" ? "High Foot traffic & visibility" :
                    config.budget === "Under $50k" ? "Affordable entry & growth potential" :
                        isLowRisk ? "Established safety & low crime" :
                            "High growth potential & available parcels",
                traffic: traffic?.index || "N/A",
                sentiment: sentiment?.positivePercent || "N/A"
            };
        });

        // Sort by our custom match score and take top 3
        return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 3);
    };

    const isFormValid = simState.profile && simState.riskTolerence && simState.budget;

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
                {/* Simulator Form Elements */}
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

                            <Button
                                className="w-full mt-4 bg-brand-cyan hover:bg-brand-cyan/80 text-black font-bold text-sm h-12"
                                disabled={!isFormValid || isSimulating || !metrics}
                                onClick={handleSimulate}
                            >
                                {isSimulating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        Computing Quantum Matrix...
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
                                                {/* Medal indicator */}
                                                <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-full flex items-start justify-end p-3 ${idx === 0 ? "bg-brand-amber/20" : idx === 1 ? "bg-slate-300/20" : "bg-amber-700/20"
                                                    }`}>
                                                    <span className={`font-black text-lg ${idx === 0 ? "text-brand-amber" : idx === 1 ? "text-slate-300" : "text-amber-700"
                                                        }`}>#{idx + 1}</span>
                                                </div>

                                                <div className="flex gap-4">
                                                    {/* Score Circular Indicator */}
                                                    <div className="shrink-0 flex flex-col items-center justify-center w-20 h-20 rounded-full border-[3px] border-brand-cyan bg-brand-cyan/10 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                                                        <span className="text-2xl font-black text-white">{res.matchScore}</span>
                                                        <span className="text-[9px] text-brand-cyan uppercase tracking-widest font-bold">Match</span>
                                                    </div>

                                                    <div className="flex-1 w-full pt-1 pr-12">
                                                        <h3 className="text-xl font-bold text-white mb-1">{res.name}</h3>
                                                        <p className="text-xs text-brand-green flex items-center gap-1.5 mb-3">
                                                            <Sparkles className="w-3.5 h-3.5" />
                                                            {res.keyFactor}
                                                        </p>

                                                        {/* Detailed Metrics Grid */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                            <div className="bg-black/30 p-2 rounded block">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><Footprints className="inline w-3 h-3 mr-1" />Traffic</span>
                                                                <span className="text-sm font-mono font-bold">{res.traffic}/100</span>
                                                            </div>
                                                            <div className="bg-black/30 p-2 rounded block">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><ShieldCheck className="inline w-3 h-3 mr-1 text-red-400" />Crime</span>
                                                                <span className="text-sm font-mono font-bold">{res.crimeCount} Incidents</span>
                                                            </div>
                                                            <div className="bg-black/30 p-2 rounded block">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><Building2 className="inline w-3 h-3 mr-1" />Business</span>
                                                                <span className="text-sm font-mono font-bold">{res.businessCount}</span>
                                                            </div>
                                                            <div className="bg-black/30 p-2 rounded block">
                                                                <span className="text-[10px] text-white/40 block mb-0.5"><AlertTriangle className="inline w-3 h-3 mr-1 text-yellow-400" />Vacant</span>
                                                                <span className="text-sm font-mono font-bold">{res.vacantCount}</span>
                                                            </div>
                                                        </div>
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
