import { Link } from '@tanstack/react-router'
import { BellRing, GitCompareArrows, MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ContentSection } from '../components/content-section'

export function SettingsNotifications() {
  return (
    <ContentSection
      title='اعلان‌ها'
      desc='رفتار اعلان‌ها بر اساس لیست اولیه و سپس فقط تغییرات معنی‌دار است.'
    >
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <BellRing className='size-5' />
              لیست اولیه
            </CardTitle>
            <CardDescription>
              اولین اجرای موفق هر پایش می‌تواند یک فهرست کامل و قابل فهم از
              موارد فعلی ارسال کند.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <GitCompareArrows className='size-5' />
              بروزرسانی‌های بعدی
            </CardTitle>
            <CardDescription>
              بعد از لیست اولیه فقط افزودن، خروج از نتایج، تغییر آگهی و تغییر
              پیشنهاد مزایده به عنوان کارت اطلاعاتی ارسال می‌شود.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <MessageSquareText className='size-5' />
              مقصدها
            </CardTitle>
            <CardDescription>
              مقصدهای Rubika در صفحه مقصدها ثبت و فعال می‌شوند؛ اتصال مقصد به
              پایش در زمان ساخت یا ویرایش پایش انجام می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant='outline'>
              <Link to='/recipients'>مدیریت مقصدها</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
