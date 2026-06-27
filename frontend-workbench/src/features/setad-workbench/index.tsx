import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  Bell,
  CheckCircle2,
  Clock3,
  Database,
  ExternalLink,
  Eye,
  Filter,
  Gavel,
  ListChecks,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  createRubikaRecipient,
  deleteTask,
  deleteRubikaRecipient,
  getRubikaRecipients,
  getRubikaStatus,
  type Listing,
  type MonitorTask,
  type NotificationEvent,
  type RubikaRecipient,
  type RubikaRecipientType,
  SetadApiError,
  type CreateTaskPayload,
  type TaskRun,
  type TaskFilters,
  getDashboard,
  getListingDetail,
  getListings,
  getNotifications,
  getRuns,
  getTaskRuns,
  getTasks,
  runTaskNow,
  testRubikaRecipient,
  updateTask,
  updateRubikaRecipient,
  type Offer,
} from '@/lib/setad-api'

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('fa-IR').format(value ?? 0)
}

function formatMoney(value: number | null | undefined) {
  if (!value) return 'ثبت نشده'
  return `${formatNumber(value)} ریال`
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'ثبت نشده'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function boardLabel(code: number | null | undefined) {
  if (code === 1) return 'مناقصه'
  if (code === 2) return 'مزایده'
  return 'عمومی'
}

function boardValue(value: string) {
  if (value === '1') return 1
  if (value === '2') return 2
  return null
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    baseline: 'اولیه',
    listing_new: 'جدید',
    listing_changed: 'تغییر',
    listing_removed: 'حذف',
    offer_new: 'پیشنهاد تازه',
    offer_changed: 'تغییر پیشنهاد',
  }
  return labels[type] ?? type
}

function statusVariant(status: string | boolean) {
  if (status === true || status === 'success' || status === 'sent') {
    return 'default'
  }
  if (status === false || status === 'failed' || status === 'error') {
    return 'destructive'
  }
  return 'secondary'
}

function runDuration(run: TaskRun) {
  if (!run.finished_at) return 'در حال اجرا یا نامشخص'
  const startedAt = new Date(run.started_at).getTime()
  const finishedAt = new Date(run.finished_at).getTime()
  if (Number.isNaN(startedAt) || Number.isNaN(finishedAt)) return 'نامشخص'
  return `${formatNumber(Math.max(0, Math.round((finishedAt - startedAt) / 1000)))} ثانیه`
}

function rawEntries(value: Record<string, unknown> | undefined, limit = 12) {
  if (!value) return []
  return Object.entries(value)
    .filter(([, item]) => item !== null && item !== undefined && item !== '')
    .slice(0, limit)
}

function eventListingPayload(event: NotificationEvent) {
  const payload = event.payload ?? {}
  const nested = payload.listing
  return nested && typeof nested === 'object'
    ? (nested as Record<string, unknown>)
    : payload
}

function eventOfferPayload(event: NotificationEvent) {
  const offer = event.payload?.offer
  return offer && typeof offer === 'object'
    ? (offer as Record<string, unknown>)
    : null
}

const recipientTypeLabels: Record<RubikaRecipientType, string> = {
  user: 'کاربر',
  chat: 'گروه',
  channel: 'کانال',
}

type RecipientFormState = {
  name: string
  recipient_type: RubikaRecipientType
  chat_id: string
  enabled: boolean
}

function emptyRecipientForm(): RecipientFormState {
  return {
    name: '',
    recipient_type: 'chat',
    chat_id: '',
    enabled: true,
  }
}

function apiErrorMessage(error: unknown) {
  if (error instanceof SetadApiError) {
    if (error.status === 401) return 'برای دسترسی باید وارد SetadInfo شوید.'
    if (error.status === 403) return 'این عملیات فقط برای مدیر سیستم مجاز است.'
    if (error.status === 409) return 'این chat ID قبلا ثبت شده است.'
    if (error.status === 422) return 'اطلاعات واردشده کامل یا معتبر نیست.'
    if (error.status === 502) return 'بک‌اند محلی یا سرویس API در دسترس نیست.'
    if (error.status === 503) return 'سرویس Rubika یا توکن بات در دسترس نیست.'
    return error.message
  }
  if (error instanceof Error) return error.message
  return 'خطای نامشخص'
}

function taskSummary(task: MonitorTask) {
  const filters = task.filters ?? {}
  const values = Object.entries(filters)
    .filter(([, value]) => {
      if (Array.isArray(value)) return value.length > 0
      return value !== null && value !== undefined && value !== ''
    })
    .slice(0, 3)
    .map(([key, value]) => {
      if (Array.isArray(value)) return `${key}: ${value.length}`
      return `${key}: ${String(value)}`
    })
  return values.length ? values.join(' / ') : 'بدون فیلتر اختصاصی'
}

function taskPayload(
  task: MonitorTask,
  overrides: Partial<CreateTaskPayload> = {}
): CreateTaskPayload {
  return {
    name: task.name,
    description: task.description ?? '',
    enabled: task.enabled,
    interval_minutes: task.interval_minutes,
    include_offers: task.include_offers,
    notify_rubika: task.notify_rubika,
    notify_initial: task.notify_initial,
    notify_new_listings: task.notify_new_listings,
    notify_listing_changes: task.notify_listing_changes,
    notify_offer_changes: task.notify_offer_changes,
    rubika_chat_id: task.rubika_chat_id,
    recipient_ids: task.recipient_ids ?? [],
    filters: task.filters as TaskFilters,
    ...overrides,
  }
}

