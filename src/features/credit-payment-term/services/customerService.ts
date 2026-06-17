/**
 * Customer Service
 * Mock layer — replace the implementation with Google Sheet API calls when ready.
 * All public functions are async so the interface stays the same after integration.
 */
import type { Customer } from '../types/customer'
import { MOCK_CUSTOMERS } from '../data/mockCustomers'

let _customers = [...MOCK_CUSTOMERS]

export async function getCustomers(): Promise<Customer[]> {
  await _delay()
  return [..._customers]
}

export async function getCustomerById(id: string): Promise<Customer | undefined> {
  await _delay()
  return _customers.find(c => c.id === id)
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  await _delay()
  const q = query.toLowerCase()
  return _customers.filter(
    c =>
      c.status === 'active' &&
      (c.companyName.toLowerCase().includes(q) || (c.taxId ?? '').includes(q)),
  )
}

function _delay(ms = 100): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
