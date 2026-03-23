'use client';

import { useToast } from './Toast';

interface ExportActionsProps {
  html: string;
  slug: string;
  meta: Record<string, unknown>;
}

export default function ExportActions({ html, slug, meta }: ExportActionsProps) {
  const { toast } = useToast();

  function copyHtml() {
    navigator.clipboard.writeText(html).then(() => toast('HTML copied to clipboard!', 'success'));
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'blog'}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast('HTML downloaded', 'success');
  }

  function copyMeta() {
    const og = meta.og as Record<string, string> | undefined;
    const tw = meta.twitter as Record<string, string> | undefined;
    const lines = [
      `<title>${meta.title ?? ''}</title>`,
      `<meta name="description" content="${meta.description ?? ''}" />`,
      og ? Object.entries(og).map(([k, v]) => `<meta property="og:${k}" content="${v}" />`).join('\n') : '',
      tw ? Object.entries(tw).map(([k, v]) => `<meta name="twitter:${k}" content="${v}" />`).join('\n') : '',
      `<link rel="canonical" href="${meta.canonical ?? ''}" />`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(lines).then(() => toast('Meta tags copied!', 'success'));
  }

  function copySlug() {
    navigator.clipboard.writeText(slug).then(() => toast(`Slug copied: /${slug}`, 'info'));
  }

  const btnCls = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border btn-press transition-colors hover:bg-purple-50';
  const btnStyle = { borderColor: '#6C5CE7', color: '#6C5CE7' };

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 bg-white border-t border-gray-200 shadow-sm">
      <button className={btnCls} style={btnStyle} onClick={copyHtml}>
        📋 Copy HTML
      </button>
      <button className={btnCls} style={btnStyle} onClick={downloadHtml}>
        📥 Download
      </button>
      <button className={btnCls} style={btnStyle} onClick={copyMeta}>
        🏷️ Meta Tags
      </button>
      <button className={btnCls} style={btnStyle} onClick={copySlug}>
        🔗 /{slug}
      </button>
    </div>
  );
}
