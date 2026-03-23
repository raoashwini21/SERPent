'use client';

import { useState, useMemo } from 'react';

interface DiffViewProps {
  originalHtml: string;
  updatedHtml: string;
}

type DiffMode = 'side-by-side' | 'unified';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractParagraphs(html: string): string[] {
  const paras: string[] = [];

  // Extract block-level elements as paragraphs
  const blockPattern = /<(p|h[1-6]|li|td|th|blockquote|figcaption)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(html)) !== null) {
    const text = stripHtml(match[0]).trim();
    if (text.length > 0) paras.push(text);
  }

  return paras.length > 0 ? paras : html.split('\n').map((l) => l.trim()).filter(Boolean);
}

function computeDiff(originalLines: string[], updatedLines: string[]): DiffLine[] {
  const origSet = new Set(originalLines);
  const updSet = new Set(updatedLines);

  const allLines: DiffLine[] = [];

  // Removed: in original but not in updated
  for (const line of originalLines) {
    if (!updSet.has(line)) {
      allLines.push({ type: 'removed', text: line });
    }
  }

  // Added: in updated but not in original
  for (const line of updatedLines) {
    if (!origSet.has(line)) {
      allLines.push({ type: 'added', text: line });
    }
  }

  // Unchanged: in both
  for (const line of updatedLines) {
    if (origSet.has(line)) {
      allLines.push({ type: 'unchanged', text: line });
    }
  }

  // Sort: unchanged first (in original order), then removed, then added
  const origIdx = new Map(originalLines.map((l, i) => [l, i]));
  const updIdx = new Map(updatedLines.map((l, i) => [l, i]));

  allLines.sort((a, b) => {
    const aIdx = a.type === 'removed' ? (origIdx.get(a.text) ?? 9999) :
                 a.type === 'added' ? (updIdx.get(a.text) ?? 9999) + 10000 :
                 (origIdx.get(a.text) ?? 9999);
    const bIdx = b.type === 'removed' ? (origIdx.get(b.text) ?? 9999) :
                 b.type === 'added' ? (updIdx.get(b.text) ?? 9999) + 10000 :
                 (origIdx.get(b.text) ?? 9999);
    return aIdx - bIdx;
  });

  return allLines;
}

const LINE_BG: Record<DiffLine['type'], string> = {
  added: '#F0FDF4',
  removed: '#FEF2F2',
  unchanged: '#FFFFFF',
};

const LINE_BORDER: Record<DiffLine['type'], string> = {
  added: '#22C55E',
  removed: '#EF4444',
  unchanged: 'transparent',
};

const LINE_LABEL: Record<DiffLine['type'], string> = {
  added: '+',
  removed: '−',
  unchanged: ' ',
};

const LABEL_COLOR: Record<DiffLine['type'], string> = {
  added: '#16A34A',
  removed: '#DC2626',
  unchanged: '#9CA3AF',
};

export default function DiffView({ originalHtml, updatedHtml }: DiffViewProps) {
  const [mode, setMode] = useState<DiffMode>('side-by-side');

  const { origLines, updLines, diffLines, stats } = useMemo(() => {
    const origLines = extractParagraphs(originalHtml);
    const updLines = extractParagraphs(updatedHtml);
    const diffLines = computeDiff(origLines, updLines);
    const added = diffLines.filter((l) => l.type === 'added').length;
    const removed = diffLines.filter((l) => l.type === 'removed').length;
    return { origLines, updLines, diffLines, stats: { added, removed } };
  }, [originalHtml, updatedHtml]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Diff</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
              +{stats.added} added
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              −{stats.removed} removed
            </span>
          </div>
        </div>

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['side-by-side', 'unified'] as DiffMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: mode === m ? '#6C5CE7' : '#FFFFFF',
                color: mode === m ? '#FFFFFF' : '#6B7280',
              }}
            >
              {m === 'side-by-side' ? 'Side by Side' : 'Unified'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {mode === 'side-by-side' ? (
          <SideBySideView origLines={origLines} updLines={updLines} />
        ) : (
          <UnifiedView diffLines={diffLines} />
        )}
      </div>
    </div>
  );
}

function SideBySideView({ origLines, updLines }: { origLines: string[]; updLines: string[] }) {
  const origSet = new Set(origLines);
  const updSet = new Set(updLines);

  const maxLen = Math.max(origLines.length, updLines.length);

  return (
    <div className="grid grid-cols-2 divide-x divide-gray-200 min-h-full">
      {/* Original */}
      <div>
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
          <span className="text-xs font-semibold text-gray-600">Original</span>
        </div>
        <div className="divide-y divide-gray-100">
          {origLines.map((line, i) => {
            const isRemoved = !updSet.has(line);
            return (
              <div
                key={i}
                className="px-3 py-2 text-xs leading-relaxed flex gap-2"
                style={{ backgroundColor: isRemoved ? '#FEF2F2' : '#FFFFFF', borderLeft: `3px solid ${isRemoved ? '#EF4444' : 'transparent'}` }}
              >
                <span className="shrink-0 font-mono font-bold" style={{ color: isRemoved ? '#DC2626' : '#9CA3AF', width: '12px' }}>
                  {isRemoved ? '−' : ' '}
                </span>
                <span style={{ color: isRemoved ? '#991B1B' : '#374151' }}>{line}</span>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, maxLen - origLines.length) }).map((_, i) => (
            <div key={`pad-${i}`} className="px-3 py-2 h-10 bg-gray-50" />
          ))}
        </div>
      </div>

      {/* Updated */}
      <div>
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 sticky top-0">
          <span className="text-xs font-semibold text-gray-600">Updated</span>
        </div>
        <div className="divide-y divide-gray-100">
          {updLines.map((line, i) => {
            const isAdded = !origSet.has(line);
            return (
              <div
                key={i}
                className="px-3 py-2 text-xs leading-relaxed flex gap-2"
                style={{ backgroundColor: isAdded ? '#F0FDF4' : '#FFFFFF', borderLeft: `3px solid ${isAdded ? '#22C55E' : 'transparent'}` }}
              >
                <span className="shrink-0 font-mono font-bold" style={{ color: isAdded ? '#16A34A' : '#9CA3AF', width: '12px' }}>
                  {isAdded ? '+' : ' '}
                </span>
                <span style={{ color: isAdded ? '#166534' : '#374151' }}>{line}</span>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, maxLen - updLines.length) }).map((_, i) => (
            <div key={`pad-${i}`} className="px-3 py-2 h-10 bg-gray-50" />
          ))}
        </div>
      </div>
    </div>
  );
}

function UnifiedView({ diffLines }: { diffLines: DiffLine[] }) {
  return (
    <div className="divide-y divide-gray-100">
      {diffLines.map((line, i) => (
        <div
          key={i}
          className="px-3 py-2 text-xs leading-relaxed flex gap-2"
          style={{
            backgroundColor: LINE_BG[line.type],
            borderLeft: `3px solid ${LINE_BORDER[line.type]}`,
          }}
        >
          <span className="shrink-0 font-mono font-bold" style={{ color: LABEL_COLOR[line.type], width: '12px' }}>
            {LINE_LABEL[line.type]}
          </span>
          <span style={{ color: line.type === 'added' ? '#166534' : line.type === 'removed' ? '#991B1B' : '#374151' }}>
            {line.text}
          </span>
        </div>
      ))}
    </div>
  );
}
