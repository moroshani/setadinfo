import { chromium } from 'playwright'
import { access, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, resolve } from 'node:path'

const output = resolve('../qa/screenshots/workbench-search-result-dialog.png')
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

await mkdir(dirname(output), { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

await page.route('**/api/meta/filters', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      sortOptions: [{ label: 'مرتبط‌ترین', value: 'score' }],
      searchTypeOptions: [{ label: 'کلیدواژه عنوان', value: 0 }],
      boardOptions: {
        1: { label: 'مناقصه', children: [11, 12] },
        2: { label: 'مزایده', children: [21] },
      },
      tagLabels: { 11: 'کالا', 12: 'خدمات', 21: 'مزایده عمومی' },
    }),
  })
})

await page.route('**/api/live/search', async (route) => {
  await route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({
      items: [
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
          first_seen_at: '2026-06-20T08:00:00Z',
          last_seen_at: '2026-06-20T08:00:00Z',
        },
      ],
      page: 0,
      page_size: 25,
      total_elements: 1,
      total_pages: 1,
    }),
  })
})

await page.goto('http://127.0.0.1:5180/search', {
  waitUntil: 'networkidle',
  timeout: 60_000,
})
await page.getByRole('button', { name: /جستجو/ }).first().click()
await page.getByRole('button', { name: /بررسی/ }).click()
await page.screenshot({ path: output, fullPage: true, animations: 'disabled' })
await browser.close()
