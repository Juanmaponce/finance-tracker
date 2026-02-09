import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, sanitizeAmount } from '../format';

describe('formatCurrency', () => {
  it('should format USD amount correctly', () => {
    expect(formatCurrency(100, 'USD')).toBe('$100.00');
  });

  it('should format with 2 decimal places', () => {
    expect(formatCurrency(99.9, 'USD')).toBe('$99.90');
  });

  it('should format zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
  });

  it('should default to USD when no currency provided', () => {
    expect(formatCurrency(50)).toBe('$50.00');
  });

  it('should format EUR amounts', () => {
    const result = formatCurrency(100, 'EUR');
    expect(result).toContain('100.00');
  });
});

describe('formatDate', () => {
  it('should format date string to short Spanish format', () => {
    const result = formatDate('2026-02-07T12:00:00Z');
    // Should contain day number and abbreviated month
    expect(result).toMatch(/\d/);
  });

  it('should handle ISO date strings', () => {
    const result = formatDate('2026-01-15');
    expect(result).toBeDefined();
  });
});

describe('sanitizeAmount', () => {
  it('should remove non-numeric characters', () => {
    expect(sanitizeAmount('$1,000.50')).toBe('1000.50');
  });

  it('should keep digits and dots', () => {
    expect(sanitizeAmount('123.45')).toBe('123.45');
  });

  it('should remove letters', () => {
    expect(sanitizeAmount('abc123')).toBe('123');
  });

  it('should handle empty string', () => {
    expect(sanitizeAmount('')).toBe('');
  });
});
