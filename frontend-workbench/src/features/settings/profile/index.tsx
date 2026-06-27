import { ContentSection } from '../components/content-section'
import { Link } from '@tanstack/react-router'
import { Bell, ListChecks, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SettingsProfile() {
  return (
    <ContentSection
      title='سامانه'
      desc='نقشه تنظیمات اصلی ورک‌بنچ SetadInfo و مسیرهای مرتبط با عملیات روزانه.'
    >
      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Search className='size-5' />
              جریان اصلی کار
            </CardTitle>
            <CardDescription>
              کاربر از جستجوی زنده شروع می‌کند، فیلتر را دقیق می‌سازد و سپس پایش ذخیره می‌کند.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to='/search'>رفتن به جستجوی زنده</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <ListChecks className='size-5' />
              پایش‌ها
            </CardTitle>
            <CardDescription>
              فاصله اجرا، دریافت پیشنهادهای مزایده و وضعیت فعال بودن هر پایش در صفحه پایش‌ها مدیریت می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant='outline'>
              <Link to='/monitors'>دیدن پایش‌ها</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Bell className='size-5' />
              مقصدهای اعلان
            </CardTitle>
            <CardDescription>
              مقصدهای Rubika به صورت رسمی و با chat ID ثبت می‌شوند و به پایش‌ها وصل می‌شوند.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant='outline'>
              <Link to='/recipients'>مدیریت مقصدها</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Users className='size-5' />
              کاربران و نقش‌ها
            </CardTitle>
            <CardDescription>
              دسترسی‌ها با نقش‌های مدیر، اپراتور و مشاهده‌گر کنترل می‌شوند.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant='outline'>
              <Link to='/users'>مدیریت کاربران</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
