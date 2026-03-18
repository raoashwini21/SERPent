import { NextRequest, NextResponse } from 'next/server';
import { analyzeSERP } from '../../../../lib/seo/serp-analyzer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      primary_keyword: string;
      secondary_keywords: string[];
    };

    const { primary_keyword } = body;

    if (!primary_keyword) {
      return NextResponse.json({ error: 'primary_keyword is required' }, { status: 400 });
    }

    const serpAnalysis = await analyzeSERP(primary_keyword);

    return NextResponse.json(serpAnalysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `SERP analysis failed: ${message}` }, { status: 500 });
  }
}
