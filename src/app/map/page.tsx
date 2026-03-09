"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
    Layers, MapPin, X, Search,
    Building2, Home, Shield, Eye, EyeOff, Clock, Rocket,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GeoJSONFeature } from "@/lib/arcgis";
import { useAppState } from "@/lib/context";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("@/components/map/LeafletMap"), { ssr: false });

// ---- Layer Configuration ----
export type LayerKey = "business" | "vacant";

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

const MAX_FEATURES = 1000;

/** Filter features that have valid geometry with plottable coordinates.
 *  Handles: Point, normalized centroids, and features with missing geometry.type
 *  (e.g., 911 crime data where ArcGIS returns features without a type field). */
function plottableOnly(features: GeoJSONFeature[]): GeoJSONFeature<Record<string, unknown>>[] {
    return features.filter((f) => {
        if (!f.geometry || !f.geometry.coordinates) return false;
        const coords = f.geometry.coordinates;
        if (!Array.isArray(coords)) return false;

        // Accept any feature whose coordinates look like [lng, lat] (2 finite numbers)
        if (coords.length >= 2 && typeof coords[0] === "number" && typeof coords[1] === "number") {
            return isFinite(coords[0]) && isFinite(coords[1]);
        }

        // Polygon/MultiPolygon: should have been normalized by the API route already,
        // but handle gracefully if not
        if (Array.isArray(coords[0])) {
            return true; // Let the map renderer decide
        }

        return false;
    }) as GeoJSONFeature<Record<string, unknown>>[];
}

/** Fetch GeoJSON from our API routes — returns ONLY real features, NO fallbacks */
async function fetchLayerData(url: string): Promise<GeoJSONFeature<Record<string, unknown>>[]> {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.warn(`[Map] HTTP ${res.status} from ${url}`);
            return [];
        }
        const data = await res.json();
        const features = plottableOnly(data.features || []);
        return features.slice(0, MAX_FEATURES);
    } catch (err) {
        console.warn(`[Map] Fetch failed for ${url}:`, err);
        return [];
    }
}

function getLabel(props: Record<string, unknown>): string {
    return String(
        props.incident_type ||
        props.Call_Category ||
        props.BUSNAME ||
        props.Business_Name ||
        props.type ||
        props.PropertyType ||
        props.STATUS ||
        props.Current_U ||
        props.Address ||
        "Unknown"
    );
}

