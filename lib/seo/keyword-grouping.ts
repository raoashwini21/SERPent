import { callClaude } from '../claude';

export async function groupKeywords(
  keywords: string[],
  product: string
): Promise<Record<string, string[]>> {
  const systemPrompt = `You are an SEO content strategist. You cluster keyword lists into topically coherent groups for blog content planning. Return valid JSON only — no prose, no markdown fences.`;

  const userMessage = `Cluster these keywords for a blog about "${product}" into 6-10 sub-topic groups.

KEYWORDS:
${keywords.slice(0, 150).join('\n')}

Return a JSON object where:
- Each KEY is a sub-topic group name (should be a potential blog section heading topic, e.g. "Pricing and Plans", "Key Features", "Alternatives and Competitors")
- Each VALUE is an array of keywords that belong to that group

Example structure:
{
  "Getting Started and Setup": ["how to use product", "product tutorial", "product setup"],
  "Pricing and Plans": ["product pricing", "product cost", "product free trial"],
  "Key Features": ["product features", "product automation", "product integrations"]
}

Rules:
- Every keyword must appear in exactly one group
- Group names should be descriptive and usable as blog section topics
- 6-10 groups total
- Return ONLY the JSON object, nothing else`;

  const raw = await callClaude(systemPrompt, userMessage, 2048);
  const cleaned = raw.replace(/```(?:json)?/g, '').trim();
  return JSON.parse(cleaned) as Record<string, string[]>;
}
