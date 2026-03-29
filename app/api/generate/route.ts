import { NextRequest } from 'next/server';
import { discoverKeywords } from '../../../lib/seo/keyword-discovery';
import { estimateKeywordMetrics } from '../../../lib/seo/keyword-scoring';
import { analyzeSERP } from '../../../lib/seo/serp-analyzer';
import { generateContentBrief } from '../../../lib/seo/content-brief';
import { researchProduct } from '../../../lib/research';
import { generateSection } from '../../../lib/generate-section';
import { generateInfographic } from '../../../lib/infographics/generator';
import { validateSVG } from '../../../lib/infographics/validator';
import { wrapInFigure } from '../../../lib/infographics/embedder';
import { assembleHTML } from '../../../lib/assembler';
import { generateMetaTags } from '../../../lib/seo/meta-generator';
import { generateSlug } from '../../../lib/seo/url-generator';
import { searchWeb } from '../../../lib/jina';
import { getBlogType } from '../../../lib/config/blog-types';
import { KeywordData, SERPAnalysis, ContentBrief, ResearchBrief } from '../../../lib/types';

// Minimal fallback keyword data when discovery completely fails
function fallbackKeywordData(topic: string): KeywordData {
  return {
    primaryKeyword: topic,
    secondaryKeywords: [],
    longTailKeywords: [],
    peopleAlsoAsk: [],
    keywordGroups: { [topic]: [topic] },
  };
}

// Minimal fallback SERP analysis
function fallbackSERPAnalysis(topic: string): SERPAnalysis {
  return {
    results: [],
    avgWordCount: 2000,
    contentGaps: [],
    searchIntent: 'informational',
    mustHaveSections: ['intro', 'body_sections', 'faq', 'conclusion'],
    headingSuggestions: [`What is ${topic}?`, `How does ${topic} work?`],
  };
}


