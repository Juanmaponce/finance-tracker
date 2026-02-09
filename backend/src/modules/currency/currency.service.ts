import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';

const CACHE_TTL = 86400; // 24 hours
const API_BASE = 'https://open.er-api.com/v6/latest';

interface ExchangeRates {
  [currency: string]: number;
}

interface ExchangeRateApiResponse {
  result: string;
  'error-type'?: string;
  rates: ExchangeRates;
}

class CurrencyService {
  async getRates(base: string): Promise<ExchangeRates> {
    const cacheKey = `exchange_rates:${base}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable
    }

    try {
      const response = await fetch(`${API_BASE}/${base}`);
      if (!response.ok) {
        logger.warn(`Exchange rate API returned ${response.status} for ${base}`);
        return this.fallbackRates(base);
      }

      const data = (await response.json()) as ExchangeRateApiResponse;
      if (data.result !== 'success') {
        logger.warn(`Exchange rate API error for ${base}: ${data['error-type']}`);
        return this.fallbackRates(base);
      }

      const rates: ExchangeRates = data.rates;

      try {
        await redis.set(cacheKey, JSON.stringify(rates), 'EX', CACHE_TTL);
      } catch {
        // Redis unavailable
      }

      return rates;
    } catch {
      logger.error('Failed to fetch exchange rates');
      return this.fallbackRates(base);
    }
  }

  async convertCurrency(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;

    const rates = await this.getRates(from);
    const rate = rates[to] || 1;
    return Math.round(amount * rate * 100) / 100;
  }

  private fallbackRates(base: string): ExchangeRates {
    return { [base]: 1 };
  }
}

export const currencyService = new CurrencyService();
