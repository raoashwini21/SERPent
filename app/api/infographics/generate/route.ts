import { NextRequest, NextResponse } from 'next/server';
import { generateInfographic } from '../../../../lib/infographics/generator';
import { validateSVG } from '../../../../lib/infographics/validator';
import { wrapInFigure } from '../../../../lib/infographics/embedder';
import { SectionBrief, ResearchBrief, KeywordData } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type: string;
      section: SectionBrief;
      research: ResearchBrief;
      keywords: KeywordData;
    };

    const { type, section, research, keywords } = body;

    if (!type || !section || !research || !keywords) {
      return NextResponse.json(
        { error: 'type, section, research, and keywords are required' },
        { status: 400 }
      );
    }

    const svg = await generateInfographic(type, section, research, keywords);

    if (!svg) {
      return NextResponse.json({
        svg: null,
        figure_html: null,
        valid: false,
        errors: ['Infographic generation returned null (type may be "none" or generation failed)'],
      });
    }

    const { valid, errors } = validateSVG(svg);
    const figureHtml = valid
      ? wrapInFigure(svg, keywords.primaryKeyword, section.heading)
      : null;

    return NextResponse.json({ svg, figure_html: figureHtml, valid, errors });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Infographic generation failed: ${message}` },
      { status: 500 }
    );
  }
}
