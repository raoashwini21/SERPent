import { WebflowBlog, WebflowBlogUpdate } from './types';

const API_BASE = 'https://api.webflow.com/v2';

function getConfig(): { token: string; collectionId: string } {
  const token = process.env.WEBFLOW_API_TOKEN || '';
  const collectionId = process.env.WEBFLOW_COLLECTION_ID || '689b0a93a12fc701f9e4daa0';
  if (!token) {
    throw new Error('WEBFLOW_API_TOKEN environment variable is not set');
  }
  return { token, collectionId };
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    accept: 'application/json',
    'content-type': 'application/json',
  };
}

// Map a raw Webflow item to our WebflowBlog shape
function mapItem(item: Record<string, unknown>): WebflowBlog {
  const fields = (item.fieldData ?? item) as Record<string, unknown>;
  return {
    id:              String(item.id ?? ''),
    title:           String(fields['name'] ?? fields['title'] ?? ''),
    slug:            String(fields['slug'] ?? ''),
    metaTitle:       String(fields['meta-title'] ?? fields['meta-description'] ?? ''),
    metaDescription: String(fields['meta-description'] ?? ''),
    excerpt:         String(fields['excerpt'] ?? fields['summary'] ?? ''),
    postBody:        String(fields['post-body'] ?? fields['body'] ?? ''),
    publishedAt:     String(item.lastPublished ?? item.createdOn ?? ''),
  };
}

export async function fetchBlogBySlug(slug: string): Promise<WebflowBlog | null> {
  const { token, collectionId } = getConfig();
  const url = `${API_BASE}/collections/${collectionId}/items?slug=${encodeURIComponent(slug)}&limit=1`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    console.warn(`[webflow] fetchBlogBySlug HTTP ${res.status} for slug="${slug}"`);
    return null;
  }
  const data = await res.json() as { items?: unknown[] };
  const items = data.items ?? [];
  if (items.length === 0) return null;
  return mapItem(items[0] as Record<string, unknown>);
}

export async function fetchBlogByUrl(blogUrl: string): Promise<WebflowBlog | null> {
  // Extract slug from URL path — last non-empty segment
  const pathParts = blogUrl.replace(/^https?:\/\/[^/]+/, '').split('/').filter(Boolean);
  const slug = pathParts[pathParts.length - 1] ?? '';
  if (!slug) return null;
  return fetchBlogBySlug(slug);
}

export async function listAllBlogs(): Promise<{ title: string; slug: string; id: string }[]> {
  const { token, collectionId } = getConfig();
  const results: { title: string; slug: string; id: string }[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${API_BASE}/collections/${collectionId}/items?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: authHeaders(token) });
    if (!res.ok) {
      console.warn(`[webflow] listAllBlogs HTTP ${res.status}`);
      break;
    }
    const data = await res.json() as { items?: unknown[]; pagination?: { total?: number } };
    const items = data.items ?? [];

    for (const item of items) {
      const blog = mapItem(item as Record<string, unknown>);
      if (blog.title || blog.slug) {
        results.push({ title: blog.title, slug: blog.slug, id: blog.id });
      }
    }

    const total = data.pagination?.total ?? items.length;
    offset += items.length;
    if (offset >= total || items.length < limit) break;
  }

  return results;
}

export async function fetchBlogById(itemId: string): Promise<WebflowBlog | null> {
  const { token, collectionId } = getConfig();
  const url = `${API_BASE}/collections/${collectionId}/items/${itemId}`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    console.warn(`[webflow] fetchBlogById HTTP ${res.status} for id="${itemId}"`);
    return null;
  }
  const item = await res.json() as Record<string, unknown>;
  return mapItem(item);
}

export async function updateBlogContent(
  itemId: string,
  updates: Partial<WebflowBlogUpdate>
): Promise<boolean> {
  const { token, collectionId } = getConfig();
  const fieldData: Record<string, string> = {};

  if (updates.postBody        !== undefined) fieldData['post-body']         = updates.postBody;
  if (updates.metaTitle       !== undefined) fieldData['meta-title']        = updates.metaTitle;
  if (updates.metaDescription !== undefined) fieldData['meta-description']  = updates.metaDescription;
  if (updates.excerpt         !== undefined) fieldData['excerpt']           = updates.excerpt;

  if (Object.keys(fieldData).length === 0) return true; // nothing to update

  const url = `${API_BASE}/collections/${collectionId}/items/${itemId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ fieldData }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[webflow] updateBlogContent HTTP ${res.status}: ${body}`);
    return false;
  }
  return true;
}
