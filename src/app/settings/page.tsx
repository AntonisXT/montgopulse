"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Settings, User, Key, ShieldCheck, Mail, Smartphone, Activity, Database, BrainCircuit, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
    const [name, setName] = useState("Alexander Sterling");
    const [org, setOrg] = useState("Montgomery Capital Partners");
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [smsAlerts, setSmsAlerts] = useState(false);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                    <Settings className="w-8 h-8 text-brand-purple" />
                    Workspace <span className="gradient-text">Settings</span>
                </h1>
                <p className="text-white/40 mt-2 max-w-3xl">
                    Configure your enterprise profile, API integrations, and billing preferences.
                </p>
            </motion.div>

            <div className="neon-line" />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Column 1: Profile & API */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Profile & Preferences */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <Card className="glass-card">
                            <CardHeader className="border-b border-glass-border pb-4">
                                <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-brand-cyan">
                                    <User className="w-4 h-4" />
                                    Profile & Preferences
                                </CardTitle>
                                <CardDescription>Manage your personal and organizational details.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-white/50 tracking-wider">Full Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-glass-100 border border-glass-border rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-white/50 tracking-wider">Organization</label>
                                        <input
                                            type="text"
                                            value={org}
                                            onChange={(e) => setOrg(e.target.value)}
                                            className="w-full bg-glass-100 border border-glass-border rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-white/50 tracking-wider">Default Zone</label>
                                        <select
                                            className="appearance-none w-full bg-glass-100 border border-glass-border rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
                                        >
                                            <option className="bg-surface">All Montgomery</option>
                                            <option className="bg-surface">Downtown</option>
                                            <option className="bg-surface">Cloverdale</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase font-bold text-white/50 tracking-wider">Risk Tolerance</label>
                                        <select
                                            className="appearance-none w-full bg-glass-100 border border-glass-border rounded-lg px-4 py-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-cyan/50"
                                        >
                                            <option className="bg-surface">Aggressive (High Yield)</option>
                                            <option className="bg-surface">Moderate (Balanced)</option>
                                            <option className="bg-surface">Conservative (Stable)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-glass-border flex flex-col gap-4">
                                    <h4 className="text-sm font-bold text-white/70">Alert Preferences</h4>

                                    <div className="flex items-center justify-between p-3 rounded-lg border border-glass-border bg-glass-50">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-brand-purple" />
                                            <div>
                                                <p className="text-sm font-bold text-white">Email Digests</p>
                                                <p className="text-xs text-white/40">Weekly momentum and risk alerts.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEmailAlerts(!emailAlerts)}
                                            className={`w-11 h-6 rounded-full transition-colors relative ${emailAlerts ? 'bg-brand-cyan' : 'bg-glass-200'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${emailAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-3 rounded-lg border border-glass-border bg-glass-50">
                                        <div className="flex items-center gap-3">
                                            <Smartphone className="w-5 h-5 text-brand-orange" />
                                            <div>
                                                <p className="text-sm font-bold text-white">SMS Critical Alerts</p>
                                                <p className="text-xs text-white/40">Instant notifications for high-risk zoning changes.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setSmsAlerts(!smsAlerts)}
                                            className={`w-11 h-6 rounded-full transition-colors relative ${smsAlerts ? 'bg-brand-cyan' : 'bg-glass-200'}`}
                                        >
                                            <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${smsAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* API Management */}
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                        <Card className="glass-card">
                            <CardHeader className="border-b border-glass-border pb-4">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-sm uppercase tracking-widest font-bold flex items-center gap-2 text-white/70">
                                        <Key className="w-4 h-4" />
                                        External Integrations
                                    </CardTitle>
                                    <CardDescription>Bring-Your-Own-Key (BYOK)</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-xs uppercase font-bold text-white/50 tracking-wider">Gemini Pro API Key</label>
                                        <Badge variant="ghost" className="border-brand-green/30 text-brand-green bg-brand-green/10 text-[10px]">Connected</Badge>
                                    </div>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        spellCheck={false}
                                        data-lpignore="true"
                                        defaultValue="************************"
                                        className="w-full bg-glass-100 border border-glass-border rounded-lg px-4 py-2.5 text-white/50 font-mono focus:outline-none focus:border-brand-cyan/50 transition-colors"
                                    />
                                    <p className="text-[10px] text-white/30 text-right">Last authenticated: Today, 08:24 AM</p>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-xs uppercase font-bold text-white/50 tracking-wider">Bright Data Web Unlocker</label>
                                        <Badge variant="ghost" className="border-white/10 text-white/40 bg-white/5 text-[10px]">Not Configured</Badge>
                                    </div>
                                    <input
                                        type="password"
                                        autoComplete="new-password"
                                        spellCheck={false}
                                        data-lpignore="true"
                                        placeholder="Enter Bright Data Endpoint / API Key"
                                        className="w-full bg-glass-100 border border-glass-border rounded-lg px-4 py-2.5 text-white font-mono focus:outline-none focus:border-brand-purple/50 transition-colors"
                                    />
                                </div>
                            </CardContent>
                            <div className="bg-black/20 border-t border-glass-border flex justify-end px-6 py-4 rounded-b-xl">
                                <button className="px-4 py-2 bg-glass-200 hover:bg-glass-300 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors">
                                    Update Keys
                                </button>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Column 2: System Health */}
                <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="mb-8">
                    <Card className="glass-card border-brand-green/30 bg-gradient-to-br from-brand-green/10 via-transparent to-transparent h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-6 opacity-10">
                            <Activity className="w-48 h-48 text-brand-green mix-blend-overlay" />
                        </div>

                        <CardHeader className="relative z-10 pb-4 border-b border-gray-800/50">
                            <div className="flex flex-row justify-between items-center w-full">
                                <CardTitle className="text-sm font-bold tracking-wider uppercase text-emerald-500 whitespace-nowrap flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4" />
                                    SYSTEM HEALTH
                                </CardTitle>
                                <div className="px-3 py-1 text-[11px] font-semibold tracking-wide uppercase rounded-full whitespace-nowrap bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm pointer-events-none">
                                    All Systems Operational
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10 pt-6 space-y-6">

                            <div className="flex items-center justify-between p-4 rounded-lg border border-glass-border bg-glass-100">
                                <div className="flex items-center gap-3">
                                    <Database className="w-5 h-5 text-brand-cyan" />
                                    <div>
                                        <p className="text-sm font-bold text-white">ArcGIS Open Data</p>
                                        <p className="text-xs text-white/40">City of Montgomery Municipal APIs</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-brand-green">
                                    <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                                    Online
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border border-glass-border bg-glass-100">
                                <div className="flex items-center gap-3">
                                    <BrainCircuit className="w-5 h-5 text-brand-purple" />
                                    <div>
                                        <p className="text-sm font-bold text-white">Google Gemini Intelligence</p>
                                        <p className="text-xs text-white/40">Predictive Copilot Engine</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-brand-green">
                                    <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                                    Online
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border border-glass-border bg-glass-100">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-brand-orange" />
                                    <div>
                                        <p className="text-sm font-bold text-white">Bright Data Network</p>
                                        <p className="text-xs text-white/40">Sentiment & Web Unlocking</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-brand-green">
                                    <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                                    Online
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

            </div>
        </div>
    );
}
