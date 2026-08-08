export const FALLBACK_BOARD_OPTIONS: Record<
  string,
  { label: string; children: number[] }
> = {
  '1': { label: 'خرید', children: [] },
  '2': { label: 'مناقصه', children: [] },
  '3': { label: 'مزایده', children: [] },
}

export function boardLabel(code: number | null | undefined) {
  if (code === null || code === undefined) return 'عمومی'
  return FALLBACK_BOARD_OPTIONS[String(code)]?.label ?? 'عمومی'
}

export function boardValue(value: string) {
  if (!Object.prototype.hasOwnProperty.call(FALLBACK_BOARD_OPTIONS, value)) {
    return null
  }
  return Number(value)
}
