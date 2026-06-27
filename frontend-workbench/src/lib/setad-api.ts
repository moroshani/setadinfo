export type DashboardStats = {
  total_tasks: number
  enabled_tasks: number
  total_listings: number
  total_runs: number
  last_run: string | null
}

export type MonitorTask = {
  id: string
  name: string
  description: string
  enabled: boolean
  interval_minutes: number
  include_offers: boolean
  notify_rubika: boolean
  notify_initial: boolean
  notify_new_listings: boolean
  notify_listing_changes: boolean
  notify_offer_changes: boolean
  rubika_chat_id: string
  recipient_ids: string[]
  owner_id?: string | null
  filters: Record<string, unknown>
  created_at: string
  updated_at: string | null
  last_run_at: string | null
  next_run_at: string | null
  baseline_notified_at: string | null
  last_successful_run_id: number | null
}

export type TaskFilters = {
  monitorMode: 'filter' | 'item'
  searchTypeCode: number
  keyword: string
  keywords: string[]
  excludedKeywords: string[]
  sort: string
  boardCodes: number[]
  tagCodes: number[]
  selectedOrganization: string[]
  selectedCategory: number[]
  selectedProvinces: string[]
  selectedCities: string[]
  fromSendDeadlineDate: string
  toSendDeadlineDate: string
  fromDocumentDeadlineDate: string
  toDocumentDeadlineDate: string
  fromPrice: number | null
  toPrice: number | null
  classificationId: number[]
  notOrgId: string[]
  targetSourceKey: string
  targetTradeNumber: string
  targetPartyNumber: string
  targetBoardCode: number | null
  targetTagCode: number | null
}

export type MetaFilters = {
  sortOptions: { label: string; value: string }[]
  searchTypeOptions: { label: string; value: number }[]
  boardOptions: Record<string, { label: string; children: number[] }>
  tagLabels: Record<string, string>
}

export type LookupItem = {
  id: string | number
  name?: string
  title?: string
  label?: string
  categoryName?: string
  organizationName?: string
  orgName?: string
}

export type LookupResponse = {
  content?: LookupItem[]
  items?: LookupItem[]
}

export type DashboardResponse = {
  stats: DashboardStats
  tasks: MonitorTask[]
}

export type UserRole = 'admin' | 'operator' | 'viewer'

export type WorkbenchUser = {
  id: string
  username: string
  role: UserRole
  enabled: boolean
  created_at: string
  updated_at: string | null
}

export type CurrentUser = {
  ok: boolean
  id: string
  username: string
  role: UserRole
}

export type RubikaRecipientType = 'user' | 'chat' | 'channel'

export type RubikaRecipient = {
  id: string
  name: string
  recipient_type: RubikaRecipientType
  chat_id: string
  enabled: boolean
  created_at: string
  updated_at: string | null
}

export type RubikaStatus = {
  configured: boolean
  default_chat_configured: boolean
}

export type TaskRun = {
  id: number
  task_id: string
  started_at: string
  finished_at: string | null
  status: string
  message: string
  fetched_count: number
  matched_count: number
  changed_count: number
}

export type NotificationEvent = {
  id: number
  task_id: string
  run_id: number
  listing_id: number | null
  offer_id: number | null
  event_type: string
  severity: string
  title: string
  summary: string
  payload: Record<string, unknown>
  created_at: string
}

export type Listing = {
  id: number
  source_key: string
  trade_number: string
  board_code: number | null
  tag_code: number | null
  party_number: string
  title: string
  description: string
  organization: string
  province: string
  city: string
  category: string
  send_deadline: string
  document_deadline: string
  price: number | null
  detail_url: string
  first_seen_at: string
  last_seen_at: string
  raw?: Record<string, unknown>
  content_hash?: string
}

export type Offer = {
  id?: number
  listing_id?: number
  source_key: string
  bidder_name: string
  amount: number | null
  submitted_at: string
  status: string
  rank: string
  raw?: Record<string, unknown>
  content_hash?: string
  first_seen_at?: string
  last_seen_at?: string
}

export type PageResponse<T> = {
  items: T[]
  page: number
  page_size: number
  total_elements: number
  total_pages: number
}

export class SetadApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'SetadApiError'
    this.status = status
  }
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const body = (await response.json()) as { detail?: string }
      message = body.detail ?? message
    } catch {
      // Keep the HTTP status text.
    }
    throw new SetadApiError(response.status, message)
  }

  return (await response.json()) as T
}

async function send<T>(path: string, method: 'POST' | 'PUT', body: unknown) {
  const response = await fetch(path, {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = (await response.json()) as { detail?: string }
      message = payload.detail ?? message
    } catch {
      // Keep the HTTP status text.
    }
    throw new SetadApiError(response.status, message)
  }

  return (await response.json()) as T
}

async function destroy<T>(path: string) {
  const response = await fetch(path, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    let message = response.statusText
    try {
      const payload = (await response.json()) as { detail?: string }
      message = payload.detail ?? message
    } catch {
      // Keep the HTTP status text.
    }
    throw new SetadApiError(response.status, message)
  }

  return (await response.json()) as T
}

export function getDashboard() {
  return request<DashboardResponse>('/api/dashboard')
}

export function login(username: string, password: string) {
  return send<{ ok: boolean }>('/api/auth/login', 'POST', {
    username,
    password,
  })
}

export function logout() {
  return send<{ ok: boolean }>('/api/auth/logout', 'POST', {})
}

export function getCurrentUser() {
  return request<CurrentUser>('/api/auth/me')
}

export function getTasks() {
  return request<{ items: MonitorTask[] }>('/api/tasks')
}

export function getRuns() {
  return request<{ items: TaskRun[] }>('/api/runs')
}

