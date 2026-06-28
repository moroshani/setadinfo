import {
  Activity,
  LayoutDashboard,
  Search,
  Bell,
  Settings,
  Users,
  ListChecks,
  Send,
  Gavel,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'SetadInfo',
    email: 'workbench',
    avatar: '',
  },
  navGroups: [
    {
      title: 'ورک‌بنچ',
      items: [
        {
          title: 'نمای کلی',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'جستجوی زنده',
          url: '/search',
          icon: Search,
        },
        {
          title: 'پایش‌ها',
          url: '/monitors',
          icon: ListChecks,
        },
        {
          title: 'بروزرسانی‌ها',
          url: '/updates',
          icon: Bell,
        },
      ],
    },
    {
      title: 'عملیات',
      items: [
        {
          title: 'آگهی‌ها',
          url: '/opportunities',
          icon: Gavel,
        },
        {
          title: 'اجراها',
          url: '/runs',
          icon: Activity,
        },
        {
          title: 'مقصدها',
          url: '/recipients',
          icon: Send,
        },
        {
          title: 'کاربران',
          url: '/users',
          icon: Users,
        },
        {
          title: 'تنظیمات',
          url: '/settings',
          icon: Settings,
        },
      ],
    },
  ],
}
