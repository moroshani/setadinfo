import { chromium } from 'playwright'
import { access, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, resolve } from 'node:path'

const screenshotDir = resolve('../docs/assets/screenshots')
const baseUrl = process.env.WORKBENCH_URL ?? 'http://127.0.0.1:5180'
const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]

let executablePath
for (const candidate of candidates) {
  try {
    await access(candidate, constants.F_OK)
    executablePath = candidate
    break
  } catch {
    // Try the next installed browser candidate.
  }
}

const tasks = [
  {
    id: 'monitor-cooling',
    name: 'کولر گازی و تجهیزات سرمایشی',
    description: 'پایش مناقصه‌های مرتبط با تجهیزات سرمایشی در استان‌های هدف.',
    enabled: true,
    interval_minutes: 45,
    include_offers: true,
    notify_rubika: true,
    notify_initial: true,
    notify_new_listings: true,
    notify_listing_changes: true,
    notify_offer_changes: true,
    rubika_chat_id: '',
    recipient_ids: ['rec-ops'],
    owner_id: 'user-admin',
    filters: {
      monitorMode: 'filter',
      keywords: ['کولر گازی', 'سرمایش'],
      excludedKeywords: ['کارکرده'],
      boardCodes: [1],
      selectedProvinces: ['تهران', 'قم'],
    },
    created_at: '2026-06-19T07:00:00Z',
    updated_at: '2026-06-21T10:15:00Z',
    last_run_at: '2026-06-22T05:30:00Z',
    next_run_at: '2026-06-22T06:15:00Z',
    baseline_notified_at: '2026-06-19T07:04:00Z',
    last_successful_run_id: 902,
  },
  {
    id: 'monitor-auction',
    name: 'مزایده خودرو سازمانی',
    description: 'پایش یک آگهی مزایده و تغییرات پیشنهادهای عمومی.',
    enabled: true,
    interval_minutes: 30,
    include_offers: true,
    notify_rubika: true,
    notify_initial: true,
    notify_new_listings: true,
    notify_listing_changes: true,
    notify_offer_changes: true,
    rubika_chat_id: '',
    recipient_ids: ['rec-ops', 'rec-channel'],
    owner_id: 'user-admin',
    filters: {
      monitorMode: 'item',
      targetTradeNumber: '310500153',
      targetPartyNumber: 'P-1405-001',
      targetBoardCode: 2,
      targetTagCode: 21,
    },
    created_at: '2026-06-20T09:00:00Z',
    updated_at: '2026-06-22T05:40:00Z',
    last_run_at: '2026-06-22T05:42:00Z',
    next_run_at: '2026-06-22T06:12:00Z',
    baseline_notified_at: '2026-06-20T09:05:00Z',
    last_successful_run_id: 903,
  },
]

const listings = [
  {
    id: 1,
    source_key: 'sample-310500153',
    trade_number: '310500153',
    board_code: 2,
    tag_code: 21,
    party_number: 'P-1405-001',
    title: 'مزایده خودرو سواری سازمانی',
    description: 'فروش یک دستگاه خودرو سواری با بازدید حضوری و مهلت محدود.',
    organization: 'اداره کل نمونه',
    province: 'تهران',
    city: 'تهران',
    category: 'خودرو',
    send_deadline: '1405/04/25',
    document_deadline: '1405/04/20',
    price: 132000000,
    detail_url: 'https://setadiran.ir/',
    raw: {
      tradeNumber: '310500153',
      boardCode: 2,
      tagCode: 21,
      organizationName: 'اداره کل نمونه',
    },
    content_hash: 'sample-hash-1',
    first_seen_at: '2026-06-20T08:00:00Z',
    last_seen_at: '2026-06-22T05:42:00Z',
  },
  {
    id: 2,
    source_key: 'sample-310500184',
    trade_number: '310500184',
    board_code: 1,
    tag_code: 11,
    party_number: 'P-1405-002',
    title: 'خرید و نصب کولر گازی برای ساختمان اداری',
    description: 'تامین، حمل و نصب تجهیزات سرمایشی برای ساختمان اداری.',
    organization: 'شرکت خدمات عمومی نمونه',
    province: 'قم',
    city: 'قم',
    category: 'تاسیسات',
    send_deadline: '1405/04/28',
    document_deadline: '1405/04/24',
    price: 640000000,
    detail_url: 'https://setadiran.ir/',
    raw: {
      tradeNumber: '310500184',
      boardCode: 1,
      organizationName: 'شرکت خدمات عمومی نمونه',
    },
    content_hash: 'sample-hash-2',
    first_seen_at: '2026-06-21T06:20:00Z',
    last_seen_at: '2026-06-22T05:30:00Z',
  },
]

