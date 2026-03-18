'use client';

import { useState } from 'react';

interface ExportActionsProps {
  html: string;
  slug: string;
  meta: Record<string, unknown>;
}

type ToastKey = 'html' | 'meta' | 'slug' | null;

export default function ExportActions({ html, slug, meta }: ExportActionsProps) {
  const [toast, setToast] = useState<ToastKey>(null);

  function showToast(key: ToastKey) {
    setToast(key);
    setTimeout(() => setToast(null), 2000);
  }

  function copyHtml() {
    navigator.clipboard.writeText(html).then(() => showToast('html'));
  }

  function downloadHtml() {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug || 'blog'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyMeta() {
    const og = meta.og as Record<string, string> | undefined;
    const tw = meta.twitter as Record<string, string> | undefined;
    const lines = [
      `<title>${meta.title ?? ''}</title>`,
      `<meta name="description" content="${meta.description ?? ''}" />`,
      og
        ? Object.entries(og)
            .map(([k, v]) => `<meta property="og:${k}" content="${v}" />`)
            .join('\n')
        : '',
      tw
        ? Object.entries(tw)
            .map(([k, v]) => `<meta name="twitter:${k}" content="${v}" />`)
            .join('\n')
        : '',
      `<link rel="canonical" href="${meta.canonical ?? ''}" />`,
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(lines).then(() => showToast('meta'));
  }

  function copySlug() {
    navigator.clipboard.writeText(slug).then(() => showToast('slug'));
  }

  const btnBase =
    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors';
  const btnStyle = (key: ToastKey) => ({
    borderColor: toast === key ? '#22C55E' : '#6C5CE7',
    color: toast === key ? '#22C55E' : '#6C5CE7',
    backgroundColor: toast === key ? '#F0FDF4' : 'transparent',
  });

  return (
    <div className="flex flex-wrap gap-2 px-4 py-3 bg-white border-t border-gray-200">
      <button className={btnBase} style={btnStyle('html')} onClick={copyHtml}>
        {toast === 'html' ? '✓ Copied!' : 'Copy HTML'}
      </button>
      <button className={btnBase} style={btnStyle(null)} onClick={downloadHtml}>
        Download HTML
      </button>
      <button className={btnBase} style={btnStyle('meta')} onClick={copyMeta}>
        {toast === 'meta' ? '✓ Copied!' : 'Copy Meta Tags'}
      </button>
      <button className={btnBase} style={btnStyle('slug')} onClick={copySlug}>
        {toast === 'slug' ? '✓ Copied!' : `/${slug}`}
      </button>
    </div>
  );
}
