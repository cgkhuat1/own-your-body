"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, CalendarDays, UserCircle } from 'lucide-react';

export default function ClientNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Tập Luyện', href: '/', icon: Dumbbell },
    { name: 'Nhật Ký', href: '/tracking', icon: CalendarDays },
    { name: 'Hồ Sơ', href: '/profile', icon: UserCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-[72px] pb-safe z-50 px-2 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
              isActive ? 'text-brand-moss' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-full ${isActive ? 'bg-brand-moss/10' : ''}`}>
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${isActive ? 'font-bold' : 'font-semibold'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
