import { NextRequest, NextResponse } from 'next/server';
import { researchProduct } from '../../../lib/research';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { url: string; topic: string };
    const { url, topic } = body;

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const research = await researchProduct(url ?? '', topic);
    return NextResponse.json(research);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Research failed: ${message}` }, { status: 500 });
  }
}
