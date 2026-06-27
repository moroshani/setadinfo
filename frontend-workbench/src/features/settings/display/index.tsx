import { ContentSection } from '../components/content-section'
import { Link } from '@tanstack/react-router'
import { Archive, Database, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SettingsDisplay() {
  return (
    <ContentSection
      title='داده و نگهداری'
      desc='مسیرهای مرتبط با داده‌های ذخیره‌شده، تاریخچه اجراها و آماده‌سازی عمومی‌سازی.'
    >
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Database className='size-5' />
              آگهی‌های ذخیره‌شده
            </CardTitle>
            <CardDescription>
              فقط آگهی‌هایی که به یک پایش وصل شده‌اند نگهداری می‌شوند؛ داده‌های orphan در پاکسازی حذف می‌شوند.
            </CardDescription>
          </CardHeader>
          <div className='px-6'>
            <Button asChild variant='outline'>
              <Link to='/opportunities'>دیدن آگهی‌ها</Link>
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <History className='size-5' />
              تاریخچه اجرا
            </CardTitle>
            <CardDescription>
              اجرای موفق، خطاها، تعداد دریافت‌شده و تعداد تغییرکرده در صفحه اجراها قابل بررسی است.
            </CardDescription>
          </CardHeader>
          <div className='px-6'>
            <Button asChild variant='outline'>
              <Link to='/runs'>دیدن اجراها</Link>
            </Button>
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Archive className='size-5' />
              مخزن عمومی
            </CardTitle>
            <CardDescription>
              فایل‌های عملیاتی خصوصی، توکن‌ها، دامپ‌ها و فونت‌های بدون مجوز بازنشر نباید وارد مخزن عمومی شوند.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </ContentSection>
  )
}
