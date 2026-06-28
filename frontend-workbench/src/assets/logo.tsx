import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='shadcn-admin-logo'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      height='24'
      width='24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={cn('size-6', className)}
      {...props}
    >
      <title>SetadInfo</title>
      <path d='M4 18V8' />
      <path d='M20 18V8' />
      <path d='M8 18V6' />
      <path d='M16 18V6' />
      <path d='M12 18V4' />
      <path d='M3 18h18' />
      <path d='M6 21h12' />
      <path d='M9 9h6' />
    </svg>
  )
}
