import { NextRequest, NextResponse } from 'next/server';
import { fetchBlogBySlug, fetchBlogById } from '../../../../lib/webflow';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  const id = req.nextUrl.searchParams.get('id');

  if (!slug && !id) {
    return NextResponse.json({ error: 'slug or id query param is required' }, { status: 400 });
  }

  try {
    const blog = slug ? await fetchBlogBySlug(slug) : await fetchBlogById(id!);
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }
    return NextResponse.json({ blog });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webflow/blog] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
