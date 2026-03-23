'use client';

import { useState } from 'react';
import { SEOScore, SEOCheck } from '../lib/types';

interface SeoScoreDashboardProps {
  score: SEOScore;
  previousScore?: number;
}

const STATUS_ICON: Record<string, string> = { pass: '✓', fail: '✗', warn: '⚠' };
const STATUS_COLOR: Record<string, string> = { pass: '#22C55E', fail: '#EF4444', warn: '#F59E0B' };

function scoreColor(n: number) {
  if (n >= 80) return '#22C55E';
  if (n >= 60) return '#F59E0B';
  return '#EF4444';
}
function scoreLabel(n: number) {
  if (n >= 80) return 'Excellent';
  if (n >= 60) return 'Good';
  return 'Needs Work';
}

function groupChecks(checks: SEOCheck[]): Record<string, SEOCheck[]> {
  return checks.reduce<Record<string, SEOCheck[]>>((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {});
}

const CIRCUMFERENCE = 2 * Math.PI * 34; // r=34

export default function SeoScoreDashboard({ score, previousScore }: SeoScoreDashboardProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const groups = groupChecks(score.checks);
  const color = scoreColor(score.overall);
  const dash = (score.overall / 100) * CIRCUMFERENCE;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Score header */}
      <div className="px-5 py-5 flex items-center gap-5" style={{ backgroundColor: '#1A1A2E' }}>
        {/* Large ring */}
        <div className="relative w-24 h-24 shrink-0">
          <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#2D2D50" strokeWidth="7" />
            <circle
              cx="40" cy="40" r="34"
              fill="none"
              stroke={color}
              strokeWidth="7"
              strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color }}>{score.overall}</span>
            <span className="text-xs" style={{ color: '#6B7280' }}>/ 100</span>
          </div>
        </div>

        <div>
          <p className="text-white font-bold text-lg leading-tight">SEO Score</p>
          <p className="font-semibold text-sm mt-0.5" style={{ color }}>
            {scoreLabel(score.overall)}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            {score.checks.filter((c) => c.status === 'pass').length}/{score.checks.length} checks passed
          </p>
          {previousScore !== undefined && (
            <p className="text-xs mt-1" style={{ color: score.overall >= previousScore ? '#22C55E' : '#EF4444' }}>
              {score.overall >= previousScore ? '↑' : '↓'} {Math.abs(score.overall - previousScore)} pts vs before
            </p>
          )}
        </div>
      </div>

      {/* Category groups */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groups).map(([category, checks]) => {
          const passCount = checks.filter((c) => c.status === 'pass').length;
          const hasFail = checks.some((c) => c.status === 'fail');
          const hasWarn = checks.some((c) => c.status === 'warn');
          const borderColor = hasFail ? '#EF4444' : hasWarn ? '#F59E0B' : '#22C55E';
          const isExpanded = expanded === category;

          return (
            <div key={category} style={{ borderLeft: `3px solid ${borderColor}` }}>
              <button
                onClick={() => setExpanded(isExpanded ? null : category)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: borderColor }} />
                  <span className="text-sm font-medium text-gray-800">{category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{passCount}/{checks.length}</span>
                  <span className="text-gray-400 text-xs">{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 space-y-2 bg-gray-50">
                  {checks.map((check, i) => (
                    <div key={i} className="flex items-start gap-2 animate-slide-in-left">
                      <span className="text-sm mt-0.5 shrink-0 font-bold" style={{ color: STATUS_COLOR[check.status] }}>
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
          <p className="text-xs font-semibold text-amber-700 mb-2">Suggestions ({score.suggestions.length})</p>
          <ul className="space-y-1">
            {score.suggestions.slice(0, 5).map((s, i) => (
              <li key={i} className="text-xs text-amber-800">• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
