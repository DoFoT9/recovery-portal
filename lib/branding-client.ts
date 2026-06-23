export function hexToRgbTriplet(hex: string): string {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/)
  if (!m) return '37 99 235'
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 0xff} ${(n >> 8) & 0xff} ${n & 0xff}`
}

export function isValidHex(s: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(s)
}
