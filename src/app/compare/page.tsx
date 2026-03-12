"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompare, MapPin, Shield, Users, Building2, Eye, TrendingUp, Zap, Award } from 'lucide-react';
import {
    ResponsiveContainer, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip
} from 'recharts';
import type { DashboardMetrics } from "@/lib/analytics";

function getInvestmentGrade(score: number): { grade: string; color: string; bg: string } {
    if (score >= 85) return { grade: "A+", color: "text-emerald-400", bg: "border-emerald-400/50 bg-emerald-400/10 shadow-[0_0_20px_rgba(52,211,153,0.2)]" };
    if (score >= 75) return { grade: "A", color: "text-emerald-400", bg: "border-emerald-400/40 bg-emerald-400/10" };
    if (score >= 65) return { grade: "B+", color: "text-brand-cyan", bg: "border-brand-cyan/40 bg-brand-cyan/10" };
    if (score >= 50) return { grade: "B", color: "text-brand-amber", bg: "border-brand-amber/40 bg-brand-amber/10" };
    if (score >= 35) return { grade: "C", color: "text-orange-400", bg: "border-orange-400/40 bg-orange-400/10" };
    return { grade: "D", color: "text-red-400", bg: "border-red-400/40 bg-red-400/10" };
}

export default function ComparePage() {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [zoneA, setZoneA] = useState<string>("");
    const [zoneB, setZoneB] = useState<string>("");

    useEffect(() => {
        fetch("/api/analytics/dashboard")
            .then(res => res.json())
            .then((data: DashboardMetrics) => {
                setMetrics(data);
                if (data.topNeighborhoods && data.topNeighborhoods.length >= 2) {
                    setZoneA(data.topNeighborhoods[0].name);
                    setZoneB(data.topNeighborhoods[1].name);
                }
            })
            .catch(console.error);
    }, []);

    const profileA = useMemo(() => metrics?.topNeighborhoods?.find(n => n.name === zoneA), [metrics, zoneA]);
    const profileB = useMemo(() => metrics?.topNeighborhoods?.find(n => n.name === zoneB), [metrics, zoneB]);

    const radarData = useMemo(() => {
        if (!metrics || !profileA || !profileB) return [];

        const maxCrime = Math.max(...metrics.topNeighborhoods.map(n => n.crimeCount), 1);
        const maxBiz = Math.max(...metrics.topNeighborhoods.map(n => n.businessCount), 1);
        const maxBlight = Math.max(...metrics.topNeighborhoods.map(n => n.violationsCount), 1);
        const maxDev = Math.max(...metrics.topNeighborhoods.map(n => n.developmentVelocity), 1);

        const trafficA = metrics.brightData?.footTraffic.find(f => f.neighborhood === zoneA)?.index || 50;
        const trafficB = metrics.brightData?.footTraffic.find(f => f.neighborhood === zoneB)?.index || 50;

        return [
            { subject: 'Safety Index', [zoneA]: Math.round(100 - (profileA.crimeCount / maxCrime * 100)), [zoneB]: Math.round(100 - (profileB.crimeCount / maxCrime * 100)) },
            { subject: 'Business Density', [zoneA]: Math.round((profileA.businessCount / maxBiz) * 100), [zoneB]: Math.round((profileB.businessCount / maxBiz) * 100) },
            { subject: 'Foot Traffic', [zoneA]: trafficA, [zoneB]: trafficB },
            { subject: 'Blight Risk', [zoneA]: Math.round((profileA.violationsCount / maxBlight) * 100), [zoneB]: Math.round((profileB.violationsCount / maxBlight) * 100) },
            { subject: 'Capital Inflow', [zoneA]: Math.round((profileA.developmentVelocity / maxDev) * 100), [zoneB]: Math.round((profileB.developmentVelocity / maxDev) * 100) }
        ];
    }, [metrics, profileA, profileB, zoneA, zoneB]);

    // Weighted score: Safety 25%, Business 25%, Traffic 20%, Blight (inverted) 15%, Capital 15%
    const scoreA = useMemo(() => {
        if (!radarData.length || !zoneA) return 0;
        const vals = radarData.map(r => (r[zoneA] as number) || 0);
        return Math.round(vals[0] * 0.25 + vals[1] * 0.25 + vals[2] * 0.20 + (100 - vals[3]) * 0.15 + vals[4] * 0.15);
    }, [radarData, zoneA]);

    const scoreB = useMemo(() => {
        if (!radarData.length || !zoneB) return 0;
        const vals = radarData.map(r => (r[zoneB] as number) || 0);
        return Math.round(vals[0] * 0.25 + vals[1] * 0.25 + vals[2] * 0.20 + (100 - vals[3]) * 0.15 + vals[4] * 0.15);
    }, [radarData, zoneB]);

    const gradeA = getInvestmentGrade(scoreA);
    const gradeB = getInvestmentGrade(scoreB);

    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4 pt-20">
                <div className="w-10 h-10 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
                <p className="text-xs text-white/30 uppercase tracking-widest">Loading Compare Engine...</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <GitCompare className="w-8 h-8 text-brand-purple" />
                    District <span className="gradient-text">Battle</span>
                </h1>
                <p className="text-white/40 mt-2 max-w-3xl">
                    Head-to-head performance comparison of investment zones based on safety, business density, foot traffic, and vacant properties.
                </p>
            </motion.div>

            <div className="neon-line" />

            {/* Selectors with Investment Grade Badges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
                <Card className="glass-card overflow-visible">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2 text-brand-cyan">
                                <MapPin className="w-4 h-4" /> Zone Alpha
                            </CardTitle>
                            {profileA && (
                                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${gradeA.bg}`}>
                                    <span className={`text-lg font-black ${gradeA.color}`}>{gradeA.grade}</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-brand-cyan/50 appearance-none"
                            value={zoneA}
                            onChange={e => setZoneA(e.target.value)}
                        >
                            {metrics.topNeighborhoods.map(n => (
                                <option key={`A-${n.name}`} value={n.name} className="bg-surface-raised">{n.name}</option>
                            ))}
                        </select>
                        {profileA && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Weighted Score</span>
                                <span className={`text-sm font-bold ${gradeA.color}`}>{scoreA}/100</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card overflow-visible">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2 text-brand-purple">
                                <MapPin className="w-4 h-4" /> Zone Beta
                            </CardTitle>
                            {profileB && (
                                <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${gradeB.bg}`}>
                                    <span className={`text-lg font-black ${gradeB.color}`}>{gradeB.grade}</span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-brand-purple/50 appearance-none"
                            value={zoneB}
                            onChange={e => setZoneB(e.target.value)}
                        >
                            {metrics.topNeighborhoods.map(n => (
                                <option key={`B-${n.name}`} value={n.name} className="bg-surface-raised">{n.name}</option>
                            ))}
                        </select>
                        {profileB && (
                            <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Weighted Score</span>
                                <span className={`text-sm font-bold ${gradeB.color}`}>{scoreB}/100</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Radar Chart — Polished */}
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                <Card className="glass-card relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-purple/5 blur-3xl rounded-full pointer-events-none" />
                    <CardHeader>
                        <CardTitle>Head-to-Head Multi-Factor Analysis</CardTitle>
                        <CardDescription>Relative performance indices (0-100 scale)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {radarData.length > 0 ? (
                            <div className="h-[550px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                                        <PolarGrid stroke="rgba(255,255,255,0.08)" />
                                        <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.7)" fontSize={13} fontWeight="bold" />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.1)" fontSize={10} />
                                        <Radar
                                            name={zoneA}
                                            dataKey={zoneA}
                                            stroke="#00f0ff"
                                            fill="#00f0ff"
                                            fillOpacity={0.15}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: "#00f0ff", stroke: "#0a0a14", strokeWidth: 2 }}
                                        />
                                        <Radar
                                            name={zoneB}
                                            dataKey={zoneB}
                                            stroke="#c084fc"
                                            fill="#a855f7"
                                            fillOpacity={0.15}
                                            strokeWidth={2.5}
                                            dot={{ r: 4, fill: "#c084fc", stroke: "#0a0a14", strokeWidth: 2 }}
                                        />
                                        <Legend
                                            wrapperStyle={{ paddingTop: '20px' }}
                                            formatter={(value: string) => <span className="text-white/80 text-sm font-semibold">{value}</span>}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(10,10,20,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center p-20 text-white/30">
                                Select two different zones to compare
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Head-to-Head Comparison Table */}
                {radarData.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                        <Card className="glass-card mt-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Award className="w-4 h-4 text-brand-amber" /> Head-to-Head Scorecard
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="text-left text-[11px] text-white/40 uppercase tracking-widest px-6 py-3 font-bold">Metric</th>
                                            <th className="text-center text-[11px] uppercase tracking-widest px-4 py-3 font-bold text-brand-cyan">{zoneA}</th>
                                            <th className="text-center text-[11px] uppercase tracking-widest px-4 py-3 font-bold text-brand-purple">{zoneB}</th>
                                            <th className="text-center text-[11px] text-white/40 uppercase tracking-widest px-4 py-3 font-bold">Winner</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {radarData.map((row, i) => {
                                            const valA = (row[zoneA] as number) || 0;
                                            const valB = (row[zoneB] as number) || 0;
                                            // For "Blight Risk" lower is better
                                            const isLowerBetter = row.subject === "Blight Risk";
                                            const aWins = isLowerBetter ? valA < valB : valA > valB;
                                            const bWins = isLowerBetter ? valB < valA : valB > valA;
                                            const tie = valA === valB;
                                            const winnerName = tie ? "TIE" : (aWins ? zoneA : zoneB);
                                            const winnerColor = tie ? "text-white/40" : (aWins ? "text-brand-cyan" : "text-brand-purple");

                                            return (
                                                <tr key={row.subject} className={`border-b border-white/5 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}>
                                                    <td className="px-6 py-3.5">
                                                        <span className="text-xs font-semibold text-white/80">{row.subject}</span>
                                                    </td>
                                                    <td className="text-center px-4 py-3.5">
                                                        <span className={`text-sm font-bold tabular-nums ${aWins ? 'text-brand-cyan' : 'text-white/50'}`}>
                                                            {valA}
                                                        </span>
                                                        {aWins && <span className="ml-1.5 text-[10px] text-brand-cyan">▲</span>}
                                                    </td>
                                                    <td className="text-center px-4 py-3.5">
                                                        <span className={`text-sm font-bold tabular-nums ${bWins ? 'text-brand-purple' : 'text-white/50'}`}>
                                                            {valB}
                                                        </span>
                                                        {bWins && <span className="ml-1.5 text-[10px] text-brand-purple">▲</span>}
                                                    </td>
                                                    <td className="text-center px-4 py-3.5">
                                                        <Badge
                                                            variant="ghost"
                                                            className={`text-[10px] font-bold uppercase tracking-wider ${winnerColor} ${
                                                                tie ? 'bg-white/5 border-white/10' :
                                                                aWins ? 'bg-brand-cyan/10 border-brand-cyan/30' : 'bg-brand-purple/10 border-brand-purple/30'
                                                            }`}
                                                        >
                                                            {winnerName}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* Totals Row */}
                                        <tr className="bg-white/[0.04] border-t border-white/10">
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-bold text-white uppercase tracking-wider">Weighted Total</span>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <span className={`text-lg font-black tabular-nums ${scoreA >= scoreB ? 'text-brand-cyan' : 'text-white/50'}`}>{scoreA}</span>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <span className={`text-lg font-black tabular-nums ${scoreB >= scoreA ? 'text-brand-purple' : 'text-white/50'}`}>{scoreB}</span>
                                            </td>
                                            <td className="text-center px-4 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-bold text-xs uppercase tracking-wider ${
                                                    scoreA > scoreB ? 'bg-brand-cyan/15 border-brand-cyan/40 text-brand-cyan' :
                                                    scoreB > scoreA ? 'bg-brand-purple/15 border-brand-purple/40 text-brand-purple' :
                                                    'bg-white/5 border-white/10 text-white/50'
                                                }`}>
                                                    <Zap className="w-3 h-3" />
                                                    {scoreA === scoreB ? "DRAW" : (scoreA > scoreB ? zoneA : zoneB)}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* AI Verdict with "Best For" Tags */}
                {radarData.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="glass-card mt-6 border-l-4 border-l-brand-cyan">
                            <CardContent className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-brand-cyan/20 rounded-full shrink-0 mt-1">
                                        <Eye className="w-5 h-5 text-brand-cyan" />
                                    </div>
                                    <div className="space-y-3 flex-1">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">AI Investment Verdict</h3>
                                        <p className="text-xs text-white/70 leading-relaxed">
                                            {(() => {
                                                if (zoneA === zoneB) return "Please select two distinct zones for a valid algorithmic comparison.";
                                                if (!profileA || !profileB) return "";

                                                let verdict = `${zoneA} and ${zoneB} show contrasting profiles. `;
                                                if (profileA.businessCount > profileB.businessCount && profileA.crimeCount > profileB.crimeCount) {
                                                    verdict += `${zoneA} dominates in Business Density offering higher volume, but ${zoneB} provides superior Safety. `;
                                                } else if (profileA.violationsCount > profileB.violationsCount) {
                                                    verdict += `${zoneA} carries more revitalization overhead due to higher Blight Risk (Code Violations) compared to ${zoneB}. `;
                                                } else {
                                                    verdict += `${zoneA} offers an aggressive investment posture, while ${zoneB} provides stabler underlying fundamentals. `;
                                                }

                                                const trafficA = metrics?.brightData?.footTraffic.find(f => f.neighborhood === zoneA)?.index || 50;
                                                const trafficB = metrics?.brightData?.footTraffic.find(f => f.neighborhood === zoneB)?.index || 50;

                                                if (trafficA > trafficB + 10) {
                                                    verdict += `Notably, ${zoneA} has significantly higher live Foot Traffic (${trafficA}/100), making it prime for Retail/F&B.`;
                                                } else if (trafficB > trafficA + 10) {
                                                    verdict += `Notably, ${zoneB} has significantly higher live Foot Traffic (${trafficB}/100), making it prime for Retail/F&B.`;
                                                } else {
                                                    verdict += `Both zones exhibit comparable live Foot Traffic indices.`;
                                                }
                                                return verdict;
                                            })()}
                                        </p>

                                        {/* Best For Tags */}
                                        {zoneA !== zoneB && profileA && profileB && (
                                            <div className="flex flex-wrap gap-3 pt-2 border-t border-white/5">
                                                {(() => {
                                                    const tags: { zone: string; label: string; icon: React.ReactNode; color: string }[] = [];
                                                    const trafficA = metrics?.brightData?.footTraffic.find(f => f.neighborhood === zoneA)?.index || 50;
                                                    const trafficB = metrics?.brightData?.footTraffic.find(f => f.neighborhood === zoneB)?.index || 50;

                                                    // Quick ROI: higher capital inflow + higher business density
                                                    const roiA = profileA.developmentVelocity + profileA.businessCount * 100;
                                                    const roiB = profileB.developmentVelocity + profileB.businessCount * 100;
                                                    tags.push({
                                                        zone: roiA >= roiB ? zoneA : zoneB,
                                                        label: "Best for Quick ROI",
                                                        icon: <TrendingUp className="w-3 h-3" />,
                                                        color: roiA >= roiB ? "border-brand-cyan/40 text-brand-cyan bg-brand-cyan/10" : "border-brand-purple/40 text-brand-purple bg-brand-purple/10"
                                                    });

                                                    // Value Preservation: lower blight, lower crime
                                                    const riskA = profileA.violationsCount + profileA.crimeCount;
                                                    const riskB = profileB.violationsCount + profileB.crimeCount;
                                                    tags.push({
                                                        zone: riskA <= riskB ? zoneA : zoneB,
                                                        label: "Best for Value Preservation",
                                                        icon: <Shield className="w-3 h-3" />,
                                                        color: riskA <= riskB ? "border-brand-cyan/40 text-brand-cyan bg-brand-cyan/10" : "border-brand-purple/40 text-brand-purple bg-brand-purple/10"
                                                    });

                                                    // Retail/F&B: higher foot traffic
                                                    tags.push({
                                                        zone: trafficA >= trafficB ? zoneA : zoneB,
                                                        label: "Best for Retail & F&B",
                                                        icon: <Users className="w-3 h-3" />,
                                                        color: trafficA >= trafficB ? "border-brand-cyan/40 text-brand-cyan bg-brand-cyan/10" : "border-brand-purple/40 text-brand-purple bg-brand-purple/10"
                                                    });

                                                    // Gentrification Play: high blight + high permits (turnaround potential)
                                                    const gentA = profileA.violationsCount * 2 + profileA.permitsCount * 5;
                                                    const gentB = profileB.violationsCount * 2 + profileB.permitsCount * 5;
                                                    tags.push({
                                                        zone: gentA >= gentB ? zoneA : zoneB,
                                                        label: "Best for Gentrification Play",
                                                        icon: <Zap className="w-3 h-3" />,
                                                        color: gentA >= gentB ? "border-brand-cyan/40 text-brand-cyan bg-brand-cyan/10" : "border-brand-purple/40 text-brand-purple bg-brand-purple/10"
                                                    });

                                                    return tags.map(tag => (
                                                        <div key={tag.label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${tag.color}`}>
                                                            {tag.icon}
                                                            <span>{tag.label}: {tag.zone}</span>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
