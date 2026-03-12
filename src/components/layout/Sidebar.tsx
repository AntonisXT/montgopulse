"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Map,
    Bell,
    Terminal,
    FileText,
    ChevronLeft,
    ChevronRight,
    Activity,
    Zap,
    BrainCircuit,
    Menu,
    X,
    Target,
    Swords,
    Users,
    Briefcase,
    Settings,
    Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/map", label: "Spatial Explorer", icon: Map },
    { href: "/analytics", label: "Market Analytics", icon: Activity },
    { href: "/predictions", label: "Predictive Insights", icon: BrainCircuit },
    { href: "/compare", label: "District Battle", icon: Swords },
    { href: "/simulator", label: "Investment Simulator", icon: Calculator },
    { href: "/market-gap", label: "Citizen Pulse & Demand", icon: Users },
    { href: "/alerts", label: "Pulse Triggers", icon: Zap },
    { href: "/reports", label: "Dynamic Report Builder", icon: FileText },
];

const workspaceItems = [
    { href: "/portfolio", label: "My Portfolios", icon: Briefcase },
    { href: "/settings", label: "System Settings", icon: Settings },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const sidebarContent = (
        <>
            {/* Brand */}
            <div className="flex items-center gap-3 px-4 h-16 border-b border-glass-border">
                <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20">
                    <Zap className="w-5 h-5 text-brand-cyan" />
                    <div className="absolute inset-0 rounded-lg animate-pulse-glow" />
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <h1 className="text-base font-bold tracking-tight">
                                <span className="gradient-text">Montgo</span>
                                <span className="text-white">Pulse</span>
                            </h1>
                            <p className="text-[10px] text-white/30 font-medium tracking-wider uppercase">
                                Urban Intelligence
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-4 px-2 flex flex-col gap-1 overflow-y-auto scrollbar-thin" aria-label="Main navigation">
                <AnimatePresence>
                    {!collapsed && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="section-title px-3 mb-3"
                        >
                            Navigation
                        </motion.p>
                    )}
                </AnimatePresence>

                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                            <div
                                className={cn(
                                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer",
                                    isActive
                                        ? "bg-white/5"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                )}
                                aria-current={isActive ? "page" : undefined}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute left-0 inset-y-0 my-auto w-[3px] h-6 rounded-r-full bg-gradient-to-b from-cyan-400 to-purple-500 shadow-[0_0_8px_rgba(0,240,255,0.4)]"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" : "")} />
                                <AnimatePresence>
                                    {!collapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.15 }}
                                            className={cn(
                                                "text-sm whitespace-nowrap",
                                                isActive
                                                    ? "font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500"
                                                    : "font-medium"
                                            )}
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Link>
                    );
                })}

                <div className="mt-auto pt-4 flex flex-col gap-1">
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="section-title px-3 mb-2"
                            >
                                Workspace
                            </motion.p>
                        )}
                    </AnimatePresence>

                    {workspaceItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
                                <div
                                    className={cn(
                                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer",
                                        isActive
                                            ? "bg-brand-purple/10 text-brand-purple"
                                            : "text-white/50 hover:text-white hover:bg-glass-200"
                                    )}
                                    aria-current={isActive ? "page" : undefined}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute left-0 inset-y-0 my-auto w-[3px] h-6 rounded-r-full bg-brand-purple shadow-glow-purple"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    <Icon className={cn("w-5 h-5 shrink-0", isActive && "drop-shadow-[0_0_6px_rgba(168,85,247,0.5)]")} />
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="text-sm font-medium whitespace-nowrap"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Status */}
            < div className="px-3 pb-3" >
                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="glass rounded-lg p-3 mb-3"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                                <span className="text-xs font-medium text-white/60">System Status</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <Activity className="w-3 h-3" />
                                <span>All pipelines active</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Collapse Toggle - Desktop */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full hidden md:flex items-center justify-center gap-2 py-2 rounded-lg text-white/40 hover:text-white hover:bg-glass-200 transition-colors"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-xs"
                            >
                                Collapse
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div >
        </>
    );

    return (
        <>
            {/* Mobile Hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="fixed top-4 left-4 z-50 md:hidden p-2 glass-strong rounded-lg"
                aria-label="Open navigation menu"
            >
                <Menu className="w-5 h-5 text-brand-cyan" />
            </button>

            {/* Desktop Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: collapsed ? 72 : 260 }}
                transition={{ duration: 0.3, ease: "easeInOut" as const }}
                className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col bg-surface-raised/80 backdrop-blur-2xl border-r border-glass-border"
            >
                {sidebarContent}
            </motion.aside>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                        />
                        <motion.aside
                            initial={{ x: -280 }}
                            animate={{ x: 0 }}
                            exit={{ x: -280 }}
                            transition={{ duration: 0.3, ease: "easeInOut" as const }}
                            className="fixed left-0 top-0 bottom-0 w-[260px] z-50 md:hidden flex flex-col bg-surface-raised/95 backdrop-blur-2xl border-r border-glass-border"
                        >
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-glass-200 text-white/40 hover:text-white transition-colors"
                                aria-label="Close navigation menu"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            {sidebarContent}
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
