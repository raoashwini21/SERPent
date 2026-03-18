const BRAND_PALETTE = new Set([
  '#1a1a2e', '#6c5ce7', '#a29bfe', '#00d2ff',
  '#22c55e', '#ef4444', '#f59e0b', '#ffffff',
  '#6b7280', '#9ca3af', '#2d2d50', '#252547',
  '#1e1e3a', '#0f0f0f',
]);

export function validateSVG(svg: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!svg.startsWith('<svg')) {
    errors.push('SVG must start with <svg tag');
  }

  if (!svg.includes('</svg>')) {
    errors.push('SVG must contain closing </svg> tag');
  }

  if (!/<title[^>]*>/i.test(svg)) {
    errors.push('SVG is missing <title> element for accessibility');
  }

  if (!/<desc[^>]*>/i.test(svg)) {
    errors.push('SVG is missing <desc> element for accessibility');
  }

  // Check for text rendered as paths (d= with very long path data in a <text> context)
  const longPathPattern = /<path[^>]+d=["'][^"']{100,}["'][^>]*>/g;
  const pathMatches = svg.match(longPathPattern) ?? [];
  if (pathMatches.length > 0) {
    errors.push(`SVG contains ${pathMatches.length} complex path(s) that may be text rendered as paths — use <text> elements instead`);
  }

  // Warn on colors not in brand palette (soft check — doesn't fail)
  const colorPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const foundColors = new Set<string>();
  let colorMatch: RegExpExecArray | null;
  while ((colorMatch = colorPattern.exec(svg)) !== null) {
    foundColors.add(colorMatch[0].toLowerCase());
  }
  const offBrand = Array.from(foundColors).filter((c) => !BRAND_PALETTE.has(c));
  if (offBrand.length > 0) {
    errors.push(`[WARN] Off-brand colors found (non-fatal): ${offBrand.slice(0, 5).join(', ')}`);
  }

  // Valid if no hard errors (only warnings are the off-brand color note)
  const hardErrors = errors.filter((e) => !e.startsWith('[WARN]'));
  return { valid: hardErrors.length === 0, errors };
}
