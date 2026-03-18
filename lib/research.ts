import { scrapeUrl, delay } from './jina';
import { callClaude } from './claude';
import { ResearchBrief } from './types';

function extractProductSlug(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    // Convert domain to slug: "11x.ai" → "11x-ai", "salesrobot.co" → "salesrobot"
    const parts = hostname.split('.');
    // Take first part (subdomain-free domain name) and convert dots/underscores to hyphens
    const slug = parts[0].replace(/[^a-z0-9]/gi, '-').toLowerCase();
    return slug;
  } catch {
    // Fallback: treat url as-is, strip protocol and slashes
    return url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .split('.')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
  }
}

export async function researchProduct(url: string, topic: string): Promise<ResearchBrief> {
  // Step 1: Scrape product website
  let siteContent = 'No website content available';
  if (url) {
    try {
      const raw = await scrapeUrl(url);
      siteContent = raw.slice(0, 8000);
    } catch {
      siteContent = 'Failed to scrape product website';
    }
  }

  await delay(200);

  // Step 2: Scrape G2 reviews
  const slug = url ? extractProductSlug(url) : topic.toLowerCase().replace(/\s+/g, '-');
  let g2Content = 'No G2 reviews found';
  try {
    const raw = await scrapeUrl(`https://www.g2.com/products/${slug}/reviews`);
    if (raw && raw.length > 200) {
      g2Content = raw.slice(0, 4000);
    }
  } catch {
    g2Content = 'No G2 reviews found';
  }

  await delay(200);

  // Step 3: Scrape Capterra reviews
  let capterraContent = 'No Capterra reviews found';
  try {
    const raw = await scrapeUrl(`https://www.capterra.com/p/search/?query=${encodeURIComponent(slug)}`);
    if (raw && raw.length > 200) {
      capterraContent = raw.slice(0, 4000);
    }
  } catch {
    capterraContent = 'No Capterra reviews found';
  }

  // Step 4: Claude analysis
  const systemPrompt = `You are a product research analyst. Extract structured data from product websites and reviews. Return valid JSON only — no prose, no markdown fences.`;

  const userMessage = `Analyze this product and create a structured research brief.

PRODUCT WEBSITE:
${siteContent}

G2 REVIEWS:
${g2Content}

CAPTERRA REVIEWS:
${capterraContent}

TOPIC: ${topic}

Return ONLY valid JSON matching this exact structure (no markdown, no code fences):
{
  "productName": "Product Name",
  "oneLiner": "One sentence describing what the product does",
  "features": [
    { "name": "Feature Name", "description": "What it does and who benefits", "rating": 4.5 }
  ],
  "pricing": {
    "plans": [
      { "name": "Plan Name", "price": "$X/month", "features": ["feature1", "feature2"] }
    ],
    "freeTrial": true
  },
  "pros": ["Specific advantage backed by reviews"],
  "cons": ["Specific drawback backed by reviews"],
  "targetAudience": "Who this product is best for",
  "competitors": ["Competitor 1", "Competitor 2"],
  "g2Rating": 4.5,
  "capterraRating": 4.3,
  "keyDifferentiators": ["What makes this product unique vs competitors"]
}

Rules:
- Extract real data from the scraped content, don't make things up
- If G2/Capterra rating not found in content, omit those fields
- Include 5-8 features, 4-6 pros, 3-5 cons, 3-5 competitors, 3-5 differentiators
- Return ONLY the JSON object`;

  const raw = await callClaude(systemPrompt, userMessage, 3000);
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const parsed = JSON.parse(cleaned) as ResearchBrief;
  return parsed;
}
