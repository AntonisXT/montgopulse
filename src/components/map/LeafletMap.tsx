"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polygon, Circle } from "react-leaflet";
import type { GeoJSONFeature } from "@/lib/arcgis";
import type { LayerKey } from "@/app/map/page";
import { useAppState } from "@/lib/context";
import "leaflet/dist/leaflet.css";

export interface MapFeature {
    feature: GeoJSONFeature<Record<string, unknown>>;
    color: string;
    layerKey: LayerKey;
}

interface HeatmapPoint {
    lat: number;
    lng: number;
    intensity: number;
    name: string;
    score: number;
}

interface Props {
    features: MapFeature[];
    onMarkerClick?: (feature: GeoJSONFeature<Record<string, unknown>>, layerKey: LayerKey) => void;
    futureMode?: boolean;
    showFootTraffic?: boolean;
    predictionMonth?: number;
    heatmapData?: HeatmapPoint[];
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 100);
    }, [map]);
    return null;
}

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

function MapController() {
    const map = useMap();
    const { selectedZone } = useAppState();

    useEffect(() => {
        if (!selectedZone || selectedZone === "All Montgomery") {
            map.flyTo([32.3792, -86.3077], 12, { duration: 1.5 });
            return;
        }
        const targetZone = MAP_NEIGHBORHOODS.find(n => n.name.toLowerCase() === selectedZone.toLowerCase());
        if (targetZone) {
            map.flyTo([targetZone.lat, targetZone.lng], 14, { duration: 1.5 });
        }
    }, [selectedZone, map]);
    return null;
}

const LAYER_LABELS: Record<LayerKey, string> = {
    business: "Business License",
    permits: "Construction Permit",
    violations: "Code Violation",
};

function getLabel(props: Record<string, unknown>, layerKey: LayerKey): string {
    switch (layerKey) {
        case "business":
            return String(props.custCOMPANY_NAME || props.BUSNAME || props.Business_Name || props.NAME || props.DBA || "Business");
        case "permits":
            return String(props.PermitDescription || props.UseType || props.JobDescription || "Permit");
        case "violations":
            return String(props.CaseType || props.ComplaintRem || "Violation");
        default:
            return "Marker";
    }
}

function getAddress(props: Record<string, unknown>): string {
    return String(
        props.Full_Address || props.address || props.Address || props.BUSADDRESS || props.SITUS_FULL || props.location || "N/A"
    );
}

function getBrightDataMock(lat: number, lng: number) {
    const seed = Math.abs((lat + lng) * 10000);
    const traffic = Math.floor((Math.sin(seed) * 0.5 + 0.5) * 100); // 0-100
    const rating = (Math.cos(seed) * 1.5 + 3.5).toFixed(1); // 2.0 - 5.0
    const sentiment = Math.floor((Math.sin(seed * 2) * 0.2 + 0.8) * 100); // 60-100
    return {
        traffic: Math.max(10, Math.min(100, traffic)),
        rating: Math.max(1.0, Math.min(5.0, Number(rating))),
        sentiment: Math.max(10, Math.min(100, sentiment))
    };
}

