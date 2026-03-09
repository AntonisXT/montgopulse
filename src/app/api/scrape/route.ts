// ============================================================================
// Bright Data Scraping Browser API Route
// ============================================================================
// Demonstrates connecting to Bright Data's Scraping Browser via puppeteer-core.
// The Scraping Browser handles CAPTCHAs, fingerprinting, and proxy rotation
// automatically via their managed browser infrastructure.
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

// Lazy-import puppeteer-core to keep it server-only
async function getPuppeteer() {
    const puppeteer = await import("puppeteer-core");
    return puppeteer.default;
}

interface ScrapeRequest {
    targetUrl: string;
    extractionType: "sentiment" | "pricing" | "reviews" | "general";
    selectors?: Record<string, string>;
}

interface ScrapeResult {
    success: boolean;
    url: string;
    extractionType: string;
    timestamp: string;
    data: Record<string, unknown>;
    logs: string[];
    error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ScrapeResult>> {
    const logs: string[] = [];
    const log = (msg: string) => {
        const ts = new Date().toISOString().slice(11, 23);
        logs.push(`[${ts}] ${msg}`);
    };

    try {
        const body: ScrapeRequest = await request.json();
        const { targetUrl, extractionType, selectors } = body;

        if (!targetUrl) {
            return NextResponse.json(
                { success: false, url: "", extractionType: "", timestamp: new Date().toISOString(), data: {}, logs: ["ERROR: targetUrl is required"], error: "Missing targetUrl" },
                { status: 400 }
            );
        }

        log(`INFO  Initializing Bright Data Scraping Browser session`);
        log(`INFO  Extraction type: ${extractionType}`);
        log(`INFO  Target: ${targetUrl}`);

        // ---- Bright Data WebSocket Connection ----
        // The BRIGHT_DATA_WS_ENDPOINT should be:
        //   wss://brd-customer-<CUSTOMER_ID>-zone-scraping_browser1:<PASSWORD>@brd.superproxy.io:9222
        const wsEndpoint = process.env.BRIGHT_DATA_WS_ENDPOINT;

        if (!wsEndpoint) {
            log(`WARN  No BRIGHT_DATA_WS_ENDPOINT configured — using simulated scrape`);
            // Return simulated data for demo/hackathon purposes
            return NextResponse.json(simulateScrape(targetUrl, extractionType, logs));
        }

        log(`INFO  Connecting to Bright Data Scraping Browser...`);
        log(`INFO  Endpoint: wss://brd-customer-***-zone-scraping_browser1:***@brd.superproxy.io:9222`);

        const puppeteer = await getPuppeteer();

        // Connect to Bright Data's managed browser via WebSocket
        const browser = await puppeteer.connect({
            browserWSEndpoint: wsEndpoint,
        });

        log(`SUCCESS  Connected to Scraping Browser`);

        const page = await browser.newPage();

        // Set viewport and user agent for consistency
        await page.setViewport({ width: 1920, height: 1080 });
        log(`INFO  Page created, navigating to target...`);

        // Navigate — Bright Data handles CAPTCHA solving, proxy rotation, etc.
        await page.goto(targetUrl, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

        log(`SUCCESS  Page loaded: ${await page.title()}`);
        log(`INFO  Bright Data CAPTCHA bypass: active`);
        log(`INFO  Extracting ${extractionType} data...`);

        let extractedData: Record<string, unknown> = {};

        switch (extractionType) {
            case "sentiment":
            case "reviews": {
                // Extract review/sentiment data
                const reviewSelector = selectors?.review || "[data-testid='review'], .review, .comment";
                extractedData = await page.evaluate((sel: string) => {
                    const reviews = Array.from(document.querySelectorAll(sel)).slice(0, 20);
                    return {
                        reviewCount: reviews.length,
                        reviews: reviews.map((el) => ({
                            text: el.textContent?.trim().slice(0, 200) || "",
                            rating: el.querySelector("[class*='star'], [aria-label*='star']")?.getAttribute("aria-label") || "N/A",
                        })),
                        pageTitle: document.title,
                    };
                }, reviewSelector);
                break;
            }
            case "pricing": {
                // Extract pricing data
                const priceSelector = selectors?.price || "[data-testid='price'], .price, .listing-price";
                extractedData = await page.evaluate((sel: string) => {
                    const prices = Array.from(document.querySelectorAll(sel)).slice(0, 30);
                    return {
                        priceCount: prices.length,
                        prices: prices.map((el) => ({
                            value: el.textContent?.trim() || "",
                        })),
                        pageTitle: document.title,
                    };
                }, priceSelector);
                break;
            }
            default: {
                // General extraction: title, meta, headings, links
                extractedData = await page.evaluate(() => ({
                    title: document.title,
                    metaDescription: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
                    headings: Array.from(document.querySelectorAll("h1, h2, h3")).slice(0, 10).map((h) => h.textContent?.trim()),
                    linkCount: document.querySelectorAll("a").length,
                    imageCount: document.querySelectorAll("img").length,
                }));
            }
        }

        log(`SUCCESS  Data extraction complete`);
        log(`INFO  Records extracted: ${JSON.stringify(extractedData).length} bytes`);

        await browser.close();
        log(`INFO  Browser session closed`);

        return NextResponse.json({
            success: true,
            url: targetUrl,
            extractionType,
            timestamp: new Date().toISOString(),
            data: extractedData,
            logs,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        log(`ERROR  Scraping failed: ${message}`);
        return NextResponse.json(
            {
                success: false,
                url: "",
                extractionType: "",
                timestamp: new Date().toISOString(),
                data: {},
                logs,
                error: message,
            },
            { status: 500 }
        );
    }
}

// ---- Simulated Scrape for Demo ----

function simulateScrape(url: string, type: string, logs: string[]): ScrapeResult {
    const log = (msg: string) => {
        const ts = new Date().toISOString().slice(11, 23);
        logs.push(`[${ts}] ${msg}`);
    };

    log(`INFO  [SIMULATED] Connecting to Scraping Browser...`);
    log(`SUCCESS  [SIMULATED] Connected`);
    log(`INFO  [SIMULATED] Navigating to ${url}`);
    log(`SUCCESS  [SIMULATED] Page loaded`);
    log(`INFO  [SIMULATED] CAPTCHA detection: none required`);
    log(`INFO  [SIMULATED] Extracting ${type} data...`);

    const mockData: Record<string, Record<string, unknown>> = {
        sentiment: {
            overallSentiment: 0.72,
            reviewCount: 847,
            averageRating: 4.2,
            sentimentBreakdown: { positive: 68, neutral: 20, negative: 12 },
            topKeywords: ["great location", "affordable", "growing community", "safe neighborhood", "good schools"],
            recentReviews: [
                { text: "Montgomery is experiencing a renaissance in its downtown area.", rating: 5, date: "2025-12-01" },
                { text: "Great investment opportunity in the midtown district.", rating: 4, date: "2025-11-28" },
                { text: "The new developments along Dexter Ave are impressive.", rating: 5, date: "2025-11-25" },
            ],
        },
        pricing: {
            medianPrice: 185000,
            averagePrice: 210000,
            priceRange: { min: 85000, max: 650000 },
            pricePerSqFt: 98,
            yearOverYearChange: 6.3,
            listings: [
                { address: "421 Dexter Ave", price: 245000, sqft: 2100, beds: 3, type: "Single Family" },
                { address: "889 Perry St", price: 189000, sqft: 1800, beds: 3, type: "Single Family" },
                { address: "156 Court St", price: 320000, sqft: 2800, beds: 4, type: "Single Family" },
                { address: "78 Monroe St", price: 155000, sqft: 1400, beds: 2, type: "Townhouse" },
            ],
        },
        reviews: {
            totalReviews: 1243,
            averageRating: 3.9,
            reviews: [
                { text: "Excellent local dining scene on Cloverdale.", rating: 5, source: "Yelp" },
                { text: "Parks system has improved significantly.", rating: 4, source: "Google" },
                { text: "Public transit could use improvement.", rating: 3, source: "Yelp" },
            ],
        },
        general: {
            title: "Montgomery, AL — City Data Overview",
            populationGrowth: 2.1,
            medianIncome: 42500,
            crimeIndexChange: -8.3,
            walkScore: 34,
        },
    };

    log(`SUCCESS  [SIMULATED] Extraction complete`);
    log(`INFO  [SIMULATED] Browser session closed`);

    return {
        success: true,
        url,
        extractionType: type,
        timestamp: new Date().toISOString(),
        data: mockData[type] || mockData.general,
        logs,
    };
}
