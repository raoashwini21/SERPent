import { NextRequest, NextResponse } from 'next/server';
import { updateBlogContent, createBlogPost } from '../../../../lib/webflow';

interface UpdateRequest {
  item_id?: string;
  post_body?: string;
  title?: string;
  slug?: string;
  meta_title?: string;
  meta_description?: string;
  excerpt?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as UpdateRequest;
    const { item_id, post_body, title, slug, meta_title, meta_description, excerpt } = body;

    // CREATE path: no item_id provided but enough data to create
    if (!item_id) {
      if (!post_body || !title || !slug) {
        return NextResponse.json(
          { error: 'item_id required for update, or post_body + title + slug required for create' },
          { status: 400 }
        );
      }
      const result = await createBlogPost({
        postBody: post_body,
        title,
        slug,
        metaTitle: meta_title ?? title,
        metaDescription: meta_description ?? '',
        excerpt: excerpt ?? '',
      });
      if (!result) {
        return NextResponse.json({ error: 'Failed to create Webflow item' }, { status: 500 });
      }
      return NextResponse.json({ success: true, itemId: result.id, slug: result.slug });
    }

    // UPDATE path: item_id provided
    console.log('[WEBFLOW] Pushing', post_body ? post_body.length : 0, 'chars to item', item_id);
    let success: boolean;
    try {
      success = await updateBlogContent(item_id, {
        postBody: post_body,
        metaTitle: meta_title,
        metaDescription: meta_description,
        excerpt,
      });
    } catch (webflowErr) {
      const webflowMsg = webflowErr instanceof Error ? webflowErr.message : String(webflowErr);
      console.error('[webflow/update] Webflow API error:', webflowMsg);
      return NextResponse.json({ error: `Webflow API error: ${webflowMsg}` }, { status: 502 });
    }

    if (!success) {
      return NextResponse.json({ error: 'Failed to update Webflow item — check API token and collection ID' }, { status: 500 });
    }

    return NextResponse.json({ success: true, itemId: item_id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[webflow/update] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
