import { chromium } from 'playwright'
import { access, mkdir } from 'node:fs/promises'
import { constants } from 'node:fs'
import { dirname, resolve } from 'node:path'

const routePath = process.argv[2] ?? '/'
const outputName = process.argv[3] ?? 'workbench-overview.png'
const output = resolve(`../qa/screenshots/${outputName}`)
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
await page.goto(`http://127.0.0.1:5180${routePath}`, {
  waitUntil: 'networkidle',
  timeout: 60_000,
})
await page.screenshot({ path: output, fullPage: true, animations: 'disabled' })
await browser.close()
