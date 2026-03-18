# SalesRobot Blog Automation Engine

AI-powered, SEO-optimized blog generation for [salesrobot.co](https://www.salesrobot.co) — from a single topic to a fully assembled, Webflow-ready HTML file in one click.

## What It Does

The engine runs a 10-step pipeline automatically:

1. **Keyword Discovery** — Google Autocomplete + alphabet soup scraping
2. **SERP Analysis** — Scrapes top 10 Google results, deep-scrapes top 3, extracts content gaps
3. **Keyword Scoring** — Claude estimates volume, difficulty, clusters keywords into topical groups
4. **Content Brief** — Section-by-section outline with word counts, PAA mapping, infographic assignments
5. **Product Research** — Scrapes product website, G2, and Capterra for features, pricing, pros/cons
6. **2-Pass Generation** — Draft pass (substance) + refiner pass (conversational tone)
7. **SVG Infographics** — Branded Claude-generated SVGs: comparison tables, pros/cons, pricing cards
8. **Link Injection** — Internal SalesRobot blog links + external authority links
9. **Metadata Generation** — Title, description, OG, Twitter, canonical, sitemap
10. **SEO Scoring** — 25-point audit across keyword placement, structure, density, technical, links, CTAs

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: Claude API (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- **Scraping**: Jina Reader (`r.jina.ai`) + Jina Search (`s.jina.ai`) — both free, no key needed
- **Image Processing**: Sharp (WebP compression, responsive sizes)
- **Streaming**: Server-Sent Events (SSE) via ReadableStream

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd SERPent

# 2. Install dependencies
npm install

# 3. Add your API key
cp .env.example .env.local
# Edit .env.local — set ANTHROPIC_API_KEY=sk-ant-your-key-here

# 4. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Go to `/new` or click **Create New Blog** on the dashboard
2. Enter the **Product Website URL** (optional — used for deep research)
3. Enter the **Blog Topic / Product Name** (e.g. `11x AI review`)
4. Select a **Category** and **Funnel Stage** (TOFU / MOFU / BOFU)
5. Click **Generate Blog**
6. Watch the live SSE stream: keywords → SERP → outline → research → sections
7. Export: copy HTML, download file, copy meta tags, copy slug

## API Endpoints

| Route | Description |
|-------|-------------|
| `POST /api/generate` | Main SSE pipeline (300s timeout) |
| `POST /api/generate/section` | Single section regeneration |
| `POST /api/seo/keywords` | Keyword discovery + scoring |
| `POST /api/seo/serp` | SERP analysis |
| `POST /api/seo/brief` | Content brief generation |
| `POST /api/seo/score` | SEO scoring |
| `POST /api/research` | Product research |
| `POST /api/infographics/generate` | SVG infographic generation |
| `POST /api/images/compress` | WebP image compression |
| `POST /api/export` | Export blog + metadata |

## Deployment

1. Push to GitHub
2. Connect repo to [Vercel](https://vercel.com)
3. Add env var: `ANTHROPIC_API_KEY`
4. Deploy — `vercel.json` sets correct function timeouts automatically

## API Keys Required

Only **one key needed**: `ANTHROPIC_API_KEY`

All web scraping uses Jina's free public endpoints — no additional keys required.
