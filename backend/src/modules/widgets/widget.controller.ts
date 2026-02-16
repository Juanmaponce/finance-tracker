import type { Request, Response } from 'express';
import { widgetService } from './widget.service';

export async function getMonthlySummary(req: Request, res: Response) {
  const userId = req.user!.userId;
  const summary = await widgetService.getMonthlySummary(userId);

  res.json({ success: true, data: summary });
}
