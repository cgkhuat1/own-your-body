"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dumbbell, CalendarDays, UserCircle } from 'lucide-react';

export default function ClientNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Nhật Ký', href: '/', icon: CalendarDays },
    { name: 'Tập Luyện', href: '/program', icon: Dumbbell },
    { name: 'Hồ Sơ', href: '/profile', icon: UserCircle },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-[85px] pb-6 pt-2 z-50 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]">
      {navItems.map((item) => {
        // Special case for '/' so it doesn't stay active on other routes
        const isActive = pathname === item.href;
        const Icon = item.icon;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-all duration-200 ${
              isActive ? 'text-brand-mossDeep transform scale-105' : 'text-gray-300 hover:text-gray-400'
            }`}
          >
            <div className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-brand-moss/15' : ''}`}>
              <Icon size={26} strokeWidth={isActive ? 2.5 : 1.5} className={isActive ? 'text-brand-mossDeep' : ''} />
            </div>
            <span className={`text-[10px] uppercase tracking-widest ${isActive ? 'font-black text-brand-mossDeep' : 'font-semibold'}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
