import type {
  CreateTaskPayload,
  CurrentUser,
  DashboardResponse,
  Listing,
  LookupItem,
  MetaFilters,
  MonitorTask,
  NotificationEvent,
  NotificationEventType,
  Offer,
  PageResponse,
  RubikaRecipient,
  RubikaRecipientPayload,
  RubikaStatus,
  TaskFilters,
  TaskRun,
  UserRole,
  WorkbenchUser,
} from './setad-api'

export const isPublicDemo = import.meta.env.VITE_PUBLIC_DEMO === 'true'

type DemoMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

const DEMO_NOW = '2026-08-08T09:30:00.000Z'

const DEFAULT_NOTIFICATION_EVENT_TYPES: NotificationEventType[] = [
  'baseline_summary',
  'listing_new',
  'listing_changed',
  'listing_removed',
  'offer_new',
  'offer_changed',
  'run_failed',
  'monitor_needs_attention',
]

const createFilters = (overrides: Partial<TaskFilters> = {}): TaskFilters => ({
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
  ...overrides,
})

const createListing = (
  id: number,
  boardCode: number,
  title: string,
  organization: string,
  category: string,
  province: string,
  city: string,
  price: number | null,
  sendDeadline: string,
  lastSeenAt: string
): Listing => ({
  id,
  source_key: `public-demo-${1000 + id}`,
  trade_number: `1405-D-${String(id).padStart(4, '0')}`,
  board_code: boardCode,
  tag_code: 100 + boardCode,
  party_number: `DEMO-${2300 + id}`,
  title,
  description:
    'رکورد ساختگی برای نمایش جریان کشف، پایش و بررسی تغییرات در نسخه عمومی SetadInfo.',
  organization,
  province,
  city,
  category,
  send_deadline: sendDeadline,
  document_deadline: sendDeadline,
  price,
  detail_url: `https://example.com/setadinfo-demo/${id}`,
  first_seen_at: '2026-08-01T07:00:00.000Z',
  last_seen_at: lastSeenAt,
  content_hash: `demo-content-${id}`,
  raw: {
    demo_record: true,
    procurement_method: boardCode === 3 ? 'مزایده عمومی' : 'فراخوان عمومی',
  },
})

const INITIAL_LISTINGS: Listing[] = [
  createListing(
    1,
    2,
    'تامین تجهیزات ذخیره‌سازی شبکه مرکز داده',
    'شرکت نمونه انرژی آفتاب',
    'فناوری اطلاعات',
    'تهران',
    'تهران',
    48_500_000_000,
    '2026-08-18T12:00:00.000Z',
    '2026-08-08T09:22:00.000Z'
  ),
  createListing(
    2,
    3,
    'فروش ماشین‌آلات مازاد کارگاه آموزشی',
    'دانشگاه فناوری نمونه',
    'ماشین‌آلات',
    'اصفهان',
    'اصفهان',
    12_800_000_000,
    '2026-08-16T10:30:00.000Z',
    '2026-08-08T09:16:00.000Z'
  ),
  createListing(
    3,
    1,
    'خرید سرور و تجهیزات پشتیبان‌گیری',
    'سازمان خدمات دیجیتال نمونه',
    'تجهیزات رایانه‌ای',
    'فارس',
    'شیراز',
    31_250_000_000,
    '2026-08-22T08:00:00.000Z',
    '2026-08-08T08:54:00.000Z'
  ),
  createListing(
    4,
    2,
    'مناقصه نگهداری سامانه‌های تاسیساتی',
    'مرکز درمانی آموزشی نمونه',
    'خدمات نگهداری',
    'خراسان رضوی',
    'مشهد',
    19_700_000_000,
    '2026-08-24T11:00:00.000Z',
    '2026-08-08T08:41:00.000Z'
  ),
  createListing(
    5,
    3,
    'فروش ضایعات فلزی تفکیک‌شده',
    'کارخانه آزمایشی سپهر',
    'مواد بازیافتی',
    'آذربایجان شرقی',
    'تبریز',
    6_350_000_000,
    '2026-08-15T09:00:00.000Z',
    '2026-08-08T08:20:00.000Z'
  ),
  createListing(
    6,
    1,
    'خرید تجهیزات ایمنی و آتش‌نشانی',
    'شهرداری منطقه آزمایشی',
    'ایمنی صنعتی',
    'البرز',
    'کرج',
    8_900_000_000,
    '2026-08-27T12:30:00.000Z',
    '2026-08-08T08:06:00.000Z'
  ),
  createListing(
    7,
    2,
    'مناقصه توسعه شبکه فیبر نوری پردیس',
    'پارک علم و فناوری نمونه',
    'زیرساخت ارتباطی',
    'گیلان',
    'رشت',
    27_400_000_000,
    '2026-08-30T07:30:00.000Z',
    '2026-08-08T07:58:00.000Z'
  ),
  createListing(
    8,
    3,
    'مزایده خودروهای سازمانی نمونه',
    'شرکت حمل‌ونقل نمایشی',
    'وسایل نقلیه',
    'قم',
    'قم',
    22_100_000_000,
    '2026-08-20T10:00:00.000Z',
    '2026-08-08T07:31:00.000Z'
  ),
  createListing(
    9,
    1,
    'خرید تجهیزات آزمایشگاهی کنترل کیفیت',
    'پژوهشگاه نمونه مواد پیشرفته',
    'تجهیزات آزمایشگاهی',
    'یزد',
    'یزد',
    14_600_000_000,
    '2026-09-02T09:00:00.000Z',
    '2026-08-08T07:12:00.000Z'
  ),
  createListing(
    10,
    2,
    'مناقصه خدمات مرکز عملیات امنیت',
    'موسسه مالی نمایشی فردا',
    'امنیت اطلاعات',
    'تهران',
    'تهران',
    36_000_000_000,
    '2026-09-05T12:00:00.000Z',
    '2026-08-08T06:48:00.000Z'
  ),
]

