'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/' },
  { label: 'New Blog', href: '/new' },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: active ? '#6C5CE7' : 'transparent',
              color: active ? '#FFFFFF' : '#9CA3AF',
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
