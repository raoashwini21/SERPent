'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: '🏠' },
  { label: 'New Blog', href: '/new', icon: '✨' },
  { label: 'Update Blog', href: '/update', icon: '🔄' },
];

export default function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: active ? 'rgba(108, 92, 231, 0.18)' : 'transparent',
              color: active ? '#A29BFE' : '#9CA3AF',
              borderLeft: active ? '2px solid #6C5CE7' : '2px solid transparent',
            }}
          >
            <span className="text-base leading-none">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