const createOffer = (
  listingId: number,
  id: number,
  bidder: string,
  amount: number,
  rank: string
): Offer => ({
  id,
  listing_id: listingId,
  source_key: `demo-offer-${listingId}-${id}`,
  bidder_name: bidder,
  amount,
  submitted_at: `2026-08-08T0${Math.min(id + 4, 9)}:15:00.000Z`,
  status: 'ثبت‌شده',
  rank,
  content_hash: `demo-offer-hash-${listingId}-${id}`,
  first_seen_at: '2026-08-08T05:00:00.000Z',
  last_seen_at: DEMO_NOW,
  raw: { demo_record: true },
})

const INITIAL_OFFERS: Record<number, Offer[]> = {
  2: [
    createOffer(2, 21, 'پیشنهاددهنده نمونه الف', 13_250_000_000, '۱'),
    createOffer(2, 22, 'پیشنهاددهنده نمونه ب', 12_980_000_000, '۲'),
  ],
  5: [
    createOffer(5, 51, 'خریدار آزمایشی سپید', 6_810_000_000, '۱'),
    createOffer(5, 52, 'خریدار آزمایشی آبی', 6_600_000_000, '۲'),
  ],
  8: [
    createOffer(8, 81, 'شرکت نمایشی راه نو', 22_900_000_000, '۱'),
    createOffer(8, 82, 'شرکت نمایشی مسیر', 22_450_000_000, '۲'),
    createOffer(8, 83, 'خریدار نمونه ج', 22_300_000_000, '۳'),
  ],
}