export function getTaskRuns(taskId: string) {
  return request<{ items: TaskRun[] }>(
    `/api/runs?task_id=${encodeURIComponent(taskId)}`
  )
}

export function getNotifications(limit = 80, taskId?: string) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (taskId) params.set('task_id', taskId)
  return request<{ items: NotificationEvent[] }>(
    `/api/notifications?${params.toString()}`
  )
}

export type ListingQuery = {
  page?: number
  pageSize?: number
  q?: string
  boardCode?: number | null
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  taskId?: string
}

export function getListings(options: ListingQuery = {}) {
  const params = new URLSearchParams({
    page: String(options.page ?? 0),
    page_size: String(options.pageSize ?? 25),
    sort_by: options.sortBy ?? 'last_seen_at',
    sort_dir: options.sortDir ?? 'desc',
  })
  if (options.q) params.set('q', options.q)
  if (options.boardCode) params.set('board_code', String(options.boardCode))
  if (options.taskId) params.set('task_id', options.taskId)
  return request<PageResponse<Listing>>(`/api/listings?${params.toString()}`)
}

export function getListingDetail(listingId: number) {
  return request<{ listing: Listing; offers: Offer[] }>(
    `/api/listings/${listingId}`
  )
}

export function getListingOffers(listingId: number) {
  return request<{ items: Offer[] }>(`/api/listings/${listingId}/offers`)
}

export function getUsers() {
  return request<{ items: WorkbenchUser[] }>('/api/users')
}

export function createUser(payload: {
  username: string
  password: string
  role: UserRole
  enabled: boolean
}) {
  return send<WorkbenchUser>('/api/users', 'POST', payload)
}

export function updateUser(
  userId: string,
  payload: {
    password?: string | null
    role: UserRole
    enabled: boolean
  }
) {
  return send<WorkbenchUser>(`/api/users/${userId}`, 'PUT', payload)
}

export function getRubikaStatus() {
  return request<RubikaStatus>('/api/integrations/rubika/status')
}

export function getRubikaRecipients() {
  return request<{ items: RubikaRecipient[] }>(
    '/api/integrations/rubika/recipients'
  )
}

export type RubikaRecipientPayload = {
  name: string
  recipient_type: RubikaRecipientType
  chat_id: string
  enabled: boolean
}

export function createRubikaRecipient(payload: RubikaRecipientPayload) {
  return send<RubikaRecipient>(
    '/api/integrations/rubika/recipients',
    'POST',
    payload
  )
}

export function updateRubikaRecipient(
  recipientId: string,
  payload: RubikaRecipientPayload
) {
  return send<RubikaRecipient>(
    `/api/integrations/rubika/recipients/${recipientId}`,
    'PUT',
    payload
  )
}

export function deleteRubikaRecipient(recipientId: string) {
  return destroy<{ ok: boolean }>(
    `/api/integrations/rubika/recipients/${recipientId}`
  )
}

export function testRubikaRecipient(chatId: string, text: string) {
  return send<{ ok: boolean; result: unknown }>(
    '/api/integrations/rubika/test',
    'POST',
    { chat_id: chatId, text }
  )
}

export function getMetaFilters() {
  return request<MetaFilters>('/api/meta/filters')
}

export function getOrganizations(search = '') {
  return request<LookupResponse>(
    `/api/meta/organizations?search=${encodeURIComponent(search)}&page_size=40`
  )
}

export function getCategories(search = '') {
  return request<LookupResponse>(
    `/api/meta/categories?search=${encodeURIComponent(search)}&page_size=40`
  )
}

export function liveSearch(filters: TaskFilters, page = 0, pageSize = 25) {
  return send<PageResponse<Listing>>('/api/live/search', 'POST', {
    filters,
    page,
    page_size: pageSize,
  })
}

export function liveOffers(
  partyNumber: string,
  boardCode: number,
  tagCode: number
) {
  return send<{ items: Offer[] }>('/api/live/offers', 'POST', {
    party_number: partyNumber,
    board_code: boardCode,
    tag_code: tagCode,
  })
}

export type CreateTaskPayload = {
  name: string
  description: string
  enabled: boolean
  interval_minutes: number
  include_offers: boolean
  notify_rubika: boolean
  notify_initial: boolean
  notify_new_listings: boolean
  notify_listing_changes: boolean
  notify_offer_changes: boolean
  rubika_chat_id: string
  recipient_ids: string[]
  filters: TaskFilters
}

export function createTask(payload: CreateTaskPayload) {
  return send<MonitorTask>('/api/tasks', 'POST', payload)
}

export function updateTask(taskId: string, payload: CreateTaskPayload) {
  return send<MonitorTask>(`/api/tasks/${taskId}`, 'PUT', payload)
}

export function deleteTask(taskId: string) {
  return destroy<{ ok: boolean }>(`/api/tasks/${taskId}`)
}

export function runTaskNow(taskId: string) {
  return send<{ ok: boolean; queued: boolean }>(
    `/api/tasks/${taskId}/run`,
    'POST',
    {}
  )
}

export function defaultTaskFilters(): TaskFilters {
  return {
    monitorMode: 'filter',
    searchTypeCode: 0,
    keyword: '',
    keywords: [],
    excludedKeywords: [],
    sort: 'score',
    boardCodes: [],
    tagCodes: [],
    selectedOrganization: [],
    selectedCategory: [],
    selectedProvinces: [],
    selectedCities: [],
    fromSendDeadlineDate: '',
    toSendDeadlineDate: '',
    fromDocumentDeadlineDate: '',
    toDocumentDeadlineDate: '',
    fromPrice: null,
    toPrice: null,
    classificationId: [],
    notOrgId: [],
    targetSourceKey: '',
    targetTradeNumber: '',
    targetPartyNumber: '',
    targetBoardCode: null,
    targetTagCode: null,
  }
}
