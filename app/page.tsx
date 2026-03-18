import Link from 'next/link';

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{ backgroundColor: '#0F0F0F' }}
    >
      <div className="max-w-2xl w-full text-center">
        <h1
          className="text-4xl font-bold mb-4"
          style={{ color: '#A29BFE', fontFamily: 'Inter, sans-serif' }}
        >
          SalesRobot Blog Automation
        </h1>
        <p className="text-gray-400 mb-10 text-lg">
          End-to-end SEO-optimized blog generation for salesrobot.co
        </p>
        <Link
          href="/new"
          className="inline-block px-8 py-4 rounded-lg font-semibold text-white text-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#6C5CE7' }}
        >
          Create New Blog
        </Link>
      </div>
    </main>
  );
}
