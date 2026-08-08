import { ExternalLink, FlaskConical } from 'lucide-react'
import { isPublicDemo } from '@/lib/public-demo-api'

export function PublicDemoBanner() {
  if (!isPublicDemo) return null

  return (
    <div
      className='flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
      data-testid='public-demo-banner'
      dir='rtl'
    >
      <span className='inline-flex items-center gap-1.5 font-semibold'>
        <FlaskConical className='size-4' />
        نسخه نمایشی عمومی
      </span>
      <span>
        داده‌ها ساختگی‌اند و همه تغییرات فقط تا بارگذاری دوباره صفحه باقی
        می‌مانند.
      </span>
      <a
        className='inline-flex items-center gap-1 font-semibold underline-offset-4 hover:underline'
        href='https://github.com/moroshani/setadinfo'
        rel='noreferrer'
        target='_blank'
      >
        مخزن پروژه
        <ExternalLink className='size-3.5' />
      </a>
    </div>
  )
}
