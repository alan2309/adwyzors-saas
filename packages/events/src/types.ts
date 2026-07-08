export interface DomainEvent<T = unknown> {
  type: string
  tenantId: string
  userId: string | null
  payload: T
  timestamp: string
}

export type DomainEventListener<T = any> = (event: DomainEvent<T>) => void | Promise<void>
