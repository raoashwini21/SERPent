'use client';

import { ContentBrief } from '../lib/types';

interface OutlinePreviewProps {
  brief: ContentBrief;
  countdown: number;
}

const INFOGRAPHIC_BADGE_COLORS: Record<string, string> = {
  comparison: '#6C5CE7',
  pros_cons: '#22C55E',
  features: '#00D2FF',
  pricing: '#F59E0B',
  workflow: '#A29BFE',
  stats: '#EF4444',
  none: '#E5E7EB',
};

export default function OutlinePreview({ brief, countdown }: OutlinePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Content Outline Ready</h3>
          <p className="text-xs text-gray-500 mt-0.5">Generating content in {countdown}s...</p>
        </div>
        <div
          className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
          style={{ backgroundColor: '#22C55E' }}
        >
          {brief.targetWordCount.toLocaleString()} words target
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Title</p>
        <p className="text-sm font-medium text-gray-900">{brief.blogTitle}</p>
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {brief.sections.map((section, i) => (
          <div
            key={section.id}
            className="bg-white border border-gray-200 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 font-mono shrink-0">{i + 1}</span>
                <span className="text-sm font-medium text-gray-800 truncate">
                  {section.heading}
                </span>
              </div>
              <span className="text-xs text-gray-400 shrink-0">{section.wordCountTarget}w</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {section.targetKeywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: '#F5F3FF', color: '#6C5CE7' }}
                >
                  {kw}
                </span>
              ))}
              {section.infographicType !== 'none' && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded text-white"
                  style={{
                    backgroundColor: INFOGRAPHIC_BADGE_COLORS[section.infographicType] ?? '#6B7280',
                  }}
                >
                  {section.infographicType}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
