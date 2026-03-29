'use client';

import { useState } from 'react';
import { BLOG_TYPES } from '../lib/config/blog-types';

interface BlogFormProps {
  onSubmit: (config: { url: string; topic: string; blogType: string }) => void;
}

const inputCls =
  'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-shadow';

const FUNNEL_BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  TOFU: { bg: '#F0FDF4', text: '#166534' },
  MOFU: { bg: '#EFF6FF', text: '#1D4ED8' },
  BOFU: { bg: '#F5F3FF', text: '#6C5CE7' },
};

export default function BlogForm({ onSubmit }: BlogFormProps) {
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [blogType, setBlogType] = useState<string>(BLOG_TYPES[0].id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    onSubmit({ url: url.trim(), topic: topic.trim(), blogType });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Product Website URL{' '}
          <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Blog Topic / Product Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. 11x AI review, best LinkedIn automation tools"
          required
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          What kind of blog are you creating?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {BLOG_TYPES.map((bt) => {
            const selected = blogType === bt.id;
            const badge = FUNNEL_BADGE_STYLE[bt.funnelStage] ?? FUNNEL_BADGE_STYLE.TOFU;
            return (
              <button
                key={bt.id}
                type="button"
                onClick={() => setBlogType(bt.id)}
                className="relative flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                style={{
                  borderColor: selected ? '#6C5CE7' : '#E5E7EB',
                  backgroundColor: selected ? 'rgba(108,92,231,0.06)' : '#FFFFFF',
                }}
              >
                {/* Funnel badge */}
                <span
                  className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: badge.bg, color: badge.text }}
                >
                  {bt.funnelStage}
                </span>
                <span
                  className="text-xs font-bold leading-tight pr-8"
                  style={{ color: selected ? '#6C5CE7' : '#374151' }}
                >
                  {bt.label}
                </span>
                <span className="text-[10px] text-gray-400 leading-snug pr-1">
                  {bt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm btn-press hover:opacity-90 transition-opacity shadow-sm"
        style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
      >
        ✨ Generate Blog
      </button>
    </form>
  );
}
