import { beforeEach, describe, expect, it } from 'vitest'
import { requestPublicDemo, resetPublicDemoState } from './public-demo-api'
import {
  defaultTaskFilters,
  type DashboardResponse,
  type MonitorTask,
  type PageResponse,
  type TaskRun,
} from './setad-api'

describe('public demo API', () => {
  beforeEach(() => resetPublicDemoState())

  it('serves a coherent dashboard and listing bank', async () => {
    const dashboard =
      await requestPublicDemo<DashboardResponse>('/api/dashboard')
    const listings = await requestPublicDemo<PageResponse<{ id: number }>>(
      '/api/listings?page=0&page_size=25'
    )

    expect(dashboard.stats.total_tasks).toBe(dashboard.tasks.length)
    expect(dashboard.stats.total_listings).toBe(listings.total_elements)
    expect(listings.items.length).toBeGreaterThan(5)
  })

  it('filters live results without making a network request', async () => {
    const filters = {
      ...defaultTaskFilters(),
      keyword: 'امنیت',
      boardCodes: [2],
    }
    const result = await requestPublicDemo<PageResponse<{ title: string }>>(
      '/api/live/search',
      'POST',
      { filters, page: 0, page_size: 25 }
    )

    expect(result.total_elements).toBe(1)
    expect(result.items[0]?.title).toContain('امنیت')
  })

  it('keeps monitor mutations inside resettable browser state', async () => {
    const initial = await requestPublicDemo<{ items: MonitorTask[] }>(
      '/api/tasks'
    )
    await requestPublicDemo('/api/tasks/demo-infrastructure/run', 'POST', {})
    const runs = await requestPublicDemo<{ items: TaskRun[] }>('/api/runs')
    await requestPublicDemo('/api/tasks/demo-infrastructure', 'DELETE')
    const afterDelete = await requestPublicDemo<{ items: MonitorTask[] }>(
      '/api/tasks'
    )

    expect(runs.items[0]?.status).toBe('queued')
    expect(afterDelete.items).toHaveLength(initial.items.length - 1)

    resetPublicDemoState()
    const afterReset = await requestPublicDemo<{ items: MonitorTask[] }>(
      '/api/tasks'
    )
    expect(afterReset.items).toHaveLength(initial.items.length)
  })
})
