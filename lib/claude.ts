import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callClaudeOnce(
  client: Anthropic,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = response.content[0];
  if (!content || content.type !== 'text') {
    throw new Error('Unexpected response format from Claude API: no text content returned');
  }

  return content.text;
}

export async function callClaude(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 4096
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
  }

  const client = new Anthropic({ apiKey });
  let lastError: Error = new Error('Unknown error');

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await callClaudeOnce(client, systemPrompt, userMessage, maxTokens);
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        // Don't retry on 4xx errors (except 429 rate limit)
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw new Error(`Claude API error (${error.status}): ${error.message}`);
        }
        lastError = new Error(`Claude API error (${error.status}): ${error.message}`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  throw new Error(`Claude API failed after ${MAX_RETRIES + 1} attempts: ${lastError.message}`);
}
