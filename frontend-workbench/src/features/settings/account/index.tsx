import { ContentSection } from '../components/content-section'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SettingsAccount() {
  return (
    <ContentSection
      title='امنیت'
      desc='دسترسی‌ها، نقش‌ها و وضعیت ورود کاربران در SetadInfo.'
    >
      <div className='grid gap-4'>
        <Card>
          <CardHeader>
            <CardTitle>مدل دسترسی فعلی</CardTitle>
            <CardDescription>
              بک‌اند از نقش‌های واقعی پشتیبانی می‌کند و صفحه کاربران به API مدیریت کاربر وصل است.
            </CardDescription>
          </CardHeader>
          <CardContent className='grid gap-3 md:grid-cols-3'>
            <div className='rounded-md border p-3'>
              <Badge>مدیر</Badge>
              <p className='mt-2 text-sm text-muted-foreground'>
                مدیریت همه پایش‌ها، کاربران و تنظیمات.
              </p>
            </div>
            <div className='rounded-md border p-3'>
              <Badge variant='secondary'>اپراتور</Badge>
              <p className='mt-2 text-sm text-muted-foreground'>
                ساخت و مدیریت پایش‌های متعلق به خودش.
              </p>
            </div>
            <div className='rounded-md border p-3'>
              <Badge variant='outline'>مشاهده‌گر</Badge>
              <p className='mt-2 text-sm text-muted-foreground'>
                مشاهده داشبورد و نتایج بدون تغییر داده.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مدیریت کاربران</CardTitle>
            <CardDescription>
              ساخت کاربر، تغییر نقش، فعال/غیرفعال کردن و تغییر رمز عبور در صفحه کاربران انجام می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to='/users'>رفتن به کاربران</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
