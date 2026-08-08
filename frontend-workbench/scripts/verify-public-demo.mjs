import { strict as assert } from 'node:assert'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { chromium } from 'playwright'

const demoRoot = resolve('dist-demo')
const screenshotRoot = resolve('artifacts/demo-qa')
const basePath = '/setadinfo/'
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

async function serveFile(response, filePath) {
  const contents = await readFile(filePath)
  response.writeHead(200, {
    'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream',
  })
  response.end(contents)
}

const server = createServer(async (request, response) => {
  try {
    const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname
    if (!requestPath.startsWith(basePath)) {
      response.writeHead(404).end()
      return
    }

    const relativePath = requestPath.slice(basePath.length) || 'index.html'
    const filePath = normalize(join(demoRoot, relativePath))
    assert(
      filePath === demoRoot || filePath.startsWith(`${demoRoot}/`),
      'Request escaped the demo directory'
    )
    const fileStat = await stat(filePath)
    await serveFile(
      response,
      fileStat.isDirectory() ? join(filePath, 'index.html') : filePath
    )
  } catch {
    response.writeHead(404).end()
  }
})

await new Promise((resolveListen) =>
  server.listen(0, '127.0.0.1', resolveListen)
)
const address = server.address()
assert(address && typeof address !== 'string')
const demoUrl = `http://127.0.0.1:${address.port}${basePath}`

await mkdir(screenshotRoot, { recursive: true })
const browser = await chromium.launch({ headless: true })
const routes = [
  ['#/', 'کنترل روزانه فرصت‌ها، پایش‌ها و تغییرات Setad'],
  ['#/search', 'جستجوی زنده'],
  ['#/opportunities', 'آگهی‌ها و مزایده‌ها'],
  ['#/updates', 'بروزرسانی‌ها'],
  ['#/runs', 'تاریخچه اجرا'],
  ['#/recipients', 'مقصدهای اعلان'],
]

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport })
    const errors = []
    const apiRequests = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/api/')) {
        apiRequests.push(request.url())
      }
    })

    for (const [hash, heading] of routes) {
      await page.goto(`${demoUrl}${hash}`, { waitUntil: 'networkidle' })
      await page.getByRole('heading', { name: heading }).waitFor()
    }

    await page.goto(`${demoUrl}#/search`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'جستجو', exact: true }).click()
    await page.getByText('1405-D-0001').filter({ visible: true }).waitFor()
    await page.screenshot({
      path: join(screenshotRoot, `${viewport.name}-search-results.png`),
      fullPage: true,
    })

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
    }))
    assert.equal(dimensions.scrollWidth, dimensions.clientWidth)
    assert.equal(dimensions.bodyScrollWidth, dimensions.clientWidth)

    for (const name of [
      'سامانه و نوع معامله',
      'دستگاه اجرایی',
      'دسته‌بندی کالا',
      'سازمان‌های مستثنی',
    ]) {
      const button = page
        .getByRole('button', { name: new RegExp(name) })
        .first()
      const contained = await button.evaluate((element) => {
        const parent = element.getBoundingClientRect()
        return [...element.children].every((child) => {
          const bounds = child.getBoundingClientRect()
          return (
            bounds.left >= parent.left - 1 &&
            bounds.right <= parent.right + 1 &&
            bounds.top >= parent.top - 1 &&
            bounds.bottom <= parent.bottom + 1
          )
        })
      })
      assert(contained, `${name} content escaped its button`)
    }

    assert.deepEqual(
      apiRequests,
      [],
      'Public demo attempted a backend API request'
    )
    assert.deepEqual(errors, [], 'Public demo emitted browser errors')
    await page.close()
  }

  console.log('Public demo verification passed for desktop and mobile.')
} finally {
  await browser.close()
  await new Promise((resolveClose) => server.close(resolveClose))
}
