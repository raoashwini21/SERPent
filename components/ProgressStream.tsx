'use client';

interface StatusEvent {
  phase: string;
  step?: string;
  message: string;
}

interface ProgressStreamProps {
  events: StatusEvent[];
  currentPhase: string;
}

const PHASES = [
  { id: 'seo', label: 'SEO Research' },
  { id: 'research', label: 'Product Research' },
  { id: 'generate', label: 'Content Gen' },
  { id: 'post', label: 'Post-Processing' },
];

export default function ProgressStream({ events, currentPhase }: ProgressStreamProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase);

  return (
    <div className="space-y-5">
      {/* Phase stepper */}
      <div className="flex items-center gap-1">
        {PHASES.map((phase, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex;
          return (
            <div key={phase.id} className="flex items-center gap-1 flex-1 min-w-0">
              <div className="flex flex-col items-center min-w-0 flex-1">
                <div className="relative">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                    style={{
                      backgroundColor: done ? '#22C55E' : active ? '#6C5CE7' : '#E5E7EB',
                      color: done || active ? '#FFFFFF' : '#9CA3AF',
                    }}
                  >
                    {done ? '✓' : idx + 1}
                  </div>
                  {active && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full pulse-dot"
                      style={{ backgroundColor: '#A29BFE' }}
                    />
                  )}
                </div>
                <span className="text-xs mt-1 text-center leading-tight" style={{ color: active ? '#6C5CE7' : done ? '#22C55E' : '#9CA3AF' }}>
                  {phase.label}
                </span>
              </div>
              {idx < PHASES.length - 1 && (
                <div className="h-0.5 flex-1 mb-5 mx-0.5" style={{ backgroundColor: done ? '#22C55E' : '#E5E7EB' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Terminal log */}
      <div className="bg-gray-900 rounded-xl p-3 h-56 overflow-y-auto font-mono border border-gray-800">
        {events.length === 0 && (
          <p className="text-gray-600 text-xs">Starting generation pipeline...</p>
        )}
        {events.map((ev, i) => (
          <div key={i} className="text-xs mb-1 section-appear" style={{ color: i === events.length - 1 ? '#A29BFE' : '#6B7280' }}>
            <span style={{ color: '#00D2FF' }}>[{ev.phase}]</span> {ev.message}
          </div>
        ))}
      </div>
    </div>
  );
}
