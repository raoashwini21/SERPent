'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import DiffView from '../../components/DiffView';
import SeoScoreDashboard from '../../components/SeoScoreDashboard';
import { useToast } from '../../components/Toast';
import { parseGSCData, findQuickWins } from '../../lib/gsc-parser';
import type { SEOScore, BlogUpdateAnalysis, GSCKeyword, UpdateChange } from '../../lib/types';

// ─── Types ──────────────────────────────────────────────────────────────────

type InputMode = 'webflow' | 'manual';
type AnalysisState = 'idle' | 'analyzing' | 'suggestions' | 'applying' | 'complete' | 'error';

interface WebflowBlogSummary {
  id: string;
  title: string;
  slug: string;
}

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
  analysis: BlogUpdateAnalysis;
  issues: UpdateIssue[];
  wordCount: number;
  sourceUrl?: string;
  webflowItemId?: string;
  metaTitle?: string;
  metaDescription?: string;
}

interface StatusEvent {
  message: string;
  total?: number;
  done?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<UpdateIssue['severity'], { bg: string; text: string; label: string }> = {
  high:   { bg: '#FEF2F2', text: '#991B1B', label: 'High' },
  medium: { bg: '#FFFBEB', text: '#92400E', label: 'Med' },
  low:    { bg: '#F0FDF4', text: '#166534', label: 'Low' },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function UpdateBlogPage() {
  const { toast } = useToast();

  // Input
  const [inputMode, setInputMode] = useState<InputMode>('webflow');
  const [blogUrl, setBlogUrl] = useState('');
  const [pastedHtml, setPastedHtml] = useState('');
  const [primaryKeyword, setPrimaryKeyword] = useState('');

  // Webflow
  const [webflowBlogs, setWebflowBlogs] = useState<WebflowBlogSummary[]>([]);
  const [webflowSearch, setWebflowSearch] = useState('');
  const [selectedBlog, setSelectedBlog] = useState<WebflowBlogSummary | null>(null);
  const [webflowLoading, setWebflowLoading] = useState(false);
  const [webflowError, setWebflowError] = useState('');

  // GSC
  const [gscKeywords, setGscKeywords] = useState<GSCKeyword[]>([]);
  const [gscOpen, setGscOpen] = useState(false);
  const [gscDragOver, setGscDragOver] = useState(false);
  const gscInputRef = useRef<HTMLInputElement>(null);

  // Analysis
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [issues, setIssues] = useState<UpdateIssue[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Apply
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [updateStatus, setUpdateStatus] = useState<StatusEvent | null>(null);

  // Results
  const [updatedHtml, setUpdatedHtml] = useState('');
  const [changes, setChanges] = useState<UpdateChange[]>([]);
  const [oldScore, setOldScore] = useState<SEOScore | null>(null);
  const [newScore, setNewScore] = useState<SEOScore | null>(null);

  const completeRef = useRef(false);

  // ── Webflow: load on mount ───────────────────────────────────────────────

  useEffect(() => {
    setWebflowLoading(true);
    setWebflowError('');
    fetch('/api/webflow/blogs')
      .then((r) => r.json())
      .then((d: { blogs?: WebflowBlogSummary[]; error?: string }) => {
        if (d.error) throw new Error(d.error);
        setWebflowBlogs(d.blogs ?? []);
      })
      .catch((e: unknown) => setWebflowError(e instanceof Error ? e.message : String(e)))
      .finally(() => setWebflowLoading(false));
  }, []);

  // ── GSC helpers ──────────────────────────────────────────────────────────

  function parseGscFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string ?? '';
      const parsed = parseGSCData(csv);
      setGscKeywords(parsed);
      if (parsed.length > 0) toast(`${parsed.length} GSC keywords loaded`, 'success');
      else toast('Could not parse CSV — check format', 'warning');
    };
    reader.readAsText(file);
  }

  function handleGscDrop(e: React.DragEvent) {
    e.preventDefault();
    setGscDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseGscFile(file);
  }

  function handleGscFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) parseGscFile(file);
  }

  // ── Issues helpers ───────────────────────────────────────────────────────

  function toggleIssue(id: string) {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i)));
  }

  function selectAll() { setIssues((prev) => prev.map((i) => ({ ...i, selected: true }))); }
  function selectNone() { setIssues((prev) => prev.map((i) => ({ ...i, selected: false }))); }

  // ── Analyze ──────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    const body: Record<string, unknown> = {
      primary_keyword: primaryKeyword.trim() || undefined,
      gsc_keywords: gscKeywords.length > 0 ? gscKeywords : undefined,
    };

    if (inputMode === 'webflow') {
      if (!selectedBlog) { toast('Select a Webflow blog first', 'warning'); return; }
      body.webflow_item_id = selectedBlog.id;
    } else if (blogUrl.trim()) {
      body.blog_url = blogUrl.trim();
    } else if (pastedHtml.trim()) {
      body.blog_html = pastedHtml.trim();
    } else {
      toast('Enter a URL or paste HTML', 'warning');
      return;
    }

    setAnalysisState('analyzing');
    setErrorMsg('');
    setAnalysis(null);
    setIssues([]);
    setUpdatedHtml('');
    setChanges([]);
    setOldScore(null);
    setNewScore(null);

    try {
      const res = await fetch('/api/update/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as AnalyzeResult;
      setAnalysis(data);
      setOldScore(data.analysis?.currentScore ?? null);
      setIssues(data.issues ?? []);
      setAnalysisState('suggestions');
      toast('Analysis complete', 'success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setAnalysisState('error');
      toast(msg, 'error');
    }
  }, [inputMode, selectedBlog, blogUrl, pastedHtml, primaryKeyword, gscKeywords, toast]);

  // ── Apply ────────────────────────────────────────────────────────────────

  async function handleApply() {
    const selected = issues.filter((i) => i.selected).map((i) => i.id);
    if (selected.length === 0) { toast('Select at least one fix', 'warning'); return; }
    if (!analysis) return;

    setAnalysisState('applying');
    setProgressLog([]);
    setUpdateStatus(null);
    completeRef.current = false;

    try {
      const res = await fetch('/api/update/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalHtml: analysis.originalHtml,
          webflow_item_id: analysis.webflowItemId,
          selectedFixes: selected,
          keyword: primaryKeyword.trim() || analysis.sourceUrl || 'blog',
          gsc_keywords: gscKeywords.length > 0 ? gscKeywords : undefined,
          analysis: analysis.analysis,
          metaTitle: analysis.metaTitle,
          metaDescription: analysis.metaDescription,
        }),
      });

      if (!res.body) throw new Error('No response body');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';

        for (const raw of parts) {
          if (!raw.trim()) continue;
          let eventName = 'message';
          let eventData = '';
          for (const line of raw.split('\n')) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim();
            if (line.startsWith('data: ')) eventData = line.slice(6);
          }
          if (!eventData) continue;
          try {
            const parsed = JSON.parse(eventData) as Record<string, unknown>;
            if (eventName === 'status') {
              const ev = parsed as unknown as StatusEvent;
              setUpdateStatus(ev);
              setProgressLog((p) => [...p, ev.message]);
            } else if (eventName === 'fix_error') {
              const ev = parsed as { id: string; message: string };
              setProgressLog((p) => [...p, `⚠ ${ev.id}: ${ev.message}`]);
              toast(`Fix "${ev.id}" failed — continuing`, 'warning');
            } else if (eventName === 'complete') {
              const ev = parsed as { updatedHtml: string; score: SEOScore; changes_made?: UpdateChange[] };
              completeRef.current = true;
              setUpdatedHtml(ev.updatedHtml);
              setNewScore(ev.score);
              setChanges(ev.changes_made ?? []);
              setAnalysisState('complete');
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

      if (!completeRef.current) {
        setAnalysisState('complete');
        toast('Update finished (some fixes may be incomplete)', 'warning');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setAnalysisState('suggestions');
      toast(msg, 'error');
    }
  }

  // ── Export helpers ───────────────────────────────────────────────────────

  function handleCopyHtml() {
    navigator.clipboard.writeText(updatedHtml).then(() => toast('HTML copied', 'success'));
  }

  function handleDownload() {
    const blob = new Blob([updatedHtml], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${selectedBlog?.slug ?? 'updated-blog'}.html`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Download started', 'info');
  }

  async function handlePushWebflow() {
    if (!analysis?.webflowItemId || !updatedHtml) return;
    try {
      const res = await fetch('/api/webflow/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: analysis.webflowItemId, postBody: updatedHtml }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast('Published to Webflow!', 'success');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Webflow push failed', 'error');
    }
  }

  function handleReset() {
    setAnalysisState('idle');
    setBlogUrl('');
    setPastedHtml('');
    setPrimaryKeyword('');
    setSelectedBlog(null);
    setWebflowSearch('');
    setGscKeywords([]);
    setAnalysis(null);
    setIssues([]);
    setUpdatedHtml('');
    setChanges([]);
    setOldScore(null);
    setNewScore(null);
    setErrorMsg('');
    setProgressLog([]);
    setUpdateStatus(null);
  }

  // ── Derived ──────────────────────────────────────────────────────────────

  const selectedCount = issues.filter((i) => i.selected).length;
  const showDiff = analysisState === 'complete' && analysis && updatedHtml;
  const gscQuickWins = gscKeywords.length > 0 ? findQuickWins(gscKeywords).slice(0, 5) : [];

  const filteredBlogs = webflowSearch.trim()
    ? webflowBlogs.filter(
        (b) =>
          b.title.toLowerCase().includes(webflowSearch.toLowerCase()) ||
          b.slug.toLowerCase().includes(webflowSearch.toLowerCase())
      )
    : webflowBlogs;

  const isIdle = analysisState === 'idle' || analysisState === 'error';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── LEFT PANEL (40%) ────────────────────────────────────────────── */}
      <div className="w-[40%] shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">🔄</span>
            <h1 className="text-base font-bold text-gray-900">Update Blog</h1>
          </div>
          <nav className="text-xs text-gray-400 mt-1 pl-6">
            <span className="text-gray-500 font-medium">Dashboard</span>
            <span className="mx-1">›</span>
            <span style={{ color: '#6C5CE7' }} className="font-medium">Update Blog</span>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── INPUT SECTION ── */}
          {isIdle && (
            <>
              {/* Mode tabs */}
              <div className="flex rounded-xl overflow-hidden border border-gray-200 text-xs font-semibold">
                {(['webflow', 'manual'] as InputMode[]).map((m) => {
                  const labels = { webflow: '☁ Webflow', manual: '✏ Manual' };
                  const active = inputMode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => setInputMode(m)}
                      className="flex-1 py-2.5 transition-colors"
                      style={{
                        backgroundColor: active ? '#6C5CE7' : 'transparent',
                        color: active ? '#fff' : '#6B7280',
                      }}
                    >
                      {labels[m]}
                    </button>
                  );
                })}
              </div>

              {/* Webflow selector */}
              {inputMode === 'webflow' && (
                <div className="space-y-2">
                  {webflowLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
                      <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-purple-500 rounded-full animate-spin" />
                      Loading Webflow blogs…
                    </div>
                  )}
                  {webflowError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                      {webflowError}
                    </div>
                  )}
                  {!webflowLoading && webflowBlogs.length > 0 && (
                    <>
                      <input
                        type="text"
                        placeholder="Search blogs…"
                        value={webflowSearch}
                        onChange={(e) => setWebflowSearch(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-purple-400"
                      />
                      <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                        {filteredBlogs.length === 0 && (
                          <p className="px-4 py-3 text-xs text-gray-400">No results</p>
                        )}
                        {filteredBlogs.map((b) => {
                          const active = selectedBlog?.id === b.id;
                          return (
                            <button
                              key={b.id}
                              onClick={() => setSelectedBlog(b)}
                              className="w-full text-left px-4 py-2.5 text-xs transition-colors border-b border-gray-100 last:border-0"
                              style={{
                                backgroundColor: active ? 'rgba(108,92,231,0.08)' : 'transparent',
                                borderLeft: active ? '3px solid #6C5CE7' : '3px solid transparent',
                              }}
                            >
                              <span className="font-medium block truncate" style={{ color: active ? '#6C5CE7' : '#374151' }}>
                                {b.title}
                              </span>
                              <span className="text-gray-400 text-[10px]">/{b.slug}</span>
                            </button>
                          );
                        })}
                      </div>
                      {selectedBlog && (
                        <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-purple-700">
                          <p className="font-semibold truncate">{selectedBlog.title}</p>
                          <p className="text-purple-500 text-[10px] mt-0.5">/{selectedBlog.slug}</p>
                        </div>
                      )}
                    </>
                  )}
                  {!webflowLoading && !webflowError && webflowBlogs.length === 0 && (
                    <p className="text-xs text-gray-400 py-2">No Webflow blogs found.</p>
                  )}
                </div>
              )}

              {/* Manual: URL + Paste */}
              {inputMode === 'manual' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Blog URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/blog/your-post"
                      value={blogUrl}
                      onChange={(e) => setBlogUrl(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-purple-400"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span>or paste HTML</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <textarea
                    placeholder="<article>…paste blog HTML here…</article>"
                    value={pastedHtml}
                    onChange={(e) => setPastedHtml(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-xl outline-none focus:border-purple-400 font-mono resize-none"
                  />
                </div>
              )}

              {/* Primary keyword */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Target Keyword <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. LinkedIn automation tool"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-purple-400"
                />
              </div>

              {/* GSC upload collapsible */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setGscOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    📊 GSC Data
                    {gscKeywords.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: '#6C5CE7' }}>
                        {gscKeywords.length}
                      </span>
                    )}
                  </span>
                  <span className="text-gray-400 text-[10px]">{gscOpen ? '▲' : '▼'}</span>
                </button>

                {gscOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                    <p className="text-xs text-gray-500">
                      Upload a Google Search Console CSV for keyword recommendations.
                    </p>

                    {/* Drag-drop zone */}
                    <div
                      onDragOver={(e) => { e.preventDefault(); setGscDragOver(true); }}
                      onDragLeave={() => setGscDragOver(false)}
                      onDrop={handleGscDrop}
                      onClick={() => gscInputRef.current?.click()}
                      className="flex flex-col items-center justify-center gap-1 py-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors"
                      style={{
                        borderColor: gscDragOver ? '#6C5CE7' : '#D1D5DB',
                        backgroundColor: gscDragOver ? 'rgba(108,92,231,0.04)' : 'transparent',
                      }}
                    >
                      <span className="text-xl">📁</span>
                      <span className="text-xs text-gray-500">Drop CSV here or click to browse</span>
                    </div>
                    <input
                      ref={gscInputRef}
                      type="file"
                      accept=".csv,.tsv,.txt"
                      className="hidden"
                      onChange={handleGscFile}
                    />

                    {/* Quick wins chips */}
                    {gscQuickWins.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                          Quick Wins
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {gscQuickWins.map((kw) => (
                            <span
                              key={kw.query}
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-cyan-200"
                              style={{ backgroundColor: 'rgba(0,210,255,0.08)', color: '#0891B2' }}
                            >
                              {kw.query} · pos {Math.round(kw.position)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {gscKeywords.length > 0 && (
                      <button
                        onClick={() => setGscKeywords([])}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        ✕ Clear GSC data
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Analyze button */}
              <button
                onClick={handleAnalyze}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white btn-press"
                style={{ backgroundColor: '#6C5CE7' }}
              >
                🔍 Analyze Blog
              </button>
            </>
          )}

          {/* ── ANALYZING ── */}
          {analysisState === 'analyzing' && (
            <div className="flex flex-col items-center gap-4 py-10">
              <span className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              <p className="text-sm font-medium text-gray-600">Analyzing blog…</p>
              <p className="text-xs text-gray-400">Fetching content and running SEO audit</p>
            </div>
          )}

          {/* ── SUGGESTIONS ── */}
          {(analysisState === 'suggestions' || analysisState === 'complete') && analysis && (
            <div className="space-y-4">
              {/* Score */}
              {oldScore && <SeoScoreDashboard score={oldScore} />}

              {/* Webflow badge */}
              {analysis.webflowItemId && (
                <div className="flex items-center gap-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                  <span>☁</span>
                  <span>Webflow item found — can publish directly</span>
                </div>
              )}

              {/* GSC quick wins */}
              {gscQuickWins.length > 0 && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-semibold text-cyan-800 mb-1.5">📊 GSC Quick Wins</p>
                  <div className="flex flex-wrap gap-1">
                    {gscQuickWins.map((kw) => (
                      <span key={kw.query} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-100 text-cyan-800">
                        {kw.query}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Issues */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Issues Found</p>
                  <div className="flex gap-2 text-xs">
                    <button onClick={selectAll} style={{ color: '#6C5CE7' }}>All</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={selectNone} className="text-gray-400">None</button>
                  </div>
                </div>
                <div className="divide-y divide-gray-100">
                  {issues.length === 0 && (
                    <p className="px-4 py-3 text-xs text-gray-400">No issues found — looks great!</p>
                  )}
                  {issues.map((issue) => {
                    const sev = SEVERITY_STYLE[issue.severity];
                    return (
                      <label key={issue.id} className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={issue.selected}
                          onChange={() => toggleIssue(issue.id)}
                          className="mt-0.5 accent-purple-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-gray-800">{issue.label}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: sev.bg, color: sev.text }}>
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
              <p className="text-xs text-gray-400 px-1">
                📄 {analysis.wordCount.toLocaleString()} words
                {analysis.sourceUrl && <> · {analysis.sourceUrl.replace(/^https?:\/\//, '').slice(0, 40)}</>}
              </p>

              {errorMsg && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">{errorMsg}</div>
              )}

              {analysisState === 'suggestions' && (
                <button
                  onClick={handleApply}
                  disabled={selectedCount === 0}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-white btn-press disabled:opacity-50"
                  style={{ backgroundColor: '#6C5CE7' }}
                >
                  Apply {selectedCount > 0 ? `${selectedCount} Fix${selectedCount > 1 ? 'es' : ''}` : 'Fixes'} →
                </button>
              )}

              {analysisState === 'complete' && (
                <button onClick={handleReset} className="w-full py-2 text-xs border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50">
                  ← Update Another Blog
                </button>
              )}
            </div>
          )}

          {/* ── APPLYING: progress ── */}
          {analysisState === 'applying' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full pulse-dot shrink-0" style={{ backgroundColor: '#6C5CE7' }} />
                  <span className="text-xs font-semibold text-gray-700">Applying Fixes</span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {updateStatus?.total !== undefined && (
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
                            width: updateStatus.total > 0 ? `${((updateStatus.done ?? 0) / updateStatus.total) * 100}%` : '0%',
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {progressLog.map((msg, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="shrink-0">·</span>
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

      {/* ── RIGHT PANEL (60%) ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Score comparison bar */}
        {analysisState === 'complete' && oldScore && newScore && (
          <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Before</span>
              <span className="text-lg font-bold" style={{ color: oldScore.overall >= 70 ? '#22C55E' : oldScore.overall >= 50 ? '#F59E0B' : '#EF4444' }}>
                {oldScore.overall}%
              </span>
            </div>
            <span className="text-gray-300">→</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">After</span>
              <span className="text-lg font-bold" style={{ color: newScore.overall >= 70 ? '#22C55E' : newScore.overall >= 50 ? '#F59E0B' : '#EF4444' }}>
                {newScore.overall}%
              </span>
              {newScore.overall > oldScore.overall && (
                <span className="text-xs font-bold" style={{ color: '#22C55E' }}>
                  +{newScore.overall - oldScore.overall}%
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          {showDiff ? (
            <DiffView
              originalHtml={analysis!.originalHtml}
              updatedHtml={updatedHtml}
              changes={changes}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-center px-8">
              {analysisState === 'idle' && (
                <div>
                  <div className="text-5xl mb-4">🔄</div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Diff Preview</p>
                  <p className="text-xs text-gray-400 max-w-xs">Select a blog, analyze it, apply fixes — the before/after diff will appear here.</p>
                </div>
              )}
              {analysisState === 'analyzing' && (
                <div>
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Fetching &amp; Analyzing…</p>
                  <p className="text-xs text-gray-400">Scraping content and running SEO audit</p>
                </div>
              )}
              {(analysisState === 'suggestions' || analysisState === 'error') && (
                <div>
                  <div className="text-5xl mb-4">📋</div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Select fixes on the left</p>
                  <p className="text-xs text-gray-400">The diff will appear here after you apply fixes</p>
                </div>
              )}
              {analysisState === 'applying' && (
                <div>
                  <div className="text-5xl mb-4">⚙️</div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Applying fixes…</p>
                  <p className="text-xs text-gray-400">This may take a minute</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export bar — sticky bottom */}
        {analysisState === 'complete' && updatedHtml && (
          <div className="shrink-0 border-t border-gray-200 bg-white px-5 py-3 flex items-center gap-2">
            <button
              onClick={handleCopyHtml}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 btn-press"
            >
              📋 Copy HTML
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 btn-press"
            >
              📥 Download
            </button>
            {analysis?.webflowItemId && (
              <button
                onClick={handlePushWebflow}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white btn-press"
                style={{ backgroundColor: '#6C5CE7' }}
              >
                ☁ Push to Webflow
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← Start Over
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