export async function POST(req: NextRequest) {
  const body = await req.json() as {
    url?: string;
    topic: string;
    category?: string;
    blogType: string;
  };

  if (!body.topic || !body.blogType) {
    return new Response(
      JSON.stringify({ error: 'topic and blogType are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Derive category from blogType if not explicitly provided
  const blogTypeConfig = getBlogType(body.blogType);
  const effectiveCategory = body.category ?? blogTypeConfig.funnelStage.toLowerCase();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // ── Deduplication guard for controller.close() ──────────────────────
      let controllerClosed = false;
      const closeController = () => {
        if (!controllerClosed) {
          controllerClosed = true;
          try { controller.close(); } catch { /* already closed */ }
        }
      };

      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // controller may already be closed
        }
      };

      // ── Shared state (let so safety timeout closure sees latest values) ──
      let keywordData: KeywordData = fallbackKeywordData(body.topic);
      let serpAnalysis: SERPAnalysis = fallbackSERPAnalysis(body.topic);
      let contentBrief: ContentBrief | null = null;
      let research: ResearchBrief | null = null;
      // Post-processing accumulator — updated as each step succeeds
      let safetyMeta: Record<string, unknown> = {};
      let safetyHtml = '';
      let safetySlug = '';

      // ── Safety timeout at 270s (Vercel hard limit is 300s) ───────────────
      const safetyTimeout = setTimeout(() => {
        console.warn('[generate] Safety timeout fired after 270s');
        send('status', {
          phase: 'post',
          message: 'Generation timed out — sending partial results',
        });
        send('complete', {
          html: safetyHtml || `<h1>${body.topic}</h1><p>Content generation timed out. Please retry.</p>`,
          summary: {
            title: body.topic,
            wordCount: 0,
            sectionCount: 0,
            primaryKeyword: keywordData.primaryKeyword,
            infographicCount: 0,
            internalLinkCount: 0,
            externalLinkCount: 0,
          },
          meta: safetyMeta,
          slug: safetySlug || body.topic.toLowerCase().replace(/\s+/g, '-').slice(0, 60),
          brief: contentBrief,
          keywords: keywordData,
        });
        closeController();
      }, 270_000);

      try {
        // ── PHASE 1: SEO RESEARCH ──────────────────────────────────────────
        send('status', { phase: 'seo', step: 'keywords', message: 'Discovering keywords...' });

        try {
          console.log('[KEYWORDS] Discovering for topic:', body.topic);
          const allKeywords = await discoverKeywords(body.topic, effectiveCategory);
          send('status', {
            phase: 'seo',
            step: 'keywords',
            message: `Found ${allKeywords.length} keywords`,
          });
          const serpContent = await searchWeb(body.topic);
          keywordData = await estimateKeywordMetrics(allKeywords, serpContent);
        } catch (err) {
          send('status', {
            phase: 'seo',
            step: 'keywords',
            message: 'Keyword discovery partial failure — using topic as primary keyword',
          });
          console.warn('[generate] keyword phase error:', err);
        }

        send('keywords', keywordData);

        send('status', { phase: 'seo', step: 'serp', message: 'Analyzing competitors...' });
        try {
          serpAnalysis = await analyzeSERP(keywordData.primaryKeyword);
        } catch (err) {
          send('status', {
            phase: 'seo',
            step: 'serp',
            message: 'SERP analysis skipped — using defaults',
          });
          console.warn('[generate] SERP phase error:', err);
        }
        send('serp', serpAnalysis);

        send('status', { phase: 'seo', step: 'brief', message: 'Building content outline...' });
        contentBrief = await generateContentBrief(keywordData, serpAnalysis, body.blogType);
        send('brief', contentBrief);
        send('checkpoint', { type: 'outline_review', brief: contentBrief });

        // ── PHASE 2: PRODUCT RESEARCH ──────────────────────────────────────
        send('status', { phase: 'research', message: 'Researching product...' });
        try {
          research = await researchProduct(body.url ?? '', body.topic);
          send('research', research);
        } catch (err) {
          send('status', {
            phase: 'research',
            message: 'Product research failed — continuing with available data',
          });
          console.warn('[generate] research phase error:', err);
          research = {
            productName: body.topic,
            oneLiner: `A tool for ${body.topic}`,
            features: [],
            pricing: { plans: [], freeTrial: false },
            pros: [],
            cons: [],
            targetAudience: 'sales professionals',
            competitors: [],
            keyDifferentiators: [],
          };
          send('research', research);
        }

        // ── PHASE 3: CONTENT GENERATION ───────────────────────────────────
        const sections = new Map<string, string>();
        const infographics = new Map<string, string | null>();
        const usedInfographicTypes = new Set<string>();

        for (const section of contentBrief.sections) {
          send('status', {
            phase: 'generate',
            section: section.id,
            message: `Writing: ${section.heading}...`,
          });

          let sectionHtml = '';
          let figureHtml: string | null = null;

          // Deduplicate infographic types — only one per type across the whole blog
          let infographicType = section.infographicType;
          if (infographicType !== 'none' && usedInfographicTypes.has(infographicType)) {
            infographicType = 'none';
          } else if (infographicType !== 'none') {
            usedInfographicTypes.add(infographicType);
          }

          try {
            const [generatedHtml, infographicSvg] = await Promise.all([
              generateSection(section, contentBrief, research!, keywordData),
              infographicType !== 'none'
                ? generateInfographic(infographicType, section, research!, keywordData).catch(() => null)
                : Promise.resolve(null),
            ]);

            sectionHtml = generatedHtml;

            if (infographicSvg) {
              const validation = validateSVG(infographicSvg);
              if (validation.valid) {
                figureHtml = wrapInFigure(
                  infographicSvg,
                  keywordData.primaryKeyword,
                  section.heading
                );
              } else {
                console.warn(`[generate] SVG invalid for section ${section.id}:`, validation.errors);
              }
            }
          } catch (err) {
            console.warn(`[generate] Section "${section.id}" failed:`, err);
            send('status', {
              phase: 'generate',
              section: section.id,
              message: `Warning: section "${section.heading}" failed — skipping`,
            });
            sectionHtml = `<p><em>This section could not be generated.</em></p>`;
          }

          sections.set(section.id, sectionHtml);
          infographics.set(section.id, figureHtml);

          send('section', {
            id: section.id,
            heading: section.heading,
            html: sectionHtml,
            infographic: figureHtml,
          });
        }

        // ── PHASE 4: POST-PROCESSING ───────────────────────────────────────
        send('status', { phase: 'post', message: 'Starting post-processing...' });

        // Step 4a: URL slug
        send('status', { phase: 'post', message: 'Generating URL slug...' });
        try {
          safetySlug = generateSlug(keywordData.primaryKeyword);
        } catch (err) {
          console.warn('[generate] slug generation failed:', err);
          safetySlug = keywordData.primaryKeyword.toLowerCase().replace(/\s+/g, '-').slice(0, 60);
        }

        // Step 4b: Meta tags
        send('status', { phase: 'post', message: 'Generating meta tags...' });
        try {
          safetyMeta = generateMetaTags(contentBrief, keywordData, safetySlug) as Record<string, unknown>;
        } catch (err) {
          console.warn('[generate] meta generation failed:', err);
          safetyMeta = {
            title: contentBrief.h1,
            description: `Everything you need to know about ${keywordData.primaryKeyword}.`,
            keywords: keywordData.primaryKeyword,
            slug: safetySlug,
          };
        }

        // Step 4c: Assemble HTML
        send('status', { phase: 'post', message: 'Assembling HTML...' });
        let assembled: { blogHtml: string; metadata: { title: string; slug: string; metaTitle: string; metaDescription: string; excerpt: string; faqSchema: string; articleSchema: string } } | null = null;
        try {
          assembled = assembleHTML(
            contentBrief,
            sections,
            infographics,
            keywordData,
            safetyMeta,
            research ?? undefined,
            body.category
          );
          safetyHtml = assembled.blogHtml;
          safetySlug = assembled.metadata.slug;
        } catch (err) {
          console.warn('[generate] assembleHTML failed:', err);
          const allSectionBlocks = Array.from(sections.entries())
            .map(([id, html]) => `<section id="${id}">${html}</section>`)
            .join('\n\n');
          safetyHtml = `<h1>${contentBrief.h1}</h1>\n${allSectionBlocks}`;
        }

        // Step 4d: Count stats (no scoring)
        send('status', { phase: 'post', message: 'Counting stats...' });
        const html = assembled?.blogHtml ?? safetyHtml;
        console.log('[STATS] html length:', html.length, 'words:', html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length, 'sections:', (html.match(/<h2/gi) || []).length);
        const wordCount = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
        const sectionCount = (html.match(/<h2/gi) || []).length;
        const infographicCount = (html.match(/blog-infographic/gi) || []).length;
        const internalLinkCount = (html.match(/salesrobot\.co/gi) || []).length;
        const externalLinkCount = (html.match(/target="_blank"/gi) || []).length;

        // Step 4e: Emit complete
        send('complete', {
          html: assembled?.blogHtml ?? safetyHtml,
          summary: {
            title: assembled?.metadata.title ?? contentBrief.h1,
            wordCount,
            sectionCount,
            primaryKeyword: keywordData.primaryKeyword,
            infographicCount,
            internalLinkCount,
            externalLinkCount,
          },
          meta: assembled?.metadata ?? safetyMeta,
          slug: assembled?.metadata.slug ?? safetySlug,
          brief: contentBrief,
          keywords: keywordData,
        });

      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        console.error('[generate] Fatal error:', error);
        send('error', { message });
      } finally {
        clearTimeout(safetyTimeout);
        closeController();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
