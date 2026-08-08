import { Link } from '@tanstack/react-router'
import { Menu, RadioTower, X } from 'lucide-react'
import { isPublicDemo } from '@/lib/public-demo-api'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '../ui/button'

export function AppTitle() {
  const { setOpenMobile } = useSidebar()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-0 py-0 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div>
            <Link
              to='/'
              onClick={() => setOpenMobile(false)}
              className='flex flex-1 items-center gap-2 text-start text-sm leading-tight'
            >
              <span className='flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground'>
                <RadioTower className='size-4' />
              </span>
              <span className='grid min-w-0'>
                <span className='truncate font-bold'>SetadInfo</span>
                <span className='truncate text-xs text-muted-foreground'>
                  {isPublicDemo
                    ? 'آزمایشگاه عمومی با داده ساختگی'
                    : 'ورک‌بنچ پایش عمومی ستاد'}
                </span>
              </span>
            </Link>
            <ToggleSidebar />
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn('aspect-square size-8 max-md:scale-125', className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <X className='md:hidden' />
      <Menu className='max-md:hidden' />
      <span className='sr-only'>Toggle Sidebar</span>
    </Button>
  )
}
