import { NextRequest, NextResponse } from 'next/server';
import { scoreContent } from '../../../../lib/seo/content-scorer';
import { KeywordData } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      html: string;
      keyword_data: KeywordData;
      meta: { title: string; description: string; slug: string };
    };

    const { html, keyword_data, meta } = body;

    if (!html || !keyword_data || !meta) {
      return NextResponse.json(
        { error: 'html, keyword_data, and meta are required' },
        { status: 400 }
      );
    }

    if (!meta.title || !meta.description || !meta.slug) {
      return NextResponse.json(
        { error: 'meta must contain title, description, and slug' },
        { status: 400 }
      );
    }

    const score = scoreContent(html, keyword_data, meta);

    return NextResponse.json(score);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `SEO scoring failed: ${message}` }, { status: 500 });
  }
}
