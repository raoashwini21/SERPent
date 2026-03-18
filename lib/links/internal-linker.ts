import { SALESROBOT_BLOGS } from '../config/salesrobot-blogs';

const SITE_URL = 'https://www.salesrobot.co';

/** Pick 5-8 blogs relevant to the given category */
function pickRelevantBlogs(category: string) {
  const categoryMatches = SALESROBOT_BLOGS.filter((b) => b.category === category);
  const others = SALESROBOT_BLOGS.filter((b) => b.category !== category);
  const combined = [...categoryMatches, ...others];
  return combined.slice(0, 8);
}

/** Escape special regex characters */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Check if this paragraph already contains a link */
function paraHasLink(paraHtml: string): boolean {
  return /<a\s/i.test(paraHtml);
}

export function injectInternalLinks(html: string, category: string): string {
  const blogs = pickRelevantBlogs(category);
  let result = html;
  const linked = new Set<string>();

  for (const blog of blogs) {
    if (linked.size >= 8) break;
    if (linked.has(blog.url)) continue;

    const kwVariants = blog.primaryKeyword.split(' ').length >= 2
      ? [blog.primaryKeyword]
      : [blog.primaryKeyword];

    let injected = false;

    for (const kw of kwVariants) {
      if (injected) break;

      // Find a <p>...</p> containing this keyword that doesn't already have a link
      const pPattern = new RegExp(`(<p[^>]*>)((?:(?!<\/p>)[\s\S])*?)(${escapeRegex(kw)})((?:(?!<\/p>)[\s\S])*?)(<\/p>)`, 'i');
      result = result.replace(pPattern, (full, open, before, match, after, close) => {
        // Don't inject into a para that already has a link
        if (paraHasLink(full)) return full;
        injected = true;
        linked.add(blog.url);
        return `${open}${before}<a href="${SITE_URL}${blog.url}">${match}</a>${after}${close}`;
      });
    }
  }

  // Fallback: if we linked fewer than 3, add a "Related Reading" section before conclusion
  if (linked.size < 3) {
    const unlinked = blogs.filter((b) => !linked.has(b.url)).slice(0, 5 - linked.size);
    if (unlinked.length > 0) {
      const relatedHtml =
        `\n<section id="related-reading">\n<h2>Related Reading</h2>\n<ul>\n` +
        unlinked
          .map((b) => `  <li><a href="${SITE_URL}${b.url}">${b.title}</a></li>`)
          .join('\n') +
        `\n</ul>\n</section>\n`;

      // Insert before the conclusion section if it exists, else append before </article>
      if (result.includes('<section id="conclusion">')) {
        result = result.replace('<section id="conclusion">', relatedHtml + '<section id="conclusion">');
      } else {
        result = result.replace('</article>', relatedHtml + '</article>');
      }
    }
  }

  return result;
}
