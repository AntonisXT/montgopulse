import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import ClientProviders from "@/components/layout/ClientProviders";

export const metadata: Metadata = {
    title: "MontgoPulse — Predictive Urban Intelligence",
    description:
        "AI-powered urban intelligence platform for Montgomery, AL. Real-time ArcGIS data, Bright Data scraping, and predictive analytics.",
    keywords: ["Montgomery", "urban intelligence", "AI", "civic tech", "real estate", "safety", "ArcGIS", "Bright Data"],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-surface antialiased">
                <ClientProviders>
                    <Sidebar />
                    <main className="ml-0 md:ml-[260px] min-h-screen transition-all duration-300">
                        {children}
                    </main>
                </ClientProviders>
            </body>
        </html>
    );
}
