"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

type TrackedZone = {
    id: string;
    name: string;
};

interface PortfolioContextType {
    trackedZones: TrackedZone[];
    addZone: (zone: string) => void;
    removeZone: (zone: string) => void;
    isZoneTracked: (zone: string) => boolean;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export function PortfolioProvider({ children }: { children: ReactNode }) {
    const [trackedZones, setTrackedZones] = useState<TrackedZone[]>([
        { id: "Downtown Montgomery", name: "Downtown Montgomery" },
        { id: "Cloverdale", name: "Cloverdale" }
    ]);

    const addZone = (zoneName: string) => {
        setTrackedZones((prev) => {
            if (prev.some(z => z.name === zoneName)) return prev;
            return [...prev, { id: zoneName, name: zoneName }];
        });
    };

    const removeZone = (zoneName: string) => {
        setTrackedZones((prev) => prev.filter((z) => z.name !== zoneName));
    };

    const isZoneTracked = (zoneName: string) => {
        return trackedZones.some((z) => z.name === zoneName);
    };

    return (
        <PortfolioContext.Provider value={{ trackedZones, addZone, removeZone, isZoneTracked }}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const context = useContext(PortfolioContext);
    if (!context) {
        throw new Error("usePortfolio must be used within a PortfolioProvider");
    }
    return context;
}
