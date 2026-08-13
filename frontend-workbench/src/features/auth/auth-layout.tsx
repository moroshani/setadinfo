import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='grid min-h-svh w-full place-items-center overflow-x-hidden px-4 py-8'>
      <div className='flex w-full max-w-sm flex-col justify-center space-y-2'>
        <div className='mb-4 flex items-center justify-center'>
          <Logo className='me-2' />
          <h1 className='text-xl font-medium'>SetadInfo</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
