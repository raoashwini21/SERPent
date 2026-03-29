'use client';

import { useState, useEffect, useRef } from 'react';
import BlogForm from '../../components/BlogForm';
import ProgressStream from '../../components/ProgressStream';
import OutlinePreview from '../../components/OutlinePreview';
import LivePreview from '../../components/LivePreview';
import { useToast } from '../../components/Toast';
import type {
  KeywordData,
  SERPAnalysis as _SERPAnalysis,
  ContentBrief,
  ResearchBrief as _ResearchBrief,
} from '../../lib/types';

type GenState = 'idle' | 'generating' | 'checkpoint' | 'complete' | 'error';

interface StatusEvent {
  phase: string;
  step?: string;
  message: string;
}

interface SectionData {
  html: string;
  infographic: string | null;
}

interface BlogConfig {
  url: string;
  topic: string;
  blogType: string;
}

interface BlogSummary {
  title: string;
  wordCount: number;
  sectionCount: number;
  primaryKeyword: string;
  infographicCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
}

interface BlogMeta {
  title?: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  excerpt?: string;
  faqSchema?: string;
  articleSchema?: string;
  [key: string]: unknown;
}

export default function NewBlogPage() {
  const { toast } = useToast();

  const [genState, setGenState] = useState<GenState>('idle');
  const [currentPhase, setCurrentPhase] = useState('seo');
  const [progressEvents, setProgressEvents] = useState<StatusEvent[]>([]);
  const [_keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [_serpAnalysis, setSerpAnalysis] = useState<_SERPAnalysis | null>(null);
  const [contentBrief, setContentBrief] = useState<ContentBrief | null>(null);
  const [_researchBrief, setResearchBrief] = useState<_ResearchBrief | null>(null);
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [finalHtml, setFinalHtml] = useState('');
  const [summary, setSummary] = useState<BlogSummary | null>(null);
  const [meta, setMeta] = useState<BlogMeta>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [postProcessingWarning, setPostProcessingWarning] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const [webflowLoading, setWebflowLoading] = useState(false);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeReceivedRef = useRef(false);
  const sectionsRef = useRef<Record<string, SectionData>>({});
  const contentBriefRef = useRef<{ h1: string } | null>(null);

  // Auto-continue after checkpoint
  useEffect(() => {
    if (genState === 'checkpoint') {
      setCountdown(2);
      countdownRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            clearInterval(countdownRef.current!);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [genState]);

  function handleEvent(eventName: string, data: unknown) {
    const d = data as Record<string, unknown>;

    switch (eventName) {
      case 'status': {
        const ev = data as unknown as StatusEvent;
        if (ev.phase) setCurrentPhase(ev.phase);
        setProgressEvents((prev) => [...prev, ev]);
        break;
      }
      case 'keywords':
        setKeywordData(data as unknown as KeywordData);
        break;
      case 'serp':
        setSerpAnalysis(data as unknown as _SERPAnalysis);
        break;
      case 'brief': {
        const brief = data as unknown as ContentBrief;
        contentBriefRef.current = { h1: brief.h1 };
        setContentBrief(brief);
        setGenState('checkpoint');
        break;
      }
      case 'checkpoint':
        break;
      case 'research':
        setResearchBrief(data as unknown as _ResearchBrief);
        setGenState('generating');
        break;
      case 'section': {
        const sd = d as { id: string; html: string; infographic: string | null };
        const sectionEntry = { html: sd.html, infographic: sd.infographic ?? null };
        sectionsRef.current = { ...sectionsRef.current, [sd.id]: sectionEntry };
        setSections((prev) => ({ ...prev, [sd.id]: sectionEntry }));
        break;
      }
      case 'complete': {
        const cd = d as {
          html: string;
          summary: BlogSummary;
          meta: BlogMeta;
          slug: string;
        };
        completeReceivedRef.current = true;
        setFinalHtml(cd.html);
        setSummary(cd.summary ?? null);
        setMeta(cd.meta ?? {});
        setGenState('complete');
        break;
      }
      case 'error': {
        const ed = d as { message: string };
        setErrorMsg(ed.message);
        setGenState('error');
        break;
      }
    }
  }

  async function startGeneration(config: BlogConfig) {
    setGenState('generating');
    setCurrentPhase('seo');
    setProgressEvents([]);
    setKeywordData(null);
    setSerpAnalysis(null);
    setContentBrief(null);
    setResearchBrief(null);
    setSections({});
    setFinalHtml('');
    setSummary(null);
    setMeta({});
    setErrorMsg('');
    setPostProcessingWarning(false);
    completeReceivedRef.current = false;
    sectionsRef.current = {};
    contentBriefRef.current = null;

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
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
          if (eventData) {
            try {
              handleEvent(eventName, JSON.parse(eventData));
            } catch {
              // skip malformed events
            }
          }
        }
      }

      if (!completeReceivedRef.current) {
        const briefRef = contentBriefRef as { current: { h1: string } | null };
        const briefH1 = briefRef.current ? briefRef.current.h1 : '';
        const sectionBlocks = Object.entries(sectionsRef.current)
          .map(([id, s]) => `<section id="${id}">${s.html}</section>`)
          .join('\n');
        setFinalHtml(briefH1 ? `<h1>${briefH1}</h1>${sectionBlocks}` : '');
        setPostProcessingWarning(true);
        setGenState('complete');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed');
      setGenState('error');
    }
  }

  async function handlePushToWebflow() {
    if (!finalHtml) return;
    setWebflowLoading(true);
    try {
      const res = await fetch('/api/webflow/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_body: finalHtml,
          title: summary?.title ?? meta.title ?? '',
          slug: meta.slug ?? '',
          meta_title: meta.metaTitle ?? '',
          meta_description: meta.metaDescription ?? '',
          excerpt: meta.excerpt ?? '',
        }),
      });
      const json = await res.json() as { success?: boolean; slug?: string; error?: string };
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Unknown error');
      toast(`✓ Blog created in Webflow! Slug: /${json.slug ?? meta.slug}. Don't forget to publish.`, 'success');
    } catch (e) {
      toast(`Failed to push to Webflow: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setWebflowLoading(false);
    }
  }

  function handleCopyHtml() {
    navigator.clipboard.writeText(finalHtml).then(() => toast('HTML copied!', 'success'));
  }

  function handleDownload() {
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${meta.slug ?? 'blog'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopyMeta() {
    const text = `${meta.metaTitle ?? ''}\n${meta.metaDescription ?? ''}`;
    navigator.clipboard.writeText(text).then(() => toast('Meta tags copied!', 'success'));
  }

  function handleCopySlug() {
    navigator.clipboard.writeText(`/${meta.slug ?? ''}`).then(() => toast('Slug copied!', 'success'));
  }

  function handleReset() {
    setGenState('idle');
    setProgressEvents([]);
    setKeywordData(null);
    setSerpAnalysis(null);
    setContentBrief(null);
    setResearchBrief(null);
    setSections({});
    setFinalHtml('');
    setSummary(null);
    setMeta({});
    setErrorMsg('');
    setPostProcessingWarning(false);
    completeReceivedRef.current = false;
    sectionsRef.current = {};
    contentBriefRef.current = null;
  }

  const showComplete = genState === 'complete';

  const outlineBtnCls = 'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors hover:bg-purple-50 btn-press';
  const outlineBtnStyle = { borderColor: '#6C5CE7', color: '#6C5CE7' };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F9FAFB' }}>
      {/* LEFT PANEL */}
      <div className="w-full md:w-[40%] shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen">
        <div className="px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-base">✨</span>
            <h1 className="text-base font-bold text-gray-900">Create New Blog</h1>
          </div>
          <p className="text-xs text-gray-500 pl-6">
            {genState === 'idle' && 'Configure your blog'}
            {(genState === 'generating' || genState === 'checkpoint') && 'Generating…'}
            {genState === 'complete' && 'Generation complete'}
            {genState === 'error' && 'Generation failed'}
          </p>
          <nav className="text-xs text-gray-400 mt-1.5 pl-6">
            <span className="text-gray-500 font-medium">Dashboard</span>
            <span className="mx-1">›</span>
            <span style={{ color: '#6C5CE7' }} className="font-medium">New Blog</span>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {genState === 'idle' && (
            <BlogForm onSubmit={startGeneration} />
          )}

          {(genState === 'generating' || genState === 'checkpoint') && (
            <>
              <ProgressStream events={progressEvents} currentPhase={currentPhase} />
              {genState === 'checkpoint' && contentBrief && (
                <OutlinePreview brief={contentBrief} countdown={countdown} />
              )}
            </>
          )}

          {showComplete && (
            <div className="space-y-4">
              {postProcessingWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-1">Post-processing timed out</p>
                  <p className="text-xs text-amber-600">Blog content is ready but some metadata may be incomplete.</p>
                </div>
              )}

              {/* ✅ Blog Generated heading */}
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <p className="text-sm font-bold text-gray-900">Blog Generated</p>
              </div>

              {/* Blog Summary card */}
              {summary && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Blog Summary</p>

                  {/* Title */}
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{summary.title}</p>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Word Count</p>
                      <p className="text-xs font-semibold text-gray-800">{summary.wordCount.toLocaleString()} words</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sections</p>
                      <p className="text-xs font-semibold text-gray-800">{summary.sectionCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Primary Keyword</p>
                      <span
                        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
                        style={{ backgroundColor: '#F5F3FF', color: '#6C5CE7' }}
                      >
                        {summary.primaryKeyword}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Infographics</p>
                      <p className="text-xs font-semibold text-gray-800">{summary.infographicCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">Internal Links</p>
                      <p className="text-xs font-semibold text-gray-800">{summary.internalLinkCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">External Links</p>
                      <p className="text-xs font-semibold text-gray-800">{summary.externalLinkCount}</p>
                    </div>
                  </div>

                  {/* Slug */}
                  {meta.slug && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">URL Slug</p>
                      <code className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded font-mono">/{meta.slug}</code>
                    </div>
                  )}

                  {/* Meta title */}
                  {meta.metaTitle && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Meta Title</p>
                      <p className="text-xs text-gray-700">{meta.metaTitle}</p>
                    </div>
                  )}

                  {/* Meta description */}
                  {meta.metaDescription && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Meta Description</p>
                      <p className="text-xs text-gray-500">
                        {meta.metaDescription.length > 120
                          ? meta.metaDescription.slice(0, 120) + '...'
                          : meta.metaDescription}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PRIMARY: Push to Webflow */}
              <button
                onClick={handlePushToWebflow}
                disabled={webflowLoading || !finalHtml}
                className="w-full py-3 rounded-xl text-sm font-bold text-white btn-press disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
              >
                {webflowLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Pushing…
                  </>
                ) : (
                  '🚀 Push to Webflow'
                )}
              </button>

              {/* SECONDARY: export actions */}
              <div className="flex flex-wrap gap-2">
                <button className={outlineBtnCls} style={outlineBtnStyle} onClick={handleCopyHtml}>
                  📋 Copy HTML
                </button>
                <button className={outlineBtnCls} style={outlineBtnStyle} onClick={handleDownload}>
                  📥 Download
                </button>
                <button className={outlineBtnCls} style={outlineBtnStyle} onClick={handleCopyMeta}>
                  🏷️ Meta Tags
                </button>
                <button className={outlineBtnCls} style={outlineBtnStyle} onClick={handleCopySlug}>
                  🔗 Slug
                </button>
              </div>

              {/* Reset */}
              <button
                onClick={handleReset}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                ← Start New Blog
              </button>
            </div>
          )}

          {genState === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Generation Failed</p>
              <p className="text-xs text-red-600">{errorMsg}</p>
              <button onClick={handleReset} className="mt-3 text-xs text-red-600 underline">
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white">
          <LivePreview
            h1={contentBrief?.h1 ?? ''}
            sections={sections}
            brief={contentBrief}
          />
        </div>
      </div>
    </div>
  );
}
