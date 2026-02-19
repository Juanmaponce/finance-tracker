import type { Request, Response } from 'express';
import { z } from 'zod';
import { reportService } from './report.service';

const summarySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use format YYYY-MM-DD'),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
});

const comparisonSchema = z.object({
  period1Start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period1End: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period2Start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  period2End: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accountId: z.string().uuid().optional(),
});

export async function getSummary(req: Request, res: Response) {
  const validated = summarySchema.parse(req.query);
  const userId = req.user!.userId;

  const summary = await reportService.getSummary({
    userId,
    startDate: validated.startDate,
    endDate: validated.endDate,
    type: validated.type,
    categoryId: validated.categoryId,
    accountId: validated.accountId,
  });

  res.json({ success: true, data: summary });
}

export async function getComparison(req: Request, res: Response) {
  const validated = comparisonSchema.parse(req.query);
  const userId = req.user!.userId;

  const comparison = await reportService.getComparison(
    userId,
    validated.period1Start,
    validated.period1End,
    validated.period2Start,
    validated.period2End,
    validated.accountId,
  );

  res.json({ success: true, data: comparison });
}
