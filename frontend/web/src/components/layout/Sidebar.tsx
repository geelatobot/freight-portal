'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Search,
  Package,
  Bell,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { useUserStore } from '@/stores';

const navigation = [
  { name: '概览', href: '/dashboard', icon: LayoutDashboard },
  { name: '货物跟踪', href: '/dashboard/tracking', icon: Search },
  { name: '订单中心', href: '/dashboard/orders', icon: Package },
  { name: '订阅管理', href: '/dashboard/subscriptions', icon: Bell },
  { name: '通知消息', href: '/dashboard/notifications', icon: Bell },
  { name: '账户设置', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useUserStore();

  return (
    <div className="flex h-full flex-col bg-white border-r border-slate-200 w-64">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-slate-200">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">货运门户</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <item.icon className={cn('w-5 h-5 mr-3', isActive ? 'text-primary-foreground' : 'text-slate-400')} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="border-t border-slate-200 p-4">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="w-5 h-5 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {user?.companyName || '企业用户'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        <button
          onClick={logout}
          className="flex w-full items-center px-4 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3 text-slate-400" />
          退出登录
        </button>
      </div>
    </div>
  );
}