const offers = [
  {
    id: 1,
    listing_id: 1,
    source_key: 'offer-1',
    bidder_name: 'شرکت نمونه الف',
    amount: 151000000,
    submitted_at: '1405/04/22 10:30',
    status: 'ثبت شده',
    rank: '1',
    raw: { rank: 1 },
    content_hash: 'offer-hash-1',
    first_seen_at: '2026-06-22T05:42:00Z',
    last_seen_at: '2026-06-22T05:42:00Z',
  },
  {
    id: 2,
    listing_id: 1,
    source_key: 'offer-2',
    bidder_name: 'شرکت نمونه ب',
    amount: 146500000,
    submitted_at: '1405/04/22 11:05',
    status: 'ثبت شده',
    rank: '2',
    raw: { rank: 2 },
    content_hash: 'offer-hash-2',
    first_seen_at: '2026-06-22T05:42:00Z',
    last_seen_at: '2026-06-22T05:42:00Z',
  },
]

const runs = [
  {
    id: 903,
    task_id: 'monitor-auction',
    started_at: '2026-06-22T05:42:00Z',
    finished_at: '2026-06-22T05:42:09Z',
    status: 'success',
    message: '۲ پیشنهاد جدید برای مزایده ثبت شد.',
    fetched_count: 1,
    matched_count: 1,
    changed_count: 2,
  },
  {
    id: 902,
    task_id: 'monitor-cooling',
    started_at: '2026-06-22T05:30:00Z',
    finished_at: '2026-06-22T05:30:12Z',
    status: 'success',
    message: 'یک آگهی جدید مطابق فیلتر پیدا شد.',
    fetched_count: 34,
    matched_count: 8,
    changed_count: 1,
  },
]

const notifications = [
  {
    id: 41,
    task_id: 'monitor-auction',
    run_id: 903,
    listing_id: 1,
    offer_id: 1,
    event_type: 'offer_new',
    severity: 'info',
    title: 'پیشنهاد جدید برای مزایده خودرو',
    summary: 'مبلغ ۱۵۱,۰۰۰,۰۰۰ ریال با رتبه ۱ ثبت شد.',
    payload: { listing: listings[0], offer: offers[0] },
    created_at: '2026-06-22T05:42:09Z',
  },
  {
    id: 40,
    task_id: 'monitor-cooling',
    run_id: 902,
    listing_id: 2,
    offer_id: null,
    event_type: 'listing_new',
    severity: 'info',
    title: 'آگهی جدید تجهیزات سرمایشی',
    summary: 'خرید و نصب کولر گازی برای ساختمان اداری.',
    payload: listings[1],
    created_at: '2026-06-22T05:30:12Z',
  },
  {
    id: 12,
    task_id: 'monitor-cooling',
    run_id: 810,
    listing_id: 2,
    offer_id: null,
    event_type: 'baseline',
    severity: 'info',
    title: 'baseline اولیه پایش سرمایشی',
    summary: '۸ مورد اولیه ثبت شد. از این به بعد فقط تغییرات ارسال می‌شود.',
    payload: listings[1],
    created_at: '2026-06-19T07:04:00Z',
  },
]

const pageResponse = (items) => ({
  items,
  page: 0,
  page_size: 25,
  total_elements: items.length,
  total_pages: 1,
})

