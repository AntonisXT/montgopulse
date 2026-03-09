"use client";

import React from "react";
import { AppProvider } from "@/lib/context";
import CopilotButton from "@/components/copilot/CopilotButton";
import WelcomeModal from "@/components/layout/WelcomeModal";
import ErrorBoundary from "@/components/layout/ErrorBoundary";

/**
 * ClientProviders wraps the entire app with:
 * 1. React Context (AppProvider) — global state for marker→AI dispatch, welcome modal
 * 2. WelcomeModal — onboarding overlay on first visit
 * 3. ErrorBoundary — graceful fallback for any uncaught errors
 * 4. CopilotButton — persistent floating AI button
 */
export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <AppProvider>
            <WelcomeModal />
            <ErrorBoundary fallbackTitle="Something went wrong">
                {children}
            </ErrorBoundary>
            <CopilotButton />
        </AppProvider>
    );
}