function ApiState({
  error,
  isLoading,
  loadingText = 'در حال خواندن اطلاعات...',
}: {
  error: unknown
  isLoading: boolean
  loadingText?: string
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className='text-muted-foreground py-8 text-sm'>
          {loadingText}
        </CardContent>
      </Card>
    )
  }

  if (!error) return null

  const status = error instanceof SetadApiError ? error.status : 0
  const message =
    status === 401
      ? 'برای دیدن داده‌های واقعی باید وارد حساب SetadInfo شوید.'
      : status === 502
        ? 'بک‌اند محلی یا سرویس API در دسترس نیست.'
      : error instanceof Error
        ? error.message
        : 'اتصال به API برقرار نشد.'

  return (
    <Card>
      <CardContent className='py-8'>
        <div className='text-sm font-medium'>داده زنده در دسترس نیست</div>
        <p className='text-muted-foreground mt-2 text-sm leading-6'>{message}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className='text-muted-foreground rounded-md border p-4 text-sm leading-6'>
      <strong className='text-foreground block'>{title}</strong>
      {detail}
    </div>
  )
}

function UpdatesList({
  items,
  onOpenListing,
}: {
  items: NotificationEvent[]
  onOpenListing?: (listingId: number) => void
}) {
  if (!items.length) {
    return (
      <EmptyState
        title='هنوز بروزرسانی ثبت نشده'
        detail='بعد از اجرای پایش‌ها، baseline و تغییرات معنی‌دار اینجا دیده می‌شوند.'
      />
    )
  }

  return (
    <div className='grid gap-3 xl:grid-cols-2'>
      {items.map((item) => (
        <div key={item.id} className='rounded-md border p-4 text-sm'>
          <div className='mb-2 flex items-start justify-between gap-3'>
            <div>
              <strong className='leading-6'>{item.title}</strong>
              <p className='text-muted-foreground mt-1 leading-6'>
                {item.summary || 'بدون توضیح تکمیلی'}
              </p>
            </div>
            <Badge variant='outline'>{eventLabel(item.event_type)}</Badge>
          </div>
          <div className='grid gap-2 rounded-md bg-muted/40 p-3 text-xs md:grid-cols-2'>
            {[
              ['شماره', eventListingPayload(item).trade_number],
              ['عنوان', eventListingPayload(item).title],
              ['سازمان', eventListingPayload(item).organization],
              ['محل', [eventListingPayload(item).province, eventListingPayload(item).city].filter(Boolean).join(' / ')],
              ['مهلت ارسال', eventListingPayload(item).send_deadline],
              ['قیمت پایه', formatMoney(Number(eventListingPayload(item).price) || null)],
            ].map(([label, value]) => (
              <div key={label as string} className='min-w-0'>
                <span className='text-muted-foreground'>
                  {String(label)}:{' '}
                </span>
                <span className='break-words'>{String(value || 'ثبت نشده')}</span>
              </div>
            ))}
            {eventOfferPayload(item) ? (
              <>
                <div className='min-w-0'>
                  <span className='text-muted-foreground'>پیشنهاددهنده: </span>
                  <span className='break-words'>
                    {String(eventOfferPayload(item)?.bidder_name || 'ثبت نشده')}
                  </span>
                </div>
                <div className='min-w-0'>
                  <span className='text-muted-foreground'>مبلغ پیشنهاد: </span>
                  <span>
                    {formatMoney(Number(eventOfferPayload(item)?.amount) || null)}
                  </span>
                </div>
              </>
            ) : null}
          </div>
          <div className='text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs'>
            <span>پایش: {item.task_id}</span>
            <span>اجرا: {formatNumber(item.run_id)}</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
          {item.listing_id && onOpenListing ? (
            <div className='mt-3 flex justify-end'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => onOpenListing(item.listing_id as number)}
              >
                <Eye />
                جزئیات آگهی
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function MonitorTable({
  tasks,
  limit = 8,
  onRun,
  onToggle,
  onDelete,
  isBusy = false,
}: {
  tasks: MonitorTask[]
  limit?: number
  onRun?: (task: MonitorTask) => void
  onToggle?: (task: MonitorTask) => void
  onDelete?: (task: MonitorTask) => void
  isBusy?: boolean
}) {
  if (!tasks.length) {
    return (
      <EmptyState
        title='پایشی تعریف نشده'
        detail='پس از اتصال فرم جستجو، پایش‌های ذخیره‌شده اینجا مدیریت می‌شوند.'
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>نام</TableHead>
          <TableHead>فیلتر</TableHead>
          <TableHead>baseline</TableHead>
          <TableHead>اجرای بعدی</TableHead>
          <TableHead>وضعیت</TableHead>
          {onRun || onToggle || onDelete ? (
            <TableHead className='w-40 text-end'>عملیات</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {tasks.slice(0, limit).map((task) => (
          <TableRow key={task.id}>
            <TableCell className='font-medium'>
              <a href={`/monitors/${task.id}`} className='hover:underline'>
                {task.name}
              </a>
            </TableCell>
            <TableCell className='max-w-[22rem] whitespace-normal'>
              {taskSummary(task)}
            </TableCell>
            <TableCell>{formatDate(task.baseline_notified_at)}</TableCell>
            <TableCell>{formatDate(task.next_run_at)}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(task.enabled)}>
                {task.enabled ? 'فعال' : 'غیرفعال'}
              </Badge>
            </TableCell>
            {onRun || onToggle || onDelete ? (
              <TableCell>
                <div className='flex justify-end gap-1'>
                  {onRun ? (
                    <Button
                      variant='ghost'
                      size='icon'
                      disabled={isBusy}
                      aria-label={`اجرای ${task.name}`}
                      onClick={() => onRun(task)}
                    >
                      <Play />
                    </Button>
                  ) : null}
                  {onToggle ? (
                    <Button
                      variant='ghost'
                      size='icon'
                      disabled={isBusy}
                      aria-label={
                        task.enabled
                          ? `غیرفعال کردن ${task.name}`
                          : `فعال کردن ${task.name}`
                      }
                      onClick={() => onToggle(task)}
                    >
                      <RefreshCw />
                    </Button>
                  ) : null}
                  {onDelete ? (
                    <Button
                      variant='ghost'
                      size='icon'
                      disabled={isBusy}
                      aria-label={`حذف ${task.name}`}
                      onClick={() => onDelete(task)}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function RunTable({ runs }: { runs: TaskRun[] }) {
  if (!runs.length) {
    return (
      <EmptyState
        title='اجرایی ثبت نشده'
        detail='بعد از فعال شدن scheduler یا اجرای دستی پایش‌ها، تاریخچه اینجا پر می‌شود.'
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>پایش</TableHead>
          <TableHead>شروع</TableHead>
          <TableHead>مدت</TableHead>
          <TableHead>وضعیت</TableHead>
          <TableHead>دریافتی</TableHead>
          <TableHead>مطابق</TableHead>
          <TableHead>تغییر</TableHead>
          <TableHead>پیام</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.slice(0, 20).map((run) => (
          <TableRow key={run.id}>
            <TableCell className='font-mono text-xs'>
              <a href={`/monitors/${run.task_id}`} className='hover:underline'>
                {run.task_id}
              </a>
            </TableCell>
            <TableCell>{formatDate(run.started_at)}</TableCell>
            <TableCell>{runDuration(run)}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
            </TableCell>
            <TableCell>{formatNumber(run.fetched_count)}</TableCell>
            <TableCell>{formatNumber(run.matched_count)}</TableCell>
            <TableCell>{formatNumber(run.changed_count)}</TableCell>
            <TableCell className='max-w-[22rem] whitespace-normal'>
              {run.message || 'بدون پیام'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ListingTable({
  listings,
  onOpenListing,
}: {
  listings: Listing[]
  onOpenListing?: (listing: Listing) => void
}) {
  if (!listings.length) {
    return (
      <EmptyState
        title='آگهی ذخیره‌شده‌ای وجود ندارد'
        detail='آگهی‌ها پس از اجرای پایش و ذخیره matchها در این صفحه دیده می‌شوند.'
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>شماره</TableHead>
          <TableHead>عنوان</TableHead>
          <TableHead>نوع</TableHead>
          <TableHead>سازمان</TableHead>
          <TableHead>مهلت ارسال</TableHead>
          <TableHead>مبلغ</TableHead>
          <TableHead className='w-24 text-end'>جزئیات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {listings.map((listing) => (
          <TableRow key={listing.id}>
            <TableCell>{listing.trade_number || listing.party_number}</TableCell>
            <TableCell className='max-w-[28rem] whitespace-normal font-medium'>
              {listing.title || 'بدون عنوان'}
            </TableCell>
            <TableCell>{boardLabel(listing.board_code)}</TableCell>
            <TableCell className='max-w-[18rem] whitespace-normal'>
              {listing.organization || 'نامشخص'}
            </TableCell>
            <TableCell>{listing.send_deadline || 'ثبت نشده'}</TableCell>
            <TableCell>{formatMoney(listing.price)}</TableCell>
            <TableCell>
              <div className='flex justify-end gap-1'>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={`جزئیات ${listing.title || listing.trade_number}`}
                  onClick={() => onOpenListing?.(listing)}
                >
                  <Eye />
                </Button>
                {listing.detail_url ? (
                  <Button variant='ghost' size='icon' asChild>
                    <a
                      href={listing.detail_url}
                      target='_blank'
                      rel='noreferrer'
                      aria-label='باز کردن در ستاد'
                    >
                      <ExternalLink />
                    </a>
                  </Button>
                ) : null}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function OfferTable({ offers }: { offers: Offer[] }) {
  if (!offers.length) {
    return (
      <EmptyState
        title='پیشنهادی ثبت نشده'
        detail='اگر این آگهی مزایده باشد و داده عمومی پیشنهادها در دسترس باشد، پس از اجرا اینجا دیده می‌شود.'
      />
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>پیشنهاددهنده</TableHead>
          <TableHead>مبلغ</TableHead>
          <TableHead>زمان ثبت</TableHead>
          <TableHead>وضعیت</TableHead>
          <TableHead>رتبه</TableHead>
          <TableHead>آخرین مشاهده</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.map((offer, index) => (
          <TableRow key={offer.id ?? `${offer.source_key}-${index}`}>
            <TableCell className='font-medium'>
              {offer.bidder_name || 'ثبت نشده'}
            </TableCell>
            <TableCell>{formatMoney(offer.amount)}</TableCell>
            <TableCell>{offer.submitted_at || 'ثبت نشده'}</TableCell>
            <TableCell>{offer.status || 'ثبت نشده'}</TableCell>
            <TableCell>{offer.rank || 'ثبت نشده'}</TableCell>
            <TableCell>{formatDate(offer.last_seen_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ListingDetailDialog({
  listingId,
  onOpenChange,
}: {
  listingId: number | null
  onOpenChange: (open: boolean) => void
}) {
  const query = useQuery({
    queryKey: ['setad-listing-detail', listingId],
    queryFn: () => getListingDetail(listingId as number),
    enabled: listingId !== null,
  })
  const listing = query.data?.listing
  const details = listing
    ? [
        ['شماره', listing.trade_number || listing.party_number],
        ['نوع', boardLabel(listing.board_code)],
        ['سازمان', listing.organization],
        ['محل', [listing.province, listing.city].filter(Boolean).join(' / ')],
        ['دسته‌بندی', listing.category],
        ['مهلت ارسال', listing.send_deadline],
        ['مهلت دریافت اسناد', listing.document_deadline],
        ['مبلغ', formatMoney(listing.price)],
        ['اولین مشاهده', formatDate(listing.first_seen_at)],
        ['آخرین مشاهده', formatDate(listing.last_seen_at)],
      ]
    : []

  return (
    <Dialog open={listingId !== null} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[88vh] overflow-y-auto sm:max-w-5xl'>
        <DialogHeader>
          <DialogTitle>{listing?.title || 'جزئیات آگهی'}</DialogTitle>
          <DialogDescription>
            داده ذخیره‌شده SetadInfo، پیشنهادهای مزایده و فیلدهای خام مهم.
          </DialogDescription>
        </DialogHeader>

        <ApiState
          error={query.error}
          isLoading={query.isLoading}
          loadingText='در حال خواندن جزئیات آگهی...'
        />

        {listing && !query.isLoading && !query.error ? (
          <Tabs defaultValue='summary' dir='rtl'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='summary'>خلاصه</TabsTrigger>
              <TabsTrigger value='offers'>پیشنهادها</TabsTrigger>
              <TabsTrigger value='raw'>فیلدهای خام</TabsTrigger>
            </TabsList>
            <TabsContent value='summary' className='space-y-4 pt-3'>
              <div className='grid gap-3 md:grid-cols-2'>
                {details.map(([label, value]) => (
                  <div key={label} className='rounded-md border p-3'>
                    <div className='text-muted-foreground text-xs'>{label}</div>
                    <div className='mt-1 break-words text-sm font-medium'>
                      {value || 'ثبت نشده'}
                    </div>
                  </div>
                ))}
              </div>
              {listing.description ? (
                <div className='rounded-md border p-3 text-sm leading-7'>
                  {listing.description}
                </div>
              ) : null}
              {listing.detail_url ? (
                <Button asChild>
                  <a href={listing.detail_url} target='_blank' rel='noreferrer'>
                    <ExternalLink />
                    باز کردن صفحه ستاد
                  </a>
                </Button>
              ) : null}
            </TabsContent>
            <TabsContent value='offers' className='pt-3'>
              <OfferTable offers={query.data?.offers ?? []} />
            </TabsContent>
            <TabsContent value='raw' className='pt-3'>
              <div className='grid gap-2 md:grid-cols-2'>
                {rawEntries(listing.raw).map(([key, value]) => (
                  <div key={key} className='rounded-md border p-3 text-xs'>
                    <div className='text-muted-foreground font-mono'>{key}</div>
                    <div className='mt-1 break-words'>
                      {typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value)}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function SetadOverview() {
  const dashboardQuery = useQuery({
    queryKey: ['setad-dashboard'],
    queryFn: getDashboard,
  })
  const updatesQuery = useQuery({
    queryKey: ['setad-notifications', 5],
    queryFn: () => getNotifications(5),
  })
  const stats = dashboardQuery.data?.stats
  const tasks = dashboardQuery.data?.tasks ?? []
  const updates = updatesQuery.data?.items ?? []
  const successfulRuns = stats?.total_runs
    ? Math.round((stats.total_runs / Math.max(stats.total_runs, 1)) * 100)
    : 0
  const metrics = [
    { label: 'پایش فعال', value: stats?.enabled_tasks ?? 0, icon: ListChecks },
    { label: 'کل پایش‌ها', value: stats?.total_tasks ?? 0, icon: Bell },
    { label: 'آگهی ذخیره‌شده', value: stats?.total_listings ?? 0, icon: Gavel },
    { label: 'اجرای ثبت‌شده', value: stats?.total_runs ?? 0, icon: CheckCircle2 },
  ]

  return (
    <div className='space-y-6' dir='rtl'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>ورک‌بنچ SetadInfo</p>
          <h1 className='text-2xl font-bold tracking-normal'>
            مرکز پایش مناقصه و مزایده عمومی Setad
          </h1>
          <p className='text-muted-foreground mt-2 text-sm'>
            آخرین اجرای ثبت‌شده: {formatDate(stats?.last_run)}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild>
            <Link to='/search'>
              <Search className='size-4' />
              جستجوی زنده
            </Link>
          </Button>
          <Button variant='outline' asChild>
            <Link to='/monitors'>
              <ListChecks className='size-4' />
              پایش‌ها
            </Link>
          </Button>
        </div>
      </div>

      <ApiState
        error={dashboardQuery.error}
        isLoading={dashboardQuery.isLoading}
      />

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {metrics.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>{label}</CardTitle>
              <Icon className='text-muted-foreground size-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{formatNumber(value)}</div>
              <p className='text-muted-foreground text-xs'>
                خوانده‌شده از API داخلی SetadInfo
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className='grid gap-4 xl:grid-cols-[1.3fr_0.7fr]'>
        <Card>
          <CardHeader>
            <CardTitle>پایش‌های مهم</CardTitle>
            <CardDescription>
              هر پایش یک baseline اولیه دارد و بعد از آن فقط تغییرات معنی‌دار
              نمایش داده می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonitorTable tasks={tasks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>کارت‌های بروزرسانی</CardTitle>
            <CardDescription>
              مدل جدید اعلان: خلاصه اولیه، سپس فقط افزوده/حذف/تغییر.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApiState
              error={updatesQuery.error}
              isLoading={updatesQuery.isLoading}
              loadingText='در حال خواندن بروزرسانی‌ها...'
            />
            {!updatesQuery.isLoading && !updatesQuery.error ? (
              <UpdatesList items={updates} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <p className='text-muted-foreground text-xs'>
        شاخص موفقیت فعلا از داده‌های تجمیعی backend خوانده می‌شود:
        {' '}
        {formatNumber(successfulRuns)}٪
      </p>
    </div>
  )
}

export function SetadMonitorsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['setad-tasks'], queryFn: getTasks })
  const [deleteTarget, setDeleteTarget] = useState<MonitorTask | null>(null)

  const refreshMonitors = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['setad-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['setad-dashboard'] }),
    ])
  }

  const toggleMutation = useMutation({
    mutationFn: (task: MonitorTask) =>
      updateTask(task.id, taskPayload(task, { enabled: !task.enabled })),
    onSuccess: async (_updated, task) => {
      toast.success(task.enabled ? 'پایش غیرفعال شد' : 'پایش فعال شد')
      await refreshMonitors()
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const runMutation = useMutation({
    mutationFn: (task: MonitorTask) => runTaskNow(task.id),
    onSuccess: async (_result, task) => {
      toast.success(`اجرای «${task.name}» در صف قرار گرفت`)
      await refreshMonitors()
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (task: MonitorTask) => deleteTask(task.id),
    onSuccess: async () => {
      toast.success('پایش حذف شد')
      setDeleteTarget(null)
      await refreshMonitors()
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const isBusy =
    toggleMutation.isPending || runMutation.isPending || deleteMutation.isPending

  return (
    <SetadPageShell
      title='پایش‌ها'
      description='مدیریت پایش‌های ذخیره‌شده، اجرای دستی، فعال/غیرفعال کردن و حذف پایش.'
      icon={ListChecks}
    >
      <ApiState error={query.error} isLoading={query.isLoading} />
      {!query.isLoading && !query.error ? (
        <Card>
          <CardHeader className='gap-3 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <CardTitle>همه پایش‌ها</CardTitle>
              <CardDescription>
                اجرای دستی فقط پایش را در صف worker قرار می‌دهد؛ نتیجه در صفحه اجراها دیده می‌شود.
              </CardDescription>
            </div>
            <Button asChild>
              <Link to='/search'>
                <Plus />
                پایش جدید
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <MonitorTable
              tasks={query.data?.items ?? []}
              limit={100}
              isBusy={isBusy}
              onRun={(task) => runMutation.mutate(task)}
              onToggle={(task) => toggleMutation.mutate(task)}
              onDelete={(task) => setDeleteTarget(task)}
            />
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title='حذف پایش'
        desc={
          deleteTarget
            ? `پایش «${deleteTarget.name}» حذف شود؟ آگهی‌هایی که فقط به این پایش وصل هستند هم پاکسازی می‌شوند.`
            : ''
        }
        confirmText='حذف'
        cancelBtnText='انصراف'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget)
        }}
      />
    </SetadPageShell>
  )
}

export function SetadMonitorDetailPage({ taskId }: { taskId: string }) {
  const queryClient = useQueryClient()
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null)
  const tasksQuery = useQuery({ queryKey: ['setad-tasks'], queryFn: getTasks })
  const task = tasksQuery.data?.items.find((item) => item.id === taskId)
  const runsQuery = useQuery({
    queryKey: ['setad-runs', taskId],
    queryFn: () => getTaskRuns(taskId),
  })
  const updatesQuery = useQuery({
    queryKey: ['setad-notifications', taskId, 120],
    queryFn: () => getNotifications(120, taskId),
  })
  const listingsQuery = useQuery({
    queryKey: ['setad-listings', taskId],
    queryFn: () => getListings({ taskId, pageSize: 50 }),
  })

  const refreshTask = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['setad-tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['setad-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['setad-runs', taskId] }),
      queryClient.invalidateQueries({ queryKey: ['setad-notifications', taskId] }),
      queryClient.invalidateQueries({ queryKey: ['setad-listings', taskId] }),
    ])
  }

  const toggleMutation = useMutation({
    mutationFn: () => {
      if (!task) throw new Error('پایش پیدا نشد.')
      return updateTask(task.id, taskPayload(task, { enabled: !task.enabled }))
    },
    onSuccess: async () => {
      toast.success(task?.enabled ? 'پایش غیرفعال شد' : 'پایش فعال شد')
      await refreshTask()
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const runMutation = useMutation({
    mutationFn: () => runTaskNow(taskId),
    onSuccess: async () => {
      toast.success('اجرای پایش در صف قرار گرفت')
      await refreshTask()
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const recentRun = runsQuery.data?.items[0]
  const metrics = [
    {
      label: 'رویداد ثبت‌شده',
      value: updatesQuery.data?.items.length ?? 0,
      icon: Bell,
    },
    {
      label: 'آگهی ذخیره‌شده',
      value: listingsQuery.data?.total_elements ?? 0,
      icon: Database,
    },
    {
      label: 'اجرای پایش',
      value: runsQuery.data?.items.length ?? 0,
      icon: Clock3,
    },
    {
      label: 'تغییر آخرین اجرا',
      value: recentRun?.changed_count ?? 0,
      icon: Activity,
    },
  ]

  return (
    <SetadPageShell
      title={task?.name ?? 'جزئیات پایش'}
      description='نمای عملیاتی یک پایش: تعریف فیلتر، baseline، تغییرات، اجراها و آگهی‌های متصل.'
      icon={ListChecks}
    >
      <ApiState error={tasksQuery.error} isLoading={tasksQuery.isLoading} />
      {!tasksQuery.isLoading && !tasksQuery.error && !task ? (
        <EmptyState
          title='پایش پیدا نشد'
          detail='شناسه پایش معتبر نیست یا کاربر فعلی به آن دسترسی ندارد.'
        />
      ) : null}

      {task ? (
        <>
          <Card>
            <CardHeader className='gap-3 md:flex-row md:items-start md:justify-between'>
              <div>
                <CardTitle>{task.name}</CardTitle>
                <CardDescription>
                  {task.description || taskSummary(task)}
                </CardDescription>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button
                  variant='outline'
                  disabled={toggleMutation.isPending}
                  onClick={() => toggleMutation.mutate()}
                >
                  <RefreshCw />
                  {task.enabled ? 'غیرفعال کردن' : 'فعال کردن'}
                </Button>
                <Button
                  disabled={runMutation.isPending}
                  onClick={() => runMutation.mutate()}
                >
                  <Play />
                  اجرای دستی
                </Button>
              </div>
            </CardHeader>
            <CardContent className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>وضعیت</div>
                <Badge className='mt-2' variant={statusVariant(task.enabled)}>
                  {task.enabled ? 'فعال' : 'غیرفعال'}
                </Badge>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>baseline</div>
                <div className='mt-2 text-sm font-medium'>
                  {formatDate(task.baseline_notified_at)}
                </div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>اجرای بعدی</div>
                <div className='mt-2 text-sm font-medium'>
                  {formatDate(task.next_run_at)}
                </div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='text-muted-foreground text-xs'>اعلان‌ها</div>
                <div className='mt-2 flex flex-wrap gap-1'>
                  {task.notify_initial ? <Badge variant='outline'>baseline</Badge> : null}
                  {task.notify_new_listings ? <Badge variant='outline'>جدید</Badge> : null}
                  {task.notify_listing_changes ? <Badge variant='outline'>تغییر</Badge> : null}
                  {task.notify_offer_changes ? <Badge variant='outline'>پیشنهاد</Badge> : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {metrics.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>{label}</CardTitle>
                  <Icon className='text-muted-foreground size-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>{formatNumber(value)}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs defaultValue='updates' dir='rtl'>
            <TabsList className='grid w-full grid-cols-3'>
              <TabsTrigger value='updates'>بروزرسانی‌ها</TabsTrigger>
              <TabsTrigger value='listings'>آگهی‌ها</TabsTrigger>
              <TabsTrigger value='runs'>اجراها</TabsTrigger>
            </TabsList>
            <TabsContent value='updates' className='pt-4'>
              <ApiState
                error={updatesQuery.error}
                isLoading={updatesQuery.isLoading}
              />
              {!updatesQuery.isLoading && !updatesQuery.error ? (
                <UpdatesList
                  items={updatesQuery.data?.items ?? []}
                  onOpenListing={setSelectedListingId}
                />
              ) : null}
            </TabsContent>
            <TabsContent value='listings' className='pt-4'>
              <ApiState
                error={listingsQuery.error}
                isLoading={listingsQuery.isLoading}
              />
              {!listingsQuery.isLoading && !listingsQuery.error ? (
                <ListingTable
                  listings={listingsQuery.data?.items ?? []}
                  onOpenListing={(listing) => setSelectedListingId(listing.id)}
                />
              ) : null}
            </TabsContent>
            <TabsContent value='runs' className='pt-4'>
              <ApiState error={runsQuery.error} isLoading={runsQuery.isLoading} />
              {!runsQuery.isLoading && !runsQuery.error ? (
                <RunTable runs={runsQuery.data?.items ?? []} />
              ) : null}
            </TabsContent>
          </Tabs>

          <ListingDetailDialog
            listingId={selectedListingId}
            onOpenChange={(open) => {
              if (!open) setSelectedListingId(null)
            }}
          />
        </>
      ) : null}
    </SetadPageShell>
  )
}

export function SetadUpdatesPage() {
  const [selectedType, setSelectedType] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null)
  const query = useQuery({
    queryKey: ['setad-notifications', 80],
    queryFn: () => getNotifications(80),
  })
  const filteredItems = useMemo(() => {
    const text = searchText.trim()
    return (query.data?.items ?? []).filter((item) => {
      const typeMatches = selectedType === 'all' || item.event_type === selectedType
      if (!typeMatches) return false
      if (!text) return true
      return `${item.title} ${item.summary} ${item.task_id} ${JSON.stringify(item.payload)}`
        .toLowerCase()
        .includes(text.toLowerCase())
    })
  }, [query.data?.items, searchText, selectedType])

  return (
    <SetadPageShell
      title='بروزرسانی‌ها'
      description='رویدادهای baseline، افزوده، حذف، تغییر و پیشنهادهای مزایده.'
      icon={Bell}
    >
      <Card>
        <CardHeader>
          <CardTitle>فیلتر رویدادها</CardTitle>
          <CardDescription>
            برای بررسی سریع تغییرات ارسال‌شده یا آماده ارسال به مقصدهای اعلان.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-[1fr_220px]'>
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder='جستجو در عنوان، خلاصه، پایش یا payload'
          />
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>همه رویدادها</SelectItem>
              <SelectItem value='baseline'>baseline اولیه</SelectItem>
              <SelectItem value='listing_new'>آگهی جدید</SelectItem>
              <SelectItem value='listing_changed'>تغییر آگهی</SelectItem>
              <SelectItem value='listing_removed'>حذف آگهی</SelectItem>
              <SelectItem value='offer_new'>پیشنهاد جدید</SelectItem>
              <SelectItem value='offer_changed'>تغییر پیشنهاد</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <ApiState error={query.error} isLoading={query.isLoading} />
      {!query.isLoading && !query.error ? (
        <Card>
          <CardHeader>
            <CardTitle>کارت‌های رویداد</CardTitle>
            <CardDescription>
              {formatNumber(filteredItems.length)} رویداد از آخرین
              {formatNumber(query.data?.items.length ?? 0)} رکورد خوانده‌شده.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UpdatesList
              items={filteredItems}
              onOpenListing={setSelectedListingId}
            />
          </CardContent>
        </Card>
      ) : null}
      <ListingDetailDialog
        listingId={selectedListingId}
        onOpenChange={(open) => {
          if (!open) setSelectedListingId(null)
        }}
      />
    </SetadPageShell>
  )
}

export function SetadRunsPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const query = useQuery({ queryKey: ['setad-runs'], queryFn: getRuns })
  const filteredRuns = useMemo(() => {
    const text = searchText.trim().toLowerCase()
    return (query.data?.items ?? []).filter((run) => {
      if (statusFilter !== 'all' && run.status !== statusFilter) return false
      if (!text) return true
      return `${run.task_id} ${run.message} ${run.status}`
        .toLowerCase()
        .includes(text)
    })
  }, [query.data?.items, searchText, statusFilter])

  return (
    <SetadPageShell
      title='تاریخچه اجرا'
      description='هر اجرای scheduler با نتیجه Setad، خطاها و تعداد تغییرات.'
      icon={Activity}
    >
      <Card>
        <CardHeader>
          <CardTitle>عیب‌یابی اجراها</CardTitle>
          <CardDescription>
            خطاهای upstream، اجرای دستی و تغییرات هر پایش را سریع جدا کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-[1fr_220px]'>
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder='جستجو در شناسه پایش، وضعیت یا پیام'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>همه وضعیت‌ها</SelectItem>
              <SelectItem value='success'>موفق</SelectItem>
              <SelectItem value='failed'>ناموفق</SelectItem>
              <SelectItem value='running'>در حال اجرا</SelectItem>
              <SelectItem value='queued'>در صف</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <ApiState error={query.error} isLoading={query.isLoading} />
      {!query.isLoading && !query.error ? (
        <Card>
          <CardHeader>
            <CardTitle>آخرین اجراها</CardTitle>
            <CardDescription>
              {formatNumber(filteredRuns.length)} اجرا مطابق فیلتر فعلی.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RunTable runs={filteredRuns} />
          </CardContent>
        </Card>
      ) : null}
    </SetadPageShell>
  )
}

export function SetadOpportunitiesPage() {
  const [searchText, setSearchText] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [boardFilter, setBoardFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null)
  const query = useQuery({
    queryKey: ['setad-listings', submittedSearch, boardFilter, page],
    queryFn: () =>
      getListings({
        page,
        pageSize: 25,
        q: submittedSearch,
        boardCode: boardValue(boardFilter),
      }),
  })
  const total = query.data?.total_elements ?? 0
  const totalPages = Math.max(query.data?.total_pages ?? 1, 1)

  const submitSearch = () => {
    setPage(0)
    setSubmittedSearch(searchText.trim())
  }

  return (
    <SetadPageShell
      title='آگهی‌ها و مزایده‌ها'
      description='جزئیات عمومی، آخرین مشاهده و پایه کارت‌های پیشنهاد برای مزایده‌ها.'
      icon={Gavel}
    >
      <Card>
        <CardHeader>
          <CardTitle>بانک آگهی‌های ذخیره‌شده</CardTitle>
          <CardDescription>
            جستجو در آگهی‌هایی که حداقل یک پایش آن‌ها را دیده است.
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-3 md:grid-cols-[1fr_180px_auto]'>
          <Input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitSearch()
            }}
            placeholder='عنوان، سازمان، شماره یا توضیح'
          />
          <Select
            value={boardFilter}
            onValueChange={(value) => {
              setBoardFilter(value)
              setPage(0)
            }}
          >
            <SelectTrigger className='w-full'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>همه انواع</SelectItem>
              <SelectItem value='1'>مناقصه</SelectItem>
              <SelectItem value='2'>مزایده</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={submitSearch}>
            <Filter />
            اعمال
          </Button>
        </CardContent>
      </Card>
      <ApiState error={query.error} isLoading={query.isLoading} />
      {!query.isLoading && !query.error ? (
        <Card>
          <CardHeader>
            <CardTitle>آگهی‌های ذخیره‌شده</CardTitle>
            <CardDescription>
              {formatNumber(total)} رکورد، صفحه {formatNumber(page + 1)} از{' '}
              {formatNumber(totalPages)}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <ListingTable
              listings={query.data?.items ?? []}
              onOpenListing={(listing) => setSelectedListingId(listing.id)}
            />
            <div className='flex items-center justify-between gap-2'>
              <Button
                variant='outline'
                disabled={page <= 0 || query.isFetching}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                قبلی
              </Button>
              <span className='text-muted-foreground text-sm'>
                {formatNumber(page + 1)} / {formatNumber(totalPages)}
              </span>
              <Button
                variant='outline'
                disabled={page + 1 >= totalPages || query.isFetching}
                onClick={() =>
                  setPage((current) => Math.min(totalPages - 1, current + 1))
                }
              >
                بعدی
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
      <ListingDetailDialog
        listingId={selectedListingId}
        onOpenChange={(open) => {
          if (!open) setSelectedListingId(null)
        }}
      />
    </SetadPageShell>
  )
}

export function SetadRecipientsPage() {
  const queryClient = useQueryClient()
  const statusQuery = useQuery({
    queryKey: ['rubika-status'],
    queryFn: getRubikaStatus,
  })
  const recipientsQuery = useQuery({
    queryKey: ['rubika-recipients'],
    queryFn: getRubikaRecipients,
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecipient, setEditingRecipient] =
    useState<RubikaRecipient | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RubikaRecipient | null>(null)
  const [form, setForm] = useState<RecipientFormState>(() =>
    emptyRecipientForm()
  )
  const [testText, setTestText] = useState(
    'SetadInfo: پیام آزمایشی مقصد اعلان'
  )

  const recipients = useMemo(
    () =>
      [...(recipientsQuery.data?.items ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, 'fa')
      ),
    [recipientsQuery.data?.items]
  )

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        recipient_type: form.recipient_type,
        chat_id: form.chat_id.trim(),
        enabled: form.enabled,
      }

      if (!payload.name) throw new Error('نام مقصد را وارد کنید.')
      if (!payload.chat_id) throw new Error('chat ID مقصد را وارد کنید.')

      if (editingRecipient) {
        return updateRubikaRecipient(editingRecipient.id, payload)
      }
      return createRubikaRecipient(payload)
    },
    onSuccess: async () => {
      toast.success(editingRecipient ? 'مقصد بروزرسانی شد' : 'مقصد ثبت شد')
      setDialogOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['rubika-recipients'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const deleteMutation = useMutation({
    mutationFn: (recipientId: string) => deleteRubikaRecipient(recipientId),
    onSuccess: async () => {
      toast.success('مقصد حذف شد')
      setDeleteTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['rubika-recipients'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const testMutation = useMutation({
    mutationFn: (recipient: RubikaRecipient) =>
      testRubikaRecipient(recipient.chat_id, testText.trim()),
    onSuccess: () => toast.success('پیام آزمایشی ارسال شد'),
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  const openCreate = () => {
    setEditingRecipient(null)
    setForm(emptyRecipientForm())
    setDialogOpen(true)
  }

  const openEdit = (recipient: RubikaRecipient) => {
    setEditingRecipient(recipient)
    setForm({
      name: recipient.name,
      recipient_type: recipient.recipient_type,
      chat_id: recipient.chat_id,
      enabled: recipient.enabled,
    })
    setDialogOpen(true)
  }

  return (
    <SetadPageShell
      title='مقصدهای اعلان'
      description='مقصدهای رسمی Rubika را ثبت، فعال/غیرفعال، آزمایش و برای اتصال به پایش‌ها آماده کنید.'
      icon={Send}
    >
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader>
            <CardTitle>وضعیت بات</CardTitle>
            <CardDescription>
              {statusQuery.isLoading
                ? 'در حال بررسی تنظیمات Rubika...'
                : statusQuery.isError
                  ? apiErrorMessage(statusQuery.error)
                  : statusQuery.data?.configured
                    ? 'توکن رسمی بات در بک‌اند تنظیم شده است.'
                    : 'توکن رسمی بات در محیط فعلی تنظیم نشده است.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={statusQuery.data?.configured ? 'default' : 'secondary'}>
              {statusQuery.data?.configured ? 'آماده ارسال' : 'نیازمند تنظیم'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مقصد پیش‌فرض</CardTitle>
            <CardDescription>
              مقصد پیش‌فرض فقط fallback است؛ مسیر درست این است که هر پایش مقصدهای خودش را داشته باشد.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                statusQuery.data?.default_chat_configured
                  ? 'outline'
                  : 'secondary'
              }
            >
              {statusQuery.data?.default_chat_configured
                ? 'fallback تنظیم شده'
                : 'fallback تنظیم نشده'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>رفتار اعلان</CardTitle>
            <CardDescription>
              مقصدها پیام baseline اولیه و سپس فقط کارت‌های تغییرات معنی‌دار را دریافت می‌کنند.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant='outline'>baseline + delta</Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className='gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div>
            <CardTitle>مقصدهای ثبت‌شده</CardTitle>
            <CardDescription>
              کاربر، گروه یا کانالی که قبلا با بات تعامل داشته و chat ID آن کشف یا ثبت شده است.
            </CardDescription>
          </div>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => recipientsQuery.refetch()}
              disabled={recipientsQuery.isFetching}
            >
              <RefreshCw
                className={recipientsQuery.isFetching ? 'animate-spin' : ''}
              />
              تازه‌سازی
            </Button>
            <Button onClick={openCreate}>
              <Plus />
              مقصد جدید
            </Button>
          </div>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-2'>
            <Label htmlFor='rubika-test-text'>متن پیام آزمایشی</Label>
            <Textarea
              id='rubika-test-text'
              value={testText}
              onChange={(event) => setTestText(event.target.value)}
              className='min-h-20'
            />
          </div>

          <ApiState
            error={recipientsQuery.error}
            isLoading={recipientsQuery.isLoading}
            loadingText='در حال خواندن مقصدها...'
          />

          {!recipientsQuery.isLoading && !recipientsQuery.error ? (
            recipients.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>نوع</TableHead>
                    <TableHead>chat ID</TableHead>
                    <TableHead>وضعیت</TableHead>
                    <TableHead>بروزرسانی</TableHead>
                    <TableHead className='w-44 text-end'>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell className='font-medium'>
                        {recipient.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {recipientTypeLabels[recipient.recipient_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className='font-mono text-xs'>
                        {recipient.chat_id}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(recipient.enabled)}>
                          {recipient.enabled ? 'فعال' : 'غیرفعال'}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(recipient.updated_at)}</TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-1'>
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label={`ارسال آزمایشی به ${recipient.name}`}
                            disabled={testMutation.isPending}
                            onClick={() => testMutation.mutate(recipient)}
                          >
                            <Send />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label={`ویرایش ${recipient.name}`}
                            onClick={() => openEdit(recipient)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            aria-label={`حذف ${recipient.name}`}
                            onClick={() => setDeleteTarget(recipient)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title='مقصدی ثبت نشده'
                detail='پس از پیام دادن کاربر، گروه یا کانال به بات رسمی، chat ID را ثبت کنید تا بتوان آن را به پایش‌ها وصل کرد.'
              />
            )
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRecipient ? 'ویرایش مقصد' : 'مقصد جدید'}
            </DialogTitle>
            <DialogDescription>
              فقط مقصدهایی را ثبت کنید که با بات رسمی Rubika تعامل داشته‌اند.
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4'>
            <div className='grid gap-2'>
              <Label htmlFor='recipient-name'>نام مقصد</Label>
              <Input
                id='recipient-name'
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder='گروه مناقصه‌ها'
              />
            </div>

            <div className='grid gap-2'>
              <Label>نوع مقصد</Label>
              <Select
                value={form.recipient_type}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    recipient_type: value as RubikaRecipientType,
                  }))
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(recipientTypeLabels) as RubikaRecipientType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {recipientTypeLabels[type]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className='grid gap-2'>
              <Label htmlFor='recipient-chat-id'>chat ID</Label>
              <Input
                id='recipient-chat-id'
                value={form.chat_id}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    chat_id: event.target.value,
                  }))
                }
                placeholder='b0... یا u0...'
                dir='ltr'
              />
            </div>

            <label className='flex items-center justify-between rounded-md border p-3'>
              <span>
                <span className='block font-medium'>مقصد فعال باشد</span>
                <span className='text-sm text-muted-foreground'>
                  مقصدهای غیرفعال هنگام ارسال اعلان نادیده گرفته می‌شوند.
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title='حذف مقصد اعلان'
        desc={
          deleteTarget
            ? `مقصد «${deleteTarget.name}» حذف شود؟ این مقصد از پایش‌های متصل هم جدا می‌شود.`
            : ''
        }
        confirmText='حذف'
        cancelBtnText='انصراف'
        destructive
        isLoading={deleteMutation.isPending}
        handleConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </SetadPageShell>
  )
}

function SetadPageShell({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: typeof Search
  children: React.ReactNode
}) {
  return (
    <div className='space-y-6' dir='rtl'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <p className='text-muted-foreground text-sm'>ورک‌بنچ SetadInfo</p>
          <h1 className='text-2xl font-bold tracking-normal'>{title}</h1>
          <p className='text-muted-foreground mt-2 max-w-3xl leading-7'>
            {description}
          </p>
        </div>
        <div className='bg-primary/10 text-primary rounded-md p-3'>
          <Icon className='size-5' />
        </div>
      </div>
      {children}
    </div>
  )
}
