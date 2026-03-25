'use client';

import { useState, useMemo } from 'react';
import type { UpdateChange } from '../lib/types';

interface DiffViewProps {
  originalHtml: string;
  updatedHtml: string;
  changes: UpdateChange[];
}

type DiffMode = 'side-by-side' | 'unified';

interface DiffLine {
  type: 'added' | 'removed' | 'modified-old' | 'modified-new' | 'unchanged';
  text: string;
  pairId?: number;
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
  const blockPattern = /<(p|h[1-6]|li|td|th|blockquote|figcaption)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = blockPattern.exec(html)) !== null) {
    const text = stripHtml(match[0]).trim();
    if (text.length > 0) paras.push(text);
  }
  return paras.length > 0 ? paras : html.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Jaccard word similarity between two strings (0–1) */
function similarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = new Set([...wordsA, ...b.toLowerCase().split(/\s+/)]).size;
  return union === 0 ? 1 : intersection / union;
}

function computeDiff(origLines: string[], updLines: string[]): DiffLine[] {
  const origSet = new Set(origLines);
  const updSet = new Set(updLines);

  const removedLines = origLines.filter((l) => !updSet.has(l));
  const addedLines = updLines.filter((l) => !origSet.has(l));

  // Pair removed/added by similarity (greedy)
  const THRESHOLD = 0.4;
  const pairedAddedIdx = new Set<number>();
  const pairs: { ri: number; ai: number; pid: number }[] = [];
  let pid = 0;

  for (let ri = 0; ri < removedLines.length; ri++) {
    let bestSim = THRESHOLD;
    let bestAi = -1;
    for (let ai = 0; ai < addedLines.length; ai++) {
      if (pairedAddedIdx.has(ai)) continue;
      const sim = similarity(removedLines[ri], addedLines[ai]);
      if (sim > bestSim) { bestSim = sim; bestAi = ai; }
    }
    if (bestAi !== -1) {
      pairs.push({ ri, ai: bestAi, pid: pid++ });
      pairedAddedIdx.add(bestAi);
    }
  }

  const pairedRemovedSet = new Set(pairs.map((p) => removedLines[p.ri]));
  const pairedAddedSet = new Set(pairs.map((p) => addedLines[p.ai]));

  const origIdx = new Map(origLines.map((l, i) => [l, i]));
  const updIdx = new Map(updLines.map((l, i) => [l, i]));

  const result: DiffLine[] = [];

  for (const line of origLines) {
    if (updSet.has(line)) result.push({ type: 'unchanged', text: line });
  }
  for (const line of removedLines) {
    if (!pairedRemovedSet.has(line)) result.push({ type: 'removed', text: line });
  }
  for (const line of addedLines) {
    if (!pairedAddedSet.has(line)) result.push({ type: 'added', text: line });
  }
  for (const p of pairs) {
    result.push({ type: 'modified-old', text: removedLines[p.ri], pairId: p.pid });
    result.push({ type: 'modified-new', text: addedLines[p.ai], pairId: p.pid });
  }

  result.sort((a, b) => {
    const posA = a.type === 'removed' || a.type === 'modified-old'
      ? (origIdx.get(a.text) ?? 9999)
      : (updIdx.get(a.text) ?? 9999);
    const posB = b.type === 'removed' || b.type === 'modified-old'
      ? (origIdx.get(b.text) ?? 9999)
      : (updIdx.get(b.text) ?? 9999);
    return posA - posB;
  });

  return result;
}

const TYPE_STYLE: Record<DiffLine['type'], { bg: string; border: string; textColor: string; label: string; labelColor: string }> = {
  added:          { bg: '#F0FDF4', border: '#22C55E', textColor: '#166534', label: '+', labelColor: '#16A34A' },
  removed:        { bg: '#FEF2F2', border: '#EF4444', textColor: '#991B1B', label: '−', labelColor: '#DC2626' },
  'modified-old': { bg: '#FFFBEB', border: '#F59E0B', textColor: '#78350F', label: '~', labelColor: '#D97706' },
  'modified-new': { bg: '#FEFCE8', border: '#EAB308', textColor: '#713F12', label: '~', labelColor: '#CA8A04' },
  unchanged:      { bg: '#FFFFFF', border: 'transparent', textColor: '#374151', label: ' ', labelColor: '#9CA3AF' },
};