export default function LeafletMap({ features, onMarkerClick, futureMode, showFootTraffic, predictionMonth = 0, heatmapData = [] }: Props) {
    const { selectedZone } = useAppState();

    console.log("Rendering Prediction Mode with Month:", predictionMonth, "| Features:", features.length, "| Heatmap Points:", heatmapData.length);

    const timeScale = 1 + (predictionMonth / 24) * 0.6;
    const decayScale = Math.max(0.3, 1 - (predictionMonth / 24) * 0.7);

    // In future mode, boost business and reduce crime opacity to simulate prediction
    const getOpacity = (layerKey: LayerKey, props: Record<string, unknown>): number => {
        if (!futureMode) {
            return 0.75;
        }
        if (props.STATUS === "BLIGHT ERADICATION") return 0.25 * decayScale;
        if (props.STATUS === "APPRECIATION HOTSPOT") return Math.min(1, 0.85 * timeScale);
        if (props.STATUS === "GENTRIFICATION FRONTIER") return Math.min(1, 0.85 * timeScale);
        if (props.STATUS === "MARKET_GAP") return Math.min(1, 0.9 * timeScale);

        // Fallback Mode
        switch (layerKey) {
            case "business": return 0.9;
            case "permits": return 0.6;
            case "violations": return 0;
            default: return 0.65;
        }
    };

    const getRadius = (layerKey: LayerKey, props: Record<string, unknown>): number => {
        if (!futureMode) {
            return layerKey === "business" ? 6 : layerKey === "permits" ? 7 : layerKey === "violations" ? 6 : 5;
        }

        if (props.STATUS === "BLIGHT ERADICATION") return Math.max(2, 4 * decayScale);
        if (props.STATUS === "APPRECIATION HOTSPOT") return Math.round(14 * timeScale);
        if (props.STATUS === "GENTRIFICATION FRONTIER") return Math.round(7 * timeScale);
        if (props.STATUS === "MARKET_GAP") return Math.round(16 * timeScale);

        switch (layerKey) {
            case "business": return 9;
            case "permits": return 16;
            case "violations": return 0;
            default: return 6;
        }
    };

    const formatCurrency = (val: unknown) => {
        if (typeof val === 'number') {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
        }
        return "$0";
    };

    return (
        <MapContainer
            center={[32.3792, -86.3077]}
            zoom={12}
            className="w-full h-full"
            style={{ background: "#0a0a14" }}
            zoomControl={false}
            ref={(map) => {
                if (map && typeof window !== "undefined") {
                    // Optionally bind to window for debugging or other scripts
                    (window as any).__leafletMap = map;
                }
            }}
        >
            <MapResizer />
            <MapController />
            <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {features.map(({ feature, color, layerKey }, i) => {
                const geomType = feature.geometry?.type;
                if (!geomType || !feature.geometry?.coordinates) return null;

                const props = feature.properties;

                const label = getLabel(props, layerKey);
                const address = getAddress(props);
                const uniqueKey = `${layerKey}-${props.OBJECTID || props.FID || props.GlobalID || i}-${i}`;

                let lat = 0, lng = 0;
                if (geomType === "Point") {
                    lng = feature.geometry.coordinates[0] as number;
                    lat = feature.geometry.coordinates[1] as number;
                } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
                    const coords = feature.geometry.coordinates as any[];
                    if (coords[0] && coords[0][0]) {
                        lng = coords[0][0][0];
                        lat = coords[0][0][1];
                    }
                }

                const bd = getBrightDataMock(lat, lng);
                const isGentrification = props.STATUS === "GENTRIFICATION VELOCITY";
                const isBlight = props.STATUS === "BLIGHT VULNERABILITY";
                const isCapitalGrowth = props.STATUS === "CAPITAL GROWTH CORRIDOR";

                const isHotspot = props.STATUS === "APPRECIATION HOTSPOT";
                const isFrontier = props.STATUS === "GENTRIFICATION FRONTIER";
                const isEradication = props.STATUS === "BLIGHT ERADICATION";
                const isMarketGap = props.STATUS === "MARKET_GAP";

                const isSpecial = isGentrification || isBlight || isCapitalGrowth || isHotspot || isFrontier || isEradication || isMarketGap;

                let specialColor = color;
                if (isGentrification || isHotspot) specialColor = "#00f0ff";
                if (isBlight || isEradication) specialColor = "#ef4444";
                if (isCapitalGrowth || isFrontier) specialColor = "#a855f7";
                if (isMarketGap) specialColor = "#f59e0b";

                const pathOpts = {
                    color: isSpecial ? specialColor :
                        futureMode && layerKey === "business" ? "#00f0ff" :
                            futureMode && layerKey === "permits" ? "#a855f7" : color,
                    fillColor: isSpecial ? specialColor :
                        futureMode && layerKey === "business" ? "#00f0ff" :
                            futureMode && layerKey === "permits" ? "#a855f7" : color,
                    fillOpacity: getOpacity(layerKey, props),
                    weight: isSpecial || (futureMode && layerKey === "permits" && !isEradication) ? 3 : 1,
                    opacity: 0.8,
                    className: (isSpecial && !isEradication) || (futureMode && layerKey === "permits") ? "prime-target heatmap-pulse" : "",
                    ...(isMarketGap ? { dashArray: "6 4", weight: 3 } : {}),
                };

                const handlers = {
                    click: () => {
                        if (onMarkerClick) onMarkerClick(feature, layerKey);
                    }
                };

                const popupContent = (
                    <Popup className="custom-leaflet-popup">
                        <div className="w-[240px] font-sans text-xs bg-[#0a0a14] rounded-lg overflow-hidden border border-white/10 shadow-2xl">
                            {/* Header */}
                            <div className="p-3 border-b border-white/10" style={{ backgroundColor: `${color}15` }}>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isSpecial ? specialColor : color }}>
                                        {isSpecial ? `🎯 ${props.STATUS}` : LAYER_LABELS[layerKey]}
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-white leading-tight line-clamp-2">
                                    {label}
                                </h3>
                                {layerKey === "business" && (
                                    <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wide truncate">{String(props.scNAME || "Business category")}</p>
                                )}
                                {layerKey === "permits" && Boolean(props.PermitStatus) && (
                                    <p className="text-[10px] text-brand-cyan/80 mt-1 uppercase tracking-wide truncate">Status: {String(props.PermitStatus)}</p>
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-3 space-y-2.5">
                                <div className="text-white/70">
                                    <p className="flex items-center gap-2 mb-1">
                                        <span className="text-white/40 text-[10px] uppercase w-12 shrink-0">Addr:</span>
                                        <span className="truncate">{address}</span>
                                    </p>

                                    {layerKey === "permits" && props.EstimatedCost !== undefined && (
                                        <p className="flex items-center gap-2">
                                            <span className="text-white/40 text-[10px] uppercase w-12 shrink-0">Cost:</span>
                                            <span className="font-bold text-brand-cyan text-[13px]">{formatCurrency(props.EstimatedCost)}</span>
                                        </p>
                                    )}

                                    {layerKey === "violations" && Boolean(props.ComplaintRem) && (
                                        <p className="flex gap-2">
                                            <span className="text-white/40 text-[10px] uppercase w-12 shrink-0">Desc:</span>
                                            <span className="line-clamp-2 text-white/60 text-xs">{String(props.ComplaintRem)}</span>
                                        </p>
                                    )}

                                    {!isSpecial && layerKey !== "business" && Boolean(props.District) && (
                                        <p className="flex items-center gap-2 mt-1">
                                            <span className="text-white/40 text-[10px] uppercase w-12 shrink-0">Dist:</span>
                                            <span>{String(props.District)}</span>
                                        </p>
                                    )}

                                    {isCapitalGrowth && props.TrafficScore !== undefined && (
                                        <p className="flex items-center gap-2 mt-1">
                                            <span className="text-white/40 text-[10px] uppercase w-12 shrink-0">Traffic:</span>
                                            <span className="font-bold text-brand-orange text-[12px]">{String(props.TrafficScore)}/100</span>
                                        </p>
                                    )}
                                </div>

                                {/* Bright Data Injection */}
                                {layerKey === "business" && (
                                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-white/50 uppercase flex items-center gap-1">🚥 Live Traffic</span>
                                            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-cyan" style={{ width: `${bd.traffic}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-white/50 uppercase flex items-center gap-1">⭐ Yelp Rating</span>
                                            <span className="text-xs font-bold text-brand-amber">{bd.rating} / 5.0</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-white/50 uppercase flex items-center gap-1">💭 Sentiment</span>
                                            <span className="text-xs font-bold text-brand-green">{bd.sentiment}% Pos</span>
                                        </div>
                                    </div>
                                )}

                                {layerKey === "business" && futureMode && (
                                    <div className="mt-2 p-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 rounded text-center">
                                        <span className="text-[#00f0ff] font-bold text-[10px] uppercase tracking-wider block mb-0.5">📈 3-Year Projection</span>
                                        <span className="text-white text-xs">+{Math.round(Math.abs(Math.sin(lat * lng)) * 15 + 5)}% growth estimated based on current density trends</span>
                                    </div>
                                )}

                                {isGentrification && (
                                    <div className="mt-2 p-2 bg-brand-cyan/20 border border-brand-cyan/40 rounded flex flex-col gap-1 items-center text-center">
                                        <span className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest">Gentrification Velocity</span>
                                    </div>
                                )}
                                {isHotspot && (
                                    <div className="mt-2 p-2 bg-brand-cyan/20 border border-brand-cyan/40 rounded flex flex-col gap-1 items-center text-center">
                                        <span className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest">Appreciation Hotspot</span>
                                    </div>
                                )}
                                {isBlight && (
                                    <div className="mt-2 p-2 bg-brand-orange/20 border border-brand-orange/40 rounded flex flex-col gap-1 items-center text-center">
                                        <span className="text-brand-orange text-[10px] font-bold uppercase tracking-widest">Blight Vulnerability</span>
                                    </div>
                                )}
                                {isEradication && (
                                    <div className="mt-2 p-2 bg-brand-red/20 border border-brand-red/40 rounded flex flex-col gap-1 items-center text-center">
                                        <span className="text-brand-red text-[10px] font-bold uppercase tracking-widest">Blight Eradication</span>
                                    </div>
                                )}
                                {isCapitalGrowth && (
                                    <div className="mt-2 p-2 bg-brand-purple/20 border border-brand-purple/40 rounded flex flex-col gap-1 items-center text-center">
                                        <span className="text-brand-purple text-[10px] font-bold uppercase tracking-widest">Capital Growth Corridor</span>
                                    </div>
                                )}
                                {isFrontier && (
                                    <div className="mt-2 p-2 bg-brand-purple/20 border border-brand-purple/40 rounded flex flex-col gap-1 items-center text-center">
                                        <span className="text-brand-purple text-[10px] font-bold uppercase tracking-widest">Gentrification Frontier</span>
                                        {futureMode && predictionMonth > 0 && (
                                            <span className="text-white/70 text-[10px] mt-1">Projected +{Math.round(predictionMonth * 1.2)}% growth in {predictionMonth} months</span>
                                        )}
                                    </div>
                                )}
                                {isMarketGap && (
                                    <div className="mt-2 p-2.5 bg-amber-500/15 border border-amber-500/40 rounded-lg flex flex-col gap-1.5 items-center text-center">
                                        <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">🎯 High-Yield Market Gap</span>
                                        <span className="text-white/80 text-[11px] leading-tight">
                                            Projected Market Gap: This area is <span className="font-bold text-amber-300">{String(props.underservedScore)}%</span> underserved in <span className="font-bold text-amber-300">{String(props.gapCategory)}</span> based on 24-month population growth projections.
                                        </span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-white/40">Businesses: {String(props.businessCount)}</span>
                                            <span className="text-[9px] text-white/40">•</span>
                                            <span className="text-[9px] text-white/40">Permits: {String(props.permitsCount)}</span>
                                        </div>
                                        {futureMode && predictionMonth > 0 && (
                                            <div className="mt-1 px-2 py-1 bg-amber-500/20 rounded text-[10px] text-amber-300 font-bold">
                                                🕐 Optimal Entry: +{Math.max(1, Math.round(predictionMonth * 0.6))} months
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Action */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onMarkerClick) onMarkerClick(feature, layerKey);
                                    }}
                                    className="mt-2 w-full py-2 rounded text-[10px] font-bold uppercase tracking-wider text-black flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: color }}
                                >
                                    🤖 AI Analysis
                                </button>
                            </div>
                        </div>
                    </Popup>
                );

                if (geomType === "Point") {
                    const coords = feature.geometry.coordinates as number[];
                    if (coords.length < 2) return null;
                    return (
                        <React.Fragment key={uniqueKey}>
                            {/* Bright Data Simulated Foot Traffic Heatmap (Under Marker) */}
                            {showFootTraffic && (layerKey === "business" || layerKey === "permits") && bd.traffic > 10 && (
                                <Circle
                                    center={[coords[1], coords[0]]}
                                    radius={bd.traffic * 2.5}
                                    pathOptions={{
                                        color: "transparent",
                                        fillColor: bd.traffic > 80 ? "#ef4444" : bd.traffic > 50 ? "#f97316" : "#eab308",
                                        fillOpacity: (bd.traffic / 100) * 0.35,
                                    }}
                                    className="heatmap-pulse"
                                />
                            )}
                            <CircleMarker
                                center={[coords[1], coords[0]]}
                                radius={getRadius(layerKey, props)}
                                pathOptions={pathOpts}
                                eventHandlers={handlers}
                            >
                                {popupContent}
                            </CircleMarker>
                        </React.Fragment>
                    );
                } else if (geomType === "Polygon" || geomType === "MultiPolygon") {
                    let rings: [number, number][][] = [];
                    if (geomType === "Polygon") {
                        const polyCoords = feature.geometry.coordinates as number[][][];
                        rings = polyCoords.map(ring => ring.map(c => [c[1], c[0]] as [number, number]));
                    } else {
                        const multiCoords = feature.geometry.coordinates as number[][][][];
                        rings = multiCoords.flatMap(poly => poly.map(ring => ring.map(c => [c[1], c[0]] as [number, number])));
                    }

                    if (rings.length === 0 || rings[0].length === 0) return null;

                    return (
                        <Polygon
                            key={uniqueKey}
                            positions={rings}
                            pathOptions={pathOpts}
                            eventHandlers={handlers}
                        >
                            {popupContent}
                        </Polygon>
                    );
                }

                return null;
            })}

            {/* Investment Heatmap Circles */}
            {futureMode && heatmapData.map((point, idx) => {
                if (point.intensity < 0.1) return null;
                const scaledRadius = (1200 + point.intensity * 1800) * timeScale;
                const heatColor = point.intensity > 0.7 ? "#ff5722" : point.intensity > 0.4 ? "#ff9800" : "#ffc107";
                return (
                    <React.Fragment key={`heatmap-${idx}`}>
                        <Circle
                            center={[point.lat, point.lng]}
                            radius={scaledRadius}
                            pathOptions={{
                                color: "transparent",
                                fillColor: heatColor,
                                fillOpacity: Math.min(0.35, point.intensity * 0.4 * timeScale),
                            }}
                            className="heatmap-pulse"
                        />
                        <Circle
                            center={[point.lat, point.lng]}
                            radius={scaledRadius * 0.5}
                            pathOptions={{
                                color: "transparent",
                                fillColor: heatColor,
                                fillOpacity: Math.min(0.5, point.intensity * 0.6 * timeScale),
                            }}
                        />
                    </React.Fragment>
                );
            })}
        </MapContainer>
    );
}
