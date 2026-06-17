import type { QuotationItem, PaymentInstallment, FinancialSummary } from '../types/request'

export function calcGrossProfit(selling: number, cost: number): number {
  return selling - cost
}

export function calcMarginPercent(selling: number, grossProfit: number): number {
  if (selling === 0) return 0
  return (grossProfit / selling) * 100
}

export function calcInstallmentAmount(totalSelling: number, percent: number): number {
  return (totalSelling * percent) / 100
}

export function calcFinancials(items: QuotationItem[], installments: PaymentInstallment[]): FinancialSummary {
  const totalSelling = items.reduce((s, i) => s + i.sellingPrice, 0)
  const totalCost = items.reduce((s, i) => s + i.cost, 0)
  const grossProfit = totalSelling - totalCost
  const marginPercent = calcMarginPercent(totalSelling, grossProfit)
  const maxCreditTerm = installments.length > 0
    ? Math.max(...installments.map(i => i.creditTermDays))
    : 0
  return { totalSelling, totalCost, grossProfit, marginPercent, maxCreditTerm }
}

export function calcTotalInstallmentPercent(installments: Array<{ installmentPercent: number | '' }>): number {
  return installments.reduce((s, i) => s + (Number(i.installmentPercent) || 0), 0)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function roundTo(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)
}
