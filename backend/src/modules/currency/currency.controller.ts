import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { currencyService } from './currency.service';

const ratesQuerySchema = z.object({
  base: z.string().length(3).default('USD'),
});

export async function getRates(req: Request, res: Response, next: NextFunction) {
  try {
    const { base } = ratesQuerySchema.parse(req.query);
    const rates = await currencyService.getRates(base.toUpperCase());

    res.json({ success: true, data: { base: base.toUpperCase(), rates } });
  } catch (error) {
    next(error);
  }
}
