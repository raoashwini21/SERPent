import Link from 'next/link';

const STATS = [
  { icon: '🔬', title: '4-Stage SEO Pipeline', description: 'Keyword discovery, SERP analysis, content brief, and scoring — all automated.' },
  { icon: '✍️', title: '2-Pass AI Writing', description: 'Draft pass for substance, refiner pass for conversational tone. No jargon.' },
  { icon: '📊', title: 'Branded Infographics', description: 'SVG infographics with SalesRobot brand colors embedded in every blog.' },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">SERPent 🐍</h1>
          <p className="text-lg font-semibold text-gray-700 mb-2">AI-Powered Blog Engine by SalesRobot</p>
          <p className="text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
            Generate SEO-optimized blogs from scratch or update existing ones — fully automated.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover-card animate-scale-in" style={{ borderTop: '4px solid #6C5CE7' }}>
            <div className="p-7">
              <div className="text-3xl mb-4">✨</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Create New Blog</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Enter a URL + topic, and SERPent generates a complete SEO-optimized, Webflow-ready blog with keyword research, infographics, and metadata.
              </p>
              <Link href="/new" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold btn-press hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}>
                Start Creating →
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover-card animate-scale-in" style={{ borderTop: '4px solid #00D2FF', animationDelay: '0.05s' }}>
            <div className="p-7">
              <div className="text-3xl mb-4">🔄</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Update Existing Blog</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Paste an existing blog URL. SERPent fact-checks content, finds new keywords, adds missing sections, fixes SEO, and refreshes everything.
              </p>
              <Link href="/update" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold btn-press hover:opacity-90 transition-opacity" style={{ background: 'linear-gradient(135deg, #00B4D8 0%, #00D2FF 100%)' }}>
                Start Updating →
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {STATS.map((stat, i) => (
            <div key={stat.title} className="bg-white rounded-xl border border-gray-200 p-5 hover-card animate-slide-in-left" style={{ animationDelay: `${i * 0.06}s` }}>
              <span className="text-2xl mb-3 block">{stat.icon}</span>
              <p className="font-semibold text-gray-900 text-sm mb-1">{stat.title}</p>
              <p className="text-gray-500 text-xs leading-relaxed">{stat.description}</p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">Built for SalesRobot&apos;s content pipeline</p>
      </div>
    </div>
  );
}
