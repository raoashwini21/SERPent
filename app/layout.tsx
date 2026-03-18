import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import SidebarNav from '../components/SidebarNav';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-inter',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'SalesRobot Blog Engine',
  description: 'AI-powered SEO blog generation for SalesRobot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body className="flex h-screen overflow-hidden bg-gray-50 antialiased">
        <aside
          className="hidden md:flex flex-col w-56 shrink-0 h-screen overflow-y-auto"
          style={{ backgroundColor: '#1A1A2E' }}
        >
          <div className="px-5 py-5 border-b border-white/10">
            <p className="text-white font-bold text-base leading-tight">SalesRobot</p>
            <p className="text-gray-400 text-xs mt-0.5">Blog Engine</p>
          </div>
          <SidebarNav />
        </aside>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
