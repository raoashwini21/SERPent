import { NextRequest, NextResponse } from 'next/server';
import { discoverKeywords } from '../../../../lib/seo/keyword-discovery';
import { estimateKeywordMetrics } from '../../../../lib/seo/keyword-scoring';
import { groupKeywords } from '../../../../lib/seo/keyword-grouping';
import { searchWeb } from '../../../../lib/jina';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      seed_keyword: string;
      category: string;
      funnel_stage: string;
    };

    const { seed_keyword, category } = body;

    if (!seed_keyword || !category) {
      return NextResponse.json(
        { error: 'seed_keyword and category are required' },
        { status: 400 }
      );
    }

    // Discover keywords
    const keywords = await discoverKeywords(seed_keyword, category);

    // Get SERP content for context
    const serpContent = await searchWeb(seed_keyword);

    // Estimate metrics via Claude
    const keywordData = await estimateKeywordMetrics(keywords, serpContent);

    // Re-group using Claude for clean topic clusters
    const groups = await groupKeywords(keywords, seed_keyword);
    keywordData.keywordGroups = groups;

    return NextResponse.json(keywordData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Keyword discovery failed: ${message}` }, { status: 500 });
  }
}