function changeTypeIcon(type: string): string {
  const MAP: Record<string, string> = {
    update_years: '📅',
    fix_outdated_facts: '🔧',
    add_internal_links: '🔗',
    add_external_links: '🌐',
    fix_paragraph_length: '📐',
    fix_keyword_density: '🔑',
    add_faq: '❓',
    add_missing_sections: '📄',
    optimize_gsc_keywords: '📊',
  };
  return MAP[type] ?? '✓';
}

export default function DiffView({ originalHtml, updatedHtml, changes }: DiffViewProps) {
  const [mode, setMode] = useState<DiffMode>('side-by-side');

  const { origLines, updLines, diffLines, stats } = useMemo(() => {
    const origLines = extractParagraphs(originalHtml);
    const updLines = extractParagraphs(updatedHtml);
    const diffLines = computeDiff(origLines, updLines);
    const added = diffLines.filter((l) => l.type === 'added').length;
    const removed = diffLines.filter((l) => l.type === 'removed').length;
    const modified = diffLines.filter((l) => l.type === 'modified-new').length;
    return { origLines, updLines, diffLines, stats: { added, removed, modified } };
  }, [originalHtml, updatedHtml]);

  return (
    <div className="flex flex-col h-full">
      {/* Changes summary strip */}
      {changes.length > 0 && (
        <div className="px-4 py-3 border-b border-gray-200 bg-white shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Changes Applied ({changes.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {changes.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700"
                title={c.type}
              >
                <span>{changeTypeIcon(c.type)}</span>
                <span>{c.description}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200 bg-gray-50 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Diff</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
              +{stats.added} added
            </span>
            {stats.modified > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#FFFBEB', color: '#D97706' }}>
                ~{stats.modified} modified
              </span>
            )}
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
                style={{
                  backgroundColor: isRemoved ? '#FEF2F2' : '#FFFFFF',
                  borderLeft: `3px solid ${isRemoved ? '#EF4444' : 'transparent'}`,
                }}
              >
                <span className="shrink-0 font-mono font-bold w-3" style={{ color: isRemoved ? '#DC2626' : '#9CA3AF' }}>
                  {isRemoved ? '−' : ' '}
                </span>
                <span style={{ color: isRemoved ? '#991B1B' : '#374151', textDecoration: isRemoved ? 'line-through' : 'none' }}>
                  {line}
                </span>
              </div>
            );
          })}
          {Array.from({ length: Math.max(0, maxLen - origLines.length) }).map((_, i) => (
            <div key={`pad-${i}`} className="px-3 py-2 h-10 bg-gray-50" />
          ))}
        </div>
      </div>

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
                style={{
                  backgroundColor: isAdded ? '#F0FDF4' : '#FFFFFF',
                  borderLeft: `3px solid ${isAdded ? '#22C55E' : 'transparent'}`,
                }}
              >
                <span className="shrink-0 font-mono font-bold w-3" style={{ color: isAdded ? '#16A34A' : '#9CA3AF' }}>
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
      {diffLines.map((line, i) => {
        const s = TYPE_STYLE[line.type];
        return (
          <div
            key={i}
            className="px-3 py-2 text-xs leading-relaxed flex gap-2"
            style={{ backgroundColor: s.bg, borderLeft: `3px solid ${s.border}` }}
          >
            <span className="shrink-0 font-mono font-bold w-3" style={{ color: s.labelColor }}>
              {s.label}
            </span>
            <span
              style={{
                color: s.textColor,
                textDecoration: line.type === 'removed' || line.type === 'modified-old' ? 'line-through' : 'none',
              }}
            >
              {line.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}
