import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  Bill,
  BudgetSummary,
  BudgetTarget,
  ExpenseSuggestion,
  PaymentMethod,
  Transaction,
} from '../lib/types'
import { api } from './client'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

export function useBudgetSummary(month?: string) {
  return useQuery({
    queryKey: ['budget', 'summary', month ?? 'current'],
    queryFn: () => api.get<BudgetSummary>(`/budget/summary${month ? `?month=${month}` : ''}`),
  })
}

export function useTransactions(month: string) {
  return useQuery({
    queryKey: ['budget', 'transactions', month],
    queryFn: () => api.get<Transaction[]>(`/budget/transactions?month=${month}`),
  })
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ['budget', 'payment-methods'],
    queryFn: () => api.get<PaymentMethod[]>('/budget/payment-methods'),
  })
}

export function useTargets() {
  return useQuery({
    queryKey: ['budget', 'targets'],
    queryFn: () => api.get<BudgetTarget[]>('/budget/targets'),
  })
}

export function useBills() {
  return useQuery({
    queryKey: ['budget', 'bills'],
    queryFn: () => api.get<Bill[]>('/budget/bills'),
  })
}

export function useExpenseSuggestions() {
  return useQuery({
    queryKey: ['budget', 'suggestions'],
    queryFn: () => api.get<ExpenseSuggestion[]>('/budget/suggestions'),
    refetchInterval: 30000,
  })
}

/** Every budget mutation refreshes the whole budget tree + Today + Pulse. */
export function useBudgetActions() {
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['budget'] })
    void qc.invalidateQueries({ queryKey: ['today'] })
    void qc.invalidateQueries({ queryKey: ['pulse'] })
  }
  const mk = <T,>(fn: (v: T) => Promise<unknown>) => useMutation({ mutationFn: fn, onSuccess: invalidate })

  return {
    createTxn: mk((body: Record<string, unknown>) => api.post<Transaction>('/budget/transactions', body)),
    updateTxn: mk(({ id, body }: { id: string; body: Record<string, unknown> }) => api.patch<Transaction>(`/budget/transactions/${id}`, body)),
    deleteTxn: mk((id: string) => api.del(`/budget/transactions/${id}`)),
    saveTargets: mk((targets: BudgetTarget[]) => api.put<BudgetTarget[]>('/budget/targets', { targets })),
    createMethod: mk((body: Record<string, unknown>) => api.post<PaymentMethod>('/budget/payment-methods', body)),
    updateMethod: mk(({ id, body }: { id: string; body: Record<string, unknown> }) => api.patch<PaymentMethod>(`/budget/payment-methods/${id}`, body)),
    deleteMethod: mk((id: string) => api.del(`/budget/payment-methods/${id}`)),
    createBill: mk((body: Record<string, unknown>) => api.post<Bill>('/budget/bills', body)),
    deleteBill: mk((id: string) => api.del(`/budget/bills/${id}`)),
    payBill: mk(({ id, amount }: { id: string; amount?: number }) => api.post(`/budget/bills/${id}/paid`, amount != null ? { amount } : {})),
    addSuggestion: mk((id: string) => api.post(`/budget/suggestions/${id}/add`, {})),
    dismissSuggestion: mk((id: string) => api.post<ExpenseSuggestion>(`/budget/suggestions/${id}/dismiss`, {})),
    bulkAdd: mk((ids: string[]) => api.post<{ added: number }>('/budget/suggestions/bulk-add', { ids })),
  }
}

/** CSV statement upload (multipart — bypasses the JSON api client). */
export async function importStatement(file: File): Promise<{ parsed: number; created: number; skipped: number }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE_URL}/api/budget/import`, { method: 'POST', body: form, credentials: 'include' })
  if (!res.ok) throw new Error(`Import failed (${res.status})`)
  return (await res.json()) as { parsed: number; created: number; skipped: number }
}
