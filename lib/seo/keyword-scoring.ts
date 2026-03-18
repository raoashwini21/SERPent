import { callClaude } from '../claude';
import { KeywordData } from '../types';

export async function estimateKeywordMetrics(
  keywords: string[],
  serpContent: string
): Promise<KeywordData> {
  const systemPrompt = `You are an SEO expert. You analyze keyword lists and SERP content to estimate search metrics and organize keywords strategically. Always return valid JSON only — no prose, no markdown fences.`;

  const userMessage = `Given this keyword list and SERP content, analyze and return a KeywordData JSON object.

KEYWORDS:
${keywords.slice(0, 200).join('\n')}

SERP CONTENT (sample):
${serpContent.slice(0, 3000)}

Return a JSON object with EXACTLY this structure:
{
  "primaryKeyword": "the single best keyword (highest likely search volume + most relevant)",
  "searchVolume": 1000,
  "keywordDifficulty": 45,
  "secondaryKeywords": [
    { "keyword": "...", "volume": 500, "difficulty": 40 }
  ],
  "longTailKeywords": ["4+ word low-competition keyword phrases"],
  "peopleAlsoAsk": ["question people commonly ask related to this topic?"],
  "keywordGroups": {
    "Sub-topic Name": ["keyword1", "keyword2"],
    "Another Topic": ["keyword3", "keyword4"]
  }
}

Rules:
- Pick 5-8 secondary keywords (ranked by estimated volume)
- Include 5-10 long-tail keywords (lower competition, more specific)
- Include 5-8 People Also Ask questions
- Group ALL keywords (primary + secondary + long-tail) into 6-10 sub-topic groups
- Volume and difficulty are estimates on a 1-1000 and 1-100 scale respectively
- Return ONLY the JSON object, nothing else`;

  const raw = await callClaude(systemPrompt, userMessage, 2048);
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  const parsed = JSON.parse(cleaned) as KeywordData;
  return parsed;
}
