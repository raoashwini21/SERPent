import { NextRequest, NextResponse } from 'next/server';
import { generateArticleSchema } from '../../../lib/seo/schema-generator';
import { ContentBrief } from '../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      html: string;
      meta: Record<string, unknown>;
      slug: string;
      brief?: ContentBrief;
    };

    const { html, meta, slug, brief } = body;

    if (!html || !meta || !slug) {
      return NextResponse.json({ error: 'html, meta, and slug are required' }, { status: 400 });
    }

    // Build meta tag HTML strings
    const ogTags = meta.og as Record<string, string> | undefined;
    const twitterTags = meta.twitter as Record<string, string> | undefined;

    const ogHtml = ogTags
      ? Object.entries(ogTags)
          .map(([k, v]) => `<meta property="og:${k}" content="${v}" />`)
          .join('\n')
      : '';

    const twitterHtml = twitterTags
      ? Object.entries(twitterTags)
          .map(([k, v]) => `<meta name="twitter:${k}" content="${v}" />`)
          .join('\n')
      : '';

    const faqSchema = null; // extracted inline in the HTML already
    const articleSchema = brief ? generateArticleSchema(brief) : null;

    return NextResponse.json({
      html,
      metadata: {
        title: meta.title ?? '',
        description: meta.description ?? '',
        keywords: meta.keywords ?? '',
        canonical: meta.canonical ?? '',
        ogTags: ogHtml,
        twitterTags: twitterHtml,
        faqSchema,
        articleSchema,
        slug,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Export failed: ${message}` }, { status: 500 });
  }
}