const INITIAL_TASKS: MonitorTask[] = [
  {
    id: 'demo-infrastructure',
    name: 'زیرساخت و مرکز داده',
    description: 'پایش خریدها و مناقصه‌های سرور، شبکه و ذخیره‌سازی.',
    enabled: true,
    interval_minutes: 30,
    include_offers: false,
    notify_rubika: true,
    notify_initial: true,
    notify_new_listings: true,
    notify_listing_changes: true,
    notify_offer_changes: false,
    notification_frequency: 'immediate',
    notification_event_types: [...DEFAULT_NOTIFICATION_EVENT_TYPES],
    rubika_chat_id: 'demo-operations',
    recipient_ids: ['demo-ops'],
    owner_id: 'demo-admin',
    filters: createFilters({
      keywords: ['سرور', 'شبکه', 'ذخیره‌سازی'],
      boardCodes: [1, 2],
    }),
    created_at: '2026-07-21T08:00:00.000Z',
    updated_at: '2026-08-06T11:30:00.000Z',
    last_run_at: '2026-08-08T09:00:00.000Z',
    next_run_at: '2026-08-08T09:30:00.000Z',
    baseline_notified_at: '2026-07-21T08:10:00.000Z',
    baseline_captured_at: '2026-07-21T08:10:00.000Z',
    baseline_notification_sent_at: '2026-07-21T08:10:00.000Z',
    last_successful_run_id: 108,
    consecutive_failure_count: 0,
  },
  {
    id: 'demo-auctions',
    name: 'مزایده‌های دارای پیشنهاد',
    description: 'رهگیری مزایده‌ها و تاریخچه پیشنهادهای ثبت‌شده.',
    enabled: true,
    interval_minutes: 20,
    include_offers: true,
    notify_rubika: true,
    notify_initial: false,
    notify_new_listings: true,
    notify_listing_changes: true,
    notify_offer_changes: true,
    notification_frequency: 'immediate',
    notification_event_types: [...DEFAULT_NOTIFICATION_EVENT_TYPES],
    rubika_chat_id: 'demo-auctions',
    recipient_ids: ['demo-auction'],
    owner_id: 'demo-admin',
    filters: createFilters({ boardCodes: [3] }),
    created_at: '2026-07-25T10:00:00.000Z',
    updated_at: '2026-08-07T15:00:00.000Z',
    last_run_at: '2026-08-08T09:10:00.000Z',
    next_run_at: '2026-08-08T09:30:00.000Z',
    baseline_notified_at: '2026-07-25T10:20:00.000Z',
    baseline_captured_at: '2026-07-25T10:20:00.000Z',
    baseline_notification_sent_at: '2026-07-25T10:20:00.000Z',
    last_successful_run_id: 109,
    consecutive_failure_count: 0,
  },
  {
    id: 'demo-security',
    name: 'امنیت و عملیات شبکه',
    description: 'کشف فراخوان‌های امنیت اطلاعات و خدمات SOC.',
    enabled: true,
    interval_minutes: 60,
    include_offers: false,
    notify_rubika: false,
    notify_initial: true,
    notify_new_listings: true,
    notify_listing_changes: true,
    notify_offer_changes: false,
    notification_frequency: 'in_app_only',
    notification_event_types: [...DEFAULT_NOTIFICATION_EVENT_TYPES],
    rubika_chat_id: '',
    recipient_ids: [],
    owner_id: 'demo-admin',
    filters: createFilters({ keyword: 'امنیت', boardCodes: [1, 2] }),
    created_at: '2026-08-02T09:00:00.000Z',
    updated_at: null,
    last_run_at: '2026-08-08T08:30:00.000Z',
    next_run_at: '2026-08-08T09:30:00.000Z',
    baseline_notified_at: '2026-08-02T09:08:00.000Z',
    baseline_captured_at: '2026-08-02T09:08:00.000Z',
    baseline_notification_sent_at: null,
    last_successful_run_id: 106,
    consecutive_failure_count: 0,
  },
  {
    id: 'demo-laboratory',
    name: 'تجهیزات آزمایشگاهی',
    description: 'پایش آماده برای بررسی خریدهای مراکز پژوهشی.',
    enabled: false,
    interval_minutes: 120,
    include_offers: false,
    notify_rubika: false,
    notify_initial: true,
    notify_new_listings: true,
    notify_listing_changes: true,
    notify_offer_changes: false,
    notification_frequency: 'immediate',
    notification_event_types: [...DEFAULT_NOTIFICATION_EVENT_TYPES],
    rubika_chat_id: '',
    recipient_ids: [],
    owner_id: 'demo-admin',
    filters: createFilters({ keyword: 'آزمایشگاهی', boardCodes: [1] }),
    created_at: '2026-08-05T13:00:00.000Z',
    updated_at: null,
    last_run_at: null,
    next_run_at: null,
    baseline_notified_at: null,
    baseline_captured_at: null,
    baseline_notification_sent_at: null,
    last_successful_run_id: null,
    consecutive_failure_count: 0,
  },
]

