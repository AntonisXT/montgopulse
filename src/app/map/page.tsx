"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Layers, MapPin, X, Search, Footprints, Target,
    Building2, Home, Shield, Eye, EyeOff, Clock, Rocket, Briefcase, AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeoJSONFeature } from "@/lib/arcgis";
import { useAppState } from "@/lib/context";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false });

const MAP_NEIGHBORHOODS = [
    { name: "Downtown", lat: 32.3792, lng: -86.3077 },
    { name: "Midtown", lat: 32.3621, lng: -86.2953 },
    { name: "Cloverdale", lat: 32.3565, lng: -86.3031 },
    { name: "Old Cloverdale", lat: 32.3505, lng: -86.3085 },
    { name: "Capitol Heights", lat: 32.3670, lng: -86.2800 },
    { name: "Garden District", lat: 32.3513, lng: -86.2886 },
    { name: "Highland Park", lat: 32.3890, lng: -86.2760 },
    { name: "Normandale", lat: 32.3452, lng: -86.3210 },
    { name: "Woodley Park", lat: 32.3380, lng: -86.2950 },
    { name: "East Montgomery", lat: 32.3780, lng: -86.2550 },
    { name: "West Montgomery", lat: 32.3720, lng: -86.3450 },
    { name: "Pike Road Area", lat: 32.3290, lng: -86.2500 },
];

const getDistanceKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Mirrors the exact assignment logic from analytics.ts (assignToNeighborhoods):
 * A feature belongs to a zone ONLY IF that zone is its CLOSEST neighborhood
 * AND the distance is <= 1.8km. This prevents double-counting features that
 * fall within 1.8km of multiple overlapping neighborhoods.
 */
const applySpatialFilter = (features: GeoJSONFeature<Record<string, unknown>>[], zone: string | null) => {
    if (!zone || zone === "All Montgomery") {
        return features.filter(f => f.geometry && f.geometry.coordinates);
    }

    return features.filter(f => {
        const geomType = f.geometry?.type;
        if (!geomType || !f.geometry?.coordinates) return false;

        let lat = 0, lng = 0;
        if (geomType === "Point") {
            lng = f.geometry.coordinates[0] as number;
            lat = f.geometry.coordinates[1] as number;
        } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
            const coords = f.geometry.coordinates as any[];
            if (coords[0] && coords[0][0]) {
                lng = coords[0][0][0];
                lat = coords[0][0][1];
            }
        }

        // Find the CLOSEST neighborhood (mirrors analytics.ts assignFeatures)
        let minDist = Infinity;
        let closestName = "";
        for (const n of MAP_NEIGHBORHOODS) {
            const d = getDistanceKm(lat, lng, n.lat, n.lng);
            if (d < minDist) {
                minDist = d;
                closestName = n.name;
            }
        }

        // Feature belongs to this zone ONLY if it's the closest AND within radius
        return minDist <= 1.8 && closestName.toLowerCase() === zone.toLowerCase();
    });
};

// ---- Layer Configuration ----
export type LayerKey = "business" | "permits" | "violations";

export interface MapLayer {
    key: LayerKey;
    label: string;
    emoji: string;
    icon: React.ElementType;
    color: string;
    markerColor: string;
    borderColor: string;
    bgColor: string;
    features: GeoJSONFeature<Record<string, unknown>>[];
    loading: boolean;
    enabled: boolean;
}

const MAX_FEATURES = 500; // Limit for performance to ensure ZERO browser lag

const formatCurrency = (val: number) => {
    if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
    return `$${val.toLocaleString()}`;
};

/** Filter features that have valid geometry with plottable coordinates. */
function plottableOnly(features: GeoJSONFeature[]): GeoJSONFeature<Record<string, unknown>>[] {
    return features.filter((f) => {
        if (!f.geometry || !f.geometry.coordinates) return false;
        const coords = f.geometry.coordinates;
        if (!Array.isArray(coords)) return false;

        if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
            return isFinite(coords[0]) && isFinite(coords[1]);
        }

        if (Array.isArray(coords[0])) {
            return true;
        }

        return false;
    }) as GeoJSONFeature<Record<string, unknown>>[];
}

