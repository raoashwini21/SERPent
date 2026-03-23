import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SidebarNav from '../components/SidebarNav';
import { ToastProvider } from '../components/Toast';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-inter',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'SERPent — AI Blog Engine',
  description: 'AI-powered SEO blog generation and updating by SalesRobot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="flex h-screen overflow-hidden bg-gray-50 antialiased">
        <aside
          className="hidden md:flex flex-col w-60 shrink-0 h-screen overflow-y-auto"
          style={{ backgroundColor: '#1A1A2E' }}
        >
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-2xl leading-none select-none">🐍</span>
              <div>
                <p className="text-white font-bold text-xl leading-none tracking-tight">SERPent</p>
                <p className="text-gray-500 text-xs mt-0.5">by SalesRobot</p>
              </div>
            </div>
            <div
              className="h-px rounded-full"
              style={{ background: 'linear-gradient(90deg, #6C5CE7 0%, #00D2FF 60%, transparent 100%)' }}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
          <div className="px-5 py-4 border-t border-white/10">
            <a
              href="https://salesrobot.co"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span>⚡</span>
              <span>Powered by SalesRobot</span>
            </a>
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <ToastProvider>
            {children}
          </ToastProvider>
        </main>
      </body>
    </html>
  );
}
