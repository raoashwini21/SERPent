import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';

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

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    const content = response.content[0];
    if (!content || content.type !== 'text') {
      throw new Error('Unexpected response format from Claude API: no text content returned');
    }

    return content.text;
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API error (${error.status}): ${error.message}`);
    }
    throw error;
  }
}
