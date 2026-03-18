import Link from 'next/link';

const STATS = [
  {
    title: '4-Stage SEO Pipeline',
    description: 'Keyword discovery, SERP analysis, content brief, and scoring — all automated.',
  },
  {
    title: '2-Pass AI Generation',
    description: 'Draft pass for substance, refiner pass for conversational tone. No jargon.',
  },
  {
    title: 'Branded Infographics',
    description: 'Auto-generated SVG infographics with SalesRobot brand colors in every blog.',
  },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Blog Automation Engine</h1>
          <p className="mt-2 text-gray-500">
            Generate SEO-optimized, Webflow-ready blogs in minutes
          </p>
        </div>

        {/* CTA card */}
        <Link
          href="/new"
          className="block rounded-2xl p-8 mb-8 transition-opacity hover:opacity-95 text-white"
          style={{ backgroundColor: '#6C5CE7' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">Create New Blog</p>
              <p className="text-purple-200 text-sm mt-1">
                Topic → SEO research → outline → full blog → export
              </p>
            </div>
            <span className="text-3xl">→</span>
          </div>
        </Link>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.title}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <p className="font-semibold text-gray-900 text-sm mb-2">{stat.title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
