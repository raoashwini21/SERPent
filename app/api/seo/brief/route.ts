import { NextRequest, NextResponse } from 'next/server';
import { generateContentBrief } from '../../../../lib/seo/content-brief';
import { KeywordData, SERPAnalysis } from '../../../../lib/types';
import { FunnelStage } from '../../../../lib/config/funnel-stages';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      keyword_data: KeywordData;
      serp_analysis: SERPAnalysis;
      funnel_stage: string;
    };

    const { keyword_data, serp_analysis, funnel_stage } = body;

    if (!keyword_data || !serp_analysis || !funnel_stage) {
      return NextResponse.json(
        { error: 'keyword_data, serp_analysis, and funnel_stage are required' },
        { status: 400 }
      );
    }

    const validStages: FunnelStage[] = ['TOFU', 'MOFU', 'BOFU'];
    if (!validStages.includes(funnel_stage as FunnelStage)) {
      return NextResponse.json(
        { error: `funnel_stage must be one of: ${validStages.join(', ')}` },
        { status: 400 }
      );
    }

    const brief = await generateContentBrief(
      keyword_data,
      serp_analysis,
      funnel_stage as FunnelStage
    );

    return NextResponse.json(brief);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Brief generation failed: ${message}` }, { status: 500 });
  }
}
