import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { userService } from './user.service';

const updateSettingsSchema = z.object({
  primaryCurrency: z.string().length(3).optional(),
  darkMode: z.boolean().optional(),
  locale: z.string().max(10).optional(),
  displayName: z.string().min(2).max(100).optional(),
});

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateSettingsSchema.parse(req.body);
    const user = await userService.updateSettings(req.user!.userId, data);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function exportData(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await userService.exportData(req.user!.userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
