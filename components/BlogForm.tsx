'use client';

import { useState } from 'react';
import { CATEGORIES } from '../lib/config/categories';
import { FunnelStage } from '../lib/config/funnel-stages';

interface BlogFormProps {
  onSubmit: (config: {
    url: string;
    topic: string;
    category: string;
    funnelStage: FunnelStage;
  }) => void;
}

const FUNNEL_OPTIONS: { stage: FunnelStage; label: string; description: string }[] = [
  { stage: 'TOFU', label: 'TOFU', description: 'Informational — how-to, guides, listicles' },
  { stage: 'MOFU', label: 'MOFU', description: 'Investigational — comparisons, alternatives' },
  { stage: 'BOFU', label: 'BOFU', description: 'Transactional — reviews, deep-dives, vs' },
];

export default function BlogForm({ onSubmit }: BlogFormProps) {
  const [url, setUrl] = useState('');
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [funnelStage, setFunnelStage] = useState<FunnelStage>('TOFU');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    onSubmit({ url: url.trim(), topic: topic.trim(), category, funnelStage });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Product Website URL <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': '#6C5CE7' } as React.CSSProperties}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Blog Topic / Product Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. 11x AI review, best LinkedIn automation tools"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': '#6C5CE7' } as React.CSSProperties}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent"
          style={{ '--tw-ring-color': '#6C5CE7' } as React.CSSProperties}
        >
          {CATEGORIES.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Funnel Stage</label>
        <div className="flex flex-col gap-2">
          {FUNNEL_OPTIONS.map((opt) => {
            const selected = funnelStage === opt.stage;
            return (
              <button
                key={opt.stage}
                type="button"
                onClick={() => setFunnelStage(opt.stage)}
                className="flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors"
                style={{
                  borderColor: selected ? '#6C5CE7' : '#E5E7EB',
                  backgroundColor: selected ? '#F5F3FF' : '#FFFFFF',
                }}
              >
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded mt-0.5 shrink-0"
                  style={{
                    backgroundColor: selected ? '#6C5CE7' : '#F3F4F6',
                    color: selected ? '#FFFFFF' : '#6B7280',
                  }}
                >
                  {opt.stage}
                </span>
                <span className="text-sm text-gray-600">{opt.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        className="w-full py-3 px-4 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90 active:opacity-80"
        style={{ backgroundColor: '#6C5CE7' }}
      >
        Generate Blog
      </button>
    </form>
  );
}
