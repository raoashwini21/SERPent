import { delay } from '../jina';

export async function getAutocompleteSuggestions(query: string): Promise<string[]> {
  try {
    const url = `https://www.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}&hl=en&gl=us`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!response.ok) return [];
    const json = await response.json();
    // Google autocomplete returns [query, [suggestions]]
    if (Array.isArray(json) && Array.isArray(json[1])) {
      return json[1] as string[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function alphabetSoup(seed: string): Promise<string[]> {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const all: string[] = [];

  for (const letter of alphabet) {
    const suggestions = await getAutocompleteSuggestions(`${seed} ${letter}`);
    all.push(...suggestions);
    await delay(100);
  }

  return Array.from(new Set(all));
}

export async function discoverKeywords(product: string, category: string): Promise<string[]> {
  const all: string[] = [];

  // Group 1 - Direct
  const directSeeds = [
    product,
    `${product} review`,
    `${product} pricing`,
    `${product} alternative`,
    `${product} vs`,
    `${product} features`,
    `${product} pros and cons`,
  ];

  // Group 2 - Questions
  const questionSeeds = [
    `how to ${product}`,
    `what is ${product}`,
    `is ${product}`,
    `best ${product}`,
    `why ${product}`,
    `does ${product}`,
    `can ${product}`,
  ];

  // Group 3 - Category
  const categorySeeds = [
    `best ${category} tools`,
    `best ${category} software`,
    `${category} tools comparison`,
    `${category} software for small business`,
  ];

  const allSeeds = [...directSeeds, ...questionSeeds, ...categorySeeds];

  for (const seed of allSeeds) {
    const suggestions = await getAutocompleteSuggestions(seed);
    all.push(...suggestions);
    await delay(100);
  }

  // Group 4 - Alphabet soup on product name
  const soupResults = await alphabetSoup(product);
  all.push(...soupResults);

  return Array.from(new Set(all));
}
