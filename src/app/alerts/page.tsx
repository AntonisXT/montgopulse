"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Plus, ShieldCheck, Activity, BrainCircuit, Target, ShieldAlert, Store, Check, X, TrendingDown, Footprints, Building2, AlertTriangle } from "lucide-react";

interface AlertRule {
    id: string;
    name: string;
    condition: string;
    action: string;
    status: string;
    type: string;
    severity: string;
}

const DEFAULT_ALERTS: AlertRule[] = [
    {
        id: "default-1",
        name: "Crime Rate Drop Signal",
        condition: "If 911 Crime Calls drops by 10% near Code Violations (within 1 km)",
        action: "Push Notification + Map Insight",
        status: "Active",
        type: "safety",
        severity: "high"
    },
    {
        id: "default-2",
        name: "New Business Revitalization",
        condition: "If Business Licenses spikes by 15% near Construction Permits (same neighborhood)",
        action: "Create Map Insight",
        status: "Active",
        type: "economic",
        severity: "medium"
    },
    {
        id: "default-3",
        name: "Foot Traffic Surge Alert",
        condition: "If Foot Traffic Index surges by 20% near Business Licenses (within 500m)",
        action: "Email Digest + Dashboard Flag",
        status: "Active",
        type: "economic",
        severity: "high"
    },
];

