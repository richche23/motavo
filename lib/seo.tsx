// =============================================================================
// Motavo SEO core — site config, JSON-LD builders, metadata helper,
// unique per-page content generator (Phase 2), and IndexNow.
// Import path assumes the "@/lib" alias; if you don't use it, change imports
// elsewhere to a relative path like "../../lib/seo".
// =============================================================================

export const SITE_URL = 'https://motavo.au';
export const SITE_NAME = 'Motavo';
export const SITE_TAGLINE = 'Live Australian fuel prices and EV charging';

// -----------------------------------------------------------------------------
// JSON-LD
// -----------------------------------------------------------------------------
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user HTML is included.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: SITE_TAGLINE,
    // Add your real profiles here as you create them:
    sameAs: [] as string[],
  };
}

// WebSite + sitelinks search box. Point `target` at a real search results URL.
// If you don't have a /search results page, omit potentialAction.
export function websiteLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

export function faqLd(qa: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

// A price list as an ItemList (safe, factual). Do NOT use Review/AggregateRating
// schema for prices — fabricated ratings risk a manual penalty.
export function fuelListLd(areaName: string, stations: { brand: string; price: number; address?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Fuel prices in ${areaName}`,
    numberOfItems: stations.length,
    itemListElement: stations.slice(0, 25).map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: `${s.brand}${s.address ? ' — ' + s.address : ''}`,
    })),
  };
}

// -----------------------------------------------------------------------------
// Metadata helper — use in any page's `metadata` export or generateMetadata().
// -----------------------------------------------------------------------------
import type { Metadata } from 'next';

export function buildMetadata(o: {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
  image?: string;
}): Metadata {
  const url = `${SITE_URL}${o.path || ''}`;
  const image = o.image || `${SITE_URL}/og-default.png`;
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: url },
    robots: o.noindex ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: o.title,
      description: o.description,
      url,
      siteName: SITE_NAME,
      locale: 'en_AU',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description, images: [image] },
  };
}

// -----------------------------------------------------------------------------
// PHASE 2 — unique, data-driven page content. This is the biggest ranking lever:
// it makes every suburb/fuel page materially different (real numbers + prose),
// instead of a name-swapped template that Google treats as thin/doorway content.
//
// Map your station objects to this minimal shape before calling.
// -----------------------------------------------------------------------------
export interface SeoStation {
  brand: string;
  price: number;   // in cents/L, e.g. 186.0
  address?: string;
}

function fmt(c: number) {
  return `${c.toFixed(1)}c/L`;
}

export function generateAreaContent(opts: {
  area: string;            // e.g. "Edithvale"
  state?: string;          // e.g. "VIC"
  fuelType?: string;       // e.g. "Unleaded 91"
  stations: SeoStation[];
  stateAverage?: number;   // optional, for comparison prose
}): { summary: string; stats: { label: string; value: string }[]; faq: { q: string; a: string }[] } {
  const { area, state, fuelType = 'fuel', stations, stateAverage } = opts;
  const valid = stations.filter((s) => typeof s.price === 'number' && s.price > 0);
  const fuelLabel = fuelType.toLowerCase();
  const where = state ? `${area}, ${state}` : area;

  if (valid.length === 0) {
    return {
      summary: `We don't have live ${fuelLabel} prices for ${where} right now. Prices update through the day, so check back shortly or browse a nearby suburb.`,
      stats: [],
      faq: [
        { q: `How often are ${area} fuel prices updated?`, a: `Motavo refreshes ${area} prices from the official state price feed multiple times a day.` },
      ],
    };
  }

  const sorted = [...valid].sort((a, b) => a.price - b.price);
  const cheapest = sorted[0];
  const dearest = sorted[sorted.length - 1];
  const avg = valid.reduce((t, s) => t + s.price, 0) / valid.length;
  const spread = dearest.price - cheapest.price;
  const count = valid.length;

  let cmp = '';
  if (typeof stateAverage === 'number' && stateAverage > 0) {
    const diff = avg - stateAverage;
    cmp =
      Math.abs(diff) < 0.5
        ? ` That's about level with the ${state || 'state'} average of ${fmt(stateAverage)}.`
        : diff < 0
        ? ` That's ${fmt(Math.abs(diff))} cheaper than the ${state || 'state'} average of ${fmt(stateAverage)}.`
        : ` That's ${fmt(diff)} dearer than the ${state || 'state'} average of ${fmt(stateAverage)}.`;
  }

  const summary =
    `The cheapest ${fuelLabel} in ${where} right now is ${fmt(cheapest.price)} at ${cheapest.brand}` +
    `, across ${count} station${count === 1 ? '' : 's'} we track here. ` +
    `The average is ${fmt(avg)} and prices range up to ${fmt(dearest.price)}, ` +
    `a spread of ${fmt(spread)} — so it pays to compare before you fill up.${cmp} ` +
    `Prices are pulled from the official feed and updated through the day.`;

  const stats = [
    { label: 'Cheapest now', value: fmt(cheapest.price) },
    { label: 'Average', value: fmt(avg) },
    { label: 'Stations tracked', value: String(count) },
    { label: 'Price spread', value: fmt(spread) },
  ];

  const faq = [
    {
      q: `Where is the cheapest ${fuelLabel} in ${area} today?`,
      a: `Right now the cheapest ${fuelLabel} in ${where} is ${fmt(cheapest.price)} at ${cheapest.brand}. Live prices on this page update through the day.`,
    },
    {
      q: `What's the average ${fuelLabel} price in ${area}?`,
      a: `The current average across the ${count} ${area} station${count === 1 ? '' : 's'} we track is ${fmt(avg)}.`,
    },
    {
      q: `How often do ${area} fuel prices update?`,
      a: `Motavo refreshes ${area} prices from the official state price feed multiple times a day, so the figures here reflect today's market.`,
    },
  ];

  return { summary, stats, faq };
}

// -----------------------------------------------------------------------------
// IndexNow — instantly notify Bing/Yandex when pages change. Call from a server
// action / route handler after your data refresh, with the URLs that changed.
// -----------------------------------------------------------------------------
export const INDEXNOW_KEY = '50277a2617ac4963b5b3c8116c5fc1de';

export async function pingIndexNow(urls: string[]) {
  if (!urls.length) return;
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: new URL(SITE_URL).host,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch {
    // non-fatal
  }
}
