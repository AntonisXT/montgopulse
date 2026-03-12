"use client";

import React from "react";
import { motion } from "framer-motion";
import { Briefcase, TrendingUp, AlertTriangle, ArrowUpRight, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart, Line, Tooltip, YAxis } from "recharts";
import { usePortfolio } from "@/context/PortfolioContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val}`;
};

export default function PortfolioPage() {
    const { trackedZones, removeZone } = usePortfolio();
    const router = useRouter();

    const getMockData = (name: string) => {
        let seed = 0;
        for (let i = 0; i < name.length; i++) {
            seed += name.charCodeAt(i);
        }
        return {
            permitVelocity: (seed * 120000) % 25000000 + 2000000,
            activeViolations: (seed * 3) % 150 + 10,
            momentum: `+${((seed * 1.5) % 15 + 2).toFixed(1)}%`,
            trendData: [
                { month: "Oct", value: 100 + (seed % 20) * 2 },
                { month: "Nov", value: 110 + (seed % 20) * 3 },
                { month: "Dec", value: 125 + (seed % 20) * 4 },
                { month: "Jan", value: 140 + (seed % 20) * 5 },
                { month: "Feb", value: 160 + (seed % 20) * 6 },
                { month: "Mar", value: 185 + (seed % 20) * 7 },
            ]
        };
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-brand-purple" />
                    My <span className="gradient-text">Portfolios</span>
                </h1>
                <p className="text-white/40 mt-2 max-w-3xl">
                    Tracked capital assets, monitored zones, and predictive momentum signals.
                </p>
            </motion.div>

            <div className="neon-line" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {trackedZones.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="lg:col-span-3">
                        <div className="glass-card flex flex-col items-center justify-center py-24 px-6 text-center border-dashed border-2 border-white/5 rounded-2xl bg-black/20">
                            <Briefcase className="w-16 h-16 text-white/20 mb-6 drop-shadow-lg" />
                            <h2 className="text-2xl font-bold text-white mb-2">No zones tracked yet</h2>
                            <p className="text-white/40 max-w-md mb-8">
                                Go to the Market Analytics center to start building your portfolio of monitored assets and predictive zones.
                            </p>
                            <Link href="/analytics">
                                <button className="px-6 py-3 bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan font-bold tracking-wider uppercase text-sm border border-brand-cyan/30 rounded-xl transition-all shadow-glow">
                                    Explore Market Analytics
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                ) : (
                    trackedZones.map((zone, idx) => {
                        const portfolio = getMockData(zone.name);
                        return (
                            <motion.div
                                key={zone.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <Card className="glass-card h-full relative overflow-hidden group hover:border-brand-purple/50 transition-colors">
                                    <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <CardHeader className="pb-4 border-b border-glass-border">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="text-lg font-bold">{zone.name}</CardTitle>
                                                <CardDescription className="flex items-center gap-1 text-brand-green mt-1">
                                                    <TrendingUp className="w-3 h-3" />
                                                    {portfolio.momentum} 6-Mo Momentum
                                                </CardDescription>
                                            </div>
                                            <Badge className="bg-brand-purple/20 text-brand-purple border-brand-purple/30 pointer-events-none">
                                                Active
                                            </Badge>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-6 space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-glass-100 rounded-lg p-3 border border-glass-border">
                                                <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                                    <DollarSign className="w-3 h-3" />
                                                    Permit Velocity
                                                </p>
                                                <p className="text-xl font-bold text-brand-cyan">{formatCurrency(portfolio.permitVelocity)}</p>
                                            </div>
                                            <div className="bg-glass-100 rounded-lg p-3 border border-glass-border">
                                                <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3 text-brand-orange" />
                                                    Active Violations
                                                </p>
                                                <p className="text-xl font-bold text-brand-orange">{portfolio.activeViolations}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider mb-2">
                                                6-Month Growth Trajectory
                                            </p>
                                            <div className="h-20 w-full mb-4">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={portfolio.trendData}>
                                                        <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                                                        <Tooltip
                                                            formatter={(val: number) => [val.toFixed(1), 'Growth Index']}
                                                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', fontSize: '11px', padding: '4px 8px' }}
                                                            itemStyle={{ color: '#a855f7' }}
                                                            labelStyle={{ display: 'none' }}
                                                            cursor={{ stroke: 'rgba(255,255,255,0.1)' }}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="value"
                                                            stroke="#a855f7"
                                                            strokeWidth={2}
                                                            dot={false}
                                                            activeDot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 pt-4 border-t border-glass-border">
                                            <button
                                                onClick={() => router.push(`/analytics?zone=${encodeURIComponent(zone.name)}`)}
                                                className="w-full py-2 bg-glass-100 hover:bg-glass-200 border border-glass-border rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 text-white/80">
                                                Full Analysis <ArrowUpRight className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => removeZone(zone.name)}
                                                className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2">
                                                Remove from Portfolio
                                            </button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })
                )}

                {/* Add New Zone Card (Only show if tracked zones < 6) */}
                {trackedZones.length > 0 && trackedZones.length < 6 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Link href="/analytics">
                            <div className="glass-card h-full min-h-[300px] border-dashed border-2 border-white/10 hover:border-brand-purple/50 bg-transparent hover:bg-white/5 transition-all flex flex-col items-center justify-center cursor-pointer rounded-xl text-center p-6 group">
                                <div className="w-12 h-12 rounded-full bg-glass-100 border border-glass-border flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <span className="text-2xl font-light text-white/50 group-hover:text-brand-purple">+</span>
                                </div>
                                <h3 className="font-bold text-white/70 group-hover:text-white transition-colors">Track New Zone</h3>
                                <p className="text-xs text-white/40 mt-2">
                                    Add a custom area to monitor predictive analytics and alerts.
                                </p>
                            </div>
                        </Link>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
