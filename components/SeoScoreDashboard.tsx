'use client';

import { useState } from 'react';
import { SEOScore, SEOCheck } from '../lib/types';

interface SeoScoreDashboardProps {
  score: SEOScore;
}

const STATUS_ICON: Record<string, string> = {
  pass: '✓',
  fail: '✗',
  warn: '⚠',
};

const STATUS_COLOR: Record<string, string> = {
  pass: '#22C55E',
  fail: '#EF4444',
  warn: '#F59E0B',
};

function scoreRingColor(overall: number) {
  if (overall >= 80) return '#22C55E';
  if (overall >= 60) return '#F59E0B';
  return '#EF4444';
}

function groupChecks(checks: SEOCheck[]): Record<string, SEOCheck[]> {
  return checks.reduce<Record<string, SEOCheck[]>>((acc, check) => {
    if (!acc[check.category]) acc[check.category] = [];
    acc[check.category].push(check);
    return acc;
  }, {});
}

export default function SeoScoreDashboard({ score }: SeoScoreDashboardProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const groups = groupChecks(score.checks);
  const ringColor = scoreRingColor(score.overall);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Score header */}
      <div
        className="px-5 py-4 flex items-center gap-5"
        style={{ backgroundColor: '#1A1A2E' }}
      >
        {/* Ring */}
        <div className="relative w-16 h-16 shrink-0">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <circle cx="32" cy="32" r="26" fill="none" stroke="#2D2D50" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeDasharray={`${(score.overall / 100) * 163} 163`}
              strokeLinecap="round"
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-base font-bold"
            style={{ color: ringColor }}
          >
            {score.overall}
          </span>
        </div>
        <div>
          <p className="text-white font-bold text-base">SEO Score</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {score.checks.filter((c) => c.status === 'pass').length}/{score.checks.length} checks
            passed
          </p>
        </div>
      </div>

      {/* Category groups */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groups).map(([category, checks]) => {
          const passCount = checks.filter((c) => c.status === 'pass').length;
          const hasIssues = checks.some((c) => c.status !== 'pass');
          const expanded = expandedCategory === category;

          return (
            <div key={category}>
              <button
                onClick={() => setExpandedCategory(expanded ? null : category)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: hasIssues
                        ? checks.some((c) => c.status === 'fail')
                          ? '#EF4444'
                          : '#F59E0B'
                        : '#22C55E',
                    }}
                  />
                  <span className="text-sm font-medium text-gray-800">{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {passCount}/{checks.length}
                  </span>
                  <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded && (
                <div className="px-4 pb-3 space-y-2 bg-gray-50">
                  {checks.map((check, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span
                        className="text-sm mt-0.5 shrink-0 font-bold"
                        style={{ color: STATUS_COLOR[check.status] }}
                      >
                        {STATUS_ICON[check.status]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-700">{check.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{check.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Suggestions */}
      {score.suggestions.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
          <p className="text-xs font-semibold text-amber-700 mb-2">
            Suggestions ({score.suggestions.length})
          </p>
          <ul className="space-y-1">
            {score.suggestions.slice(0, 5).map((s, i) => (
              <li key={i} className="text-xs text-amber-800">
                • {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
