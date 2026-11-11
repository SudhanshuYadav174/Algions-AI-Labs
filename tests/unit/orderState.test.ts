import { describe, it, expect } from 'vitest';
import { VALID_ORDER_TRANSITIONS, InvalidStateTransitionError } from '../../src/server/services/orderService.js';

describe('Unit: Order State Transition Machine', () => {
  it('allows valid state progression: placed -> paid -> packed -> shipped -> delivered', () => {
    expect(VALID_ORDER_TRANSITIONS['placed']).toContain('paid');
    expect(VALID_ORDER_TRANSITIONS['paid']).toContain('packed');
    expect(VALID_ORDER_TRANSITIONS['packed']).toContain('shipped');
    expect(VALID_ORDER_TRANSITIONS['shipped']).toContain('delivered');
  });

  it('allows cancellation from placed and paid states', () => {
    expect(VALID_ORDER_TRANSITIONS['placed']).toContain('cancelled');
    expect(VALID_ORDER_TRANSITIONS['paid']).toContain('cancelled');
  });

  it('prevents invalid transitions out of terminal states (delivered, cancelled)', () => {
    expect(VALID_ORDER_TRANSITIONS['delivered']).toEqual([]);
    expect(VALID_ORDER_TRANSITIONS['cancelled']).toEqual([]);
  });

  it('creates an InvalidStateTransitionError with correct message', () => {
    const err = new InvalidStateTransitionError('delivered', 'placed');
    expect(err.name).toBe('InvalidStateTransitionError');
    expect(err.message).toContain('Invalid order state transition from "delivered" to "placed"');
  });
});