export default function MapPage() {
    const { dispatchMarkerToAI } = useAppState();
    const [mapMode, setMapMode] = useState<"present" | "future">("present");

    const [layers, setLayers] = useState<Record<LayerKey, MapLayer>>({
        business: {
            key: "business", label: "Business Licenses", emoji: "🟢", icon: Building2,
            color: "#22c55e", markerColor: "#22c55e", borderColor: "border-green-500/30",
            bgColor: "bg-green-500/10", features: [], loading: true, enabled: true,
        },
        vacant: {
            key: "vacant", label: "Vacant Properties", emoji: "🟡", icon: Home,
            color: "#eab308", markerColor: "#eab308", borderColor: "border-yellow-500/30",
            bgColor: "bg-yellow-500/10", features: [], loading: true, enabled: true,
        },
    });

    const [filterOpen, setFilterOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const [showOpportunityZones, setShowOpportunityZones] = useState(false);

    // Fetch all 3 datasets in parallel — NO fallback demo data
    useEffect(() => {
        const endpoints: Record<LayerKey, string> = {
            business: "/api/arcgis/business",
            vacant: "/api/arcgis/vacant",
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
        setShowOpportunityZones(false);
    };

    const allLoading = Object.values(layers).some((l) => l.loading);

    const visibleFeatures = useMemo(() => {
        const result: { feature: GeoJSONFeature<Record<string, unknown>>; color: string; layerKey: LayerKey }[] = [];
        const q = searchQuery.toLowerCase();

        if (showOpportunityZones) {
            // Highlight Vacant Properties (since we no longer map crime spatially, 
            // all vacant properties are highlighted as potential opportunities in this mock view)
            const vacants = layers.vacant.features;

            vacants.forEach(v => {
                let vLat = 0, vLng = 0;
                if (v.geometry?.type === "Point") {
                    vLng = v.geometry.coordinates[0] as number;
                    vLat = v.geometry.coordinates[1] as number;
                } else if (v.geometry?.type === "Polygon") {
                    const coords = v.geometry.coordinates as number[][][];
                    if (coords[0] && coords[0][0]) {
                        vLng = coords[0][0][0];
                        vLat = coords[0][0][1];
                    }
                }

                if (vLat === 0 && vLng === 0) return;

                // Inject a property to show in Popup
                const enhancedV = { ...v, properties: { ...v.properties, STATUS: "OPPORTUNITY ZONE" } };
                result.push({ feature: enhancedV, color: "#00f0ff", layerKey: "vacant" }); // highlight in cyan
            });

            return result;
        }

        Object.values(layers).forEach((layer) => {
            if (!layer.enabled) return;
            layer.features.forEach((f) => {
                if (q) {
                    const label = getLabel(f.properties).toLowerCase();
                    const addr = String(f.properties.address || f.properties.Address || f.properties.BUSADDRESS || "").toLowerCase();
                    if (!label.includes(q) && !addr.includes(q)) return;
                }
                result.push({ feature: f, color: layer.markerColor, layerKey: layer.key });
            });
        });

        return result;
    }, [layers, searchQuery, showOpportunityZones]);

    const totalFeatures = Object.values(layers).reduce((sum, l) => sum + l.features.length, 0);

    const visibleStats = useMemo(() => {
        let b = 0, v = 0;
        visibleFeatures.forEach(f => {
            if (f.layerKey === "business") b++;
            if (f.layerKey === "vacant") v++;
        });

        const sumTraffic = visibleFeatures
            .filter(f => f.layerKey === "business")
            .reduce((sum, f) => {
                const seed = Math.abs(((f.feature.geometry?.coordinates?.[1] as number) || 0) + ((f.feature.geometry?.coordinates?.[0] as number) || 0)) * 10000;
                return sum + Math.max(10, Math.min(100, Math.floor((Math.sin(seed) * 0.5 + 0.5) * 100)));
            }, 0);

        return {
            businesses: b,
            vacants: v,
            avgTraffic: b > 0 ? Math.round(sumTraffic / b) : 0
        };
    }, [visibleFeatures]);

    const handleMarkerClick = (feature: GeoJSONFeature<Record<string, unknown>>, layerKey: LayerKey) => {
        const coords = feature.geometry.coordinates as number[];
        dispatchMarkerToAI({
            label: getLabel(feature.properties),
            address: String(feature.properties.address || feature.properties.Address || feature.properties.BUSADDRESS || feature.properties.Parcel_ID || "N/A"),
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
                        <LeafletMap features={visibleFeatures} onMarkerClick={handleMarkerClick} futureMode={mapMode === "future"} />
                    </>
                )}
            </div>

            {/* Floating Info HUD */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="absolute bottom-6 right-6 z-[1000] pointer-events-none"
            >
                <div className="glass-strong rounded-2xl p-4 w-64 border border-glass-border shadow-2xl">
                    <p className="text-[10px] uppercase tracking-widest text-white/50 mb-3 font-semibold">Live Sector Analysis</p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <span className="text-white/70 text-xs">Active Businesses</span>
                            <span className="text-lg font-bold text-brand-green">{visibleStats.businesses}</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-white/70 text-xs">Vacant Properties</span>
                            <span className="text-lg font-bold text-white">{visibleStats.vacants}</span>
                        </div>
                        <div className="pt-2 border-t border-white/10">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-brand-cyan/80 text-[10px] uppercase font-bold">Avg Foot Traffic</span>
                                <span className="text-xs font-bold text-brand-cyan">{visibleStats.avgTraffic}/100</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-brand-cyan"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${visibleStats.avgTraffic}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Present/Future Toggle */}
            <div className="absolute top-4 right-4 z-[1000]" role="group" aria-label="Map temporal mode">
                <div className="glass-strong rounded-xl p-1 flex gap-1">
                    <button onClick={() => setMapMode("present")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${mapMode === "present" ? "bg-brand-cyan/20 text-brand-cyan shadow-sm" : "text-white/40 hover:text-white"}`} aria-label="Show present data" aria-pressed={mapMode === "present"}>
                        <Clock className="w-3.5 h-3.5" /> Present
                    </button>
                    <button onClick={() => setMapMode("future")} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${mapMode === "future" ? "bg-brand-purple/20 text-brand-purple shadow-sm" : "text-white/40 hover:text-white"}`} aria-label="Show 3-year prediction" aria-pressed={mapMode === "future"}>
                        <Rocket className="w-3.5 h-3.5" /> 3-Year Prediction
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            <motion.div initial={{ x: -360 }} animate={{ x: filterOpen ? 0 : -360 }} transition={{ duration: 0.3, ease: "easeInOut" as const }} className="absolute top-4 left-4 bottom-4 w-[340px] z-[1000]">
                <Card className="h-full flex flex-col bg-surface-raised/90 backdrop-blur-2xl">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Layers className="w-4 h-4 text-brand-cyan" /> Investment Layers
                            </CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setFilterOpen(false)} aria-label="Close filter panel"><X className="w-4 h-4" /></Button>
                        </div>
                        <div className="relative mt-2">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                            <Input placeholder="Search across all layers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 text-xs" aria-label="Search map data" />
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 overflow-y-auto scrollbar-thin space-y-3">
                        <p className="section-title mb-1">Data Layers</p>
                        {(Object.values(layers) as MapLayer[]).map((layer) => {
                            const Icon = layer.icon;
                            return (
                                <button key={layer.key} onClick={() => toggleLayer(layer.key)} aria-label={`Toggle ${layer.label} layer`} aria-pressed={layer.enabled}
                                    className={`w-full rounded-xl p-3 text-left transition-all border ${layer.enabled ? `${layer.bgColor} ${layer.borderColor} shadow-sm` : "bg-glass-100 border-glass-border opacity-50"}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: layer.color, opacity: layer.enabled ? 1 : 0.3 }} />
                                            <Icon className="w-4 h-4" style={{ color: layer.enabled ? layer.color : "rgba(255,255,255,0.3)" }} />
                                            <span className="text-xs font-semibold">{layer.emoji} {layer.label}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="text-[10px] px-1.5 py-0" style={{ backgroundColor: layer.enabled ? `${layer.color}20` : "transparent", color: layer.enabled ? layer.color : "rgba(255,255,255,0.3)", borderColor: layer.enabled ? `${layer.color}40` : "rgba(255,255,255,0.1)" }}>
                                                {layer.loading ? "..." : layer.features.length.toLocaleString()}
                                            </Badge>
                                            {layer.enabled ? <Eye className="w-3.5 h-3.5" style={{ color: layer.color }} /> : <EyeOff className="w-3.5 h-3.5 text-white/20" />}
                                        </div>
                                    </div>
                                    {layer.enabled && !layer.loading && (
                                        <div className="mt-2 pt-2 border-t border-glass-border/50">
                                            <p className="text-[10px] text-white/30">
                                                {layer.features.length > 0 ? `${layer.features.length.toLocaleString()} live data points` : "No data from API"}
                                            </p>
                                        </div>
                                    )}
                                </button>
                            );
                        })}

                        <div className="neon-line my-3" />
                        <p className="section-title mb-1">Quick Overlays</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => {
                                setLayers((prev) => ({ ...prev, business: { ...prev.business, enabled: true }, vacant: { ...prev.vacant, enabled: true } }));
                                setShowOpportunityZones(false);
                            }} className="text-[11px] px-3 py-2 rounded-lg glass hover:bg-glass-200 transition-colors text-white/60 hover:text-white text-left" aria-label="Show investment layers only">🏗️ Investment Only</button>

                            <button onClick={() => {
                                setLayers((prev) => ({ ...prev, business: { ...prev.business, enabled: true }, vacant: { ...prev.vacant, enabled: true } }));
                                setShowOpportunityZones(false);
                            }} className="text-[11px] px-3 py-2 rounded-lg glass hover:bg-glass-200 transition-colors text-white/60 hover:text-white text-left" aria-label="Show all layers">🌐 Show All</button>

                            <button onClick={() => {
                                setLayers((prev) => ({ ...prev, business: { ...prev.business, enabled: false }, vacant: { ...prev.vacant, enabled: false } }));
                                setShowOpportunityZones(false);
                            }} className="text-[11px] px-3 py-2 rounded-lg glass hover:bg-glass-200 transition-colors text-white/60 hover:text-white text-left" aria-label="Clear all layers">⭕ Clear All</button>

                            <button onClick={() => {
                                setLayers((prev) => ({ ...prev, business: { ...prev.business, enabled: false }, vacant: { ...prev.vacant, enabled: true } }));
                                setShowOpportunityZones(true);
                            }} className="col-span-2 text-[11px] px-3 py-2 rounded-lg bg-brand-cyan/20 border border-brand-cyan/50 hover:bg-brand-cyan/30 transition-colors text-white font-bold text-center" aria-label="Show Opportunity Zones">
                                💎 Opportunity Zones
                            </button>
                        </div>
                    </CardContent>

                    <div className="p-4 border-t border-glass-border">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-white/40">Showing</span>
                            <Badge>{visibleFeatures.length.toLocaleString()} / {totalFeatures.toLocaleString()} points</Badge>
                        </div>
                    </div>
                </Card>
            </motion.div>

            {!filterOpen && (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} onClick={() => setFilterOpen(true)} className="absolute top-4 left-4 z-[1000] p-3 glass-strong rounded-xl hover:shadow-glow transition-shadow" aria-label="Open filter panel">
                    <Layers className="w-5 h-5 text-brand-cyan" />
                </motion.button>
            )}

            {/* Stats Overlay */}
            <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
                {(Object.values(layers) as MapLayer[]).map((layer) => (
                    <div key={layer.key} className={`glass-strong rounded-lg px-3 py-2 flex items-center gap-2 transition-opacity ${layer.enabled ? "opacity-100" : "opacity-40"}`}>
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: layer.color }} />
                        <span className="text-sm font-medium">{layer.loading ? "…" : layer.features.length.toLocaleString()}</span>
                        <span className="text-[10px] text-white/40 hidden sm:inline">{layer.label.split(" ")[0]}</span>
                    </div>
                ))}
            </div>

            {mapMode === "future" && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] glass-strong rounded-xl px-4 py-2 flex items-center gap-2 border border-brand-purple/30">
                    <Rocket className="w-4 h-4 text-brand-purple animate-pulse" />
                    <span className="text-xs font-semibold text-brand-purple">3-Year Prediction Mode Active</span>
                </div>
            )}
        </div>
    );
}