const INITIAL_RUNS: TaskRun[] = [
  {
    id: 109,
    task_id: 'demo-auctions',
    started_at: '2026-08-08T09:10:00.000Z',
    finished_at: '2026-08-08T09:10:18.000Z',
    status: 'success',
    message: 'مزایده‌ها و پیشنهادها با موفقیت بروزرسانی شدند.',
    fetched_count: 18,
    matched_count: 3,
    changed_count: 1,
  },
  {
    id: 108,
    task_id: 'demo-infrastructure',
    started_at: '2026-08-08T09:00:00.000Z',
    finished_at: '2026-08-08T09:00:14.000Z',
    status: 'success',
    message: 'اجرای پایش بدون خطا پایان یافت.',
    fetched_count: 42,
    matched_count: 3,
    changed_count: 2,
  },
  {
    id: 107,
    task_id: 'demo-auctions',
    started_at: '2026-08-08T08:50:00.000Z',
    finished_at: '2026-08-08T08:50:17.000Z',
    status: 'success',
    message: 'پیشنهاد تازه برای یک مزایده ثبت شد.',
    fetched_count: 18,
    matched_count: 3,
    changed_count: 1,
  },
  {
    id: 106,
    task_id: 'demo-security',
    started_at: '2026-08-08T08:30:00.000Z',
    finished_at: '2026-08-08T08:30:11.000Z',
    status: 'success',
    message: 'یک فراخوان مرتبط پیدا شد.',
    fetched_count: 31,
    matched_count: 1,
    changed_count: 1,
  },
  {
    id: 105,
    task_id: 'demo-infrastructure',
    started_at: '2026-08-08T08:00:00.000Z',
    finished_at: '2026-08-08T08:00:09.000Z',
    status: 'success',
    message: 'بدون تغییر معنی‌دار.',
    fetched_count: 40,
    matched_count: 3,
    changed_count: 0,
  },
  {
    id: 104,
    task_id: 'demo-auctions',
    started_at: '2026-08-08T07:50:00.000Z',
    finished_at: '2026-08-08T07:50:20.000Z',
    status: 'success',
    message: 'قیمت پایه یک مزایده تغییر کرد.',
    fetched_count: 17,
    matched_count: 3,
    changed_count: 1,
  },
  {
    id: 103,
    task_id: 'demo-security',
    started_at: '2026-08-08T07:30:00.000Z',
    finished_at: '2026-08-08T07:30:08.000Z',
    status: 'success',
    message: 'بدون تغییر معنی‌دار.',
    fetched_count: 29,
    matched_count: 1,
    changed_count: 0,
  },
]

const listingById = (id: number) =>
  INITIAL_LISTINGS.find((listing) => listing.id === id) as Listing

const notificationCard = (title: string, reason: string, body: string) => ({
  title,
  reason,
  body,
})

const INITIAL_NOTIFICATIONS: NotificationEvent[] = [
  {
    id: 501,
    task_id: 'demo-infrastructure',
    run_id: 108,
    listing_id: 1,
    offer_id: null,
    event_type: 'listing_changed',
    severity: 'info',
    title: 'مهلت ارسال فراخوان مرکز داده تمدید شد',
    summary: 'مهلت ارسال پیشنهاد دو روز افزایش یافت.',
    card: notificationCard(
      'تمدید مهلت فراخوان مرکز داده',
      'مهلت ارسال پیشنهاد تغییر کرده است.',
      'مهلت قبلی: ۲۵ مرداد ۱۴۰۵\nمهلت جدید: ۲۷ مرداد ۱۴۰۵'
    ),
    payload: {
      listing: listingById(1),
      changes: {
        send_deadline: {
          before: '2026-08-16T12:00:00.000Z',
          after: '2026-08-18T12:00:00.000Z',
        },
      },
    },
    created_at: '2026-08-08T09:22:00.000Z',
  },
  {
    id: 500,
    task_id: 'demo-auctions',
    run_id: 109,
    listing_id: 8,
    offer_id: 81,
    event_type: 'offer_new',
    severity: 'info',
    title: 'پیشنهاد جدید برای مزایده خودروها',
    summary: 'یک پیشنهاد تازه در آخرین اجرای پایش مشاهده شد.',
    card: notificationCard(
      'پیشنهاد تازه برای مزایده خودرو',
      'یک پیشنهاد جدید ثبت شده است.',
      'پیشنهاددهنده: شرکت نمایشی راه نو\nمبلغ: ۲۲٬۹۰۰٬۰۰۰٬۰۰۰ ریال'
    ),
    payload: { listing: listingById(8), offer: INITIAL_OFFERS[8][0] },
    created_at: '2026-08-08T09:12:00.000Z',
  },
  {
    id: 499,
    task_id: 'demo-infrastructure',
    run_id: 108,
    listing_id: 3,
    offer_id: null,
    event_type: 'new_listing',
    severity: 'info',
    title: 'خرید تجهیزات پشتیبان‌گیری کشف شد',
    summary: 'این آگهی برای نخستین بار با فیلتر زیرساخت تطبیق داشت.',
    card: notificationCard(
      'آگهی تازه در پایش زیرساخت',
      'این آگهی برای نخستین بار با فیلتر تطبیق داشت.',
      'خرید تجهیزات پشتیبان‌گیری و ذخیره‌سازی'
    ),
    payload: { listing: listingById(3) },
    created_at: '2026-08-08T09:01:00.000Z',
  },
  {
    id: 498,
    task_id: 'demo-security',
    run_id: 106,
    listing_id: 10,
    offer_id: null,
    event_type: 'new_listing',
    severity: 'info',
    title: 'فراخوان خدمات مرکز عملیات امنیت',
    summary: 'عبارت امنیت در عنوان و دسته‌بندی آگهی تطبیق پیدا کرد.',
    card: notificationCard(
      'فراخوان تازه امنیت اطلاعات',
      'عنوان و دسته‌بندی با پایش امنیت تطبیق دارد.',
      'خدمات مرکز عملیات امنیت و پایش رخدادها'
    ),
    payload: { listing: listingById(10) },
    created_at: '2026-08-08T08:31:00.000Z',
  },
  {
    id: 497,
    task_id: 'demo-auctions',
    run_id: 107,
    listing_id: 5,
    offer_id: 51,
    event_type: 'offer_changed',
    severity: 'warning',
    title: 'مبلغ پیشنهاد مزایده ضایعات تغییر کرد',
    summary: 'مبلغ ثبت‌شده پیشنهاد برتر افزایش یافت.',
    card: notificationCard(
      'تغییر پیشنهاد مزایده ضایعات',
      'مبلغ پیشنهاد برتر افزایش یافته است.',
      'مبلغ قبلی: ۶٬۵۵۰٬۰۰۰٬۰۰۰ ریال\nمبلغ جدید: ۶٬۸۱۰٬۰۰۰٬۰۰۰ ریال'
    ),
    payload: {
      listing: listingById(5),
      offer: INITIAL_OFFERS[5][0],
      changes: {
        amount: { before: 6_550_000_000, after: 6_810_000_000 },
      },
    },
    created_at: '2026-08-08T08:52:00.000Z',
  },
  {
    id: 496,
    task_id: 'demo-auctions',
    run_id: 104,
    listing_id: 2,
    offer_id: null,
    event_type: 'listing_changed',
    severity: 'warning',
    title: 'قیمت پایه ماشین‌آلات بروزرسانی شد',
    summary: 'قیمت پایه رکورد عمومی تغییر کرده است.',
    card: notificationCard(
      'تغییر قیمت پایه ماشین‌آلات',
      'قیمت پایه آگهی عمومی بروزرسانی شده است.',
      'قیمت قبلی: ۱۲٬۳۰۰٬۰۰۰٬۰۰۰ ریال\nقیمت جدید: ۱۲٬۸۰۰٬۰۰۰٬۰۰۰ ریال'
    ),
    payload: {
      listing: listingById(2),
      changes: {
        price: { before: 12_300_000_000, after: 12_800_000_000 },
      },
    },
    created_at: '2026-08-08T07:52:00.000Z',
  },
]

