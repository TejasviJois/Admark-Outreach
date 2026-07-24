import * as cheerio from "cheerio";

import { ExternalServiceError, ValidationError } from "@/lib/errors/domain-error";
import type {
  CrawledPage,
  WebsiteCrawlProvider,
  WebsiteExtractionResult,
} from "@/providers/crawl/crawl.provider";
import { logger } from "@/utils/logger";

const MAX_PAGES = 5;
const FETCH_TIMEOUT_MS = 12000;
const USER_AGENT =
  "AdmarkOutreachBot/1.0 (+https://admark-outreach.vercel.app; enrichment)";

const ABOUT_HINTS = ["about", "about-us", "our-story", "company", "who-we-are"];
const SERVICES_HINTS = [
  "service",
  "services",
  "solutions",
  "products",
  "what-we-do",
  "offerings",
];
const CONTACT_HINTS = ["contact", "contact-us", "get-in-touch", "support"];

function normalizeWebsiteUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new ValidationError("Website URL is required for enrichment");
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new ValidationError("Invalid website URL");
  }
}

function absolutize(base: string, href: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function classifyPath(pathname: string): "about" | "services" | "contact" | null {
  const path = pathname.toLowerCase();
  if (ABOUT_HINTS.some((hint) => path.includes(hint))) return "about";
  if (SERVICES_HINTS.some((hint) => path.includes(hint))) return "services";
  if (CONTACT_HINTS.some((hint) => path.includes(hint))) return "contact";
  return null;
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  return Array.from(new Set(matches ?? [])).slice(0, 10);
}

function extractPhones(text: string): string[] {
  const matches = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)\d{3,4}[\s.-]?\d{3,4}/g,
  );
  return Array.from(new Set(matches ?? [])).slice(0, 10);
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        `Failed to fetch ${url} (${response.status})`,
      );
    }

    return await response.text();
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error;
    const message = error instanceof Error ? error.message : "Fetch failed";
    throw new ExternalServiceError(`Website crawl failed for ${url}: ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

function parsePage(url: string, html: string): CrawledPage {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, nav, footer").remove();
  const title = cleanText($("title").first().text()) || null;
  const text = cleanText($("body").text()).slice(0, 20000);
  return {
    url,
    title,
    text,
    emails: extractEmails(html),
    phones: extractPhones(text),
  };
}

function discoverLinks(baseUrl: string, html: string): string[] {
  const $ = cheerio.load(html);
  const byKind = new Map<"about" | "services" | "contact", string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const absolute = absolutize(baseUrl, href);
    if (!absolute) return;
    try {
      const url = new URL(absolute);
      const base = new URL(baseUrl);
      if (url.hostname !== base.hostname) return;
      const kind = classifyPath(url.pathname);
      if (!kind || byKind.has(kind)) return;
      byKind.set(kind, absolute);
    } catch {
      // ignore bad URLs
    }
  });

  return Array.from(byKind.values());
}

function extractAbout(pages: CrawledPage[]): string | null {
  const aboutPage = pages.find((page) =>
    classifyPath(new URL(page.url).pathname) === "about",
  );
  const source = aboutPage ?? pages[0];
  if (!source) return null;
  return source.text.slice(0, 1200) || source.title;
}

function extractServices(pages: CrawledPage[], htmlByUrl: Map<string, string>): string[] {
  const services: string[] = [];

  for (const page of pages) {
    const kind = classifyPath(new URL(page.url).pathname);
    if (kind !== "services" && kind !== null && page !== pages[0]) continue;
    const html = htmlByUrl.get(page.url);
    if (!html) continue;
    const $ = cheerio.load(html);
    $("h2, h3, li").each((_, el) => {
      const text = cleanText($(el).text());
      if (text.length >= 3 && text.length <= 80) {
        services.push(text);
      }
    });
  }

  return Array.from(new Set(services)).slice(0, 20);
}

function extractSocialLinks(html: string, baseUrl: string): Record<string, string> {
  const $ = cheerio.load(html);
  const social: Record<string, string> = {};

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const absolute = absolutize(baseUrl, href);
    if (!absolute) return;
    const lower = absolute.toLowerCase();
    if (lower.includes("linkedin.com") && !social.linkedin) social.linkedin = absolute;
    if (lower.includes("twitter.com") || lower.includes("x.com")) {
      if (!social.twitter) social.twitter = absolute;
    }
    if (lower.includes("facebook.com") && !social.facebook) social.facebook = absolute;
    if (lower.includes("instagram.com") && !social.instagram) {
      social.instagram = absolute;
    }
  });

  return social;
}

function extractCompanyName(home: CrawledPage, html: string): string | null {
  const $ = cheerio.load(html);
  const og = cleanText($('meta[property="og:site_name"]').attr("content") ?? "");
  if (og) return og;
  const h1 = cleanText($("h1").first().text());
  if (h1 && h1.length <= 80) return h1;
  if (home.title) {
    return home.title.split("|")[0]?.split("-")[0]?.trim() || home.title;
  }
  return null;
}

export class CheerioWebsiteCrawlProvider implements WebsiteCrawlProvider {
  async extractFromWebsite(websiteUrl: string): Promise<WebsiteExtractionResult> {
    const website = normalizeWebsiteUrl(websiteUrl);
    logger.info("Starting website crawl", { website });

    const homeHtml = await fetchHtml(website);
    const homePage = parsePage(website, homeHtml);
    const htmlByUrl = new Map<string, string>([[website, homeHtml]]);
    const pages: CrawledPage[] = [homePage];

    const candidates = discoverLinks(website, homeHtml).slice(0, MAX_PAGES - 1);
    for (const candidate of candidates) {
      try {
        const html = await fetchHtml(candidate);
        htmlByUrl.set(candidate, html);
        pages.push(parsePage(candidate, html));
      } catch (error) {
        logger.warn("Skipping unreachable page during crawl", {
          url: candidate,
          error: error instanceof Error ? error.message : "unknown",
        });
      }
    }

    const allEmails = Array.from(new Set(pages.flatMap((page) => page.emails)));
    const socialLinks = extractSocialLinks(homeHtml, website);
    const services = extractServices(pages, htmlByUrl);
    const about = extractAbout(pages);

    return {
      website,
      companyName: extractCompanyName(homePage, homeHtml),
      about,
      services,
      contactEmail: allEmails[0] ?? null,
      linkedinUrl: socialLinks.linkedin ?? null,
      socialLinks,
      location: null,
      sourcePages: pages.map((page) => page.url),
      pages,
    };
  }
}

export function createWebsiteCrawlProvider(): WebsiteCrawlProvider {
  return new CheerioWebsiteCrawlProvider();
}