/** Fetch GeoJSON from our API routes */
async function fetchLayerData(url: string): Promise<GeoJSONFeature<Record<string, unknown>>[]> {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`[Map] HTTP ${res.status} from ${url}`);
            return [];
        }
        const data = await res.json();
        const features = plottableOnly(data.features || []);
        return features.slice(0, MAX_FEATURES); // Client-side limit
    } catch (err) {
        console.warn(`[Map] Fetch failed for ${url}:`, err);
        return [];
    }
}

function getLabel(props: Record<string, unknown>): string {
    return String(
        props.PermitDescription ||
        props.UseType ||
        props.CaseType ||
        props.ComplaintRem ||
        props.incident_type ||
        props.Call_Category ||
        props.BUSNAME ||
        props.Business_Name ||
        props.type ||
        "Feature"
    );
}

export default function MapPage() {
    const { metrics, selectedZone, setSelectedZone, dispatchMarkerToAI } = useAppState();
    const [mapMode, setMapMode] = useState<"present" | "future">("present");
    const [showFutureToast, setShowFutureToast] = useState(false);
    const [predictionMonth, setPredictionMonth] = useState(12);

    const activeData: any = selectedZone && selectedZone !== "All Montgomery"
        ? metrics?.topNeighborhoods?.find(n => n.name === selectedZone) || metrics
        : metrics;

    const handleSetFutureMode = () => {
        if (mapMode !== "future") {
            setMapMode("future");
            setShowFutureToast(true);
            setTimeout(() => setShowFutureToast(false), 4000);
        }
    };

    const [predLayers, setPredLayers] = useState({
        hotspots: true,
        frontiers: true,
        eradication: true,
        marketGaps: true,
        investmentHeatmap: true,
    });

    const [layers, setLayers] = useState<Record<LayerKey, MapLayer>>({
        business: {
            key: "business", label: "Business Licenses", emoji: "🟢", icon: Building2,
            color: "#22c55e", markerColor: "#22c55e", borderColor: "border-green-500/30",
            bgColor: "bg-green-500/10", features: [], loading: true, enabled: true,
        },
        permits: {
            key: "permits", label: "Construction Permits", emoji: "🔵", icon: Briefcase,
            color: "#3b82f6", markerColor: "#3b82f6", borderColor: "border-blue-500/30",
            bgColor: "bg-blue-500/10", features: [], loading: true, enabled: true,
        },
        violations: {
            key: "violations", label: "Code Violations", emoji: "🟠", icon: AlertTriangle,
            color: "#f97316", markerColor: "#f97316", borderColor: "border-orange-500/30",
            bgColor: "bg-orange-500/10", features: [], loading: true, enabled: true,
        },
    });

    const [filterOpen, setFilterOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [showGentrification, setShowGentrification] = useState(false);
    const [showBlight, setShowBlight] = useState(false);
    const [showCapitalGrowth, setShowCapitalGrowth] = useState(false);
    const [timeframe, setTimeframe] = useState<"30d" | "ytd" | "all">("all");
    const [showFootTraffic, setShowFootTraffic] = useState(false);

    useEffect(() => {
        const endpoints: Record<LayerKey, string> = {
            business: "/api/arcgis/business",
            permits: "/api/arcgis/permits",
            violations: "/api/arcgis/violations",
        };

        Object.entries(endpoints).forEach(([key, url]) => {
            const layerKey = key as LayerKey;
            fetchLayerData(url)
                .then((features) => {
                    setLayers((prev) => ({
                        ...prev,
                        [layerKey]: { ...prev[layerKey], features, loading: false },
                    }));
                })
                .catch(() => {
                    setLayers((prev) => ({
                        ...prev,
                        [layerKey]: { ...prev[layerKey], features: [], loading: false },
                    }));
                });
        });
    }, []);

    const toggleLayer = (key: LayerKey) => {
        setLayers((prev) => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled },
        }));
        setShowGentrification(false);
        setShowBlight(false);
        setShowCapitalGrowth(false);
    };

    const allLoading = Object.values(layers).some((l) => l.loading);

    // Apply strict spatial filtering first AND business logic rules
    const spatiallyFilteredLayers = useMemo(() => {
        const rawPermits = applySpatialFilter(layers.permits.features, selectedZone);
        const rawViolations = applySpatialFilter(layers.violations.features, selectedZone);

        const result: Record<LayerKey, GeoJSONFeature<Record<string, unknown>>[]> = {
            business: applySpatialFilter(layers.business.features, selectedZone),
            permits: rawPermits.filter(p => p.properties?.PermitStatus === "ISSUED" && p.properties?.ProjectType === "New"),
            violations: rawViolations.filter(v => v.properties?.CaseStatus !== "CLOSED"),
        };
        return result;
    }, [layers, selectedZone]);

    // Compute investment heatmap data per neighborhood
    const heatmapData = useMemo(() => {
        if (!metrics?.topNeighborhoods) return [];
        return MAP_NEIGHBORHOODS.map(n => {
            const profile = metrics.topNeighborhoods.find(p => p.name.toLowerCase() === n.name.toLowerCase());
            if (!profile) return null;
            const permitsIntensity = Math.min(profile.permitsCount / 10, 1);
            const violationsIntensity = Math.min(profile.violationsCount / 20, 1);
            const intensity = (permitsIntensity * 0.6) + (violationsIntensity * 0.4);
            return { lat: n.lat, lng: n.lng, intensity, name: n.name, score: profile.investmentScore || 50 };
        }).filter(Boolean) as { lat: number; lng: number; intensity: number; name: string; score: number }[];
    }, [metrics]);

    // Compute market gap synthetic features
    const marketGapFeatures = useMemo(() => {
        if (!metrics?.topNeighborhoods) return [];
        const gaps: { feature: GeoJSONFeature<Record<string, unknown>>; color: string; layerKey: LayerKey }[] = [];

        const needsPool = [
            "Pharmacies", "Vegan Food Options", "Secured Parking", "Late Night Dining",
            "Coworking Spaces", "Fitness Centers", "Childcare Services", "Specialty Grocery"
        ];

        MAP_NEIGHBORHOODS.forEach((n, idx) => {
            const profile = metrics!.topNeighborhoods.find(p => p.name.toLowerCase() === n.name.toLowerCase());
            if (!profile) return;
            // High-Yield Retail Gap: permits exist but very few businesses
            if (profile.businessCount < 50 && profile.permitsCount > 0) {
                let hash = 0;
                for (let i = 0; i < n.name.length; i++) hash = n.name.charCodeAt(i) + ((hash << 5) - hash);
                const category = needsPool[Math.abs(hash) % needsPool.length];
                const underservedScore = Math.min(98, Math.round(70 + (profile.permitsCount * 3) - (profile.businessCount * 0.5)));

                const syntheticFeature: GeoJSONFeature<Record<string, unknown>> = {
                    type: "Feature",
                    geometry: { type: "Point", coordinates: [n.lng, n.lat] },
                    properties: {
                        STATUS: "MARKET_GAP",
                        OBJECTID: 90000 + idx,
                        neighborhood: n.name,
                        gapCategory: category,
                        underservedScore,
                        businessCount: profile.businessCount,
                        permitsCount: profile.permitsCount,
                    }
                };
                gaps.push({ feature: syntheticFeature, color: "#f59e0b", layerKey: "business" });
            }
        });
        return gaps;
    }, [metrics]);

    const visibleFeatures = useMemo(() => {
        const result: { feature: GeoJSONFeature<Record<string, unknown>>; color: string; layerKey: LayerKey }[] = [];
        const q = searchQuery.toLowerCase();

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const passesTimeframe = (props: Record<string, unknown>) => {
            if (timeframe === "all") return true;
            let dateStr = "";
            for (const key of ["issue_date", "incident_date", "Date", "date", "StatusDate", "IssuedDate", "AddedDate"]) {
                if (props[key]) {
                    dateStr = String(props[key]);
                    break;
                }
            }
            if (!dateStr) return true;
            const fd = new Date(dateStr);
            if (isNaN(fd.getTime())) return true;
            if (timeframe === "30d") return fd >= thirtyDaysAgo;
            if (timeframe === "ytd") return fd >= startOfYear;
            return true;
        };

        if (mapMode === "future") {
            const predResult: { feature: GeoJSONFeature<Record<string, unknown>>; color: string; layerKey: LayerKey }[] = [];

            if (predLayers.hotspots) {
                spatiallyFilteredLayers.permits.forEach(p => {
                    const cost = p.properties?.EstimatedCost;
                    if (typeof cost === "number" && cost > 50000) {
                        if (!passesTimeframe(p.properties)) return;
                        if (q) {
                            const label = getLabel(p.properties).toLowerCase();
                            if (!label.includes(q)) return;
                        }
                        const enhanced = { ...p, properties: { ...p.properties, STATUS: "APPRECIATION HOTSPOT" } };
                        predResult.push({ feature: enhanced, color: "#00f0ff", layerKey: "permits" });
                    }
                });
            }
            if (predLayers.frontiers) {
                spatiallyFilteredLayers.permits.forEach(p => {
                    let pLat = 0, pLng = 0;
                    if (p.geometry?.type === "Point") {
                        pLng = p.geometry.coordinates[0] as number;
                        pLat = p.geometry.coordinates[1] as number;
                    }
                    const seed = Math.abs((pLat + pLng) * 10000);
                    const isFrontier = Math.floor((Math.sin(seed) * 0.5 + 0.5) * 100) > 65;
                    const cost = p.properties?.EstimatedCost;
                    if (isFrontier && (typeof cost !== "number" || cost <= 50000)) {
                        if (!passesTimeframe(p.properties)) return;
                        if (q) {
                            const label = getLabel(p.properties).toLowerCase();
                            if (!label.includes(q)) return;
                        }
                        const enhanced = { ...p, properties: { ...p.properties, STATUS: "GENTRIFICATION FRONTIER" } };
                        predResult.push({ feature: enhanced, color: "#a855f7", layerKey: "permits" });
                    }
                });
            }
            if (predLayers.eradication) {
                spatiallyFilteredLayers.violations.forEach(v => {
                    if (!passesTimeframe(v.properties)) return;
                    if (q) {
                        const label = getLabel(v.properties).toLowerCase();
                        if (!label.includes(q)) return;
                    }
                    const enhanced = { ...v, properties: { ...v.properties, STATUS: "BLIGHT ERADICATION" } };
                    predResult.push({ feature: enhanced, color: "#ef4444", layerKey: "violations" });
                });
            }

            // Inject market gap features
            if (predLayers.marketGaps) {
                marketGapFeatures.forEach(g => predResult.push(g));
            }

            return predResult;
        }

        if (showGentrification) {
            spatiallyFilteredLayers.permits.forEach(p => {
                if (!passesTimeframe(p.properties)) return;
                const enhanced = { ...p, properties: { ...p.properties, STATUS: "GENTRIFICATION VELOCITY" } };
                result.push({ feature: enhanced, color: "#00f0ff", layerKey: "permits" });
            });
            return result;
        }

        if (showBlight) {
            spatiallyFilteredLayers.violations.forEach(v => {
                if (!passesTimeframe(v.properties)) return;
                const enhanced = { ...v, properties: { ...v.properties, STATUS: "BLIGHT VULNERABILITY" } };
                result.push({ feature: enhanced, color: "#ef4444", layerKey: "violations" });
            });
            return result;
        }

        if (showCapitalGrowth) {
            spatiallyFilteredLayers.permits.forEach(p => {
                let pLat = 0, pLng = 0;
                if (p.geometry?.type === "Point") {
                    pLng = p.geometry.coordinates[0] as number;
                    pLat = p.geometry.coordinates[1] as number;
                }
                const seed = Math.abs((pLat + pLng) * 10000);
                const traffic = Math.floor((Math.sin(seed) * 0.5 + 0.5) * 100);
                if (!passesTimeframe(p.properties)) return;
                if (traffic > 60) {
                    const enhanced = { ...p, properties: { ...p.properties, STATUS: "CAPITAL GROWTH CORRIDOR", TrafficScore: traffic } };
                    result.push({ feature: enhanced, color: "#a855f7", layerKey: "permits" });
                }
            });
            return result;
        }

        Object.values(layers).forEach((layer) => {
            if (!layer.enabled) return;
            const filteredFeatures = spatiallyFilteredLayers[layer.key as LayerKey];
            filteredFeatures.forEach((f) => {
                if (!passesTimeframe(f.properties)) return;
                if (q) {
                    const label = getLabel(f.properties).toLowerCase();
                    const addr = String(f.properties.address || f.properties.Address || f.properties.BUSADDRESS || "").toLowerCase();
                    if (!label.includes(q) && !addr.includes(q)) return;
                }
                result.push({ feature: f, color: layer.markerColor, layerKey: layer.key });
            });
        });

        return result;
    }, [layers, spatiallyFilteredLayers, marketGapFeatures, searchQuery, showGentrification, showBlight, showCapitalGrowth, timeframe, mapMode, predLayers]);

    const totalFeatures = Object.values(layers).reduce((sum, l) => sum + l.features.length, 0);

    const visibleStats = useMemo(() => {
        let b = 0, p = 0, openV = 0, closedV = 0;
        let capitalInlay = 0;
        visibleFeatures.forEach(f => {
            if (f.layerKey === "business") b++;
            if (f.layerKey === "permits") {
                p++;
                const cost = f.feature.properties?.EstimatedCost;
                if (typeof cost === 'number') capitalInlay += cost;
            }
            if (f.layerKey === "violations") {
                if (f.feature.properties?.CaseStatus === "CLOSED") closedV++;
                else openV++;
            }
        });

        const totalV = openV + closedV;
        const resolutionRate = totalV > 0 ? Math.round((closedV / totalV) * 100) : 0;

        // Dynamic Heuristic Score for the current sector
        const bizScore = Math.min(b * 5, 30);
        const permitScore = Math.min((capitalInlay / 500000) * 10, 40);
        const blightScore = Math.max(0, 30 - (openV * 2));
        const investmentScore = Math.round(bizScore + permitScore + blightScore);

        // Predictive Metrics
        const appreciation = capitalInlay * 0.045; // 4.5% projected growth
        const roi = (investmentScore / 100) * 18.2; // ROI scaled by score
        const velocity = investmentScore > 70 ? "High" : investmentScore > 40 ? "Moderate" : "Stable";

        return {
            businesses: b,
            permits: p,
            violations: openV,
            totalViolations: totalV,
            resolutionRate,
            capitalInlay,
            investmentScore: Math.min(investmentScore, 98),
            appreciation,
            roi,
            velocity
        };
    }, [visibleFeatures]);

    const handleMarkerClick = (feature: GeoJSONFeature<Record<string, unknown>>, layerKey: LayerKey) => {
        const coords = feature.geometry.coordinates as number[];
        dispatchMarkerToAI({
            label: getLabel(feature.properties),
            address: String(feature.properties.address || feature.properties.Address || feature.properties.BUSADDRESS || "N/A"),
            layerKey,
            coordinates: [coords[1], coords[0]],
            properties: feature.properties,
        });
    };

    return (
        <div className="relative h-screen overflow-hidden">
            <div className="absolute inset-0 flex flex-col">
                {allLoading ? (
                    <div className="flex flex-1 items-center justify-center bg-surface">
                        <div className="text-center">
                            <div className="w-12 h-12 border-2 border-brand-cyan/30 border-t-brand-cyan rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-white/40 text-sm">Loading ArcGIS datasets...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {visibleFeatures.length === 0 && (
                            <div className="absolute inset-0 z-[500] flex items-center justify-center pointer-events-none">
                                <div className="text-center max-w-sm px-6 py-8 rounded-2xl glass-strong border border-glass-border flex flex-col items-center">
                                    <div className="w-12 h-12 rounded-xl bg-glass-100 border border-glass-border flex items-center justify-center mb-3">
                                        <Search className="w-6 h-6 text-white/50" />
                                    </div>
                                    <h3 className="text-base font-bold text-white mb-1">No data available for this sector</h3>
                                    <p className="text-xs text-white/50">Adjust your layers or search query to see active data points.</p>
                                </div>
                            </div>
                        )}
                        <LeafletMap
                            features={visibleFeatures}
                            onMarkerClick={handleMarkerClick}
                            futureMode={mapMode === "future"}
                            showFootTraffic={showFootTraffic}
                            predictionMonth={predictionMonth}
                            heatmapData={mapMode === "future" && predLayers.investmentHeatmap ? heatmapData : []}
                        />
                    </>
                )}
            </div>
            {/* Unified Map Intelligence Widget */}
            <div className="absolute top-6 right-6 z-[1000] flex flex-col items-center gap-3 w-64">
                {/* Present/Future Toggle */}
                <div role="group" aria-label="Map temporal mode" className="glass-strong rounded-xl p-1 flex gap-1 w-full">
                    <button
                        onClick={() => setMapMode("present")}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mapMode === "present" ? "bg-brand-cyan/20 text-brand-cyan shadow-sm" : "text-white/40 hover:text-white"}`}
                        aria-label="Show present data"
                        aria-pressed={mapMode === "present"}
                    >
                        <Clock className="w-3.5 h-3.5" /> Present
                    </button>
                    <button
                        onClick={handleSetFutureMode}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${mapMode === "future" ? "bg-brand-purple/20 text-brand-purple shadow-sm" : "text-white/40 hover:text-white"}`}
                        aria-label="Show 3-year prediction"
                        aria-pressed={mapMode === "future"}
                    >
                        <Rocket className="w-3.5 h-3.5" /> Prediction
                    </button>
                </div>

                {/* Floating Analysis Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="w-full pointer-events-none"
                >
                    <div className="glass-strong rounded-2xl p-5 border border-glass-border shadow-2xl backdrop-blur-3xl">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                            {mapMode === "present" ? <Shield className="w-3.5 h-3.5 text-brand-cyan" /> : <Rocket className="w-3.5 h-3.5 text-brand-purple" />}
                            <p className="text-[10px] uppercase tracking-[0.15em] text-white/40 font-black">
                                {mapMode === "present" ? "Live Sector Analysis" : "3-Year Forecast"}
                            </p>
                        </div>

                        <div className="space-y-4">
                            {mapMode === "present" ? (
                                <>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-white/50 text-xs font-semibold">Capital Deployed</span>
                                        <span className="text-base font-bold text-white tracking-tight">{formatCurrency(activeData?.developmentVelocity || metrics?.developmentVelocity || 0)}</span>
                                    </div>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-white/50 text-xs font-semibold">Blight Resolution</span>
                                        <span className="text-base font-bold text-emerald-400">{activeData?.blightResolutionRate || activeData?.cityBlightResolutionRate || visibleStats.resolutionRate}%</span>
                                    </div>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-white/50 text-xs font-semibold">Investment Score</span>
                                        <span className="text-xl font-black text-brand-cyan">{activeData?.revitalizationScore || activeData?.investmentScore || visibleStats.investmentScore}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-white/50 text-xs font-semibold">Est. Appreciation</span>
                                        <span className="text-base font-bold text-brand-purple">+{formatCurrency(visibleStats.appreciation)}</span>
                                    </div>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-white/50 text-xs font-semibold">Projected ROI</span>
                                        <span className="text-lg font-bold text-emerald-400">{visibleStats.roi.toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center w-full">
                                        <span className="text-white/50 text-xs font-semibold">Gentrification Velocity</span>
                                        <span className={`text-xs font-black uppercase tracking-widest ${visibleStats.velocity === "High" ? "text-brand-purple" : "text-white/80"}`}>
                                            {visibleStats.velocity}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Filter Panel */}
            <motion.div initial={{ x: -360 }} animate={{ x: filterOpen ? 0 : -360 }} transition={{ duration: 0.3, ease: "easeInOut" as const }} className="absolute top-4 left-4 bottom-4 w-[340px] z-[1000]">
                <Card className="h-full flex flex-col bg-surface-raised/90 backdrop-blur-2xl border-white/10">
                    <CardHeader className="pb-3 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Layers className="w-4 h-4 text-brand-cyan" /> Data Layers
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setFilterOpen(false)} aria-label="Close filter panel"><X className="w-4 h-4" /></Button>
                        </div>
                        <div className="relative mt-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <Input placeholder="Search across all layers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs bg-white/5 border-white/10" aria-label="Search map data" />
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto scrollbar-thin py-4 space-y-3">
                        {/* Always-visible Zone Selection */}
                        <div className="mb-4 space-y-2">
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest px-1">Zone Selection</p>
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="w-full bg-glass-100 border border-white/10 text-white text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-brand-cyan transition-all appearance-none cursor-pointer"
                            >
                                <option value="All Montgomery" className="bg-surface-raised text-white">All Montgomery</option>
                                {metrics?.topNeighborhoods?.map(z => (
                                    <option key={z.name} value={z.name} className="bg-surface-raised text-white">{z.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute right-8 top-[148px]">
                                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>

                        <div className="neon-line my-3" />
                        {mapMode === "present" ? (
                            <>
                                <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest px-1">Signals</p>
                                {(Object.values(layers) as MapLayer[]).map((layer) => {
                                    const Icon = layer.icon;
                                    return (
                                        <button key={layer.key} onClick={() => toggleLayer(layer.key)} aria-label={`Toggle ${layer.label} layer`} aria-pressed={layer.enabled}
                                            className={`w-full rounded-xl p-3 text-left transition-all border ${layer.enabled ? `${layer.bgColor} ${layer.borderColor} shadow-sm` : "bg-glass-100 border-glass-border opacity-50"}`}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: layer.color, opacity: layer.enabled ? 1 : 0.3, boxShadow: layer.enabled ? `0 0 10px ${layer.color}60` : 'none' }} />
                                                    <Icon className="w-4 h-4" style={{ color: layer.enabled ? layer.color : "rgba(255,255,255,0.3)" }} />
                                                    <span className="text-xs font-semibold">{layer.label}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: layer.enabled ? `${layer.color}20` : "transparent", color: layer.enabled ? layer.color : "rgba(255,255,255,0.3)", borderColor: layer.enabled ? `${layer.color}40` : "rgba(255,255,255,0.1)" }}>
                                                        {layer.loading ? "..." : (
                                                            layer.key === "business" ? (activeData?.activeBusinesses || activeData?.businessCount || 0).toLocaleString() :
                                                            layer.key === "permits" ? (activeData?.totalPermits || activeData?.permitsCount || 0).toLocaleString() :
                                                            layer.key === "violations" ? (activeData?.totalViolations || activeData?.violationsCount || 0).toLocaleString() :
                                                            spatiallyFilteredLayers[layer.key as LayerKey].length.toLocaleString()
                                                        )}
                                                    </Badge>
                                                    {layer.enabled ? <Eye className="w-3.5 h-3.5" style={{ color: layer.color }} /> : <EyeOff className="w-3.5 h-3.5 text-white/20" />}
                                                </div>
                                            </div>
                                            {layer.enabled && !layer.loading && (
                                                <div className="mt-2 pt-2 border-t border-glass-border/50">
                                                    <p className="text-[10px] text-white/40">
                                                        {spatiallyFilteredLayers[layer.key as LayerKey].length > 0 ? `Showing ${spatiallyFilteredLayers[layer.key as LayerKey].length.toLocaleString()} mapped signals` : "No data mapped in this area"}
                                                    </p>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}

                                <div className="neon-line my-3" />
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Heatmaps</p>
                                </div>
                                <button onClick={() => setShowFootTraffic(!showFootTraffic)} className={`w-full text-left rounded-xl p-3 flex justify-between items-center transition-all border ${showFootTraffic ? "bg-brand-orange/20 border-brand-orange/40 shadow-sm" : "bg-glass-100 border-glass-border opacity-60"}`} aria-pressed={showFootTraffic}>
                                    <div className="flex items-center gap-3">
                                        <Footprints className="w-4 h-4" style={{ color: showFootTraffic ? "#f97316" : "rgba(255,255,255,0.4)" }} />
                                        <span className="text-xs font-semibold" style={{ color: showFootTraffic ? "#f97316" : "inherit" }}>Live Foot Traffic</span>
                                    </div>
                                    {showFootTraffic && <div className="w-2 h-2 rounded-full bg-brand-orange shadow-glow animate-pulse" />}
                                </button>

                                <div className="neon-line my-4" />
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Timeframe</p>
                                </div>
                                <div className="flex bg-glass-100 rounded-lg p-1 border border-glass-border">
                                    {["30d", "ytd", "all"].map(t => (
                                        <button key={t} onClick={() => setTimeframe(t as any)} className={`flex-1 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-md transition-all ${timeframe === t ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}>
                                            {t === "30d" ? "30 Days" : t === "ytd" ? "YTD" : "All Time"}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] font-bold text-brand-purple uppercase tracking-widest px-1 mb-2">Predictive Layers</p>
                                <div className="space-y-3">
                                    {[
                                        { key: "hotspots", label: "Appreciation Hotspots", emoji: "📈", color: "#00f0ff", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/30", count: visibleFeatures.filter(f => f.feature.properties.STATUS === "APPRECIATION HOTSPOT").length },
                                        { key: "frontiers", label: "Gentrification Frontiers", emoji: "🚧", color: "#a855f7", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30", count: visibleFeatures.filter(f => f.feature.properties.STATUS === "GENTRIFICATION FRONTIER").length },
                                        { key: "eradication", label: "Blight Eradication", emoji: "📉", color: "#ef4444", bgColor: "bg-red-500/10", borderColor: "border-red-500/30", count: visibleFeatures.filter(f => f.feature.properties.STATUS === "BLIGHT ERADICATION").length },
                                        { key: "marketGaps", label: "Market Gaps", emoji: "🎯", color: "#f59e0b", bgColor: "bg-amber-500/10", borderColor: "border-amber-500/30", count: visibleFeatures.filter(f => f.feature.properties.STATUS === "MARKET_GAP").length },
                                        { key: "investmentHeatmap", label: "Investment Heatmap", emoji: "🔥", color: "#ff5722", bgColor: "bg-orange-600/10", borderColor: "border-orange-600/30", count: heatmapData.filter(h => h.intensity > 0.3).length },
                                    ].map((pk) => {
                                        const isEn = predLayers[pk.key as keyof typeof predLayers];
                                        return (
                                            <button key={pk.key} onClick={() => setPredLayers(p => ({ ...p, [pk.key as keyof typeof predLayers]: !p[pk.key as keyof typeof predLayers] }))}
                                                className={`w-full rounded-xl p-3 text-left transition-all border ${isEn ? `${pk.bgColor} ${pk.borderColor} shadow-sm` : "bg-glass-100 border-glass-border opacity-50"}`}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pk.color, opacity: isEn ? 1 : 0.3, boxShadow: isEn ? `0 0 10px ${pk.color}60` : 'none' }} />
                                                        <span className="text-xs font-semibold">{pk.emoji} {pk.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: isEn ? `${pk.color}20` : "transparent", color: isEn ? pk.color : "rgba(255,255,255,0.3)", borderColor: isEn ? `${pk.color}40` : "rgba(255,255,255,0.1)" }}>
                                                            {pk.count}
                                                        </Badge>
                                                        {isEn ? <Eye className="w-3.5 h-3.5" style={{ color: pk.color }} /> : <EyeOff className="w-3.5 h-3.5 text-white/20" />}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="neon-line my-4" />
                                <div className="p-3 bg-brand-purple/10 border border-brand-purple/30 rounded-xl text-xs text-brand-purple font-medium flex gap-3 shadow-glow mt-4">
                                    <Rocket className="w-5 h-5 shrink-0" />
                                    <p>Predictive mode simulates Montgomery 36 months in the future. Regular markers and smart overlays are disabled.</p>
                                </div>
                            </>
                        )}
                    </CardContent>

                    <div className="p-4 border-t border-white/5 bg-black/20">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">Visible Markers</span>
                            <Badge variant="ghost" className="border border-white/10 bg-white/5">{visibleFeatures.length.toLocaleString()} / {totalFeatures.toLocaleString()}</Badge>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {!filterOpen && (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setFilterOpen(true)} className="absolute top-4 left-4 z-[1000] p-3 glass-strong rounded-xl hover:shadow-glow transition-shadow border border-white/10" aria-label="Open filter panel">
                    <Layers className="w-5 h-5 text-brand-cyan" />
                </motion.button>
            )}

            {/* Removed Legacy Stats Overlay */}

            {mapMode === "future" && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] glass-strong rounded-xl px-4 py-2 flex items-center gap-2 border border-brand-purple/30 shadow-glow">
                    <Rocket className="w-4 h-4 text-brand-purple animate-pulse" />
                    <span className="text-xs font-semibold text-brand-purple uppercase tracking-widest">3-Year Prediction Active</span>
                </div>
            )}

            {/* Predictive Time-Slider */}
            {mapMode === "future" && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-xl"
                >
                    <div className="glass-strong rounded-2xl px-6 py-4 border border-brand-purple/30 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-brand-purple" />
                                <span className="text-[11px] font-bold text-white/60 uppercase tracking-widest">Investment Timeline</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-brand-purple">+{predictionMonth} Months</span>
                                <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse" />
                            </div>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={24}
                            value={predictionMonth}
                            onChange={(e) => setPredictionMonth(Number(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                            style={{ accentColor: '#a855f7' }}
                        />
                        <div className="flex justify-between mt-2 text-[10px] text-white/30 font-bold uppercase tracking-wider">
                            <span>Present</span>
                            <span>+6mo</span>
                            <span>+12mo</span>
                            <span>+18mo</span>
                            <span>+24mo</span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Future Mode Toast */}
            <AnimatePresence>
                {showFutureToast && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[1000] glass-strong rounded-full px-6 py-3 flex items-center gap-3 border border-brand-purple/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                    >
                        <div className="w-2 h-2 rounded-full bg-brand-purple animate-ping" />
                        <span className="text-sm font-bold text-white tracking-wide">
                            Simulating future gentrification based on current capital inflow...
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