const INITIAL_RECIPIENTS: RubikaRecipient[] = [
  {
    id: 'demo-ops',
    name: 'اتاق عملیات نمایشی',
    recipient_type: 'chat',
    chat_id: 'demo-chat-operations',
    enabled: true,
    created_at: '2026-07-20T08:00:00.000Z',
    updated_at: null,
  },
  {
    id: 'demo-auction',
    name: 'کانال مزایده آزمایشی',
    recipient_type: 'channel',
    chat_id: 'demo-channel-auctions',
    enabled: true,
    created_at: '2026-07-24T08:00:00.000Z',
    updated_at: '2026-08-01T08:00:00.000Z',
  },
]

const INITIAL_USERS: WorkbenchUser[] = [
  {
    id: 'demo-admin',
    username: 'demo.admin',
    role: 'admin',
    enabled: true,
    created_at: '2026-07-18T08:00:00.000Z',
    updated_at: null,
  },
  {
    id: 'demo-operator',
    username: 'demo.operator',
    role: 'operator',
    enabled: true,
    created_at: '2026-07-19T08:00:00.000Z',
    updated_at: null,
  },
]

const ORGANIZATIONS: LookupItem[] = Array.from(
  new Set(INITIAL_LISTINGS.map((listing) => listing.organization))
).map((name, index) => ({ id: `demo-org-${index + 1}`, name }))

const CATEGORIES: LookupItem[] = Array.from(
  new Set(INITIAL_LISTINGS.map((listing) => listing.category))
).map((name, index) => ({ id: index + 1, categoryName: name }))

