const JINA_HEADERS = {
  Accept: 'text/markdown',
  'User-Agent': 'Mozilla/5.0 (compatible; SalesRobotBlogBot/1.0)',
};

const TIMEOUT_MS = 10000;

export async function scrapeUrl(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://r.jina.ai/${url}`, {
      headers: JINA_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[Jina Reader] Status ${response.status} for URL: ${url}`);
      return '';
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Jina Reader] Timed out after ${TIMEOUT_MS}ms for URL: ${url}`);
      return '';
    }
    console.warn(`[Jina Reader] Failed for "${url}": ${error instanceof Error ? error.message : String(error)}`);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export async function searchWeb(query: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`https://s.jina.ai/?q=${encodeURIComponent(query)}`, {
      headers: JINA_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      console.warn(`[Jina Search] Status ${response.status} for query: "${query}"`);
      return '';
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Jina Search] Timed out after ${TIMEOUT_MS}ms for query: "${query}"`);
      return '';
    }
    console.warn(`[Jina Search] Failed for "${query}": ${error instanceof Error ? error.message : String(error)}`);
    return '';
  } finally {
    clearTimeout(timer);
  }
}

export async function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
