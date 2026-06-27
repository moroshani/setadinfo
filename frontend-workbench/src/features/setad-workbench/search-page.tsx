import { type ReactNode, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Bell,
  ExternalLink,
  Eye,
  Gavel,
  Plus,
  Save,
  Search,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  type Listing,
  type LookupItem,
  type Offer,
  type RubikaRecipient,
  type TaskFilters,
  createTask,
  defaultTaskFilters,
  getCategories,
  getMetaFilters,
  getOrganizations,
  getRubikaRecipients,
  liveOffers,
  liveSearch,
} from '@/lib/setad-api'

function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat('fa-IR').format(value ?? 0)
}

function formatMoney(value: number | null | undefined) {
  if (!value) return 'ثبت نشده'
  return `${formatNumber(value)} ریال`
}

function displayValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return 'ثبت نشده'
  return String(value)
}

function boardLabel(code: number | null | undefined) {
  if (code === 1) return 'مناقصه'
  if (code === 2) return 'مزایده'
  return 'عمومی'
}

const recipientTypeLabels: Record<string, string> = {
  user: 'کاربر',
  chat: 'گروه',
  channel: 'کانال',
}

function lookupLabel(item: LookupItem) {
  return (
    item.label ||
    item.name ||
    item.title ||
    item.categoryName ||
    item.organizationName ||
    item.orgName ||
    String(item.id)
  )
}

function lookupItems(payload: { content?: LookupItem[]; items?: LookupItem[] } | undefined) {
  return payload?.content ?? payload?.items ?? []
}

function priceValue(value: string) {
  const normalized = value.replace(/[^\d.]/g, '')
  return normalized ? Number(normalized) : null
}

function numericText(value: number | null) {
  return value === null ? '' : String(value)
}

function addUnique(values: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || values.includes(normalized)) return values
  return [...values, normalized]
}