function loadAlerts(): AlertRule[] {
    if (typeof window === "undefined") return DEFAULT_ALERTS;
    try {
        const saved = localStorage.getItem("montgopulse_alerts");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch { /* fallback */ }
    return DEFAULT_ALERTS;
}

function saveAlerts(alerts: AlertRule[]) {
    if (typeof window !== "undefined") {
        localStorage.setItem("montgopulse_alerts", JSON.stringify(alerts));
    }
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
    useEffect(() => {
        const t = setTimeout(onClose, 4000);
        return () => clearTimeout(t);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-5 py-3 rounded-xl bg-brand-green/90 text-black text-sm font-semibold shadow-2xl"
            role="alert"
        >
            <Check className="w-4 h-4" />
            {message}
            <button onClick={onClose} aria-label="Dismiss notification" className="ml-2 hover:opacity-70">
                <X className="w-3.5 h-3.5" />
            </button>
        </motion.div>
    );
}

// Smart dropdown options for investors
const DATASET_OPTIONS = [
    { value: "crime", label: "🚨 911 Crime Calls", icon: ShieldAlert },
    { value: "businesses", label: "🟢 Business Licenses", icon: Building2 },
    { value: "violations", label: "🟠 Code Violations", icon: AlertTriangle },
    { value: "permits", label: "🔵 Construction Permits", icon: Building2 },
    { value: "foot_traffic", label: "👣 Foot Traffic Index", icon: Footprints },
    { value: "sentiment", label: "⭐ Review Sentiment", icon: Target },
    { value: "rent", label: "🏠 Median Rent Price", icon: TrendingDown },
];

const CONDITION_OPTIONS = [
    { value: "drops_by_10%", label: "📉 Drops by > 10%" },
    { value: "drops_by_20%", label: "📉 Drops by > 20%" },
    { value: "spikes_by_15%", label: "📈 Surges by > 15%" },
    { value: "spikes_by_20%", label: "📈 Surges by > 20%" },
    { value: "new_opening_within", label: "🆕 New business opens within" },
    { value: "crosses_above_80", label: "⬆️ Crosses above 80th percentile" },
    { value: "crosses_below_20", label: "⬇️ Crosses below 20th percentile" },
    { value: "exceeds_threshold", label: "🎯 Exceeds custom threshold" },
];

const ACTION_OPTIONS = [
    { value: "push", label: "📱 Push Notification" },
    { value: "email", label: "📧 Email Digest" },
    { value: "map_insight", label: "🗺️ Create Map Insight" },
    { value: "dashboard", label: "📊 Dashboard Flag" },
    { value: "sms", label: "💬 SMS Alert" },
];

const RADIUS_OPTIONS = [
    { value: "500m", label: "Within 500 meters" },
    { value: "1km", label: "Within 1 kilometer" },
    { value: "2km", label: "Within 2 kilometers" },
    { value: "neighborhood", label: "Same neighborhood" },
    { value: "citywide", label: "City-wide" },
];

// Input styling for dark mode
const inputClass = "w-full h-10 rounded-lg bg-slate-800 border border-slate-600 px-3 text-sm text-white placeholder-slate-400 outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-all appearance-none";

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<AlertRule[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Form state
    const [newAlertName, setNewAlertName] = useState("");
    const [datasetA, setDatasetA] = useState("crime");
    const [condition, setCondition] = useState("drops_by_10%");
    const [datasetB, setDatasetB] = useState("violations");
    const [radius, setRadius] = useState("1km");
    const [action, setAction] = useState("push");
    const [severity, setSeverity] = useState("high");

    useEffect(() => {
        setAlerts(loadAlerts());
    }, []);

    const handleCreateAlert = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAlertName) return;

        const condLabel = CONDITION_OPTIONS.find(c => c.value === condition)?.label?.replace(/^[^\s]+\s/, "") || condition;
        const dsA = DATASET_OPTIONS.find(d => d.value === datasetA)?.label?.replace(/^[^\s]+\s/, "") || datasetA;
        const dsB = DATASET_OPTIONS.find(d => d.value === datasetB)?.label?.replace(/^[^\s]+\s/, "") || datasetB;
        const actionLabel = ACTION_OPTIONS.find(a => a.value === action)?.label?.replace(/^[^\s]+\s/, "") || action;

        const newAlert: AlertRule = {
            id: Date.now().toString(),
            name: newAlertName,
            condition: `If ${dsA} ${condLabel} near ${dsB} (${radius})`,
            action: actionLabel,
            status: "Active",
            type: ["crime", "safety"].includes(datasetA) ? "safety" : "economic",
            severity,
        };

        const updated = [newAlert, ...alerts];
        setAlerts(updated);
        saveAlerts(updated);
        setIsCreating(false);
        setNewAlertName("");
        setToastMessage(`Alert "${newAlert.name}" activated successfully!`);
    };

    const handleDeleteAlert = (id: string) => {
        const updated = alerts.filter(a => a.id !== id);
        setAlerts(updated);
        saveAlerts(updated);
        setToastMessage("Alert rule removed.");
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Toast */}
            <AnimatePresence>
                {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
            </AnimatePresence>

            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
                        <Bell className="w-6 h-6 text-brand-amber" />
                        <span className="gradient-text">Pulse</span> Triggers
                    </h1>
                    <p className="text-sm text-white/40 mt-1">Smart investment alerts with cross-correlated data thresholds</p>
                </div>
                <Button onClick={() => setIsCreating(true)} className="bg-brand-cyan text-black hover:bg-brand-cyan/80 font-semibold" aria-label="Create new composite alert rule">
                    <Plus className="w-4 h-4 mr-2" />
                    New Investment Trigger
                </Button>
            </motion.div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap gap-2">
                {[
                    { label: "Crime drops > 10%", dataset: "crime", cond: "drops_by_10%", dsB: "violations" },
                    { label: "Foot traffic surges > 15%", dataset: "foot_traffic", cond: "spikes_by_15%", dsB: "businesses" },
                    { label: "New permit within 1km", dataset: "permits", cond: "new_opening_within", dsB: "businesses" },
                    { label: "Rent crosses 80th pctl", dataset: "rent", cond: "crosses_above_80", dsB: "businesses" },
                ].map((preset) => (
                    <Button
                        key={preset.label}
                        size="sm"
                        variant="ghost"
                        className="text-xs border border-glass-border hover:border-brand-cyan/50 hover:bg-brand-cyan/10 text-white/60 hover:text-white"
                        onClick={() => {
                            setIsCreating(true);
                            setDatasetA(preset.dataset);
                            setCondition(preset.cond);
                            setDatasetB(preset.dsB);
                            setNewAlertName("");
                        }}
                    >
                        {preset.label}
                    </Button>
                ))}
            </div>

            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <Card className="glass-card border-brand-cyan/30 bg-[#0d1117] mt-4">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <BrainCircuit className="w-5 h-5 text-brand-cyan" />
                                    Smart Trigger Builder
                                </CardTitle>
                                <CardDescription className="text-white/40">Define cross-data investment triggers with specific thresholds</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleCreateAlert} className="space-y-5">
                                    {/* Rule Name */}
                                    <div>
                                        <label htmlFor="alert-name" className="text-xs font-semibold text-white/60 mb-1.5 block">Rule Name</label>
                                        <input
                                            id="alert-name"
                                            required
                                            type="text"
                                            value={newAlertName}
                                            onChange={(e) => setNewAlertName(e.target.value)}
                                            placeholder="e.g., Gentrification Early Warning"
                                            className={inputClass}
                                        />
                                    </div>

                                    {/* Row 1: Dataset + Condition */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="dataset-a" className="text-xs font-semibold text-white/60 mb-1.5 block">When This Metric</label>
                                            <select id="dataset-a" value={datasetA} onChange={(e) => setDatasetA(e.target.value)} className={inputClass}>
                                                {DATASET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="condition" className="text-xs font-semibold text-white/60 mb-1.5 block">Condition</label>
                                            <select id="condition" value={condition} onChange={(e) => setCondition(e.target.value)} className={inputClass}>
                                                {CONDITION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 2: Relative To + Radius */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="dataset-b" className="text-xs font-semibold text-white/60 mb-1.5 block">Relative To</label>
                                            <select id="dataset-b" value={datasetB} onChange={(e) => setDatasetB(e.target.value)} className={inputClass}>
                                                {DATASET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="radius" className="text-xs font-semibold text-white/60 mb-1.5 block">Proximity Radius</label>
                                            <select id="radius" value={radius} onChange={(e) => setRadius(e.target.value)} className={inputClass}>
                                                {RADIUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 3: Action + Severity */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="action" className="text-xs font-semibold text-white/60 mb-1.5 block">Alert Action</label>
                                            <select id="action" value={action} onChange={(e) => setAction(e.target.value)} className={inputClass}>
                                                {ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="severity" className="text-xs font-semibold text-white/60 mb-1.5 block">Priority Level</label>
                                            <select id="severity" value={severity} onChange={(e) => setSeverity(e.target.value)} className={inputClass}>
                                                <option value="critical">🔴 Critical</option>
                                                <option value="high">🟠 High</option>
                                                <option value="medium">🟡 Medium</option>
                                                <option value="low">🟢 Low</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 justify-end pt-4 border-t border-glass-border">
                                        <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} aria-label="Cancel creating alert">Cancel</Button>
                                        <Button type="submit" className="bg-brand-cyan text-black hover:bg-brand-cyan/80 font-semibold" aria-label="Activate new alert rule">
                                            <Check className="w-4 h-4 mr-2" />
                                            Activate Trigger
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                {alerts.map((alert, i) => (
                    <motion.div key={alert.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                        <Card className="glass-card hover:border-brand-cyan/30 transition-colors">
                            <CardContent className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${alert.type === 'safety' ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                                            {alert.type === 'safety' ? <ShieldAlert className="w-5 h-5 text-red-400" /> : <Store className="w-5 h-5 text-green-400" />}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white/90">{alert.name}</h3>
                                            <p className="text-xs text-white/50 mt-0.5">{alert.condition}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant={alert.status === "Active" ? "success" : "default"}>
                                            <Activity className="w-3 h-3 mr-1" />
                                            {alert.status}
                                        </Badge>
                                        <button onClick={() => handleDeleteAlert(alert.id)} className="p-1 rounded hover:bg-red-500/20 transition-colors" aria-label={`Delete alert ${alert.name}`}>
                                            <X className="w-3.5 h-3.5 text-white/30 hover:text-red-400" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs border-t border-glass-border pt-4">
                                    <span className="text-white/40">Action: <strong className="text-white/80">{alert.action}</strong></span>
                                    <span className={`px-2 py-0.5 rounded ${alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                        alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                            alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-green-500/20 text-green-400'
                                        } uppercase tracking-wider text-[10px] font-bold`}>
                                        {alert.severity} Priority
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