async function fulfillJson(route, body) {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

await mkdir(screenshotDir, { recursive: true })
const browser = await chromium.launch({ headless: true, executablePath })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

await page.route('**/api/**', async (route) => {
  const url = new URL(route.request().url())
  const path = url.pathname

  if (path === '/api/auth/me') {
    return fulfillJson(route, {
      ok: true,
      id: 'user-admin',
      username: 'admin',
      role: 'admin',
    })
  }
  if (path === '/api/dashboard') {
    return fulfillJson(route, {
      stats: {
        total_tasks: tasks.length,
        enabled_tasks: tasks.filter((task) => task.enabled).length,
        total_listings: listings.length,
        total_runs: runs.length,
        last_run: runs[0].started_at,
      },
      tasks,
    })
  }
  if (path === '/api/tasks') return fulfillJson(route, { items: tasks })
  if (path === '/api/runs') {
    const taskId = url.searchParams.get('task_id')
    return fulfillJson(route, {
      items: taskId ? runs.filter((run) => run.task_id === taskId) : runs,
    })
  }
  if (path === '/api/notifications') {
    const taskId = url.searchParams.get('task_id')
    return fulfillJson(route, {
      items: taskId
        ? notifications.filter((event) => event.task_id === taskId)
        : notifications,
    })
  }
  if (path === '/api/listings') {
    const taskId = url.searchParams.get('task_id')
    const boardCode = Number(url.searchParams.get('board_code'))
    let items = listings
    if (taskId === 'monitor-auction') items = listings.slice(0, 1)
    if (taskId === 'monitor-cooling') items = listings.slice(1)
    if (boardCode) items = items.filter((item) => item.board_code === boardCode)
    return fulfillJson(route, pageResponse(items))
  }
  if (path === '/api/listings/1') {
    return fulfillJson(route, { listing: listings[0], offers })
  }
  if (path === '/api/listings/2') {
    return fulfillJson(route, { listing: listings[1], offers: [] })
  }
  if (path === '/api/listings/1/offers') return fulfillJson(route, { items: offers })
  if (path === '/api/users') {
    return fulfillJson(route, {
      items: [
        {
          id: 'user-admin',
          username: 'admin',
          role: 'admin',
          enabled: true,
          created_at: '2026-06-19T06:00:00Z',
          updated_at: '2026-06-22T05:00:00Z',
        },
        {
          id: 'user-operator',
          username: 'operator',
          role: 'operator',
          enabled: true,
          created_at: '2026-06-20T06:00:00Z',
          updated_at: null,
        },
      ],
    })
  }
  if (path === '/api/integrations/rubika/status') {
    return fulfillJson(route, {
      configured: true,
      default_chat_configured: false,
    })
  }
  if (path === '/api/integrations/rubika/recipients') {
    return fulfillJson(route, {
      items: [
        {
          id: 'rec-ops',
          name: 'گروه عملیات',
          recipient_type: 'chat',
          chat_id: 'sample-chat-id',
          enabled: true,
          created_at: '2026-06-19T08:00:00Z',
          updated_at: '2026-06-22T05:00:00Z',
        },
      ],
    })
  }
  if (path === '/api/meta/filters') {
    return fulfillJson(route, {
      sortOptions: [{ label: 'مرتبط‌ترین', value: 'score' }],
      searchTypeOptions: [{ label: 'کلیدواژه عنوان', value: 0 }],
      boardOptions: {
        1: { label: 'مناقصه', children: [11, 12] },
        2: { label: 'مزایده', children: [21] },
      },
      tagLabels: { 11: 'کالا', 12: 'خدمات', 21: 'مزایده عمومی' },
    })
  }
  if (path === '/api/live/search') return fulfillJson(route, pageResponse(listings))
  if (path === '/api/live/offers') return fulfillJson(route, { items: offers })

  return fulfillJson(route, {})
})

const captures = [
  { routePath: '/', fileName: 'overview.png' },
  {
    routePath: '/search',
    fileName: 'search.png',
    beforeCapture: async () => {
      await page.getByRole('button', { name: /^جستجو$/ }).click()
      await page.waitForTimeout(500)
    },
  },
  { routePath: '/updates', fileName: 'updates.png' },
  { routePath: '/monitors/monitor-auction', fileName: 'monitor-detail.png' },
  { routePath: '/opportunities', fileName: 'opportunities.png' },
]

for (const capture of captures) {
  const { routePath, fileName, beforeCapture } = capture
  await page.goto(`${baseUrl}${routePath}`, {
    waitUntil: 'networkidle',
    timeout: 60_000,
  })
  if (beforeCapture) await beforeCapture()
  await page.screenshot({
    path: resolve(screenshotDir, fileName),
    fullPage: true,
    animations: 'disabled',
  })
}

await browser.close()
