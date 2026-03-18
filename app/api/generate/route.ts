import { NextRequest } from 'next/server';
import { discoverKeywords } from '../../../lib/seo/keyword-discovery';
import { estimateKeywordMetrics } from '../../../lib/seo/keyword-scoring';
import { analyzeSERP } from '../../../lib/seo/serp-analyzer';
import { generateContentBrief } from '../../../lib/seo/content-brief';
import { researchProduct } from '../../../lib/research';
import { generateSection } from '../../../lib/generate-section';
import { assembleHTML } from '../../../lib/assembler';
import { scoreContent } from '../../../lib/seo/content-scorer';
import { generateMetaTags } from '../../../lib/seo/meta-generator';
import { generateSlug } from '../../../lib/seo/url-generator';
import { searchWeb } from '../../../lib/jina';
import { FunnelStage } from '../../../lib/config/funnel-stages';

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    url?: string;
    topic: string;
    category: string;
    funnelStage: FunnelStage;
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        // ── PHASE 1: SEO RESEARCH ──────────────────────────────────────────
        send('status', { phase: 'seo', step: 'keywords', message: 'Discovering keywords...' });

        const allKeywords = await discoverKeywords(body.topic, body.category);
        send('status', {
          phase: 'seo',
          step: 'keywords',
          message: `Found ${allKeywords.length} keywords`,
        });

        const serpContent = await searchWeb(body.topic);
        const keywordData = await estimateKeywordMetrics(allKeywords, serpContent);
        send('keywords', keywordData);

        send('status', { phase: 'seo', step: 'serp', message: 'Analyzing competitors...' });
        const serpAnalysis = await analyzeSERP(keywordData.primaryKeyword);
        send('serp', serpAnalysis);

        send('status', { phase: 'seo', step: 'brief', message: 'Building content outline...' });
        const contentBrief = await generateContentBrief(
          keywordData,
          serpAnalysis,
          body.funnelStage
        );
        send('brief', contentBrief);

        // Checkpoint: frontend can show the outline for review
        send('checkpoint', { type: 'outline_review', brief: contentBrief });

        // ── PHASE 2: PRODUCT RESEARCH ──────────────────────────────────────
        send('status', { phase: 'research', message: 'Researching product...' });
        const research = await researchProduct(body.url ?? '', body.topic);
        send('research', research);

        // ── PHASE 3: CONTENT GENERATION ───────────────────────────────────
        const sections = new Map<string, string>();
        const infographics = new Map<string, string | null>();

        for (const section of contentBrief.sections) {
          send('status', {
            phase: 'generate',
            section: section.id,
            message: `Writing: ${section.heading}...`,
          });

          const sectionHtml = await generateSection(
            section,
            contentBrief,
            research,
            keywordData
          );
          sections.set(section.id, sectionHtml);
          infographics.set(section.id, null); // Phase 5 adds real infographics

          send('section', { id: section.id, heading: section.heading, html: sectionHtml });
        }

        // ── PHASE 4: POST-PROCESSING ───────────────────────────────────────
        send('status', { phase: 'post', message: 'Generating metadata...' });
        const slug = generateSlug(keywordData.primaryKeyword);
        const metaTags = generateMetaTags(contentBrief, keywordData, slug);

        const assembledHtml = assembleHTML(
          contentBrief,
          sections,
          infographics,
          keywordData,
          metaTags as Record<string, unknown>
        );

        send('status', { phase: 'post', message: 'Scoring SEO...' });
        const seoScore = scoreContent(assembledHtml, keywordData, {
          title: metaTags.title,
          description: metaTags.description,
          slug,
        });

        send('score', seoScore);
        send('complete', {
          html: assembledHtml,
          score: seoScore,
          meta: metaTags,
          slug,
          brief: contentBrief,
          keywords: keywordData,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Generation failed';
        send('error', { message });
      } finally {
        controller.close();
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
