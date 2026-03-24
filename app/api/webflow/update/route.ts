import { NextRequest, NextResponse } from 'next/server';
import { updateBlogContent } from '../../../../lib/webflow';

interface UpdateRequest {
  item_id: string;
  post_body?: string;
  meta_title?: string;
  meta_description?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdateRequest;
    const { item_id, post_body, meta_title, meta_description } = body;

    if (!item_id) {
      return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
    }

    const success = await updateBlogContent(item_id, {
      postBody: post_body,
      metaTitle: meta_title,
      metaDescription: meta_description,
    });

    if (!success) {
      return NextResponse.json({ error: 'Failed to update Webflow item' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webflow/update] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
