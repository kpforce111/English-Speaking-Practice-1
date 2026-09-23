export function planSavingsPercent(monthlyPaise: number, planPaise: number, months: number): number {
  return Math.round((1 - planPaise / (monthlyPaise * months)) * 100);
}