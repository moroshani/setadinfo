import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import {
  createUser,
  getUsers,
  SetadApiError,
  updateUser,
  type UserRole,
  type WorkbenchUser,
} from '@/lib/setad-api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

const roleLabels: Record<UserRole, string> = {
  admin: 'مدیر',
  operator: 'اپراتور',
  viewer: 'مشاهده‌گر',
}

const roleDescriptions: Record<UserRole, string> = {
  admin: 'مدیریت کاربران، تنظیمات و همه پایش‌ها',
  operator: 'ساخت و مدیریت پایش‌های خودش',
  viewer: 'مشاهده داشبورد و نتایج بدون تغییر',
}

type UserFormState = {
  username: string
  password: string
  role: UserRole
  enabled: boolean
}

function emptyForm(): UserFormState {
  return {
    username: '',
    password: '',
    role: 'viewer',
    enabled: true,
  }
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function errorMessage(error: unknown) {
  if (error instanceof SetadApiError) {
    if (error.status === 401) return 'برای دیدن کاربران باید وارد شوید.'
    if (error.status === 403) return 'فقط مدیر سیستم به مدیریت کاربران دسترسی دارد.'
    if (error.status === 502) return 'بک‌اند محلی یا سرویس کاربران در دسترس نیست.'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'خطای نامشخص'
}

export function Users() {
  const queryClient = useQueryClient()
  const usersQuery = useQuery({ queryKey: ['setad-users'], queryFn: getUsers })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<WorkbenchUser | null>(null)
  const [form, setForm] = useState<UserFormState>(() => emptyForm())

  const sortedUsers = useMemo(
    () =>
      [...(usersQuery.data?.items ?? [])].sort((a, b) =>
        a.username.localeCompare(b.username, 'fa')
      ),
    [usersQuery.data?.items]
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const username = form.username.trim()
      const password = form.password.trim()

      if (!editingUser && username.length < 3) {
        throw new Error('نام کاربری باید حداقل ۳ کاراکتر باشد.')
      }
      if (!editingUser && password.length < 10) {
        throw new Error('رمز عبور باید حداقل ۱۰ کاراکتر باشد.')
      }
      if (editingUser && password && password.length < 10) {
        throw new Error('رمز عبور جدید باید حداقل ۱۰ کاراکتر باشد.')
      }

      if (editingUser) {
        return updateUser(editingUser.id, {
          password: password || null,
          role: form.role,
          enabled: form.enabled,
        })
      }

      return createUser({
        username,
        password,
        role: form.role,
        enabled: form.enabled,
      })
    },
    onSuccess: async () => {
      toast.success(editingUser ? 'کاربر بروزرسانی شد' : 'کاربر ساخته شد')
      setDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['setad-users'] })
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const openCreate = () => {
    setEditingUser(null)
    setForm(emptyForm())
    setDialogOpen(true)
  }

  const openEdit = (user: WorkbenchUser) => {
    setEditingUser(user)
    setForm({
      username: user.username,
      password: '',
      role: user.role,
      enabled: user.enabled,
    })
    setDialogOpen(true)
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>کاربران</h2>
            <p className='text-muted-foreground'>
              دسترسی مدیر، اپراتور و مشاهده‌گر را برای ورک‌بنچ SetadInfo مدیریت کنید.
            </p>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={() => usersQuery.refetch()}
              disabled={usersQuery.isFetching}
            >
              <RefreshCw
                className={usersQuery.isFetching ? 'animate-spin' : ''}
              />
              تازه‌سازی
            </Button>
            <Button onClick={openCreate}>
              <Plus />
              کاربر جدید
            </Button>
          </div>
        </div>

        <div className='overflow-hidden rounded-md border bg-background'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام کاربری</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>ایجاد</TableHead>
                <TableHead>آخرین بروزرسانی</TableHead>
                <TableHead className='w-24 text-end'>عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-24 text-center'>
                    در حال خواندن کاربران...
                  </TableCell>
                </TableRow>
              ) : usersQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={6} className='h-24 text-center'>
                    امکان خواندن کاربران وجود ندارد: {errorMessage(usersQuery.error)}
                  </TableCell>
                </TableRow>
              ) : sortedUsers.length ? (
                sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className='font-medium'>
                      <div className='flex items-center gap-2'>
                        <ShieldCheck className='size-4 text-muted-foreground' />
                        {user.username}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='space-y-1'>
                        <Badge
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                        >
                          {roleLabels[user.role]}
                        </Badge>
                        <p className='text-xs text-muted-foreground'>
                          {roleDescriptions[user.role]}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.enabled ? 'outline' : 'destructive'}>
                        {user.enabled ? 'فعال' : 'غیرفعال'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>{formatDate(user.updated_at)}</TableCell>
                    <TableCell className='text-end'>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() => openEdit(user)}
                        aria-label={`ویرایش ${user.username}`}
                      >
                        <Pencil />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className='h-24 text-center'>
                    هنوز کاربری ثبت نشده است.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'ویرایش کاربر' : 'کاربر جدید'}
            </DialogTitle>
            <DialogDescription>
              نقش کاربر تعیین می‌کند چه بخشی از پایش‌ها، نتایج و تنظیمات قابل تغییر باشد.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='setad-user-username'>نام کاربری</Label>
              <Input
                id='setad-user-username'
                value={form.username}
                disabled={!!editingUser}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    username: event.target.value,
                  }))
                }
                placeholder='operator'
                autoComplete='username'
              />
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='setad-user-password'>
                {editingUser ? 'رمز عبور جدید' : 'رمز عبور'}
              </Label>
              <Input
                id='setad-user-password'
                value={form.password}
                type='password'
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder={
                  editingUser ? 'برای عدم تغییر خالی بگذارید' : 'حداقل ۱۰ کاراکتر'
                }
                autoComplete={editingUser ? 'new-password' : 'new-password'}
              />
            </div>

            <div className='grid gap-2'>
              <Label>نقش</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    role: value as UserRole,
                  }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(roleLabels) as UserRole[]).map((role) => (
                    <SelectItem key={role} value={role}>
                      {roleLabels[role]} - {roleDescriptions[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className='flex items-center justify-between rounded-md border p-3'>
              <span>
                <span className='block font-medium'>کاربر فعال باشد</span>
                <span className='text-sm text-muted-foreground'>
                  کاربران غیرفعال نمی‌توانند وارد ورک‌بنچ شوند.
                </span>
              </span>
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) =>
                  setForm((current) => ({ ...current, enabled }))
                }
              />
            </label>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={() => setDialogOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? 'در حال ذخیره...' : 'ذخیره'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
