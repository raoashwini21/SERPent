import { NextRequest, NextResponse } from 'next/server';
import { generateContentBrief } from '../../../../lib/seo/content-brief';
import { KeywordData, SERPAnalysis } from '../../../../lib/types';
import { BLOG_TYPES } from '../../../../lib/config/blog-types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      keyword_data: KeywordData;
      serp_analysis: SERPAnalysis;
      blog_type: string;
    };

    const { keyword_data, serp_analysis, blog_type } = body;

    if (!keyword_data || !serp_analysis || !blog_type) {
      return NextResponse.json(
        { error: 'keyword_data, serp_analysis, and blog_type are required' },
        { status: 400 }
      );
    }

    const validIds = BLOG_TYPES.map((b) => b.id);
    if (!validIds.includes(blog_type as typeof BLOG_TYPES[number]['id'])) {
      return NextResponse.json(
        { error: `blog_type must be one of: ${validIds.join(', ')}` },
        { status: 400 }
      );
    }

    const brief = await generateContentBrief(keyword_data, serp_analysis, blog_type);
    return NextResponse.json(brief);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Brief generation failed: ${message}` }, { status: 500 });
  }
}
