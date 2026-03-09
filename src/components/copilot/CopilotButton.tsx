"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import CopilotPanel from "./CopilotPanel";
import { useAppState } from "@/lib/context";

export default function CopilotButton() {
    const { copilotOpen, setCopilotOpen } = useAppState();

    return (
        <>
            <CopilotPanel isOpen={copilotOpen} onClose={() => setCopilotOpen(false)} />

            <AnimatePresence>
                {!copilotOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setCopilotOpen(true)}
                        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-brand-cyan to-brand-purple flex items-center justify-center shadow-glow-lg transition-shadow hover:shadow-[0_0_30px_rgba(0,240,255,0.4)]"
                        aria-label="Open AI Copilot"
                    >
                        <Sparkles className="w-5 h-5 text-white" />
                        <span className="absolute inset-0 rounded-full border-2 border-brand-cyan/30 animate-ping" />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}
