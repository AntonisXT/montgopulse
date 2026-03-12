"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BarChart3, Target, ArrowUpRight, DollarSign, Calculator, List, TrendingUp } from "lucide-react";
import {
    ResponsiveContainer, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, Legend, BarChart, Bar,
    LineChart, Line,
} from 'recharts';
import { usePortfolio } from "@/context/PortfolioContext";
import type { DashboardMetrics } from "@/lib/analytics";

const formatCurrency = (val: number) => {
    if (val === 0) return "$0";
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val}`;
};

export default function PredictionsPage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [investAmount, setInvestAmount] = useState<number>(500000);
    const [investZone, setInvestZone] = useState<string>("");
    const { addZone, removeZone, isZoneTracked } = usePortfolio();

    useEffect(() => {
        fetch("/api/analytics/dashboard")
            .then(res => res.json())
            .then(data => {
                setMetrics(data);
                if (data.topNeighborhoods && data.topNeighborhoods.length > 0) {
                    setInvestZone(data.topNeighborhoods[0].name);
                }
            })
            .catch(console.error);
    }, []);

    const aiInsight = useMemo(() => {
        if (!metrics) return "Predictive models standby.";
        const velocity = metrics.developmentVelocity / 1000000;

        return `Montgomery is entering a phase of aggressive institutional inflow, with city-wide capital velocity reaching $${velocity.toFixed(1)}M across ${metrics.totalPermits.toLocaleString()} active development pipelines. With ${metrics.totalViolations.toLocaleString()} active municipal code cases, the market indicates high gentrification pressure—specifically in zones where capital deployment outpaces historical blight resolution by more than 25%.`;
    }, [metrics]);

    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center mt-20 gap-4">
                <div className="w-10 h-10 border-2 border-brand-purple/30 border-t-brand-purple rounded-full animate-spin" />
                <p className="text-xs text-white/30 uppercase tracking-widest">Loading Predictive Models...</p>
            </div>
        );
    }

    const topZones = metrics.topNeighborhoods || [];
    const brightTraffic = metrics.brightData?.footTraffic || [];
    const brightSentiment = metrics.brightData?.sentiment || [];
    const brightRent = metrics.brightData?.rentEstimates || [];

    // 3-Year ROI Forecast data
    const roiForecast = topZones.slice(0, 6).map((n) => {
        const traffic = brightTraffic.find(f => f.neighborhood === n.name);
        const rent = brightRent.find(r => r.neighborhood === n.name);
        const y1 = Math.round(n.investmentScore * 0.8 + (traffic?.index || 50) * 0.2);
        const y2 = Math.round(y1 * 1.12 + (rent?.yoyChange || 0));
        const y3 = Math.round(y2 * 1.08 + (rent?.yoyChange || 0) * 0.5);
        return { name: n.name.slice(0, 10), Year1: y1, Year2: y2, Year3: y3 };
    });

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

    const riskReward = topZones.map((n) => {
        const traffic = brightTraffic.find(f => f.neighborhood === n.name);
        const risk = n.crimeCount + n.violationsCount * 1.5;
        const reward = n.businessCount * 2 + (traffic?.index || 0) + (n.developmentVelocity / 1000000);
        return {
            name: n.name,
            risk: Math.round(risk),
            reward: Math.round(reward),
            investmentScore: n.investmentScore,
        };
    });

    // 36-Month Asset Appreciation Curve (Top 3 Zones)
    const top3 = topZones.slice(0, 3);
    const appreciationCurve: any[] = [
        { year: "Year 0" },
        { year: "Year 1" },
        { year: "Year 2" },
        { year: "Year 3" }
    ];
    top3.forEach((n) => {
        const traffic = brightTraffic.find(f => f.neighborhood === n.name);
        const rent = brightRent.find(r => r.neighborhood === n.name);
        const baseValue = 500000;
        const g = (n.investmentScore * 0.4 + (traffic?.index || 50) + (rent?.yoyChange || 0) * 5) / 1000; // Approx 5-15% growth

        appreciationCurve[0][n.name] = baseValue;
        appreciationCurve[1][n.name] = Math.round(baseValue * (1 + g));
        appreciationCurve[2][n.name] = Math.round(baseValue * (1 + g) * (1 + g * 1.1));
        appreciationCurve[3][n.name] = Math.round(baseValue * (1 + g) * (1 + g * 1.1) * (1 + g * 1.2));
    });
    const lineColors = ["#00f0ff", "#a855f7", "#22c55e"];

    // ROI Estimator computations
    const targetZoneData = topZones.find(z => z.name === investZone);
    let estAppreciation = 0;
    let riskGrade = "Medium";
    if (targetZoneData) {
        const r1 = roiForecast.find(r => r.name === targetZoneData.name.slice(0, 10));
        const growthFactor = ((r1?.Year3 || 50) - (r1?.Year1 || 50)) / 100;
        estAppreciation = investAmount * (1 + growthFactor * 1.5) - investAmount;

        const rr = riskReward.find(r => r.name === targetZoneData.name);
        if (rr) {
            if (rr.risk < 20) riskGrade = "Low";
            else if (rr.risk > 60) riskGrade = "High";
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Sparkles className="w-8 h-8 text-brand-purple" />
                    Predictive <span className="gradient-text">Insights</span>
                </h1>
                <p className="text-white/40 mt-2 max-w-3xl">
                    Capital trajectory forecasts and multi-factor investment matrix projections.
                </p>
            </motion.div>

            <div className="neon-line" />

            {/* Strategic Insight Card */}
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <Card className="glass-card border-brand-purple/30 bg-brand-purple/5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-purple/10 to-transparent pointer-events-none" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-brand-purple">
                            <Sparkles className="w-4 h-4" />
                            Strategic Insight: Market Trajectory
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white/90 leading-relaxed font-medium">
                            {aiInsight}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Interactive ROI Estimator */}
                <Card className="glass-card">
                    <CardHeader className="pb-4 border-b border-glass-border">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-brand-green">
                            <Calculator className="w-4 h-4" />
                            Interactive ROI Estimator
                        </CardTitle>
                        <CardDescription>Calculate projected 3-year appreciation based on algorithmic zone scores.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs uppercase tracking-wider text-white/50 font-bold">Initial Investment ($)</label>
                            <input
                                type="number"
                                value={investAmount}
                                onChange={(e) => setInvestAmount(Number(e.target.value))}
                                className="bg-glass-100 border border-glass-border rounded-lg px-4 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/50"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-xs uppercase tracking-wider text-white/50 font-bold">Target Zone</label>
                            <select
                                value={investZone}
                                onChange={(e) => setInvestZone(e.target.value)}
                                className="appearance-none bg-glass-100 border border-glass-border rounded-lg px-4 py-2 text-white font-bold focus:outline-none focus:ring-2 focus:ring-brand-green/50 cursor-pointer"
                            >
                                {topZones.map(z => <option key={z.name} value={z.name} className="bg-surface">{z.name}</option>)}
                            </select>
                        </div>

                        <div className="bg-glass-100 rounded-lg p-4 border border-glass-border mt-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs text-brand-green uppercase font-bold tracking-wider mb-1">Est. 3-Year Appr.</p>
                                <p className="text-2xl font-bold">{formatCurrency(estAppreciation)}</p>
                                <p className="text-[10px] text-white/40 mt-1">ROI: {Math.round((estAppreciation / investAmount) * 100)}%</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-1">Risk Factor</p>
                                <Badge variant="ghost" className={`font-mono ${riskGrade === 'Low' ? 'text-brand-green border-brand-green/30 px-2' : riskGrade === 'High' ? 'text-brand-red border-brand-red/30 px-2' : 'text-brand-amber border-brand-amber/30 px-2'}`}>
                                    {riskGrade}
                                </Badge>
                            </div>
                        </div>
                        <button
                            onClick={() => isZoneTracked(investZone) ? removeZone(investZone) : addZone(investZone)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-glass-100 border border-glass-border hover:border-brand-purple/50 hover:bg-brand-purple/5 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-purple transition-all shadow-glow-purple">
                            <span>{isZoneTracked(investZone) ? "★" : "⭐"}</span> {isZoneTracked(investZone) ? "Remove from Portfolio" : "Save to Portfolio"}
                        </button>
                    </CardContent>
                </Card>

                {/* Trajectory Rankings Table */}
                <Card className="glass-card">
                    <CardHeader className="pb-4 border-b border-glass-border">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-brand-cyan">
                            <List className="w-4 h-4" />
                            Trajectory Rankings Table
                        </CardTitle>
                        <CardDescription>Top 5 Zones sorted by absolute algorithmic trajectory.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 px-0">
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-glass-100 text-xs uppercase text-white/60">
                                    <tr>
                                        <th className="px-5 py-3 font-semibold">Zone</th>
                                        <th className="px-5 py-3 font-semibold">Gentrification Vel.</th>
                                        <th className="px-5 py-3 font-semibold">Blight Risk</th>
                                        <th className="px-5 py-3 font-semibold text-right">Rating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topZones.slice(0, 5).map((z, i) => {
                                        const r = riskReward.find(rr => rr.name === z.name);
                                        return (
                                            <tr key={z.name} className="border-b border-glass-border/50 hover:bg-glass-100/50 transition-colors">
                                                <td className="px-5 py-3 font-bold">{z.name}</td>
                                                <td className="px-5 py-3 font-mono text-brand-cyan">{r ? formatCurrency(r.reward * 1000) : '$0'}</td>
                                                <td className="px-5 py-3">
                                                    <div className="w-full bg-glass-100 rounded-full h-1.5 max-w-[50px]">
                                                        <div className="bg-brand-red h-1.5 rounded-full" style={{ width: `${Math.min(100, (r?.risk || 0) * 1.5)}%` }}></div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <Badge className="bg-brand-purple/20 text-brand-purple border-brand-purple/30 pointer-events-none hover:bg-brand-purple/20">
                                                        {z.investmentScore}/100
                                                    </Badge>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

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
                                        <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }} itemStyle={{ color: '#f8fafc' }} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
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

                {/* Gentrification Probability Matrix */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                    <Card className="glass-card h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-brand-purple" />
                                Gentrification Probability Matrix
                            </CardTitle>
                            <CardDescription>Multi-factor analysis of trajectory markers</CardDescription>
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
                                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }} itemStyle={{ color: '#f8fafc' }} cursor={{ fill: 'rgba(255,255,255,0.1)' }} />
                                    </RadarChart>
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
                            <CardDescription>Crime/vacancy distress plotted against business activity & foot traffic</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full flex flex-col">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: -10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" dataKey="risk" name="Risk Index" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} label={{ value: "Risk →", position: "bottom", fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                                        <YAxis type="number" dataKey="reward" name="Reward Index" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} label={{ value: "Reward →", angle: -90, position: "insideLeft", fill: "rgba(255,255,255,0.3)", fontSize: 10 }} />
                                        <Tooltip
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '3 3' }}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                            formatter={(value: number, name: string) => [Number(value).toFixed(1), name]}
                                            labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ""}
                                        />
                                        <Scatter name="Zones" data={riskReward} fill="#00f0ff" />
                                    </ScatterChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3 justify-center">
                                {riskReward.sort((a, b) => (b.reward - b.risk) - (a.reward - a.risk)).slice(0, 3).map(z => (
                                    <Badge key={z.name} className="bg-brand-green/15 text-brand-green text-[10px] border-brand-green/30 px-2 py-1 pointer-events-none hover:bg-brand-green/15">
                                        <ArrowUpRight className="w-3 h-3 mr-1" />
                                        {z.name}: Score {z.investmentScore}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* 36-Month Asset Appreciation Curve */}
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                    <Card className="glass-card h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-brand-cyan" />
                                36-Month Asset Appreciation Curve
                            </CardTitle>
                            <CardDescription>Projected property value growth for the Top 3 zones over a 3-year timeline.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full flex flex-col">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={appreciationCurve} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="year" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                                        <YAxis
                                            stroke="rgba(255,255,255,0.3)"
                                            fontSize={11}
                                            tickLine={false}
                                            tickFormatter={(val) => `$${(val / 1000)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '3 3' }}
                                            formatter={(value: number) => [formatCurrency(value), undefined]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                                        {top3.map((zone, idx) => (
                                            <Line
                                                key={zone.name}
                                                type="monotone"
                                                dataKey={zone.name}
                                                stroke={lineColors[idx]}
                                                strokeWidth={3}
                                                dot={{ r: 4, fill: '#0a0a14', strokeWidth: 2 }}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </div>
    );
}
