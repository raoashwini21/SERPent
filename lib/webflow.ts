import type { WebflowBlog, WebflowBlogUpdate } from './types';

const WEBFLOW_API_BASE = 'https://api.webflow.com/v2';

function getToken(): string {
  const token = process.env.WEBFLOW_API_TOKEN;
  if (!token) throw new Error('WEBFLOW_API_TOKEN is not set');
  return token;
}

function getCollectionId(): string {
  return process.env.WEBFLOW_COLLECTION_ID || '689b0a93a12fc701f9e4daa0';
}

function makeHeaders() {
  return {
    Authorization: 'Bearer ' + getToken(),
    accept: 'application/json',
    'content-type': 'application/json',
  };
}

interface WebflowItem {
  id: string;
  fieldData: {
    name?: string;
    slug?: string;
    'post-body'?: string;
    'meta-title'?: string;
    'meta-description'?: string;
    excerpt?: string;
    [key: string]: unknown;
  };
  lastPublished?: string;
}

interface WebflowListResponse {
  items: WebflowItem[];
  pagination?: {
    limit: number;
    offset: number;
    total: number;
  };
}

function mapItem(item: WebflowItem): WebflowBlog {
  return {
    id: item.id,
    title: item.fieldData.name || '',
    slug: item.fieldData.slug || '',
    metaTitle: item.fieldData['meta-title'] || '',
    metaDescription: item.fieldData['meta-description'] || '',
    excerpt: item.fieldData.excerpt || '',
    postBody: item.fieldData['post-body'] || '',
    publishedAt: item.lastPublished || '',
  };
}

export async function fetchBlogById(itemId: string): Promise<WebflowBlog | null> {
  const collectionId = getCollectionId();
  const url = `${WEBFLOW_API_BASE}/collections/${collectionId}/items/${itemId}`;

  const response = await fetch(url, { headers: makeHeaders() });
  if (!response.ok) {
    console.warn(`[webflow] fetchBlogById HTTP ${response.status} for id="${itemId}"`);
    return null;
  }

  const item = (await response.json()) as WebflowItem;
  return mapItem(item);
}

export async function fetchBlogBySlug(slug: string): Promise<WebflowBlog | null> {
  const collectionId = getCollectionId();
  const url = `${WEBFLOW_API_BASE}/collections/${collectionId}/items`;

  const response = await fetch(url, { headers: makeHeaders() });
  if (!response.ok) {
    console.error(`[webflow] fetchBlogBySlug failed: ${response.status} ${response.statusText}`);
    return null;
  }

  const data = (await response.json()) as WebflowListResponse;
  const item = data.items?.find((i) => i.fieldData?.slug === slug);
  return item ? mapItem(item) : null;
}

export async function fetchBlogByUrl(blogUrl: string): Promise<WebflowBlog | null> {
  try {
    const parsed = new URL(blogUrl);
    const parts = parsed.pathname.replace(/\/$/, '').split('/');
    const slug = parts[parts.length - 1];
    if (!slug) return null;
    return fetchBlogBySlug(slug);
  } catch {
    return null;
  }
}

export async function listAllBlogs(): Promise<{ title: string; slug: string; id: string }[]> {
  const collectionId = getCollectionId();
  const results: { title: string; slug: string; id: string }[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${WEBFLOW_API_BASE}/collections/${collectionId}/items?limit=${limit}&offset=${offset}`;
    const response = await fetch(url, { headers: makeHeaders() });

    if (!response.ok) {
      console.error(`[webflow] listAllBlogs failed: ${response.status} ${response.statusText}`);
      break;
    }

    const data = (await response.json()) as WebflowListResponse;
    const items = data.items || [];

    for (const item of items) {
      results.push({
        id: item.id,
        title: item.fieldData.name || '',
        slug: item.fieldData.slug || '',
      });
    }

    const total = data.pagination?.total ?? items.length;
    offset += items.length;

    if (offset >= total || items.length === 0) break;
  }

  return results;
}

export async function createBlogPost(data: {
  postBody: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
}): Promise<{ id: string; slug: string } | null> {
  try {
    const token = process.env.WEBFLOW_API_TOKEN;
    const collectionId = process.env.WEBFLOW_COLLECTION_ID || '689b0a93a12fc701f9e4daa0';
    const res = await fetch(`https://api.webflow.com/v2/collections/${collectionId}/items`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        fieldData: {
          'post-body': data.postBody,
          title: data.title,
          slug: data.slug,
          'meta-title': data.metaTitle,
          'meta-description': data.metaDescription,
          excerpt: data.excerpt,
        },
      }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { id: string; fieldData?: { slug?: string } };
    return { id: json.id, slug: json.fieldData?.slug || data.slug };
  } catch {
    return null;
  }
}

export async function updateBlogContent(
  itemId: string,
  updates: Partial<WebflowBlogUpdate>
): Promise<boolean> {
  const collectionId = getCollectionId();
  const url = `${WEBFLOW_API_BASE}/collections/${collectionId}/items/${itemId}`;

  const fieldData: Record<string, string> = {};
  if (updates.postBody !== undefined) fieldData['post-body'] = updates.postBody;
  if (updates.metaTitle !== undefined) fieldData['meta-title'] = updates.metaTitle;
  if (updates.metaDescription !== undefined) fieldData['meta-description'] = updates.metaDescription;
  if (updates.excerpt !== undefined) fieldData.excerpt = updates.excerpt;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: makeHeaders(),
    body: JSON.stringify({ fieldData }),
  });

  if (!response.ok) {
    console.error(`[webflow] updateBlogContent failed: ${response.status} ${response.statusText}`);
    return false;
  }

  return true;
}
