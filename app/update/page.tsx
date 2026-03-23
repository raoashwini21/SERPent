'use client';

import { useState, useRef } from 'react';
import DiffView from '../../components/DiffView';
import SeoScoreDashboard from '../../components/SeoScoreDashboard';
import { useToast } from '../../components/Toast';
import type { SEOScore } from '../../lib/types';

type UpdateState = 'idle' | 'analyzing' | 'suggestions' | 'updating' | 'complete';

interface UpdateIssue {
  id: string;
  label: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  selected: boolean;
}

interface AnalyzeResult {
  originalHtml: string;
  originalText: string;
  score: SEOScore;
  issues: UpdateIssue[];
  wordCount: number;
  url: string;
}

interface StatusEvent {
  message: string;
  total?: number;
  done?: number;
}

const SEVERITY_COLOR: Record<UpdateIssue['severity'], { bg: string; text: string; label: string }> = {
  high:   { bg: '#FEF2F2', text: '#991B1B', label: 'High' },
  medium: { bg: '#FFFBEB', text: '#92400E', label: 'Medium' },
  low:    { bg: '#F0FDF4', text: '#166534', label: 'Low' },
};

export default function UpdateBlogPage() {
  const { toast } = useToast();

  const [state, setState] = useState<UpdateState>('idle');
  const [url, setUrl] = useState('');
  const [keyword, setKeyword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Analysis results
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [issues, setIssues] = useState<UpdateIssue[]>([]);

  // Update results
  const [updateStatus, setUpdateStatus] = useState<StatusEvent | null>(null);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [updatedHtml, setUpdatedHtml] = useState('');
  const [newScore, setNewScore] = useState<SEOScore | null>(null);

  // Refs for stream recovery
  const completeReceivedRef = useRef(false);
  const updatedHtmlRef = useRef('');

  function toggleIssue(id: string) {
    setIssues((prev) => prev.map((i) => i.id === id ? { ...i, selected: !i.selected } : i));
  }

  function selectAll() {
    setIssues((prev) => prev.map((i) => ({ ...i, selected: true })));
  }

  function selectNone() {
    setIssues((prev) => prev.map((i) => ({ ...i, selected: false })));
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setState('analyzing');
    setErrorMsg('');
    setAnalyzeResult(null);
    setIssues([]);
    setUpdatedHtml('');
    setNewScore(null);

    try {
      const res = await fetch('/api/update/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), keyword: keyword.trim() }),
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json() as AnalyzeResult;
      setAnalyzeResult(data);
      setIssues(data.issues || []);
      setState('suggestions');
      toast('Analysis complete — review the issues below', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setState('idle');
      toast(msg, 'error');
    }
  }

  async function handleApply() {
    const selected = issues.filter((i) => i.selected).map((i) => i.id);
    if (selected.length === 0) {
      toast('Select at least one fix to apply', 'warning');
      return;
    }
    if (!analyzeResult) return;

    setState('updating');
    setProgressLog([]);
    completeReceivedRef.current = false;
    updatedHtmlRef.current = '';

    try {
      const res = await fetch('/api/update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalHtml: analyzeResult.originalHtml,
          originalText: analyzeResult.originalText,
          selectedFixes: selected,
          keyword: keyword.trim() || analyzeResult.url,
          url: analyzeResult.url,
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const rawEvents = buffer.split('\n\n');
        buffer = rawEvents.pop() ?? '';

        for (const rawEvent of rawEvents) {
          if (!rawEvent.trim()) continue;
          const lines = rawEvent.split('\n');
          let eventName = 'message';
          let eventData = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: ')) eventData = line.slice(6);
          }
          if (!eventData) continue;
          try {
            const parsed = JSON.parse(eventData) as Record<string, unknown>;
            if (eventName === 'status') {
              const ev = parsed as unknown as StatusEvent;
              setUpdateStatus(ev);
              setProgressLog((prev) => [...prev, ev.message]);
            } else if (eventName === 'fix_error') {
              const ev = parsed as { id: string; message: string };
              setProgressLog((prev) => [...prev, `⚠ ${ev.id} failed: ${ev.message}`]);
              toast(`Fix "${ev.id}" failed — continuing`, 'warning');
            } else if (eventName === 'complete') {
              const ev = parsed as { updatedHtml: string; score: SEOScore; fixesApplied: string[] };
              completeReceivedRef.current = true;
              updatedHtmlRef.current = ev.updatedHtml;
              setUpdatedHtml(ev.updatedHtml);
              setNewScore(ev.score);
              setState('complete');
              toast('Blog updated successfully!', 'success');
            } else if (eventName === 'error') {
              const ev = parsed as { message: string };
              throw new Error(ev.message);
            }
          } catch (parseErr) {
            if (parseErr instanceof SyntaxError) continue;
            throw parseErr;
          }
        }
      }

      if (!completeReceivedRef.current) {
        setState('complete');
        toast('Update finished (some fixes may be incomplete)', 'warning');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
      setState('suggestions');
      toast(msg, 'error');
    }
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(updatedHtml).then(() => toast('HTML copied to clipboard', 'success'));
  }

  function handleDownload() {
    const blob = new Blob([updatedHtml], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'updated-blog.html';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Download started', 'info');
  }

  function handleReset() {
    setState('idle');
    setUrl('');
    setKeyword('');
    setAnalyzeResult(null);
    setIssues([]);
    setUpdatedHtml('');
    setNewScore(null);
    setErrorMsg('');
    setProgressLog([]);
    setUpdateStatus(null);
  }

  const showDiff = (state === 'complete') && analyzeResult && updatedHtml;
  const selectedCount = issues.filter((i) => i.selected).length;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F9FAFB' }}>
      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="w-full md:w-[40%] shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">🔄</span>
            <h1 className="text-base font-bold text-gray-900">Update Blog</h1>
          </div>
          <p className="text-xs text-gray-500 pl-6">
            {state === 'idle' && 'Enter a blog URL to audit and update'}
            {state === 'analyzing' && 'Analyzing your blog…'}
            {state === 'suggestions' && 'Review and apply fixes'}
            {state === 'updating' && 'Applying selected fixes…'}
            {state === 'complete' && 'Update complete — diff below'}
          </p>
          <nav className="text-xs text-gray-400 mt-1.5 pl-6">
            <span className="text-gray-500 font-medium">Dashboard</span>
            <span className="mx-1">›</span>
            <span style={{ color: '#6C5CE7' }} className="font-medium">Update Blog</span>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* ── IDLE: URL form ── */}
          {(state === 'idle' || state === 'analyzing') && (
            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Blog Post URL
                </label>
                <input
                  type="url"
                  placeholder="https://salesrobot.co/blog/your-post"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  disabled={state === 'analyzing'}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition-all focus:border-purple-400 focus:ring-2"
                  style={{ '--tw-ring-color': 'rgba(108,92,231,0.15)' } as React.CSSProperties}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Target Keyword <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. LinkedIn automation tool"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  disabled={state === 'analyzing'}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none transition-all focus:border-purple-400 focus:ring-2"
                  style={{ '--tw-ring-color': 'rgba(108,92,231,0.15)' } as React.CSSProperties}
                />
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={state === 'analyzing' || !url.trim()}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60 btn-press"
                style={{ backgroundColor: '#6C5CE7' }}
              >
                {state === 'analyzing' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing…
                  </span>
                ) : (
                  '🔍 Analyze Blog'
                )}
              </button>
            </form>
          )}

          {/* ── SUGGESTIONS: issue list + apply ── */}
          {(state === 'suggestions' || state === 'complete') && analyzeResult && (
            <div className="space-y-4 animate-slide-in-left">
              {/* Current score */}
              <SeoScoreDashboard score={analyzeResult.score} />

              {/* Issue list */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Issues Found
                  </p>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs" style={{ color: '#6C5CE7' }}>All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={selectNone} className="text-xs text-gray-400">None</button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {issues.length === 0 && (
                    <p className="px-4 py-3 text-xs text-gray-500">No issues found — blog looks good!</p>
                  )}
                  {issues.map((issue) => {
                    const sev = SEVERITY_COLOR[issue.severity];
                    return (
                      <label
                        key={issue.id}
                        className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={issue.selected}
                          onChange={() => toggleIssue(issue.id)}
                          className="mt-0.5 accent-purple-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-gray-800">{issue.label}</span>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: sev.bg, color: sev.text }}
                            >
                              {sev.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">{issue.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Word count */}
              <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
                <span>📄</span>
                <span>{analyzeResult.wordCount.toLocaleString()} words · {analyzeResult.url.replace(/^https?:\/\//, '').slice(0, 40)}</span>
              </div>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              {state === 'suggestions' && (
                <button
                  onClick={handleApply}
                  disabled={selectedCount === 0}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50 btn-press"
                  style={{ backgroundColor: '#6C5CE7' }}
                >
                  Apply {selectedCount > 0 ? `${selectedCount} Fix${selectedCount > 1 ? 'es' : ''}` : 'Fixes'} →
                </button>
              )}

              {state === 'complete' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCopyHtml}
                      className="py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 btn-press"
                    >
                      📋 Copy HTML
                    </button>
                    <button
                      onClick={handleDownload}
                      className="py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 btn-press"
                    >
                      📥 Download
                    </button>
                  </div>
                  <button
                    onClick={handleReset}
                    className="w-full py-2 rounded-xl text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 btn-press"
                  >
                    ← Update Another Blog
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── UPDATING: progress log ── */}
          {state === 'updating' && (
            <div className="space-y-4 animate-slide-in-left">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full pulse-dot shrink-0"
                    style={{ backgroundColor: '#6C5CE7' }}
                  />
                  <span className="text-xs font-semibold text-gray-700">Applying Fixes</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {/* Progress bar */}
                  {updateStatus && updateStatus.total !== undefined && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{updateStatus.message}</span>
                        <span>{updateStatus.done ?? 0}/{updateStatus.total}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            backgroundColor: '#6C5CE7',
                            width: updateStatus.total > 0
                              ? `${((updateStatus.done ?? 0) / updateStatus.total) * 100}%`
                              : '0%',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Log */}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {progressLog.map((msg, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="shrink-0 mt-0.5">·</span>
                        <span>{msg}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Score comparison when complete */}
        {state === 'complete' && newScore && analyzeResult && (
          <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Before</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: analyzeResult.score.overall >= 70 ? '#22C55E' : analyzeResult.score.overall >= 50 ? '#F59E0B' : '#EF4444' }}
                >
                  {analyzeResult.score.overall}%
                </span>
              </div>
              <span className="text-gray-300">→</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">After</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: newScore.overall >= 70 ? '#22C55E' : newScore.overall >= 50 ? '#F59E0B' : '#EF4444' }}
                >
                  {newScore.overall}%
                </span>
                {newScore.overall > analyzeResult.score.overall && (
                  <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>
                    +{newScore.overall - analyzeResult.score.overall}%
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main panel content */}
        <div className="flex-1 overflow-hidden">
          {showDiff ? (
            <DiffView
              originalHtml={analyzeResult!.originalHtml}
              updatedHtml={updatedHtml}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center px-8">
              {state === 'idle' && (
                <div>
                  <div className="text-4xl mb-3">🔄</div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Diff Preview</p>
                  <p className="text-xs text-gray-400">
                    Analyze a blog post to see what will change, then apply fixes to see a before/after diff.
                  </p>
                </div>
              )}
              {state === 'analyzing' && (
                <div>
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Fetching page…</p>
                  <p className="text-xs text-gray-400">Scraping content and running SEO analysis</p>
                </div>
              )}
              {state === 'suggestions' && (
                <div>
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Select fixes on the left</p>
                  <p className="text-xs text-gray-400">The diff will appear here after you apply fixes</p>
                </div>
              )}
              {state === 'updating' && (
                <div>
                  <div className="text-4xl mb-3">⚙️</div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Applying fixes…</p>
                  <p className="text-xs text-gray-400">This may take a minute</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
