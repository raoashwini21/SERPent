import { NextRequest, NextResponse } from 'next/server';
import { fetchBlogBySlug, fetchBlogById } from '../../../../lib/webflow';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const id = searchParams.get('id');

  if (!slug && !id) {
    return NextResponse.json({ error: 'slug or id is required' }, { status: 400 });
  }

  try {
    const blog = slug ? await fetchBlogBySlug(slug) : await fetchBlogById(id!);
    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }
    return NextResponse.json({ blog });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/webflow/blog]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
