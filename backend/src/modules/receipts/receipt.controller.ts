import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { receiptService } from './receipt.service';
import { ValidationError } from '../../lib/errors';

const transactionIdSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction ID'),
});

export async function uploadReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionId } = transactionIdSchema.parse(req.params);

    if (!req.file) {
      throw new ValidationError('No file provided. Please upload an image.');
    }

    const receiptUrl = await receiptService.upload(req.user!.userId, transactionId, req.file);

    res.status(201).json({ success: true, data: { receiptUrl } });
  } catch (error) {
    next(error);
  }
}

export async function deleteReceipt(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionId } = transactionIdSchema.parse(req.params);

    await receiptService.delete(req.user!.userId, transactionId);

    res.json({ success: true, data: { message: 'Receipt deleted' } });
  } catch (error) {
    next(error);
  }
}
