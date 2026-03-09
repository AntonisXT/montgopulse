"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, MapPin, BrainCircuit, BarChart3, X, ArrowRight } from "lucide-react";
import { useAppState } from "@/lib/context";

export default function WelcomeModal() {
    const { welcomeDismissed, dismissWelcome } = useAppState();

    if (welcomeDismissed) return null;

    return (
        <AnimatePresence>
            {!welcomeDismissed && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Welcome to MontgoPulse"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative w-full max-w-lg mx-4 rounded-2xl border border-glass-border bg-surface-raised/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
                    >
                        {/* Gradient Header Bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-cyan" />

                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2.5 rounded-xl bg-brand-cyan/10 border border-brand-cyan/20">
                                    <Zap className="w-6 h-6 text-brand-cyan" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">
                                        <span className="gradient-text">Montgo</span>Pulse
                                    </h2>
                                    <p className="text-xs text-white/40 uppercase tracking-widest">Predictive Urban Intelligence</p>
                                </div>
                            </div>

                            <p className="text-sm text-white/70 leading-relaxed mb-6">
                                Welcome to <strong className="text-white">MontgoPulse</strong> — an AI-powered civic-tech platform that
                                cross-correlates <strong className="text-brand-cyan">live City of Montgomery ArcGIS data</strong> with{" "}
                                <strong className="text-brand-purple">Bright Data web scraping</strong> to deliver predictive urban intelligence for
                                investors, city planners, and community organizations.
                            </p>

                            {/* Feature highlights */}
                            <div className="grid grid-cols-2 gap-3 mb-8">
                                {[
                                    { icon: MapPin, label: "3 Live ArcGIS Layers", color: "text-brand-cyan" },
                                    { icon: BrainCircuit, label: "AI Copilot Analysis", color: "text-brand-purple" },
                                    { icon: BarChart3, label: "Predictive Models", color: "text-brand-green" },
                                    { icon: Zap, label: "Bright Data Pipeline", color: "text-brand-amber" },
                                ].map(({ icon: Icon, label, color }) => (
                                    <div key={label} className="flex items-center gap-2.5 glass rounded-lg px-3 py-2.5">
                                        <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                                        <span className="text-xs font-medium text-white/80">{label}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={dismissWelcome}
                                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-gradient-to-r from-brand-cyan to-brand-purple text-black font-semibold text-sm hover:opacity-90 transition-opacity"
                                aria-label="Enter MontgoPulse Dashboard"
                            >
                                Enter Dashboard
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <button
                            onClick={dismissWelcome}
                            className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-glass-200 transition-colors text-white/40 hover:text-white"
                            aria-label="Close welcome modal"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
