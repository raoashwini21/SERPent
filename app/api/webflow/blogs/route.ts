import { NextResponse } from 'next/server';
import { listAllBlogs } from '../../../../lib/webflow';

export async function GET() {
  try {
    const blogs = await listAllBlogs();
    return NextResponse.json(blogs);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webflow/blogs] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
