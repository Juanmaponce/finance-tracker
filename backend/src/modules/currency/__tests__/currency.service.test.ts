import { redis } from '../../../lib/redis';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Must import after mocks are set up
import { currencyService } from '../currency.service';

describe('CurrencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('convertCurrency', () => {
    it('should return same amount when from and to currencies are equal', async () => {
      const result = await currencyService.convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should convert using fetched rates', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify({ EUR: 0.85 }));

      const result = await currencyService.convertCurrency(100, 'USD', 'EUR');
      expect(result).toBe(85);
    });

    it('should default to rate 1 when target currency not in rates', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify({ EUR: 0.85 }));

      const result = await currencyService.convertCurrency(100, 'USD', 'JPY');
      expect(result).toBe(100);
    });

    it('should round to 2 decimal places', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify({ EUR: 0.8533 }));

      const result = await currencyService.convertCurrency(100, 'USD', 'EUR');
      expect(result).toBe(85.33);
    });
  });

  describe('getRates', () => {
    it('should return cached rates when available', async () => {
      const cachedRates = { EUR: 0.85, GBP: 0.73 };
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(cachedRates));

      const result = await currencyService.getRates('USD');
      expect(result).toEqual(cachedRates);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch from API when cache misses', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'success', rates: { EUR: 0.85 } }),
      });

      const result = await currencyService.getRates('USD');
      expect(result).toEqual({ EUR: 0.85 });
      expect(redis.set).toHaveBeenCalledWith(
        'exchange_rates:USD',
        JSON.stringify({ EUR: 0.85 }),
        'EX',
        86400,
      );
    });

    it('should return fallback rates when API fails', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await currencyService.getRates('USD');
      expect(result).toEqual({ USD: 1 });
    });

    it('should return fallback rates when API returns error result', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: 'error', 'error-type': 'unsupported-code' }),
      });

      const result = await currencyService.getRates('XYZ');
      expect(result).toEqual({ XYZ: 1 });
    });

    it('should return fallback rates when fetch throws', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await currencyService.getRates('USD');
      expect(result).toEqual({ USD: 1 });
    });
  });
});
