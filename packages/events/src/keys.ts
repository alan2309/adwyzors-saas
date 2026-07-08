/**
 * Standard Domain Event Types.
 * Matches actions in the system.
 */
export const EVENTS = {
  USER: {
    CREATED: 'user.created',
    UPDATED: 'user.updated',
    DEACTIVATED: 'user.deactivated',
  },
  TENANT: {
    CREATED: 'tenant.created',
    UPDATED: 'tenant.updated',
    SUSPENDED: 'tenant.suspended',
  },
  INVENTORY: {
    STOCK_ADJUSTED: 'inventory.stock.adjusted',
    STOCK_TRANSFERRED: 'inventory.stock.transferred',
  },
  SALES: {
    ORDER_CREATED: 'sales.order.created',
    ORDER_APPROVED: 'sales.order.approved',
    INVOICE_PAID: 'sales.invoice.paid',
  },
} as const

export type EventType =
  | typeof EVENTS.USER[keyof typeof EVENTS.USER]
  | typeof EVENTS.TENANT[keyof typeof EVENTS.TENANT]
  | typeof EVENTS.INVENTORY[keyof typeof EVENTS.INVENTORY]
  | typeof EVENTS.SALES[keyof typeof EVENTS.SALES]
