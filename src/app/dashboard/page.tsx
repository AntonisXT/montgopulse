"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    BrainCircuit, TrendingUp, Target, Shield, DollarSign, Building2,
    AlertTriangle, Zap, BarChart3, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
    ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import type { DashboardMetrics } from "@/lib/analytics";

export default function AnalyticsPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

    useEffect(() => {
        fetch("/api/analytics/dashboard")
            .then(res => res.json())
            .then(data => setMetrics(data))
            .catch(console.error);
    }, []);

    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center mt-20 gap-4">
                <div className="w-10 h-10 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
                <p className="text-xs text-white/30 uppercase tracking-widest">Loading Strategic Data...</p>
            </div>
        );
    }

    const topZones = metrics.topNeighborhoods || [];
    const brightTraffic = metrics.brightData?.footTraffic || [];
    const brightSentiment = metrics.brightData?.sentiment || [];
    const brightRent = metrics.brightData?.rentEstimates || [];

    // 3-Year ROI Forecast data derived from real metrics
    const roiForecast = topZones.slice(0, 6).map((n) => {
        const traffic = brightTraffic.find(f => f.neighborhood === n.name);
        const rent = brightRent.find(r => r.neighborhood === n.name);
        const y1 = Math.round(n.investmentScore * 0.8 + (traffic?.index || 50) * 0.2);
        const y2 = Math.round(y1 * 1.12 + (rent?.yoyChange || 0));
        const y3 = Math.round(y2 * 1.08 + (rent?.yoyChange || 0) * 0.5);
        return { name: n.name.slice(0, 10), Year1: y1, Year2: y2, Year3: y3 };
    });

    // Gentrification Probability Matrix
    const gentrificationMatrix = topZones.slice(0, 6).map((n) => {
        const traffic = brightTraffic.find(f => f.neighborhood === n.name);
        const sentiment = brightSentiment.find(s => s.neighborhood === n.name);
        const rent = brightRent.find(r => r.neighborhood === n.name);
        const safetyScore = n.crimeCount > 0 ? Math.max(0, 100 - (n.crimeCount / Math.max(...topZones.map(t => t.crimeCount), 1)) * 100) : 80;
        return {
            subject: n.name.slice(0, 10),
            "Business Activity": Math.min(100, Math.round((n.businessCount / Math.max(...topZones.map(t => t.businessCount), 1)) * 100)),
            "Safety Score": Math.round(safetyScore),
            "Foot Traffic": traffic?.index || 50,
            "Sentiment": sentiment?.positivePercent || 60,
            "Rent Growth": Math.min(100, Math.round((rent?.yoyChange || 0) * 8 + 50)),
        };
    });

    // Risk vs Reward scatter
    const riskReward = topZones.map((n) => {
        const traffic = brightTraffic.find(f => f.neighborhood === n.name);
        const risk = n.crimeCount + n.vacantCount * 0.5;
        const reward = n.businessCount * 2 + (traffic?.index || 0);
        return {
            name: n.name,
            risk: Math.round(risk),
            reward: Math.round(reward),
            investmentScore: n.investmentScore,
        };
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <BrainCircuit className="w-8 h-8 text-brand-purple" />
                    Strategic <span className="gradient-text">Forecasting Hub</span>
                </h1>
                <p className="text-white/40 mt-2 max-w-3xl">
                    Actionable investment intelligence for municipal planners and private investors.
                    Real-time cross-correlation of ArcGIS open data with Bright Data market signals
                    to identify high-ROI opportunities and predict neighborhood trajectories.
                </p>
            </motion.div>

            <div className="neon-line" />

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Investment Zones", value: topZones.length.toString(), icon: Target, color: "text-brand-cyan", sub: "Analyzed neighborhoods" },
                    { label: "Survival Rate", value: `${metrics.businessSurvivalData?.[0]?.value || 0}%`, icon: TrendingUp, color: "text-brand-green", sub: "New business 3-yr projection" },
                    { label: "Avg. Sentiment", value: `${Math.round(brightSentiment.reduce((s, v) => s + v.positivePercent, 0) / Math.max(brightSentiment.length, 1))}%`, icon: Zap, color: "text-brand-amber", sub: "Positive Google/Yelp reviews" },
                    { label: "Vacancy Rate", value: `${metrics.vacancyRate}%`, icon: AlertTriangle, color: "text-red-400", sub: `${metrics.totalVacantProperties.toLocaleString()} parcels` },
                ].map((stat) => (
                    <Card key={stat.label} className="glass-card">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                                <span className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{stat.value}</div>
                            <p className="text-[10px] text-white/30 mt-1">{stat.sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 3-Year ROI Forecaster */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                    <Card className="glass-card h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-brand-green" />
                                3-Year Neighborhood ROI Forecaster
                            </CardTitle>
                            <CardDescription>Projected investment attractiveness scores based on crime trends, foot traffic, and rent growth</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={roiForecast} margin={{ top: 10, right: 20, bottom: 10, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(10,10,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }} />
                                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                                        <Bar dataKey="Year1" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Year2" fill="#00f0ff" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Year3" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Risk vs Reward Analyzer */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                    <Card className="glass-card h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Target className="w-5 h-5 text-brand-amber" />
                                Risk vs. Reward Analyzer
                            </CardTitle>
                            <CardDescription>Crime/vacancy risk plotted against business activity & foot traffic reward</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" dataKey="risk" name="Risk Index" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} label={{ value: "Risk →", position: "bottom", fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                                        <YAxis type="number" dataKey="reward" name="Reward Index" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} label={{ value: "Reward →", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                                        <Tooltip
                                            cursor={{ strokeDasharray: '3 3' }}
                                            contentStyle={{ backgroundColor: 'rgba(10,10,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                                            formatter={(value: number, name: string) => [value, name]}
                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                                        />
                                        <Scatter name="Zones" data={riskReward} fill="#00f0ff" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {riskReward.sort((a, b) => (b.reward - b.risk) - (a.reward - a.risk)).slice(0, 3).map(z => (
                                    <Badge key={z.name} className="bg-brand-green/15 text-brand-green text-[10px] border-brand-green/30">
                                        <ArrowUpRight className="w-3 h-3 mr-1" />
                                        {z.name}: Score {z.investmentScore}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Gentrification Probability Matrix */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="lg:col-span-2">
                    <Card className="glass-card">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-brand-purple" />
                                Gentrification Probability Matrix
                            </CardTitle>
                            <CardDescription>Multi-factor analysis: business activity, safety, foot traffic, sentiment, and rent growth per neighborhood</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={gentrificationMatrix}>
                                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                        <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                                        <PolarRadiusAxis stroke="rgba(255,255,255,0.15)" fontSize={10} />
                                        <Radar name="Business Activity" dataKey="Business Activity" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} />
                                        <Radar name="Safety Score" dataKey="Safety Score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                                        <Radar name="Foot Traffic" dataKey="Foot Traffic" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} />
                                        <Radar name="Sentiment" dataKey="Sentiment" stroke="#00f0ff" fill="#00f0ff" fillOpacity={0.1} />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(10,10,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Model Weights */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="w-5 h-5 text-brand-cyan" />
                        Investment Prediction Model Weights
                    </CardTitle>
                    <CardDescription>Feature importance in the neighborhood scoring algorithm</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { label: "Bright Data: Local Sentiment + Foot Traffic", weight: 35, color: "bg-brand-cyan" },
                        { label: "ArcGIS: Business License Density", weight: 28, color: "bg-brand-green" },
                        { label: "ArcGIS: Vacant/Suspected Parcel Ratio", weight: 22, color: "bg-brand-amber" },
                        { label: "ArcGIS: 911 Crime Geocode Proximity", weight: 15, color: "bg-brand-purple" },
                    ].map(({ label, weight, color }) => (
                        <div key={label} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-white/80 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${color}`} />
                                    {label}
                                </span>
                                <span className="font-mono text-white/60">{weight}%</span>
                            </div>
                            <div className="h-2 w-full bg-glass-100 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${weight}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className={`h-full ${color} rounded-full`}
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center pt-4">
                <p className="text-xs text-white/30 uppercase tracking-widest font-mono">Powered by Google Gemini + ArcGIS Open Data + Bright Data</p>
            </motion.div>
        </div>
    );
}