function compactFilters(filters: TaskFilters): TaskFilters {
  const keyword =
    filters.searchTypeCode === 1
      ? filters.keyword.trim()
      : filters.keywords[0] ?? ''

  return {
    ...filters,
    monitorMode: 'filter',
    keyword,
    keywords: filters.keywords.map((item) => item.trim()).filter(Boolean),
    excludedKeywords: filters.excludedKeywords
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

function activeFilterLabels(filters: TaskFilters) {
  const labels: string[] = []
  if (filters.searchTypeCode === 1 && filters.keyword.trim()) {
    labels.push(`شماره ${filters.keyword.trim()}`)
  }
  if (filters.searchTypeCode !== 1) {
    if (filters.keywords.length) labels.push(`${filters.keywords.length} کلیدواژه`)
    if (filters.excludedKeywords.length) {
      labels.push(`${filters.excludedKeywords.length} حذف کلیدواژه`)
    }
  }
  if (filters.boardCodes.length) labels.push('سامانه')
  if (filters.tagCodes.length) labels.push(`${filters.tagCodes.length} نوع معامله`)
  if (filters.selectedOrganization.length) labels.push('دستگاه اجرایی')
  if (filters.selectedCategory.length) labels.push('دسته‌بندی')
  if (filters.notOrgId.length) labels.push('سازمان مستثنی')
  if (filters.fromSendDeadlineDate || filters.toSendDeadlineDate) {
    labels.push('مهلت ارسال')
  }
  if (filters.fromPrice !== null || filters.toPrice !== null) labels.push('قیمت')
  return labels
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

type SelectorKind = 'system' | 'organization' | 'category' | 'excludedOrganization'

function labeledSummary(
  values: Array<string | number>,
  labels: Record<string, string>,
  fallback: string
) {
  if (!values.length) return fallback
  if (values.length === 1) return labels[String(values[0])] ?? String(values[0])
  return `${formatNumber(values.length)} مورد`
}

function KeywordChips({
  values,
  variant = 'secondary',
  onRemove,
}: {
  values: string[]
  variant?: 'secondary' | 'outline'
  onRemove: (value: string) => void
}) {
  if (!values.length) return null
  return (
    <div className='flex flex-wrap gap-2'>
      {values.map((value) => (
        <Badge key={value} variant={variant} className='gap-1'>
          {value}
          <button type='button' onClick={() => onRemove(value)}>
            <X className='size-3' />
          </button>
        </Badge>
      ))}
    </div>
  )
}

function ResultsTable({
  items,
  onInspect,
}: {
  items: Listing[]
  onInspect: (listing: Listing) => void
}) {
  if (!items.length) {
    return (
      <div className='text-muted-foreground rounded-md border p-5 text-sm'>
        هنوز نتیجه‌ای برای نمایش وجود ندارد.
      </div>
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
          <TableHead>موقعیت</TableHead>
          <TableHead>مهلت ارسال</TableHead>
          <TableHead>مبلغ</TableHead>
          <TableHead>اقدام</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((listing) => (
          <TableRow key={listing.source_key || listing.id}>
            <TableCell>{listing.trade_number || listing.party_number}</TableCell>
            <TableCell className='max-w-[28rem] whitespace-normal font-medium leading-6'>
              {listing.title || 'بدون عنوان'}
            </TableCell>
            <TableCell>{boardLabel(listing.board_code)}</TableCell>
            <TableCell className='max-w-[18rem] whitespace-normal leading-6'>
              {listing.organization || 'نامشخص'}
            </TableCell>
            <TableCell>
              {[listing.province, listing.city].filter(Boolean).join(' / ') ||
                'نامشخص'}
            </TableCell>
            <TableCell>{listing.send_deadline || 'ثبت نشده'}</TableCell>
            <TableCell>{formatMoney(listing.price)}</TableCell>
            <TableCell>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => onInspect(listing)}
              >
                <Eye className='size-4' />
                بررسی
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export function SetadSearchPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<TaskFilters>(() =>
    defaultTaskFilters()
  )
  const [keywordDraft, setKeywordDraft] = useState('')
  const [excludedDraft, setExcludedDraft] = useState('')
  const [page, setPage] = useState(0)
  const [results, setResults] = useState<{
    items: Listing[]
    total_elements: number
    total_pages: number
    page: number
  } | null>(null)
  const [monitorName, setMonitorName] = useState('')
  const [intervalMinutes, setIntervalMinutes] = useState(60)
  const [includeOffers, setIncludeOffers] = useState(true)
  const [notifyRubika, setNotifyRubika] = useState(false)
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([])
  const [searchError, setSearchError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [selectorKind, setSelectorKind] = useState<SelectorKind | null>(null)
  const [selectorSearch, setSelectorSearch] = useState('')
  const [lookupLabels, setLookupLabels] = useState<Record<string, string>>({})
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [offers, setOffers] = useState<Offer[]>([])
  const [offerError, setOfferError] = useState('')

  const metaQuery = useQuery({
    queryKey: ['setad-meta-filters'],
    queryFn: getMetaFilters,
  })
  const organizationQuery = useQuery({
    queryKey: ['setad-organizations', selectorSearch],
    queryFn: () => getOrganizations(selectorSearch),
    enabled:
      selectorKind === 'organization' || selectorKind === 'excludedOrganization',
  })
  const categoryQuery = useQuery({
    queryKey: ['setad-categories', selectorSearch],
    queryFn: () => getCategories(selectorSearch),
    enabled: selectorKind === 'category',
  })
  const recipientsQuery = useQuery({
    queryKey: ['rubika-recipients'],
    queryFn: getRubikaRecipients,
  })

  const preparedFilters = useMemo(
    () =>
      compactFilters({
        ...filters,
        keywords: addUnique(filters.keywords, keywordDraft),
        excludedKeywords: addUnique(filters.excludedKeywords, excludedDraft),
      }),
    [excludedDraft, filters, keywordDraft]
  )

  const enabledRecipients = useMemo(
    () => (recipientsQuery.data?.items ?? []).filter((item) => item.enabled),
    [recipientsQuery.data?.items]
  )

  const toggleRecipient = (recipient: RubikaRecipient) => {
    setSelectedRecipientIds((current) =>
      current.includes(recipient.id)
        ? current.filter((id) => id !== recipient.id)
        : [...current, recipient.id]
    )
  }

  const searchMutation = useMutation({
    mutationFn: (nextPage: number) => liveSearch(preparedFilters, nextPage, 25),
    onMutate: () => {
      setSearchError('')
    },
    onSuccess: (payload) => {
      setResults({
        items: payload.items,
        total_elements: payload.total_elements,
        total_pages: payload.total_pages,
        page: payload.page,
      })
      setPage(payload.page)
      setKeywordDraft('')
      setExcludedDraft('')
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'جستجوی زنده ناموفق بود'
      setSearchError(message)
      toast.error(message)
      setResults(null)
    },
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      createTask({
        name:
          monitorName.trim() ||
          preparedFilters.keywords.join(' + ') ||
          preparedFilters.keyword ||
          'پایش جدید',
        description: 'ساخته‌شده از workbench جستجوی زنده',
        enabled: true,
        interval_minutes: intervalMinutes,
        include_offers: includeOffers,
        notify_rubika: notifyRubika && selectedRecipientIds.length > 0,
        notify_initial: true,
        notify_new_listings: true,
        notify_listing_changes: true,
        notify_offer_changes: true,
        rubika_chat_id: '',
        recipient_ids: notifyRubika ? selectedRecipientIds : [],
        filters: preparedFilters,
      }),
    onMutate: () => {
      setSaveError('')
    },
    onSuccess: async (task) => {
      toast.success(`پایش «${task.name}» ذخیره شد`)
      setMonitorName('')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setad-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['setad-dashboard'] }),
      ])
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'ذخیره پایش ناموفق بود'
      setSaveError(message)
      toast.error(message)
    },
  })
  const trackItemMutation = useMutation({
    mutationFn: (listing: Listing) =>
      createTask({
        name: `پیگیری ${listing.trade_number || listing.party_number || listing.source_key}`,
        description: listing.title || 'پایش یک آگهی مشخص',
        enabled: true,
        interval_minutes: intervalMinutes,
        include_offers: true,
        notify_rubika: notifyRubika && selectedRecipientIds.length > 0,
        notify_initial: true,
        notify_new_listings: true,
        notify_listing_changes: true,
        notify_offer_changes: true,
        rubika_chat_id: '',
        recipient_ids: notifyRubika ? selectedRecipientIds : [],
        filters: {
          ...defaultTaskFilters(),
          monitorMode: 'item',
          searchTypeCode: 1,
          keyword: listing.trade_number || listing.party_number || listing.source_key,
          boardCodes: listing.board_code ? [listing.board_code] : [],
          tagCodes: listing.tag_code ? [listing.tag_code] : [],
          targetSourceKey: listing.source_key,
          targetTradeNumber: listing.trade_number,
          targetPartyNumber: listing.party_number,
          targetBoardCode: listing.board_code,
          targetTagCode: listing.tag_code,
        },
      }),
    onSuccess: async (task) => {
      toast.success(`پایش «${task.name}» ساخته شد`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['setad-tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['setad-dashboard'] }),
      ])
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'ساخت پایش آگهی ناموفق بود'
      )
    },
  })
  const offerMutation = useMutation({
    mutationFn: (listing: Listing) =>
      liveOffers(
        listing.party_number,
        listing.board_code ?? 0,
        listing.tag_code ?? 0
      ),
    onMutate: () => {
      setOfferError('')
      setOffers([])
    },
    onSuccess: (payload) => {
      setOffers(payload.items)
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'دریافت پیشنهادها ناموفق بود'
      setOfferError(message)
      toast.error(message)
    },
  })

  const boardOptions = metaQuery.data?.boardOptions ?? {
    '1': { label: 'مناقصه', children: [] },
    '2': { label: 'مزایده', children: [] },
  }
  const sortOptions = metaQuery.data?.sortOptions ?? [
    { label: 'مرتبط‌ترین', value: 'score' },
    { label: 'جدیدترین', value: 'lastModificationDate' },
  ]

  const runSearch = (nextPage = 0) => {
    searchMutation.mutate(nextPage)
  }

  const setBoardCode = (value: string) => {
    setFilters((current) => ({
      ...current,
      boardCodes: value === 'all' ? [] : [Number(value)],
      tagCodes: [],
    }))
  }

  const activeBoard = filters.boardCodes[0]?.toString() ?? 'all'
  const activeLabels = activeFilterLabels(preparedFilters)
  const openSelector = (kind: SelectorKind) => {
    setSelectorKind(kind)
    setSelectorSearch('')
  }
  const closeSelector = () => {
    setSelectorKind(null)
    setSelectorSearch('')
  }
  const inspectListing = (listing: Listing) => {
    setSelectedListing(listing)
    setOffers([])
    setOfferError('')
  }
  const closeListing = () => {
    setSelectedListing(null)
    setOffers([])
    setOfferError('')
  }
  const toggleLookup = (
    field: 'selectedOrganization' | 'notOrgId' | 'selectedCategory',
    item: LookupItem
  ) => {
    const id = String(item.id)
    setLookupLabels((current) => ({ ...current, [id]: lookupLabel(item) }))
    setFilters((current) => {
      if (field === 'selectedCategory') {
        const value = Number(item.id)
        return {
          ...current,
          selectedCategory: current.selectedCategory.includes(value)
            ? current.selectedCategory.filter((itemId) => itemId !== value)
            : [...current.selectedCategory, value],
        }
      }
      const values = current[field]
      return {
        ...current,
        [field]: values.includes(id)
          ? values.filter((itemId) => itemId !== id)
          : [...values, id],
      }
    })
  }
  const toggleBoard = (boardId: number) => {
    const children = boardOptions[String(boardId)]?.children ?? []
    setFilters((current) => {
      const enabled = current.boardCodes.includes(boardId)
      return {
        ...current,
        boardCodes: enabled
          ? current.boardCodes.filter((id) => id !== boardId)
          : [...current.boardCodes, boardId],
        tagCodes: enabled
          ? current.tagCodes.filter((id) => !children.includes(id))
          : current.tagCodes,
      }
    })
  }
  const toggleTag = (tagId: number) => {
    const boardId = Number(
      Object.entries(boardOptions).find(([, board]) =>
        board.children.includes(tagId)
      )?.[0] ?? 0
    )
    setFilters((current) => ({
      ...current,
      boardCodes:
        boardId && !current.boardCodes.includes(boardId)
          ? [...current.boardCodes, boardId]
          : current.boardCodes,
      tagCodes: current.tagCodes.includes(tagId)
        ? current.tagCodes.filter((id) => id !== tagId)
        : [...current.tagCodes, tagId],
    }))
  }
  const remoteItems =
    selectorKind === 'category'
      ? lookupItems(categoryQuery.data)
      : lookupItems(organizationQuery.data)
  const selectorTitle =
    selectorKind === 'system'
      ? 'سامانه و نوع معامله'
      : selectorKind === 'organization'
        ? 'دستگاه اجرایی'
        : selectorKind === 'category'
          ? 'دسته‌بندی کالا'
          : 'سازمان‌های مستثنی'
  const selectorLoading =
    selectorKind === 'category'
      ? categoryQuery.isLoading
      : organizationQuery.isLoading
  const selectorError =
    selectorKind === 'category' ? categoryQuery.error : organizationQuery.error
  const canSave =
    preparedFilters.searchTypeCode === 1
      ? Boolean(preparedFilters.keyword)
      : Boolean(
          preparedFilters.keywords.length ||
            preparedFilters.boardCodes.length ||
            preparedFilters.fromSendDeadlineDate ||
            preparedFilters.toSendDeadlineDate ||
            preparedFilters.fromPrice !== null ||
            preparedFilters.toPrice !== null
        )

  return (
    <div className='space-y-6' dir='rtl'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          <p className='text-muted-foreground text-sm'>ورک‌بنچ SetadInfo</p>
          <h1 className='text-2xl font-bold tracking-normal'>جستجوی زنده</h1>
          <p className='text-muted-foreground mt-2 max-w-3xl leading-7'>
            جستجو را مثل یک کار عملیاتی بسازید، نتیجه را بررسی کنید، سپس همان
            فیلتر را به پایش زمان‌بندی‌شده تبدیل کنید.
          </p>
        </div>
        <div className='flex gap-2'>
          <Button onClick={() => runSearch(0)} disabled={searchMutation.isPending}>
            <Search className='size-4' />
            {searchMutation.isPending ? 'در حال جستجو' : 'جستجو'}
          </Button>
          <Button
            variant='outline'
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !canSave}
          >
            <Save className='size-4' />
            ذخیره پایش
          </Button>
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-[0.78fr_1.22fr]'>
        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>سازنده فیلتر</CardTitle>
              <CardDescription>
                فیلترهای اصلی Setad؛ انتخاب‌های سازمان، دسته‌بندی و شهر در گام
                بعدی به همین فرم اضافه می‌شوند.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-5'>
              {metaQuery.error ? (
                <Alert>
                  <AlertCircle className='size-4' />
                  <AlertTitle>فهرست فیلترها کامل نیست</AlertTitle>
                  <AlertDescription>
                    API متادیتا در دسترس نیست؛ فرم با گزینه‌های پایه ادامه
                    می‌دهد.
                  </AlertDescription>
                </Alert>
              ) : null}

              <div className='grid gap-3 md:grid-cols-2'>
                <Field label='نوع جستجو'>
                  <select
                    className='h-9 w-full rounded-md border bg-background px-3 text-sm'
                    value={filters.searchTypeCode}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        searchTypeCode: Number(event.target.value),
                      }))
                    }
                  >
                    <option value={0}>کلیدواژه عنوان</option>
                    <option value={1}>شماره معامله</option>
                  </select>
                </Field>
                <Field label='سامانه سریع'>
                  <select
                    className='h-9 w-full rounded-md border bg-background px-3 text-sm'
                    value={activeBoard}
                    onChange={(event) => setBoardCode(event.target.value)}
                  >
                    <option value='all'>همه سامانه‌ها</option>
                    {Object.entries(boardOptions).map(([id, board]) => (
                      <option key={id} value={id}>
                        {board.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {filters.searchTypeCode === 1 ? (
                <Field label='شماره معامله'>
                  <Input
                    value={filters.keyword}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        keyword: event.target.value,
                      }))
                    }
                    placeholder='مثلا 310500153'
                  />
                </Field>
              ) : (
                <div className='space-y-4'>
                  <Field label='کلیدواژه‌های مثبت'>
                    <div className='flex gap-2'>
                      <Input
                        value={keywordDraft}
                        onChange={(event) => setKeywordDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            setFilters((current) => ({
                              ...current,
                              keywords: addUnique(current.keywords, keywordDraft),
                            }))
                            setKeywordDraft('')
                          }
                        }}
                        placeholder='مثلا کولر گازی'
                      />
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        onClick={() => {
                          setFilters((current) => ({
                            ...current,
                            keywords: addUnique(current.keywords, keywordDraft),
                          }))
                          setKeywordDraft('')
                        }}
                      >
                        <Plus className='size-4' />
                      </Button>
                    </div>
                  </Field>
                  <KeywordChips
                    values={filters.keywords}
                    onRemove={(value) =>
                      setFilters((current) => ({
                        ...current,
                        keywords: current.keywords.filter((item) => item !== value),
                      }))
                    }
                  />

                  <Field label='کلیدواژه‌های منفی'>
                    <div className='flex gap-2'>
                      <Input
                        value={excludedDraft}
                        onChange={(event) => setExcludedDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            setFilters((current) => ({
                              ...current,
                              excludedKeywords: addUnique(
                                current.excludedKeywords,
                                excludedDraft
                              ),
                            }))
                            setExcludedDraft('')
                          }
                        }}
                        placeholder='مثلا کارکرده'
                      />
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        onClick={() => {
                          setFilters((current) => ({
                            ...current,
                            excludedKeywords: addUnique(
                              current.excludedKeywords,
                              excludedDraft
                            ),
                          }))
                          setExcludedDraft('')
                        }}
                      >
                        <Plus className='size-4' />
                      </Button>
                    </div>
                  </Field>
                  <KeywordChips
                    values={filters.excludedKeywords}
                    variant='outline'
                    onRemove={(value) =>
                      setFilters((current) => ({
                        ...current,
                        excludedKeywords: current.excludedKeywords.filter(
                          (item) => item !== value
                        ),
                      }))
                    }
                  />
                </div>
              )}

              <div className='grid gap-3 md:grid-cols-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='h-auto justify-between gap-3 px-3 py-3 text-right'
                  onClick={() => openSelector('system')}
                >
                  <span>
                    <span className='block text-sm font-medium'>
                      سامانه و نوع معامله
                    </span>
                    <span className='text-muted-foreground block text-xs'>
                      {filters.boardCodes.length || filters.tagCodes.length
                        ? `${formatNumber(filters.boardCodes.length)} سامانه، ${formatNumber(filters.tagCodes.length)} نوع`
                        : 'همه سامانه‌ها'}
                    </span>
                  </span>
                  <Plus className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='h-auto justify-between gap-3 px-3 py-3 text-right'
                  onClick={() => openSelector('organization')}
                >
                  <span>
                    <span className='block text-sm font-medium'>دستگاه اجرایی</span>
                    <span className='text-muted-foreground block text-xs'>
                      {labeledSummary(
                        filters.selectedOrganization,
                        lookupLabels,
                        'همه دستگاه‌ها'
                      )}
                    </span>
                  </span>
                  <Plus className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='h-auto justify-between gap-3 px-3 py-3 text-right'
                  onClick={() => openSelector('category')}
                >
                  <span>
                    <span className='block text-sm font-medium'>دسته‌بندی کالا</span>
                    <span className='text-muted-foreground block text-xs'>
                      {labeledSummary(
                        filters.selectedCategory,
                        lookupLabels,
                        'همه دسته‌ها'
                      )}
                    </span>
                  </span>
                  <Plus className='size-4' />
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='h-auto justify-between gap-3 px-3 py-3 text-right'
                  onClick={() => openSelector('excludedOrganization')}
                >
                  <span>
                    <span className='block text-sm font-medium'>
                      سازمان‌های مستثنی
                    </span>
                    <span className='text-muted-foreground block text-xs'>
                      {labeledSummary(filters.notOrgId, lookupLabels, 'بدون استثنا')}
                    </span>
                  </span>
                  <Plus className='size-4' />
                </Button>
              </div>

              <div className='grid gap-3 md:grid-cols-2'>
                <Field label='مرتب‌سازی'>
                  <select
                    className='h-9 w-full rounded-md border bg-background px-3 text-sm'
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        sort: event.target.value,
                      }))
                    }
                  >
                    {sortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label='تعداد فیلترهای فعال'>
                  <div className='text-muted-foreground flex h-9 items-center rounded-md border px-3 text-sm'>
                    {formatNumber(activeLabels.length)}
                  </div>
                </Field>
              </div>

              {activeLabels.length ? (
                <div className='flex flex-wrap gap-2'>
                  {activeLabels.map((label) => (
                    <Badge key={label} variant='outline'>
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className='text-muted-foreground text-sm'>
                  هنوز هیچ محدودیتی روی جستجو اعمال نشده است.
                </p>
              )}

              <div className='grid gap-3 md:grid-cols-2'>
                <Field label='از مهلت ارسال'>
                  <Input
                    type='text'
                    value={filters.fromSendDeadlineDate}
                    dir='ltr'
                    className='text-left'
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        fromSendDeadlineDate: event.target.value,
                      }))
                    }
                    placeholder='2026-06-21'
                  />
                </Field>
                <Field label='تا مهلت ارسال'>
                  <Input
                    type='text'
                    value={filters.toSendDeadlineDate}
                    dir='ltr'
                    className='text-left'
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        toSendDeadlineDate: event.target.value,
                      }))
                    }
                    placeholder='2026-07-21'
                  />
                </Field>
                <Field label='قیمت از'>
                  <Input
                    inputMode='numeric'
                    value={numericText(filters.fromPrice)}
                    dir='ltr'
                    className='text-left'
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        fromPrice: priceValue(event.target.value),
                      }))
                    }
                    placeholder='ریال'
                  />
                </Field>
                <Field label='قیمت تا'>
                  <Input
                    inputMode='numeric'
                    value={numericText(filters.toPrice)}
                    dir='ltr'
                    className='text-left'
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        toPrice: priceValue(event.target.value),
                      }))
                    }
                    placeholder='ریال'
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ذخیره به عنوان پایش</CardTitle>
              <CardDescription>
                بعد از ذخیره، scheduler همین فیلتر را با baseline و delta دنبال
                می‌کند.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Field label='نام پایش'>
                <Input
                  value={monitorName}
                  onChange={(event) => setMonitorName(event.target.value)}
                  placeholder='مثلا کولر گازی قم'
                />
              </Field>
              <div className='grid gap-3 md:grid-cols-2'>
                <Field label='فاصله بررسی'>
                  <Input
                    type='number'
                    min={15}
                    value={intervalMinutes}
                    onChange={(event) =>
                      setIntervalMinutes(Number(event.target.value) || 60)
                    }
                  />
                </Field>
                <div className='flex items-end justify-between gap-3 rounded-md border p-3'>
                  <div>
                    <Label>تاریخچه پیشنهاد مزایده</Label>
                    <p className='text-muted-foreground mt-1 text-xs'>
                      برای مزایده‌ها پیشنهادها هم بررسی شوند.
                    </p>
                  </div>
                  <Switch
                    checked={includeOffers}
                    onCheckedChange={setIncludeOffers}
                  />
                </div>
              </div>
              <div className='rounded-md border p-3'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <Label>اعلان Rubika</Label>
                    <p className='text-muted-foreground mt-1 text-xs leading-5'>
                      baseline اولیه و بروزرسانی‌های بعدی برای مقصدهای انتخاب‌شده ارسال شوند.
                    </p>
                  </div>
                  <Switch
                    checked={notifyRubika}
                    onCheckedChange={setNotifyRubika}
                  />
                </div>
                {notifyRubika ? (
                  <div className='mt-3 space-y-2'>
                    {recipientsQuery.isLoading ? (
                      <p className='text-muted-foreground text-xs'>
                        در حال خواندن مقصدها...
                      </p>
                    ) : recipientsQuery.isError ? (
                      <p className='text-muted-foreground text-xs'>
                        مقصدها در دسترس نیستند.
                      </p>
                    ) : enabledRecipients.length ? (
                      enabledRecipients.map((recipient) => (
                        <label
                          key={recipient.id}
                          className='flex items-center gap-2 rounded-md border px-3 py-2 text-sm'
                        >
                          <Checkbox
                            checked={selectedRecipientIds.includes(recipient.id)}
                            onCheckedChange={() => toggleRecipient(recipient)}
                          />
                          <span className='flex-1'>{recipient.name}</span>
                          <Badge variant='outline'>
                            {recipientTypeLabels[recipient.recipient_type] ??
                              recipient.recipient_type}
                          </Badge>
                        </label>
                      ))
                    ) : (
                      <p className='text-muted-foreground text-xs'>
                        مقصد فعالی ثبت نشده است.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
              <Button
                className='w-full'
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending ||
                  !canSave ||
                  (notifyRubika && selectedRecipientIds.length === 0)
                }
              >
                <Bell className='size-4' />
                {saveMutation.isPending ? 'در حال ذخیره' : 'ساخت پایش'}
              </Button>
              {saveError ? (
                <Alert variant='destructive'>
                  <AlertCircle className='size-4' />
                  <AlertTitle>پایش ذخیره نشد</AlertTitle>
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className='flex flex-col gap-2 md:flex-row md:items-center md:justify-between'>
              <div>
                <CardTitle>نتایج زنده</CardTitle>
                <CardDescription>
                  {results
                    ? `${formatNumber(results.total_elements)} نتیجه پیدا شد`
                    : 'برای شروع، فیلتر را بسازید و جستجو کنید.'}
                </CardDescription>
              </div>
              <div className='flex gap-2'>
                <Button
                  variant='outline'
                  onClick={() => runSearch(Math.max(page - 1, 0))}
                  disabled={!results || page <= 0 || searchMutation.isPending}
                >
                  قبلی
                </Button>
                <Button
                  variant='outline'
                  onClick={() => runSearch(page + 1)}
                  disabled={
                    !results ||
                    page + 1 >= results.total_pages ||
                    searchMutation.isPending
                  }
                >
                  بعدی
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className='space-y-4'>
            {searchMutation.isPending ? (
              <div className='text-muted-foreground rounded-md border p-5 text-sm'>
                در حال دریافت داده از Setad...
              </div>
            ) : (
              <ResultsTable
                items={results?.items ?? []}
                onInspect={inspectListing}
              />
            )}
            {searchError ? (
              <Alert variant='destructive'>
                <AlertCircle className='size-4' />
                <AlertTitle>جستجوی زنده انجام نشد</AlertTitle>
                <AlertDescription>{searchError}</AlertDescription>
              </Alert>
            ) : null}
            {results ? (
              <div className='text-muted-foreground text-xs'>
                صفحه {formatNumber(results.page + 1)} از{' '}
                {formatNumber(results.total_pages)}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedListing !== null} onOpenChange={(open) => !open && closeListing()}>
        <DialogContent className='max-h-[88vh] overflow-y-auto sm:max-w-4xl' dir='rtl'>
          {selectedListing ? (
            <>
              <DialogHeader>
                <DialogTitle className='leading-7'>
                  {selectedListing.title || 'آگهی بدون عنوان'}
                </DialogTitle>
                <DialogDescription>
                  {boardLabel(selectedListing.board_code)} /{' '}
                  {displayValue(selectedListing.trade_number || selectedListing.party_number)}
                </DialogDescription>
              </DialogHeader>

              <div className='grid gap-4 lg:grid-cols-[1.25fr_0.75fr]'>
                <div className='space-y-4'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    {[
                      ['شماره معامله', selectedListing.trade_number],
                      ['شماره پارت', selectedListing.party_number],
                      ['سازمان', selectedListing.organization],
                      [
                        'موقعیت',
                        [selectedListing.province, selectedListing.city]
                          .filter(Boolean)
                          .join(' / '),
                      ],
                      ['دسته‌بندی', selectedListing.category],
                      ['مهلت ارسال', selectedListing.send_deadline],
                      ['مهلت اسناد', selectedListing.document_deadline],
                      ['مبلغ پایه', formatMoney(selectedListing.price)],
                    ].map(([label, value]) => (
                      <div key={label} className='rounded-md border p-3 text-sm'>
                        <div className='text-muted-foreground mb-1 text-xs'>
                          {label}
                        </div>
                        <div className='font-medium leading-6'>
                          {displayValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className='rounded-md border p-3 text-sm'>
                    <div className='text-muted-foreground mb-1 text-xs'>شرح</div>
                    <p className='leading-7'>
                      {selectedListing.description || 'شرح جداگانه‌ای ثبت نشده است.'}
                    </p>
                  </div>

                  <div className='flex flex-wrap gap-2'>
                    <Button
                      onClick={() => trackItemMutation.mutate(selectedListing)}
                      disabled={trackItemMutation.isPending}
                    >
                      <Bell className='size-4' />
                      {trackItemMutation.isPending
                        ? 'در حال ساخت پایش'
                        : 'پیگیری همین آگهی'}
                    </Button>
                    {selectedListing.detail_url ? (
                      <Button variant='outline' asChild>
                        <a
                          href={selectedListing.detail_url}
                          target='_blank'
                          rel='noreferrer'
                        >
                          <ExternalLink className='size-4' />
                          باز کردن در Setad
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className='space-y-3'>
                  <Card>
                    <CardHeader>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        <Gavel className='size-4' />
                        پیشنهادهای مزایده
                      </CardTitle>
                      <CardDescription>
                        برای مزایده‌ها، پیشنهادهای عمومی موجود را جداگانه بررسی
                        کنید.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-3'>
                      <Button
                        className='w-full'
                        variant='outline'
                        onClick={() => offerMutation.mutate(selectedListing)}
                        disabled={
                          offerMutation.isPending ||
                          !selectedListing.party_number ||
                          !selectedListing.board_code ||
                          !selectedListing.tag_code
                        }
                      >
                        <Search className='size-4' />
                        {offerMutation.isPending
                          ? 'در حال دریافت پیشنهادها'
                          : 'دریافت پیشنهادها'}
                      </Button>

                      {offerError ? (
                        <Alert variant='destructive'>
                          <AlertCircle className='size-4' />
                          <AlertTitle>پیشنهادها دریافت نشد</AlertTitle>
                          <AlertDescription>{offerError}</AlertDescription>
                        </Alert>
                      ) : null}

                      {!offers.length && !offerMutation.isPending ? (
                        <div className='text-muted-foreground rounded-md border p-3 text-sm leading-6'>
                          هنوز پیشنهادی در این پنل خوانده نشده است.
                        </div>
                      ) : null}

                      {offers.map((offer, index) => (
                        <div
                          key={offer.source_key || index}
                          className='rounded-md border p-3 text-sm'
                        >
                          <div className='flex items-start justify-between gap-2'>
                            <strong>{offer.bidder_name || 'نامشخص'}</strong>
                            <Badge variant='outline'>
                              رتبه {displayValue(offer.rank)}
                            </Badge>
                          </div>
                          <div className='text-muted-foreground mt-2 space-y-1'>
                            <div>مبلغ: {formatMoney(offer.amount)}</div>
                            <div>وضعیت: {displayValue(offer.status)}</div>
                            <div>ارسال: {displayValue(offer.submitted_at)}</div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={selectorKind !== null} onOpenChange={(open) => !open && closeSelector()}>
        <DialogContent className='max-h-[86vh] overflow-hidden sm:max-w-3xl' dir='rtl'>
          <DialogHeader>
            <DialogTitle>{selectorTitle}</DialogTitle>
            <DialogDescription>
              چند گزینه را انتخاب کنید؛ تغییرات بلافاصله روی سازنده فیلتر اعمال
              می‌شود.
            </DialogDescription>
          </DialogHeader>

          {selectorKind === 'system' ? (
            <div className='max-h-[62vh] space-y-4 overflow-y-auto pr-1'>
              {Object.entries(boardOptions).map(([boardId, board]) => {
                const numericBoardId = Number(boardId)
                return (
                  <div key={boardId} className='rounded-md border p-3'>
                    <label className='flex cursor-pointer items-center gap-3'>
                      <Checkbox
                        checked={filters.boardCodes.includes(numericBoardId)}
                        onCheckedChange={() => toggleBoard(numericBoardId)}
                      />
                      <span className='font-medium'>{board.label}</span>
                    </label>
                    {board.children.length ? (
                      <div className='mt-3 grid gap-2 md:grid-cols-2'>
                        {board.children.map((tagId) => (
                          <label
                            key={tagId}
                            className='text-muted-foreground flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm'
                          >
                            <Checkbox
                              checked={filters.tagCodes.includes(tagId)}
                              onCheckedChange={() => toggleTag(tagId)}
                            />
                            <span>
                              {metaQuery.data?.tagLabels[String(tagId)] ??
                                `نوع ${tagId}`}
                            </span>
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className='space-y-4'>
              <Input
                value={selectorSearch}
                onChange={(event) => setSelectorSearch(event.target.value)}
                placeholder='جستجو...'
              />
              <div className='max-h-[58vh] space-y-2 overflow-y-auto pr-1'>
                {selectorLoading ? (
                  <div className='text-muted-foreground rounded-md border p-4 text-sm'>
                    در حال دریافت گزینه‌ها...
                  </div>
                ) : null}
                {selectorError ? (
                  <Alert variant='destructive'>
                    <AlertCircle className='size-4' />
                    <AlertTitle>گزینه‌ها دریافت نشد</AlertTitle>
                    <AlertDescription>
                      اتصال متادیتا برقرار نشد. دوباره تلاش کنید یا جستجو را
                      تغییر دهید.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {!selectorLoading && !selectorError && !remoteItems.length ? (
                  <div className='text-muted-foreground rounded-md border p-4 text-sm'>
                    گزینه‌ای پیدا نشد.
                  </div>
                ) : null}
                {remoteItems.map((item) => {
                  const id = String(item.id)
                  const selected =
                    selectorKind === 'category'
                      ? filters.selectedCategory.includes(Number(item.id))
                      : selectorKind === 'organization'
                        ? filters.selectedOrganization.includes(id)
                        : filters.notOrgId.includes(id)
                  return (
                    <label
                      key={id}
                      className='flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm'
                    >
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() =>
                          toggleLookup(
                            selectorKind === 'category'
                              ? 'selectedCategory'
                              : selectorKind === 'organization'
                                ? 'selectedOrganization'
                                : 'notOrgId',
                            item
                          )
                        }
                      />
                      <span>
                        <span className='block font-medium'>{lookupLabel(item)}</span>
                        <span className='text-muted-foreground block text-xs'>
                          شناسه {id}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
