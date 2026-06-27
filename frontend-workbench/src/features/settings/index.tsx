import { Outlet } from '@tanstack/react-router'
import { Bell, Database, Palette, Shield, SlidersHorizontal } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

const sidebarNavItems = [
  {
    title: 'سامانه',
    href: '/settings',
    icon: <SlidersHorizontal size={18} />,
  },
  {
    title: 'امنیت',
    href: '/settings/account',
    icon: <Shield size={18} />,
  },
  {
    title: 'ظاهر',
    href: '/settings/appearance',
    icon: <Palette size={18} />,
  },
  {
    title: 'اعلان‌ها',
    href: '/settings/notifications',
    icon: <Bell size={18} />,
  },
  {
    title: 'داده و نگهداری',
    href: '/settings/display',
    icon: <Database size={18} />,
  },
]

export function Settings() {
  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed>
        <div className='space-y-0.5'>
          <h1 className='text-2xl font-bold tracking-tight md:text-3xl'>
            تنظیمات
          </h1>
          <p className='text-muted-foreground'>
            تنظیمات ورک‌بنچ، امنیت، ظاهر، اعلان‌ها و سیاست نگهداری داده را از اینجا مدیریت کنید.
          </p>
        </div>
        <Separator className='my-4 lg:my-6' />
        <div className='flex flex-1 flex-col space-y-2 overflow-hidden md:space-y-2 lg:flex-row lg:space-y-0 lg:gap-x-12'>
          <aside className='top-0 lg:sticky lg:w-1/5'>
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className='flex w-full overflow-y-hidden p-1'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}
