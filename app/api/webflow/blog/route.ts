import { NextRequest, NextResponse } from 'next/server';
import { fetchBlogBySlug } from '../../../../lib/webflow';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug query param is required' }, { status: 400 });
  }

  try {
    const blog = await fetchBlogBySlug(slug);
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }
    return NextResponse.json(blog);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webflow/blog] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
