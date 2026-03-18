export function wrapInFigure(svg: string, keyword: string, caption: string): string {
  return `<figure class="blog-infographic" role="img" aria-label="${keyword} infographic">
  ${svg}
  <figcaption>${keyword}: ${caption}</figcaption>
</figure>`;
}
