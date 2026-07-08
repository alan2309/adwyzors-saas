import { EventEmitter } from 'events'
import type { DomainEvent, DomainEventListener } from './types.js'

class DomainEventBus {
  private emitter: EventEmitter

  constructor() {
    this.emitter = new EventEmitter()
    // Avoid warning about memory leaks when we have many listeners
    this.emitter.setMaxListeners(100)
  }

  /**
   * Publishes an event to the internal bus.
   */
  emit<T = unknown>(
    type: string,
    tenantId: string,
    userId: string | null,
    payload: T,
  ): void {
    const event: DomainEvent<T> = {
      type,
      tenantId,
      userId,
      payload,
      timestamp: new Date().toISOString(),
    }
    this.emitter.emit(type, event)
    // Wildcard listeners receive all events
    this.emitter.emit('*', event)
  }

  /**
   * Subscribes a listener to a specific event type.
   */
  on<T = unknown>(type: string, listener: DomainEventListener<T>): void {
    this.emitter.on(type, listener)
  }

  /**
   * Subscribes a listener to a specific event type, executing only once.
   */
  once<T = unknown>(type: string, listener: DomainEventListener<T>): void {
    this.emitter.once(type, listener)
  }

  /**
   * Unsubscribes a listener from a specific event type.
   */
  off<T = unknown>(type: string, listener: DomainEventListener<T>): void {
    this.emitter.off(type, listener)
  }

  /**
   * Subscribes to ALL events on the bus.
   */
  onAny(listener: DomainEventListener<any>): void {
    this.emitter.on('*', listener)
  }

  /**
   * Clears all listeners. Useful for tests.
   */
  clear(): void {
    this.emitter.removeAllListeners()
  }
}

export const eventBus = new DomainEventBus()
export type { DomainEventBus }
