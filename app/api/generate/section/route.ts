import { NextRequest, NextResponse } from 'next/server';
import { generateSection } from '../../../../lib/generate-section';
import { SectionBrief, ContentBrief, ResearchBrief, KeywordData } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      section_brief: SectionBrief;
      content_brief: ContentBrief;
      research: ResearchBrief;
      keywords: KeywordData;
    };

    const { section_brief, content_brief, research, keywords } = body;

    if (!section_brief || !content_brief || !research || !keywords) {
      return NextResponse.json(
        { error: 'section_brief, content_brief, research, and keywords are all required' },
        { status: 400 }
      );
    }

    const html = await generateSection(section_brief, content_brief, research, keywords);
    return NextResponse.json({ html });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Section generation failed: ${message}` },
      { status: 500 }
    );
  }
}
