export * from './order-created.event';
export * from './order-status-updated.event';

/**
 * Standard Order Event Names for Event-Driven Architecture
 */
export const ORDER_EVENTS = {
  CREATED: 'order.created',
  STATUS_UPDATED: 'order.status_updated',
} as const;