const META_FILTERS: MetaFilters = {
  sortOptions: [
    { label: 'مرتبط‌ترین', value: 'score' },
    { label: 'جدیدترین', value: 'date_desc' },
    { label: 'نزدیک‌ترین مهلت', value: 'deadline_asc' },
  ],
  searchTypeOptions: [
    { label: 'همه فیلدها', value: 0 },
    { label: 'عنوان و شرح', value: 1 },
  ],
  boardOptions: {
    '1': { label: 'خرید', children: [] },
    '2': { label: 'مناقصه', children: [] },
    '3': { label: 'مزایده', children: [] },
  },
  tagLabels: {
    '101': 'خرید عمومی',
    '102': 'مناقصه عمومی',
    '103': 'مزایده عمومی',
  },
}

const CURRENT_USER: CurrentUser = {
  ok: true,
  id: 'demo-admin',
  username: 'demo.admin',
  role: 'admin',
}

const RUBIKA_STATUS: RubikaStatus = {
  configured: true,
  default_chat_configured: true,
}

let tasks: MonitorTask[]
let runs: TaskRun[]
let listings: Listing[]
let offers: Record<number, Offer[]>
let notifications: NotificationEvent[]
let recipients: RubikaRecipient[]
let users: WorkbenchUser[]
let nextTaskId = 1
let nextRunId = 110
let nextRecipientId = 1
let nextUserId = 1

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function resetPublicDemoState() {
  tasks = clone(INITIAL_TASKS)
  runs = clone(INITIAL_RUNS)
  listings = clone(INITIAL_LISTINGS)
  offers = clone(INITIAL_OFFERS)
  notifications = clone(INITIAL_NOTIFICATIONS)
  recipients = clone(INITIAL_RECIPIENTS)
  users = clone(INITIAL_USERS)
  nextTaskId = 1
  nextRunId = 110
  nextRecipientId = 1
  nextUserId = 1
}

resetPublicDemoState()

const respond = async <T>(value: T): Promise<T> => {
  if (import.meta.env.MODE !== 'test') {
    await new Promise((resolve) => window.setTimeout(resolve, 90))
  }
  return clone(value)
}

const searchableListingText = (listing: Listing) =>
  `${listing.title} ${listing.description} ${listing.organization} ${listing.category} ${listing.province} ${listing.city} ${listing.trade_number}`.toLowerCase()

const filterListings = (source: Listing[], filters: Partial<TaskFilters>) => {
  const requiredTerms = [filters.keyword, ...(filters.keywords ?? [])]
    .map((term) => term?.trim().toLowerCase())
    .filter(Boolean) as string[]
  const excludedTerms = (filters.excludedKeywords ?? [])
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean)

  return source.filter((listing) => {
    const text = searchableListingText(listing)
    if (
      requiredTerms.length &&
      !requiredTerms.some((term) => text.includes(term))
    ) {
      return false
    }
    if (excludedTerms.some((term) => text.includes(term))) return false
    if (
      filters.boardCodes?.length &&
      (!listing.board_code || !filters.boardCodes.includes(listing.board_code))
    ) {
      return false
    }
    if (
      filters.selectedOrganization?.length &&
      !filters.selectedOrganization.includes(listing.organization)
    ) {
      return false
    }
    if (
      filters.selectedProvinces?.length &&
      !filters.selectedProvinces.includes(listing.province)
    ) {
      return false
    }
    if (
      filters.selectedCities?.length &&
      !filters.selectedCities.includes(listing.city)
    ) {
      return false
    }
    if (filters.fromPrice !== null && filters.fromPrice !== undefined) {
      if (listing.price === null || listing.price < filters.fromPrice)
        return false
    }
    if (filters.toPrice !== null && filters.toPrice !== undefined) {
      if (listing.price === null || listing.price > filters.toPrice)
        return false
    }
    return true
  })
}

const paginate = <T>(
  items: T[],
  page: number,
  pageSize: number
): PageResponse<T> => ({
  items: items.slice(page * pageSize, page * pageSize + pageSize),
  page,
  page_size: pageSize,
  total_elements: items.length,
  total_pages: Math.max(Math.ceil(items.length / pageSize), 1),
})

const searchLookup = (items: LookupItem[], search: string) => {
  const needle = search.trim().toLowerCase()
  if (!needle) return items
  return items.filter((item) =>
    `${item.name ?? ''} ${item.title ?? ''} ${item.categoryName ?? ''}`
      .toLowerCase()
      .includes(needle)
  )
}

const dashboard = (): DashboardResponse => ({
  stats: {
    total_tasks: tasks.length,
    enabled_tasks: tasks.filter((task) => task.enabled).length,
    total_listings: listings.length,
    total_runs: runs.length,
    last_run: runs[0]?.finished_at ?? runs[0]?.started_at ?? null,
  },
  tasks,
})

