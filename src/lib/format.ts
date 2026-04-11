/** 68000 → "6.8만", 62100 → "6.21만" */
export function formatCp(cp: number): string {
  const man = cp / 10000
  const str = man.toFixed(2).replace(/\.?0+$/, '') // 소수점 뒤 불필요한 0 제거
  return `${str}만`
}
