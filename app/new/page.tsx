'use client';

import { useState, useEffect, useRef } from 'react';
import BlogForm from '../../components/BlogForm';
import ProgressStream from '../../components/ProgressStream';
import OutlinePreview from '../../components/OutlinePreview';
import LivePreview from '../../components/LivePreview';
import SeoScoreDashboard from '../../components/SeoScoreDashboard';
import ExportActions from '../../components/ExportActions';
import { FunnelStage } from '../../lib/config/funnel-stages';
import type {
  KeywordData,
  SERPAnalysis as _SERPAnalysis,
  ContentBrief,
  ResearchBrief as _ResearchBrief,
  SEOScore,
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
  category: string;
  funnelStage: FunnelStage;
}

export default function NewBlogPage() {
  const [genState, setGenState] = useState<GenState>('idle');
  const [currentPhase, setCurrentPhase] = useState('seo');
  const [progressEvents, setProgressEvents] = useState<StatusEvent[]>([]);
  const [keywordData, setKeywordData] = useState<KeywordData | null>(null);
  const [_serpAnalysis, setSerpAnalysis] = useState<_SERPAnalysis | null>(null);
  const [contentBrief, setContentBrief] = useState<ContentBrief | null>(null);
  const [_researchBrief, setResearchBrief] = useState<_ResearchBrief | null>(null);
  const [sections, setSections] = useState<Record<string, SectionData>>({});
  const [seoScore, setSeoScore] = useState<SEOScore | null>(null);
  const [finalHtml, setFinalHtml] = useState('');
  const [metaData, setMetaData] = useState<Record<string, unknown>>({});
  const [slug, setSlug] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [postProcessingWarning, setPostProcessingWarning] = useState(false);
  const [countdown, setCountdown] = useState(2);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs so stream-close handler can read latest values without stale closures
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
        // auto-continue handled by useEffect
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
      case 'score':
        setSeoScore(data as unknown as SEOScore);
        break;
      case 'complete': {
        const cd = d as {
          html: string;
          score: SEOScore;
          meta: Record<string, unknown>;
          slug: string;
        };
        completeReceivedRef.current = true;
        setFinalHtml(cd.html);
        setMetaData(cd.meta);
        setSlug(cd.slug);
        setSeoScore(cd.score);
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
    setSeoScore(null);
    setFinalHtml('');
    setMetaData({});
    setSlug('');
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
              const parsed = JSON.parse(eventData);
              handleEvent(eventName, parsed);
            } catch {
              // skip malformed events
            }
          }
        }
      }

      // Stream closed — if complete event was never received, recover gracefully
      if (!completeReceivedRef.current) {
        // Cast needed: TS treats post-while(true) code as potentially unreachable
        const briefRef = contentBriefRef as { current: { h1: string } | null };
        const briefH1 = briefRef.current ? briefRef.current.h1 : '';
        const sectionBlocks = Object.entries(sectionsRef.current)
          .map(([id, s]) => `<section id="${id}">${s.html}</section>`)
          .join('\n');
        const fallbackHtml = briefH1
          ? `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" /><title>${briefH1}</title></head><body><article class="blog-post"><h1>${briefH1}</h1>${sectionBlocks}</article></body></html>`
          : '';
        setFinalHtml(fallbackHtml);
        setPostProcessingWarning(true);
        setGenState('complete');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed');
      setGenState('error');
    }
  }

  const showLeftForm = genState === 'idle';
  const showComplete = genState === 'complete';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F9FAFB' }}>
      {/* LEFT PANEL */}
      <div
        className="w-full md:w-[40%] shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen"
      >
        <div className="px-5 py-4 border-b border-gray-100">
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
          {showLeftForm && (
            <BlogForm onSubmit={startGeneration} />
          )}

          {(genState === 'generating' || genState === 'checkpoint') && (
            <>
              <ProgressStream
                events={progressEvents}
                currentPhase={currentPhase}
              />
              {genState === 'checkpoint' && contentBrief && (
                <OutlinePreview brief={contentBrief} countdown={countdown} />
              )}
            </>
          )}

          {genState === 'complete' && (
            <div className="space-y-4">
              {postProcessingWarning && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-amber-700 mb-1">
                    Post-processing timed out
                  </p>
                  <p className="text-xs text-amber-600">
                    Your blog content is ready but SEO scoring may be incomplete.
                    You can still export the HTML below.
                  </p>
                </div>
              )}

              {seoScore && <SeoScoreDashboard score={seoScore} />}

              {/* Keyword summary */}
              {keywordData && (
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Primary Keyword
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {keywordData.primaryKeyword}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {keywordData.secondaryKeywords.slice(0, 4).map((k) => (
                      <span
                        key={k.keyword}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: '#F5F3FF', color: '#6C5CE7' }}
                      >
                        {k.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setGenState('idle')}
                className="w-full py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                ← Start New Blog
              </button>
            </div>
          )}

          {genState === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">Generation Failed</p>
              <p className="text-xs text-red-600">{errorMsg}</p>
              <button
                onClick={() => setGenState('idle')}
                className="mt-3 text-xs text-red-600 underline"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Preview area */}
        <div className="flex-1 overflow-y-auto bg-white">
          <LivePreview
            h1={contentBrief?.h1 ?? ''}
            sections={sections}
            brief={contentBrief}
          />
        </div>

        {/* Export bar — sticky at bottom */}
        {showComplete && finalHtml && (
          <ExportActions html={finalHtml} slug={slug} meta={metaData} />
        )}
      </div>
    </div>
  );
}