export async function requestPublicDemo<T>(
  path: string,
  method: DemoMethod = 'GET',
  body?: unknown
): Promise<T> {
  const url = new URL(path, 'https://setadinfo.demo')
  const pathname = url.pathname
  let result: unknown

  if (pathname === '/api/auth/me' && method === 'GET') {
    result = CURRENT_USER
  } else if (
    (pathname === '/api/auth/login' || pathname === '/api/auth/logout') &&
    method === 'POST'
  ) {
    result = { ok: true }
  } else if (pathname === '/api/dashboard' && method === 'GET') {
    result = dashboard()
  } else if (pathname === '/api/tasks' && method === 'GET') {
    result = { items: tasks }
  } else if (pathname === '/api/tasks' && method === 'POST') {
    const payload = body as CreateTaskPayload
    const task: MonitorTask = {
      ...payload,
      id: `demo-created-${nextTaskId++}`,
      owner_id: CURRENT_USER.id,
      created_at: DEMO_NOW,
      updated_at: null,
      last_run_at: null,
      next_run_at: payload.enabled ? DEMO_NOW : null,
      baseline_notified_at: null,
      baseline_captured_at: null,
      baseline_notification_sent_at: null,
      last_successful_run_id: null,
      consecutive_failure_count: 0,
    }
    tasks = [task, ...tasks]
    result = task
  } else if (/^\/api\/tasks\/[^/]+\/run$/.test(pathname) && method === 'POST') {
    const taskId = pathname.split('/')[3]
    const run: TaskRun = {
      id: nextRunId++,
      task_id: taskId,
      started_at: DEMO_NOW,
      finished_at: null,
      status: 'queued',
      message: 'اجرای نمایشی در صف مرورگر قرار گرفت.',
      fetched_count: 0,
      matched_count: 0,
      changed_count: 0,
    }
    runs = [run, ...runs]
    tasks = tasks.map((task) =>
      task.id === taskId ? { ...task, last_run_at: DEMO_NOW } : task
    )
    result = { ok: true, queued: true }
  } else if (/^\/api\/tasks\/[^/]+$/.test(pathname)) {
    const taskId = pathname.split('/')[3]
    if (method === 'PUT') {
      const payload = body as CreateTaskPayload
      const existing = tasks.find((task) => task.id === taskId)
      if (!existing) throw new Error('پایش نمایشی پیدا نشد.')
      const updated: MonitorTask = {
        ...existing,
        ...payload,
        id: taskId,
        updated_at: DEMO_NOW,
      }
      tasks = tasks.map((task) => (task.id === taskId ? updated : task))
      result = updated
    } else if (method === 'DELETE') {
      tasks = tasks.filter((task) => task.id !== taskId)
      result = { ok: true }
    }
  } else if (pathname === '/api/runs' && method === 'GET') {
    const taskId = url.searchParams.get('task_id')
    result = {
      items: taskId ? runs.filter((run) => run.task_id === taskId) : runs,
    }
  } else if (pathname === '/api/notifications' && method === 'GET') {
    const taskId = url.searchParams.get('task_id')
    const limit = Number(url.searchParams.get('limit') ?? 80)
    const filtered = taskId
      ? notifications.filter((event) => event.task_id === taskId)
      : notifications
    result = { items: filtered.slice(0, limit) }
  } else if (pathname === '/api/notifications/preview' && method === 'POST') {
    const payload = body as {
      task_name?: string
      listing?: Partial<Listing>
    }
    result = {
      message: [
        `پایش: ${payload.task_name || 'پایش جدید'}`,
        'رویداد: آگهی جدید',
        `عنوان: ${payload.listing?.title || 'نمونه آگهی مطابق فیلتر'}`,
        `سازمان: ${payload.listing?.organization || 'سازمان نمونه'}`,
      ].join('\n'),
    }
  } else if (pathname === '/api/listings' && method === 'GET') {
    const page = Number(url.searchParams.get('page') ?? 0)
    const pageSize = Number(url.searchParams.get('page_size') ?? 25)
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
    const boardCode = Number(url.searchParams.get('board_code') ?? 0)
    const taskId = url.searchParams.get('task_id')
    let filtered = [...listings]
    if (q)
      filtered = filtered.filter((listing) =>
        searchableListingText(listing).includes(q)
      )
    if (boardCode)
      filtered = filtered.filter((listing) => listing.board_code === boardCode)
    if (taskId) {
      const task = tasks.find((item) => item.id === taskId)
      if (task) filtered = filterListings(filtered, task.filters as TaskFilters)
    }
    filtered.sort((left, right) =>
      right.last_seen_at.localeCompare(left.last_seen_at)
    )
    result = paginate(filtered, page, pageSize)
  } else if (
    /^\/api\/listings\/\d+\/offers$/.test(pathname) &&
    method === 'GET'
  ) {
    const listingId = Number(pathname.split('/')[3])
    result = { items: offers[listingId] ?? [] }
  } else if (/^\/api\/listings\/\d+$/.test(pathname) && method === 'GET') {
    const listingId = Number(pathname.split('/')[3])
    const listing = listings.find((item) => item.id === listingId)
    if (!listing) throw new Error('آگهی نمایشی پیدا نشد.')
    result = { listing, offers: offers[listingId] ?? [] }
  } else if (pathname === '/api/meta/filters' && method === 'GET') {
    result = META_FILTERS
  } else if (pathname === '/api/meta/organizations' && method === 'GET') {
    result = {
      content: searchLookup(
        ORGANIZATIONS,
        url.searchParams.get('search') ?? ''
      ),
    }
  } else if (pathname === '/api/meta/categories' && method === 'GET') {
    result = {
      content: searchLookup(CATEGORIES, url.searchParams.get('search') ?? ''),
    }
  } else if (pathname === '/api/live/search' && method === 'POST') {
    const payload = body as {
      filters: TaskFilters
      page: number
      page_size: number
    }
    result = paginate(
      filterListings(listings, payload.filters),
      payload.page ?? 0,
      payload.page_size ?? 25
    )
  } else if (pathname === '/api/live/offers' && method === 'POST') {
    const payload = body as { party_number: string }
    const listing = listings.find(
      (item) => item.party_number === payload.party_number
    )
    result = { items: listing ? (offers[listing.id] ?? []) : [] }
  } else if (pathname === '/api/users' && method === 'GET') {
    result = { items: users }
  } else if (pathname === '/api/users' && method === 'POST') {
    const payload = body as {
      username: string
      role: UserRole
      enabled: boolean
    }
    const user: WorkbenchUser = {
      id: `demo-user-${nextUserId++}`,
      username: payload.username,
      role: payload.role,
      enabled: payload.enabled,
      created_at: DEMO_NOW,
      updated_at: null,
    }
    users = [user, ...users]
    result = user
  } else if (/^\/api\/users\/[^/]+$/.test(pathname) && method === 'PUT') {
    const userId = pathname.split('/')[3]
    const payload = body as { role: UserRole; enabled: boolean }
    const existing = users.find((user) => user.id === userId)
    if (!existing) throw new Error('کاربر نمایشی پیدا نشد.')
    const updated = { ...existing, ...payload, updated_at: DEMO_NOW }
    users = users.map((user) => (user.id === userId ? updated : user))
    result = updated
  } else if (
    pathname === '/api/integrations/rubika/status' &&
    method === 'GET'
  ) {
    result = RUBIKA_STATUS
  } else if (
    pathname === '/api/integrations/rubika/recipients' &&
    method === 'GET'
  ) {
    result = { items: recipients }
  } else if (
    pathname === '/api/integrations/rubika/recipients' &&
    method === 'POST'
  ) {
    const payload = body as RubikaRecipientPayload
    const recipient: RubikaRecipient = {
      ...payload,
      id: `demo-recipient-${nextRecipientId++}`,
      created_at: DEMO_NOW,
      updated_at: null,
    }
    recipients = [recipient, ...recipients]
    result = recipient
  } else if (
    /^\/api\/integrations\/rubika\/recipients\/[^/]+$/.test(pathname)
  ) {
    const recipientId = pathname.split('/')[5]
    if (method === 'PUT') {
      const payload = body as RubikaRecipientPayload
      const existing = recipients.find((item) => item.id === recipientId)
      if (!existing) throw new Error('مقصد نمایشی پیدا نشد.')
      const updated = { ...existing, ...payload, updated_at: DEMO_NOW }
      recipients = recipients.map((item) =>
        item.id === recipientId ? updated : item
      )
      result = updated
    } else if (method === 'DELETE') {
      recipients = recipients.filter((item) => item.id !== recipientId)
      result = { ok: true }
    }
  } else if (
    pathname === '/api/integrations/rubika/test' &&
    method === 'POST'
  ) {
    result = { ok: true, result: { demo: true, delivered: false } }
  }

  if (result === undefined) {
    throw new Error(
      `Public demo route is not implemented: ${method} ${pathname}`
    )
  }

  return respond(result as T)
}
