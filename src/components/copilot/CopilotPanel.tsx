"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Send, Sparkles, BarChart3, Loader2, Bot, User, MapPin, Target
} from "lucide-react";
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/context";
import { usePathname } from "next/navigation";

interface ChartData {
    type: "area" | "bar" | "pie" | "line";
    title: string;
    data: Record<string, unknown>[];
    dataKey: string;
    xKey: string;
    color?: string;
}

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    charts?: ChartData[];
    insightCard?: {
        title: string;
        coordinates: [number, number];
        suggestion: string;
        score: number;
    };
    timestamp: Date;
}

const QUICK_PROMPTS = [
    "Where should I open a cafe?",
    "Analyze neighborhood safety",
    "What's the revitalization score?",
    "Show the business landscape",
];

interface TooltipProps {
    active?: boolean;
    payload?: Array<{ color: string; name: string; value: number }>;
    label?: string;
}

const ChartTooltip = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload) return null;

    const formatValue = (name: string, value: number) => {
        if (name.includes("Inflow") || name.includes("Capital") || name.includes("Velocity") || name.includes("Permits")) {
            return `$${(value / 1000000).toFixed(1)}M`;
        }
        return value;
    };

    return (
        <div className="rounded-lg px-3 py-2 text-xs border shadow-xl" style={{ backgroundColor: '#1e293b', borderColor: '#334155' }}>
            <p style={{ color: '#f8fafc', opacity: 0.7 }} className="mb-1">{label}</p>
            {payload.map((p, i: number) => (
                <p key={i} style={{ color: p.color }} className="font-medium flex gap-2 justify-between">
                    <span>{p.name}:</span>
                    <span style={{ color: '#f8fafc' }}>{formatValue(p.name, p.value)}</span>
                </p>
            ))}
        </div>
    );
};

