'use client';

import { useState } from 'react';
import { CATEGORIES } from '../lib/config/categories';
import { FunnelStage } from '../lib/config/funnel-stages';

interface BlogFormProps {
  onSubmit: (config: { url: string; topic: string; category: string; funnelStage: FunnelStage }) => void;
}

const FUNNEL_OPTIONS: { stage: FunnelStage; label: string; description: string; icon: string; accent: string }[] = [
  { stage: 'TOFU', label: 'TOFU', description: 'Informational — how-to, guides, listicles', icon: '🌱', accent: '#22C55E' },
  { stage: 'MOFU', label: 'MOFU', description: 'Investigational — comparisons, alternatives', icon: '🔍', accent: '#00D2FF' },
  { stage: 'BOFU', label: 'BOFU', description: 'Transactional — reviews, deep-dives, vs', icon: '🎯', accent: '#6C5CE7' },
];

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent transition-shadow';

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
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Product Website URL <span className="text-gray-400 font-normal normal-case">(optional)</span>
        </label>
        <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
          Blog Topic / Product Name <span className="text-red-400">*</span>
        </label>
        <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. 11x AI review, best LinkedIn automation tools" required className={inputCls} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
          {CATEGORIES.map((cat) => (
            <option key={cat.slug} value={cat.slug}>{cat.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Funnel Stage</label>
        <div className="flex flex-col gap-2">
          {FUNNEL_OPTIONS.map((opt) => {
            const selected = funnelStage === opt.stage;
            return (
              <button key={opt.stage} type="button" onClick={() => setFunnelStage(opt.stage)}
                className="flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm"
                style={{ borderColor: selected ? opt.accent : '#E5E7EB', backgroundColor: selected ? `${opt.accent}12` : '#FFFFFF' }}
              >
                <span className="text-xl leading-none shrink-0">{opt.icon}</span>
                <div className="min-w-0">
                  <span className="text-xs font-bold" style={{ color: selected ? opt.accent : '#9CA3AF' }}>{opt.stage}</span>
                  <span className="text-xs text-gray-500 ml-2">{opt.description}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button type="submit" className="w-full py-3 px-4 rounded-xl text-white font-semibold text-sm btn-press hover:opacity-90 transition-opacity shadow-sm" style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}>
        ✨ Generate Blog
      </button>
    </form>
  );
}
