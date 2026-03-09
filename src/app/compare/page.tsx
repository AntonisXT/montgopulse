"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { GitCompare, MapPin, Shield, Users, Building2, Eye } from 'lucide-react';
import {
    ResponsiveContainer, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip
} from 'recharts';
import type { DashboardMetrics } from "@/lib/analytics";

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

    const radarData = useMemo(() => {
        if (!metrics || !zoneA || !zoneB) return [];

        const nA = metrics.topNeighborhoods.find(n => n.name === zoneA);
        const nB = metrics.topNeighborhoods.find(n => n.name === zoneB);
        if (!nA || !nB) return [];

        const maxCrime = Math.max(...metrics.topNeighborhoods.map(n => n.crimeCount), 1);
        const maxBiz = Math.max(...metrics.topNeighborhoods.map(n => n.businessCount), 1);
        const maxVacant = Math.max(...metrics.topNeighborhoods.map(n => n.vacantCount), 1);

        const trafficA = metrics.brightData?.footTraffic.find(f => f.neighborhood === zoneA)?.index || 50;
        const trafficB = metrics.brightData?.footTraffic.find(f => f.neighborhood === zoneB)?.index || 50;

        return [
            {
                subject: 'Safety Index',
                [zoneA]: Math.round(100 - (nA.crimeCount / maxCrime * 100)),
                [zoneB]: Math.round(100 - (nB.crimeCount / maxCrime * 100)),
            },
            {
                subject: 'Business Density',
                [zoneA]: Math.round((nA.businessCount / maxBiz) * 100),
                [zoneB]: Math.round((nB.businessCount / maxBiz) * 100),
            },
            {
                subject: 'Foot Traffic',
                [zoneA]: trafficA,
                [zoneB]: trafficB,
            },
            {
                subject: 'Vacancy Rate',
                [zoneA]: Math.round((nA.vacantCount / maxVacant) * 100),
                [zoneB]: Math.round((nB.vacantCount / maxVacant) * 100),
            }
        ];
    }, [metrics, zoneA, zoneB]);

    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center h-[ca]\lc(100vh-4rem)] gap-4 pt-20">
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

            {/* Selectors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
                <Card className="glass-card overflow-visible">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-brand-cyan">
                            <MapPin className="w-4 h-4" /> Zone Alpha
                        </CardTitle>
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
                    </CardContent>
                </Card>

                <Card className="glass-card overflow-visible">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2 text-brand-purple">
                            <MapPin className="w-4 h-4" /> Zone Beta
                        </CardTitle>
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
                    </CardContent>
                </Card>
            </div>

            {/* Radar Chart */}
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
                                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                                        <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.7)" fontSize={14} fontWeight="bold" />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.15)" fontSize={10} />
                                        <Radar
                                            name={zoneA}
                                            dataKey={zoneA}
                                            stroke="#00f0ff"
                                            fill="#00f0ff"
                                            fillOpacity={0.2}
                                            strokeWidth={2}
                                        />
                                        <Radar
                                            name={zoneB}
                                            dataKey={zoneB}
                                            stroke="#a855f7"
                                            fill="#a855f7"
                                            fillOpacity={0.2}
                                            strokeWidth={2}
                                        />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'rgba(10,10,20,0.95)', borderColor: 'rgba(255,255,255,0.1)' }}
                                            itemStyle={{ color: '#fff', fontSize: '12px' }}
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

                {/* AI Verdict */}
                {radarData.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="glass-card mt-6 border-l-4 border-l-brand-cyan">
                            <CardContent className="p-4 flex items-start gap-3">
                                <div className="p-2 bg-brand-cyan/20 rounded-full shrink-0 mt-1">
                                    <Eye className="w-5 h-5 text-brand-cyan" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-white flex items-center gap-2">AI Verdict</h3>
                                    <p className="text-xs text-white/70 leading-relaxed">
                                        {(() => {
                                            if (zoneA === zoneB) return "Please select two distinct zones for a valid algorithmic comparison.";

                                            const nA = metrics.topNeighborhoods.find(n => n.name === zoneA);
                                            const nB = metrics.topNeighborhoods.find(n => n.name === zoneB);
                                            if (!nA || !nB) return "";

                                            let verdict = `${zoneA} and ${zoneB} show contrasting profiles. `;
                                            if (nA.businessCount > nB.businessCount && nA.crimeCount > nB.crimeCount) {
                                                verdict += `${zoneA} dominates in Business Density offering higher volume, but ${zoneB} provides superior Safety. `;
                                            } else if (nA.vacantCount > nB.vacantCount) {
                                                verdict += `${zoneA} carries more revitalization overhead due to higher Vacancy Rates compared to ${zoneB}. `;
                                            } else {
                                                verdict += `${zoneA} offers an aggressive investment posture, while ${zoneB} provides stabler underlying fundamentals. `;
                                            }
                                            return verdict + "Factor foot traffic and sentiment indices into the final ROI calculation.";
                                        })()}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
