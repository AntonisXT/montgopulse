"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[MontgoPulse Error Boundary]", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center" role="alert">
                    <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                        {this.props.fallbackTitle || "Data Unavailable"}
                    </h3>
                    <p className="text-sm text-white/50 max-w-md mb-6">
                        We couldn&apos;t load this section. This may be caused by a temporary ArcGIS API outage
                        or a network issue. Please try again.
                    </p>
                    <button
                        onClick={() => {
                            this.setState({ hasError: false, error: null });
                            window.location.reload();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 transition-colors"
                        aria-label="Retry loading data"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Retry
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
