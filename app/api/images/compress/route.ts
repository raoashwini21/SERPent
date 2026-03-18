import { NextRequest, NextResponse } from 'next/server';
import { compressImage } from '../../../../lib/images';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { image_url: string };
    const { image_url } = body;

    if (!image_url) {
      return NextResponse.json({ error: 'image_url is required' }, { status: 400 });
    }

    const result = await compressImage(image_url);

    if (!result) {
      return NextResponse.json({ error: 'Failed to compress image' }, { status: 422 });
    }

    return NextResponse.json({
      image: result.buffer.toString('base64'),
      width: result.width,
      height: result.height,
      format: result.format,
      sizeKB: result.sizeKB,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Image compression failed: ${message}` }, { status: 500 });
  }
}
