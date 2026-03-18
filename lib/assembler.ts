import { ContentBrief, KeywordData } from './types';
import { generateFAQSchema, generateArticleSchema } from './seo/schema-generator';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Extract Q&A pairs from FAQ section HTML */
function extractFAQPairs(faqHtml: string): { question: string; answer: string }[] {
  const pairs: { question: string; answer: string }[] = [];
  const h3Pattern = /<h3[^>]*>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = h3Pattern.exec(faqHtml)) !== null) {
    const question = stripHtml(match[1]).trim();
    // Grab the first <p> after the h3 as the answer
    const answerBlock = match[2];
    const pMatch = answerBlock.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const answer = pMatch ? stripHtml(pMatch[1]).trim() : stripHtml(answerBlock).slice(0, 300).trim();
    if (question && answer) {
      pairs.push({ question, answer });
    }
  }

  return pairs;
}

/** Build a table of contents from sections */
function buildTableOfContents(brief: ContentBrief): string {
  const items = brief.sections
    .filter((s) => s.headingTag === 'h2' && s.id !== 'tldr')
    .map((s) => `  <li><a href="#${s.id}">${s.heading}</a></li>`)
    .join('\n');

  return `<nav class="toc" aria-label="Table of Contents">
  <p><strong>Table of Contents</strong></p>
  <ul>
${items}
  </ul>
</nav>`;
}

/** Build meta tag strings for <head> */
function buildMetaHeadTags(meta: Record<string, unknown>): string {
  const lines: string[] = [];

  if (typeof meta.title === 'string') {
    lines.push(`  <title>${meta.title}</title>`);
  }
  if (typeof meta.description === 'string') {
    lines.push(`  <meta name="description" content="${meta.description}" />`);
  }
  if (typeof meta.keywords === 'string') {
    lines.push(`  <meta name="keywords" content="${meta.keywords}" />`);
  }
  if (typeof meta.canonical === 'string') {
    lines.push(`  <link rel="canonical" href="${meta.canonical}" />`);
  }

  const og = meta.og as Record<string, string> | undefined;
  if (og) {
    if (og.url) lines.push(`  <meta property="og:url" content="${og.url}" />`);
    if (og.type) lines.push(`  <meta property="og:type" content="${og.type}" />`);
    if (og.title) lines.push(`  <meta property="og:title" content="${og.title}" />`);
    if (og.description) lines.push(`  <meta property="og:description" content="${og.description}" />`);
    if (og.image) lines.push(`  <meta property="og:image" content="${og.image}" />`);
  }

  const tw = meta.twitter as Record<string, string> | undefined;
  if (tw) {
    if (tw.card) lines.push(`  <meta name="twitter:card" content="${tw.card}" />`);
    if (tw.title) lines.push(`  <meta name="twitter:title" content="${tw.title}" />`);
    if (tw.description) lines.push(`  <meta name="twitter:description" content="${tw.description}" />`);
    if (tw.image) lines.push(`  <meta name="twitter:image" content="${tw.image}" />`);
  }

  return lines.join('\n');
}

export function assembleHTML(
  brief: ContentBrief,
  sections: Map<string, string>,
  infographics: Map<string, string | null>,
  keywords: KeywordData,
  meta: Record<string, unknown>
): string {
  // Build FAQ schema from FAQ section content
  const faqHtml = sections.get('faq') ?? '';
  const faqPairs = extractFAQPairs(faqHtml);
  const faqSchemaJson = faqPairs.length > 0 ? generateFAQSchema(faqPairs) : null;
  const articleSchemaJson = generateArticleSchema(brief);

  const metaHeadTags = buildMetaHeadTags(meta);
  const toc = buildTableOfContents(brief);

  // Assemble section bodies
  const sectionBlocks = brief.sections
    .map((section) => {
      const sectionHtml = sections.get(section.id) ?? '';
      const infographic = infographics.get(section.id) ?? null;

      // Inject infographic after the first <p> tag in the section, if one exists
      let body = sectionHtml;
      if (infographic) {
        const firstPEnd = body.indexOf('</p>');
        if (firstPEnd !== -1) {
          body =
            body.slice(0, firstPEnd + 4) +
            `\n<figure class="blog-infographic">\n${infographic}\n</figure>\n` +
            body.slice(firstPEnd + 4);
        } else {
          body = body + `\n<figure class="blog-infographic">\n${infographic}\n</figure>\n`;
        }
      }

      return `<section id="${section.id}">\n${body}\n</section>`;
    })
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${metaHeadTags}
${faqSchemaJson ? `  <script type="application/ld+json">\n${faqSchemaJson}\n  </script>` : ''}
  <script type="application/ld+json">
${articleSchemaJson}
  </script>
</head>
<body>
<article class="blog-post">

<h1>${brief.h1}</h1>

${toc}

${sectionBlocks}

</article>
</body>
</html>`;
}
