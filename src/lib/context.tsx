"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

// ---- Types ----
export interface MarkerInsight {
    label: string;
    address: string;
    layerKey: string;
    coordinates: [number, number];
    properties: Record<string, unknown>;
}

interface AppState {
    copilotOpen: boolean;
    setCopilotOpen: (open: boolean) => void;
    selectedMarker: MarkerInsight | null;
    dispatchMarkerToAI: (marker: MarkerInsight) => void;
    clearSelectedMarker: () => void;
    welcomeDismissed: boolean;
    dismissWelcome: () => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
    const [copilotOpen, setCopilotOpen] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState<MarkerInsight | null>(null);
    // IMPORTANT: Start as `true` (hidden) to avoid hydration mismatch.
    // The useEffect below will set it to `false` (show modal) on first visit.
    const [welcomeDismissed, setWelcomeDismissed] = useState(true);

    // Read localStorage ONLY in useEffect (client-side) to prevent hydration mismatch
    useEffect(() => {
        const dismissed = localStorage.getItem("montgopulse_welcome_dismissed") === "true";
        setWelcomeDismissed(dismissed);
    }, []);

    const dispatchMarkerToAI = useCallback((marker: MarkerInsight) => {
        setSelectedMarker(marker);
        setCopilotOpen(true);
    }, []);

    const clearSelectedMarker = useCallback(() => {
        setSelectedMarker(null);
    }, []);

    const dismissWelcome = useCallback(() => {
        setWelcomeDismissed(true);
        localStorage.setItem("montgopulse_welcome_dismissed", "true");
    }, []);

    return (
        <AppContext.Provider
            value={{
                copilotOpen,
                setCopilotOpen,
                selectedMarker,
                dispatchMarkerToAI,
                clearSelectedMarker,
                welcomeDismissed,
                dismissWelcome,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppState() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useAppState must be used within AppProvider");
    return context;
}
