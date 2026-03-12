"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePortfolio } from "@/context/PortfolioContext";
import {
    Target, Building2, Zap, Footprints, Activity,
    Bot, Clock, AlertTriangle, TrendingUp, Briefcase
} from "lucide-react";
import {
    ResponsiveContainer, BarChart, Bar, AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import type { DashboardMetrics } from "@/lib/analytics";
import { useAppState } from "@/lib/context";

const formatCurrency = (val: number) => {
    if (val === 0) return "$0";
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val}`;
};

const PIE_COLORS = ['#00f0ff', '#22c55e', '#a855f7', '#f97316', '#3b82f6'];

function AnalyticsContent() {
    const searchParams = useSearchParams();
    const zoneQuery = searchParams.get("zone");

    const { metrics, selectedZone, setSelectedZone } = useAppState();
    const { addZone, removeZone, isZoneTracked } = usePortfolio();

    useEffect(() => {
        if (zoneQuery && zoneQuery !== selectedZone) {
            setSelectedZone(zoneQuery);
        }
    }, [zoneQuery, selectedZone, setSelectedZone]);

    const topZones = metrics?.topNeighborhoods || [];

    const {
        filteredPermits, filteredViolations, filteredBusinesses,
        filteredTraffic, filteredSentiment, zoneDevVelocity
    } = useMemo(() => {
        if (!metrics) return {
            filteredPermits: [], filteredViolations: [], filteredBusinesses: [],
            filteredTraffic: [], filteredSentiment: [], zoneDevVelocity: 0
        };

        const permits = selectedZone === "All Montgomery"
            ? metrics.rawPermits || []
            : (metrics.rawPermits || []).filter(p => p.properties?.AssignedNeighborhood === selectedZone);

        const violations = selectedZone === "All Montgomery"
            ? metrics.rawViolations || []
            : (metrics.rawViolations || []).filter(v => v.properties?.AssignedNeighborhood === selectedZone);

        const businesses = selectedZone === "All Montgomery"
            ? metrics.rawBusinesses || []
            : (metrics.rawBusinesses || []).filter(b => b.properties?.AssignedNeighborhood === selectedZone);

        const traffic = selectedZone === "All Montgomery"
            ? metrics.brightData?.footTraffic || []
            : (metrics.brightData?.footTraffic || []).filter(f => f.neighborhood === selectedZone);

        const sentiment = selectedZone === "All Montgomery"
            ? metrics.brightData?.sentiment || []
            : (metrics.brightData?.sentiment || []).filter(s => s.neighborhood === selectedZone);

        const velocity = permits.reduce((sum, p) => sum + (typeof p.properties?.EstimatedCost === 'number' ? p.properties.EstimatedCost : 0), 0);

        return {
            filteredPermits: permits,
            filteredViolations: violations,
            filteredBusinesses: businesses,
            filteredTraffic: traffic,
            filteredSentiment: sentiment,
            zoneDevVelocity: velocity
        };
    }, [metrics, selectedZone]);



    if (!metrics) {
        return (
            <div className="flex flex-col items-center justify-center mt-20 gap-4">
                <div className="w-10 h-10 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin" />
                <p className="text-xs text-white/30 uppercase tracking-widest">Loading Strategic Data...</p>
            </div>
        );
    }

    // Metrics 
    const zoneBlightResRate = selectedZone === "All Montgomery"
        ? metrics.cityBlightResolutionRate
        : topZones.find(z => z.name === selectedZone)?.blightResolutionRate || 0;

    const zoneSafetyIncidents = selectedZone === "All Montgomery"
        ? metrics.totalCrimeIncidents
        : topZones.find(z => z.name === selectedZone)?.crimeCount || 0;

    // Charts Data

    // New Chart 1: Neighborhood Investment Volume
    const investmentVolumeData = topZones.map(z => ({
        name: z.name.length > 15 ? z.name.substring(0, 15) + "..." : z.name,
        Commercial: z.investmentCategorized?.["Commercial"] || 0,
        Residential: z.investmentCategorized?.["Residential"] || 0,
        Other: z.investmentCategorized?.["Other"] || 0,
        total: (z.investmentCategorized?.["Commercial"] || 0) + (z.investmentCategorized?.["Residential"] || 0) + (z.investmentCategorized?.["Other"] || 0)
    })).sort((a, b) => b.total - a.total).slice(0, 5);

    const activeZoneProfile = topZones.find(z => z.name === selectedZone);
    const zonalCapitalData = activeZoneProfile ? [
        { name: "Commercial", value: activeZoneProfile.investmentCategorized?.["Commercial"] || 0 },
        { name: "Residential", value: activeZoneProfile.investmentCategorized?.["Residential"] || 0 },
        { name: "Other", value: activeZoneProfile.investmentCategorized?.["Other"] || 0 },
    ].filter(d => d.value > 0) : [];

    const activeZoneTotal = zonalCapitalData.reduce((sum, item) => sum + item.value, 0);

    // New Chart 2: Capital Flow by Sector
    const flowObj = filteredPermits.reduce((acc, p) => {
        const dStr = p.properties?.issue_date || p.properties?.IssuedDate;
        if (!dStr) return acc;
        const d = new Date(String(dStr));
        if (isNaN(d.getTime())) return acc;
        const mon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[mon]) acc[mon] = { name: mon, Commercial: 0, Residential: 0, Other: 0 };
        const cost = typeof p.properties?.EstimatedCost === 'number' ? p.properties.EstimatedCost : 0;
        const useType = p.properties?.UseType || "Other";
        if (useType === "Commercial" || useType === "Residential") {
            acc[mon][useType] += cost;
        } else {
            acc[mon]["Other"] += cost;
        }
        return acc;
    }, {} as Record<string, any>);
    const flowData = Object.values(flowObj).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);

    // New Chart 3: Blight Reduction Timeline
    const blightObj = filteredViolations.reduce((acc, v) => {
        const dStr = v.properties?.date || v.properties?.StatusDate || v.properties?.CaseDate;
        if (!dStr) return acc;
        const d = new Date(String(dStr));
        if (isNaN(d.getTime())) return acc;
        const mon = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[mon]) acc[mon] = { name: mon, Closed: 0, Active: 0 };
        if (v.properties?.CaseStatus === "CLOSED") {
            acc[mon].Closed += 1;
        } else {
            acc[mon].Active += 1;
        }
        return acc;
    }, {} as Record<string, any>);
    const blightData = Object.values(blightObj).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);

    const recentActivity = [
        ...filteredPermits.map(p => ({
            type: 'permit',
            date: new Date(String(p.properties?.issue_date || p.properties?.IssuedDate || 0)),
            desc: String(p.properties?.UseType || "Construction"),
            cost: typeof p.properties?.EstimatedCost === 'number' ? p.properties.EstimatedCost : 0
        })),
        ...filteredViolations.map(v => ({
            type: 'violation',
            date: new Date(String(v.properties?.date || v.properties?.StatusDate || 0)),
            desc: String(v.properties?.ViolationType || v.properties?.Status || "Code Violation"),
            cost: 0
        }))
    ]
        .filter(a => !isNaN(a.date.getTime()) && a.date.getFullYear() > 2000)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);

    const formatCurrency = (value: number) => {
        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
        return `$${value}`;
    };

    const activeData: any = selectedZone && selectedZone !== "All Montgomery" 
        ? metrics.topNeighborhoods.find(n => n.name === selectedZone) || metrics
        : metrics;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header & Zone Drill-Down */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Activity className="w-8 h-8 text-brand-cyan" />
                        Market <span className="gradient-text">Analytics</span>
                    </h1>
                </motion.div>
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 relative">
                    {selectedZone !== "All Montgomery" && (
                        <button
                            onClick={() => isZoneTracked(selectedZone) ? removeZone(selectedZone) : addZone(selectedZone)}
                            className="hidden md:flex items-center gap-2 px-3 py-2.5 bg-glass-100 border border-glass-border hover:border-brand-purple/50 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-purple transition-all shadow-glow-purple">
                            <span>{isZoneTracked(selectedZone) ? "★" : "⭐"}</span> {isZoneTracked(selectedZone) ? "Untrack Zone" : "Track Zone"}
                        </button>
                    )}
                    <div className="relative">
                        <select
                            value={selectedZone}
                            onChange={(e) => setSelectedZone(e.target.value)}
                            className="appearance-none bg-glass-100 border border-glass-border rounded-xl px-4 py-2.5 pl-4 pr-10 text-sm font-bold text-brand-cyan uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-cyan/50 cursor-pointer shadow-glow"
                        >
                            <option value="All Montgomery" className="bg-surface text-white">All Montgomery</option>
                            {topZones.map(z => <option key={z.name} value={z.name} className="bg-surface text-white">{z.name}</option>)}
                        </select>
                        <Target className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-cyan pointer-events-none" />
                    </div>
                </motion.div>
            </div>

            <div className="neon-line" />

            {/* Executive Market Intelligence Brief */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="glass-card border-brand-cyan/30 bg-brand-cyan/5">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-brand-cyan">
                            <Bot className="w-4 h-4" />
                            Live Market Intelligence Brief
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white/90 leading-relaxed font-medium">
                            {selectedZone === "All Montgomery" ? (
                                <>
                                    Montgomery Municipal Summary: The consolidated Investment Score is currently indexed at <strong>{activeData.revitalizationScore || activeData.investmentScore || 0}</strong>/100. Market activity is supported by <strong>{(activeData.activeBusinesses || activeData.businessCount || 0).toLocaleString()}</strong> registered commercial entities and a total capital inflow of <strong>{formatCurrency(activeData.developmentVelocity || 0)}</strong>. Operational data indicates a <strong>{activeData.cityBlightResolutionRate || activeData.blightResolutionRate || 0}</strong>% blight resolution efficiency city-wide, with the highest concentration of new development permits currently located in <strong>{metrics.topNeighborhoods?.[0]?.name || "N/A"}</strong>.
                                </>
                            ) : (
                                <>
                                    <strong>{selectedZone}</strong> Sector Analysis: The localized Investment Score is positioned at <strong>{activeData.revitalizationScore || activeData.investmentScore || 0}</strong>/100. This micro-market encompasses <strong>{(activeData.activeBusinesses || activeData.businessCount || 0).toLocaleString()}</strong> active businesses with a verified development velocity of <strong>{formatCurrency(activeData.developmentVelocity || 0)}</strong>. Stabilization metrics show a <strong>{activeData.cityBlightResolutionRate || activeData.blightResolutionRate || 0}</strong>% resolution rate for local code enforcement cases, reflecting the current administrative focus on the sector.
                                </>
                            )}
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Investment", value: formatCurrency(activeData?.developmentVelocity || 0), icon: Building2, color: "text-brand-purple", sub: `${activeData?.totalPermits || activeData?.permitsCount || 0} new permits` },
                    { label: "Blight Reduction", value: `${activeData?.cityBlightResolutionRate || activeData?.blightResolutionRate || 0}%`, icon: Zap, color: "text-brand-green", sub: "Cases resolved" },
                    { label: "Investment Score", value: `${activeData?.revitalizationScore || activeData?.investmentScore || 0}/100`, icon: Target, color: "text-brand-orange", sub: "Based on data" },
                    { label: "Commercial Activity", value: (activeData?.activeBusinesses || activeData?.businessCount || 0).toLocaleString(), icon: Briefcase, color: "text-brand-cyan", sub: "Active licenses" },
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
                {selectedZone === "All Montgomery" ? (
                    <>
                        {/* Neighborhood Investment Volume */}
                        <Card className="glass-card h-full">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-brand-cyan" />
                                    Neighborhood Investment Volume
                                </CardTitle>
                                <CardDescription>Capital injection by civic zone ($M)</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={investmentVolumeData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                                        <Tooltip
                                            formatter={(val: number) => formatCurrency(val)}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                        <Bar dataKey="Commercial" stackId="a" fill="#00f0ff" radius={[0, 0, 4, 4]} />
                                        <Bar dataKey="Residential" stackId="a" fill="#22c55e" />
                                        <Bar dataKey="Other" stackId="a" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    <>
                        {/* Zonal Capital Allocation */}
                        <Card className="glass-card h-full">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-brand-cyan" />
                                    Zonal Capital Allocation
                                </CardTitle>
                                <CardDescription>Investment distribution in {selectedZone}</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[250px] relative flex flex-col items-center justify-center pt-0">
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-5">
                                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Total Cap.</span>
                                    <span className="text-xl font-bold text-white shadow-glow">{formatCurrency(activeZoneTotal)}</span>
                                </div>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={zonalCapitalData}
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                            labelLine={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                                                const RADIAN = Math.PI / 180;
                                                const radius = innerRadius + (outerRadius - innerRadius) * 2.2;
                                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                                return (
                                                    <text x={x} y={y} fill="rgba(255,255,255,0.8)" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight={600}>
                                                        {(percent * 100).toFixed(0)}%
                                                    </text>
                                                );
                                            }}
                                        >
                                            {zonalCapitalData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val: number) => formatCurrency(val)}
                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                            cursor={{ fill: 'rgba(255,255,255,0.1)', strokeDasharray: '3 3' }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Capital Flow by Sector */}
                <Card className="glass-card h-full">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-brand-purple" />
                            Capital Flow by Sector
                        </CardTitle>
                        <CardDescription>Investment trajectories over recent active months</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={flowData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCommercial" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorResidential" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <Tooltip
                                    formatter={(val: number) => formatCurrency(val)}
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '3 3' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Area type="monotone" dataKey="Commercial" stackId="1" stroke="#00f0ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCommercial)" />
                                <Area type="monotone" dataKey="Residential" stackId="1" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorResidential)" />
                                <Area type="monotone" dataKey="Other" stackId="1" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="#a855f7" style={{ opacity: 0.1 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Blight Reduction Timeline */}
                <Card className="glass-card h-full">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Target className="w-4 h-4 text-brand-green" />
                            Blight Reduction
                        </CardTitle>
                        <CardDescription>Code violations resolution velocity</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={blightData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '10px', fontSize: '12px' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeDasharray: '3 3' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Line type="monotone" dataKey="Closed" stroke="#22c55e" strokeWidth={3} dot={{ r: 4, fill: '#0a0a14', strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="Active" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Live Activity Feed */}
                <Card className="glass-card h-full">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-orange" />
                                Recent Municipal Activity
                            </CardTitle>
                            <CardDescription>Latest registered triggers in selected zone</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto scrollbar-thin pr-2 mt-4">
                            {recentActivity.length > 0 ? recentActivity.map((act, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-glass-100 border border-glass-border">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${act.type === 'permit' ? 'bg-brand-purple/20 text-brand-purple' : 'bg-brand-orange/20 text-brand-orange'}`}>
                                            {act.type === 'permit' ? <Building2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white capitalize">{act.type} • {act.desc.length > 30 ? act.desc.substring(0, 30) + "..." : act.desc}</p>
                                            <p className="text-[10px] text-white/40 mt-0.5">{act.date.toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    {act.cost > 0 && (
                                        <div className="text-right">
                                            <Badge variant="ghost" className="bg-brand-green/10 text-brand-green border-brand-green/30 text-[10px]">{formatCurrency(act.cost)}</Badge>
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <p className="text-sm text-white/40 italic py-4">No recent activity found for this zone.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div >
    );
}

export default function AnalyticsPage() {
    return (
        <Suspense fallback={<div className="p-6 text-white/50">Loading Market Analytics...</div>}>
            <AnalyticsContent />
        </Suspense>
    );
}
