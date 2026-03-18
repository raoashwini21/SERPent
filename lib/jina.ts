const JINA_HEADERS = {
  Accept: 'text/markdown',
  'User-Agent': 'Mozilla/5.0',
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
      throw new Error(`Jina Reader returned status ${response.status} for URL: ${url}`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Jina Reader timed out after ${TIMEOUT_MS}ms for URL: ${url}`);
    }
    throw new Error(
      `Failed to scrape URL "${url}": ${error instanceof Error ? error.message : String(error)}`
    );
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
      throw new Error(`Jina Search returned status ${response.status} for query: "${query}"`);
    }

    return await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Jina Search timed out after ${TIMEOUT_MS}ms for query: "${query}"`);
    }
    throw new Error(
      `Failed to search web for "${query}": ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
