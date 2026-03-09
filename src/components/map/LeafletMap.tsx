"use client";

import React, { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Polygon, Circle } from "react-leaflet";
import type { GeoJSONFeature } from "@/lib/arcgis";
import type { LayerKey } from "@/app/map/page";
import "leaflet/dist/leaflet.css";

export interface MapFeature {
    feature: GeoJSONFeature<Record<string, unknown>>;
    color: string;
    layerKey: LayerKey;
}

interface Props {
    features: MapFeature[];
    onMarkerClick?: (feature: GeoJSONFeature<Record<string, unknown>>, layerKey: LayerKey) => void;
    futureMode?: boolean;
}

function MapResizer() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 100);
    }, [map]);
    return null;
}

const LAYER_LABELS: Record<LayerKey, string> = {
    business: "Business License",
    vacant: "Vacant Property",
};

function getLabel(props: Record<string, unknown>, layerKey: LayerKey): string {
    switch (layerKey) {
        case "business":
            return String(props.custCOMPANY_NAME || props.BUSNAME || props.Business_Name || props.NAME || props.DBA || "Business");
        case "vacant":
            return String(props.Address || props.PropertyType || props.STATUS || props.Type || props.status || "Property");
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

export default function LeafletMap({ features, onMarkerClick, futureMode }: Props) {
    // In future mode, boost business and reduce crime opacity to simulate prediction
    const getOpacity = (layerKey: LayerKey): number => {
        if (!futureMode) {
            return 0.65;
        }
        // Future mode: businesses glow, vacancies shrink
        switch (layerKey) {
            case "business": return 0.9;
            case "vacant": return 0.3;
        }
    };

    const getRadius = (layerKey: LayerKey): number => {
        if (!futureMode) {
            return layerKey === "business" ? 6 : 7;
        }
        switch (layerKey) {
            case "business": return 9;
            case "vacant": return 4;
        }
    };

    return (
        <MapContainer
            center={[32.3792, -86.3077]}
            zoom={12}
            className="w-full h-full"
            style={{ background: "#0a0a14" }}
            zoomControl={false}
        >
            <MapResizer />
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
                const isOpZone = props.STATUS === "OPPORTUNITY ZONE";

                const pathOpts = {
                    color: futureMode && layerKey === "business" ? "#00f0ff" : color,
                    fillColor: futureMode && layerKey === "business" ? "#00f0ff" : color,
                    fillOpacity: getOpacity(layerKey),
                    weight: isOpZone ? 3 : 1,
                    opacity: 0.8,
                    className: isOpZone ? "prime-target" : "",
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
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color }}>
                                        {isOpZone ? "💎 Prime Target" : LAYER_LABELS[layerKey]}
                                    </span>
                                </div>
                                <h3 className="font-bold text-sm text-white leading-tight">
                                    {layerKey === "business" ? String(props.custCOMPANY_NAME || props.BUSNAME || props.Business_Name || "Business") : String(props.Address || props.address || "Vacant Property")}
                                </h3>
                                {layerKey === "business" && (
                                    <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wide">{String(props.scNAME || "Business category")}</p>
                                )}
                            </div>

                            {/* Body */}
                            <div className="p-3 space-y-2.5">
                                <div className="text-white/70">
                                    <p className="flex items-center gap-2 mb-1">
                                        <span className="text-white/40 text-[10px] uppercase w-12">Addr:</span>
                                        <span className="truncate">{address}</span>
                                    </p>
                                    {!isOpZone && layerKey !== "business" && Boolean(props.District) && (
                                        <p className="flex items-center gap-2">
                                            <span className="text-white/40 text-[10px] uppercase w-12">Dist:</span>
                                            <span>{String(props.District)}</span>
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

                                {isOpZone && (
                                    <div className="mt-2 p-2 bg-brand-cyan/20 border border-brand-cyan/40 rounded flex flex-col gap-1 items-center text-center">
                                        <span className="text-brand-cyan text-[10px] font-bold uppercase tracking-widest">High Traffic Zone</span>
                                        <span className="text-white text-xs">Ideal for Redev</span>
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
                            {layerKey === "business" && bd.traffic > 50 && (
                                <Circle
                                    center={[coords[1], coords[0]]}
                                    radius={bd.traffic * 1.5}
                                    pathOptions={{
                                        color: "transparent",
                                        fillColor: "#00f0ff",
                                        fillOpacity: (bd.traffic / 100) * 0.2,
                                    }}
                                />
                            )}
                            <CircleMarker
                                center={[coords[1], coords[0]]}
                                radius={getRadius(layerKey)}
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
        </MapContainer>
    );
}