function InlineChart({ chart }: { chart: ChartData }) {
    const color = chart.color || "#00f0ff";

    return (
        <div className="glass rounded-lg p-3 mt-2">
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1">
                <BarChart3 className="w-3 h-3" />
                {chart.title}
            </p>
            <ResponsiveContainer width="100%" height={120}>
                {chart.type === "bar" ? (
                    <BarChart data={chart.data as any[]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey={chart.xKey} stroke="rgba(255,255,255,0.2)" fontSize={9} />
                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
                        <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} content={<ChartTooltip />} />
                        <Bar dataKey={chart.dataKey} fill={color} radius={[3, 3, 0, 0]} opacity={0.8} />
                    </BarChart>
                ) : chart.type === "line" ? (
                    <LineChart data={chart.data as any[]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey={chart.xKey} stroke="rgba(255,255,255,0.2)" fontSize={9} />
                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
                        <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} content={<ChartTooltip />} />
                        <Line type="monotone" dataKey={chart.dataKey} stroke={color} strokeWidth={2} dot={false} />
                    </LineChart>
                ) : (
                    <AreaChart data={chart.data as any[]}>
                        <defs>
                            <linearGradient id="copilotGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={color} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey={chart.xKey} stroke="rgba(255,255,255,0.2)" fontSize={9} />
                        <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} />
                        <Tooltip cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} content={<ChartTooltip />} />
                        <Area type="monotone" dataKey={chart.dataKey} stroke={color} fill="url(#copilotGrad)" strokeWidth={2} />
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}

interface CopilotPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CopilotPanel({ isOpen, onClose }: CopilotPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { selectedMarker, clearSelectedMarker, simulationHandOff } = useAppState();
    const pathname = usePathname();

    const dynamicPrompts = pathname === "/compare" ? [
        "Summarize the district battle",
        "Which zone is safer?",
        "Compare business density",
        "What's the best overall pick?"
    ] : pathname === "/market-gap" ? [
        "What are the top unmet needs?",
        "Explain citizen sentiment",
        "Where is demand highest?",
        "Analyze citizen feedback"
    ] : QUICK_PROMPTS;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Auto-greet when a simulation is handed off
    useEffect(() => {
        if (simulationHandOff && isOpen) {
            const simulationMessage = `User simulation for **${simulationHandOff.profile}** in **${simulationHandOff.zoneName}**. Match Score: **${simulationHandOff.score}/10**. Key Gaps: **${simulationHandOff.gapStatus}**. Sentiment: **${simulationHandOff.sentiment}%**. Provide an entry strategy.`;
            sendMessage(simulationMessage);
            // We don't clear simulationHandOff here as it's a state, but we could if we added a clear function.
            // For now, it triggers once when isOpen becomes true if it exists.
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [simulationHandOff, isOpen]);

    // Auto-greet when a marker is dispatched from the map
    useEffect(() => {
        if (selectedMarker && isOpen) {
            const greeting: Message = {
                id: Date.now().toString(),
                role: "assistant",
                content: `I see you are looking at **${selectedMarker.label}** (${selectedMarker.layerKey}) located at ${selectedMarker.address}. \n\nWould you like me to analyze foot traffic, review safety trends, or calculate the investment viability for this specific parcel?`,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, greeting]);
            clearSelectedMarker();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedMarker, isOpen]);

    const sendMessage = async (text: string) => {
        if (!text.trim() || loading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: "user",
            content: text,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await fetch("/api/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text, route: pathname }),
            });
            const data = await res.json();

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: data.message,
                charts: data.charts,
                insightCard: data.insightCard,
                timestamp: new Date(data.timestamp),
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    role: "assistant",
                    content: "Sorry, I encountered an error. Please try again.",
                    timestamp: new Date(),
                },
            ]);
        }
        setLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: "easeOut" as const }}
                    className="fixed bottom-20 right-6 z-50 w-[420px] h-[580px] flex flex-col rounded-2xl border border-glass-border bg-surface-raised/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
                    role="dialog"
                    aria-label="AI Copilot Chat"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 h-12 border-b border-glass-border bg-glass-100 shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center">
                                <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                            </div>
                            <span className="text-sm font-semibold">MontgoPulse AI</span>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20">
                                Copilot
                            </span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="w-7 h-7" aria-label="Close AI Copilot">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-cyan/20 to-brand-purple/20 border border-glass-border flex items-center justify-center mb-4">
                                    <Sparkles className="w-7 h-7 text-brand-cyan" />
                                </div>
                                <h3 className="text-sm font-semibold mb-1">MontgoPulse AI Copilot</h3>
                                <p className="text-xs text-white/40 mb-5 max-w-[260px]">
                                    Connected to live ArcGIS data & Bright Data. Click a map marker or ask me anything about Montgomery.
                                </p>
                                <div className="grid grid-cols-2 gap-2 w-full">
                                    {dynamicPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => sendMessage(prompt)}
                                            className="text-left text-[11px] px-3 py-2 rounded-lg glass hover:bg-glass-200 transition-colors text-white/60 hover:text-white"
                                            aria-label={`Ask: ${prompt}`}
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}>
                                {msg.role === "assistant" && (
                                    <div className="w-6 h-6 rounded-md bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <Bot className="w-3.5 h-3.5 text-brand-cyan" />
                                    </div>
                                )}
                                <div className={`max-w-[85%] ${msg.role === "user" ? "order-first" : ""}`}>
                                    <div
                                        className={`rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${msg.role === "user"
                                            ? "bg-brand-cyan/15 text-white border border-brand-cyan/20"
                                            : "glass text-white/80"
                                            }`}
                                    >
                                        {msg.content.split("\n").map((line, i) => (
                                            <React.Fragment key={i}>
                                                {line.startsWith("**") && line.endsWith("**") ? (
                                                    <strong className="text-white">{line.slice(2, -2)}</strong>
                                                ) : (
                                                    <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }} />
                                                )}
                                                {i < msg.content.split("\n").length - 1 && <br />}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    {/* Inline Charts */}
                                    {msg.charts?.map((chart, i) => (
                                        <InlineChart key={i} chart={chart} />
                                    ))}
                                    {/* Insight Card */}
                                    {msg.insightCard && (
                                        <div className="mt-3 p-3 rounded-xl border border-brand-green/30 bg-brand-green/10">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Target className="w-4 h-4 text-brand-green" />
                                                <span className="text-xs font-bold text-brand-green">{msg.insightCard.title}</span>
                                            </div>
                                            <p className="text-xs text-brand-green/80 mb-3">{msg.insightCard.suggestion}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs text-brand-green/60 font-mono">
                                                    <MapPin className="w-3 h-3" />
                                                    {msg.insightCard.coordinates[0].toFixed(3)}, {msg.insightCard.coordinates[1].toFixed(3)}
                                                </div>
                                                <div className="px-2 py-1 rounded bg-brand-green/20 text-brand-green text-[10px] font-bold">
                                                    Score: {msg.insightCard.score}/100
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <div className="w-6 h-6 rounded-md bg-brand-purple/10 border border-brand-purple/20 flex items-center justify-center shrink-0 mt-0.5">
                                        <User className="w-3.5 h-3.5 text-brand-purple" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="flex gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center shrink-0">
                                    <Bot className="w-3.5 h-3.5 text-brand-cyan" />
                                </div>
                                <div className="glass rounded-xl px-3 py-2.5 flex items-center gap-2">
                                    <Loader2 className="w-3.5 h-3.5 text-brand-cyan animate-spin" />
                                    <span className="text-xs text-white/40">Correlating ArcGIS data...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="p-3 border-t border-glass-border bg-glass-50 shrink-0">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about Montgomery data..."
                                className="flex-1 h-9 rounded-lg bg-glass-100 border border-glass-border px-3 text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-brand-cyan/30"
                                disabled={loading}
                                aria-label="Type your message to the AI Copilot"
                            />
                            <Button type="submit" variant="solid" size="icon" disabled={loading || !input.trim()} aria-label="Send message">
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </form>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
