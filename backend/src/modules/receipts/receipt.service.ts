import { cloudinary, isCloudinaryConfigured } from '../../lib/cloudinary';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import fs from 'fs';
import path from 'path';
const LOCAL_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/receipts');

class ReceiptService {
  /**
   * Upload receipt image for a transaction.
   * Uses Cloudinary in production, local storage in development.
   */
  async upload(userId: string, transactionId: string, file: Express.Multer.File): Promise<string> {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, deletedAt: null },
    });

    if (!transaction) throw new NotFoundError('Transaction not found');
    if (transaction.userId !== userId) throw new ForbiddenError('Access denied');

    // Delete existing receipt if present
    if (transaction.receiptUrl) {
      await this.deleteFile(transaction.receiptUrl);
    }

    const receiptUrl = isCloudinaryConfigured
      ? await this.uploadToCloudinary(file, userId, transactionId)
      : await this.uploadLocally(file, userId, transactionId);

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { receiptUrl },
    });

    return receiptUrl;
  }

  /**
   * Delete receipt from a transaction
   */
  async delete(userId: string, transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, deletedAt: null },
    });

    if (!transaction) throw new NotFoundError('Transaction not found');
    if (transaction.userId !== userId) throw new ForbiddenError('Access denied');
    if (!transaction.receiptUrl) throw new NotFoundError('No receipt attached');

    await this.deleteFile(transaction.receiptUrl);

    await prisma.transaction.update({
      where: { id: transactionId },
      data: { receiptUrl: null },
    });
  }

  private async uploadToCloudinary(
    file: Express.Multer.File,
    userId: string,
    transactionId: string,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `finance-tracker/${userId}`,
          public_id: `receipt-${transactionId}`,
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good', fetch_format: 'auto' },
            { width: 1200, crop: 'limit' },
          ],
          overwrite: true,
        },
        (error, result) => {
          if (error) {
            logger.error({ err: error }, 'Cloudinary upload failed');
            reject(new ValidationError('Failed to upload receipt'));
            return;
          }
          resolve(result!.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  private async uploadLocally(
    file: Express.Multer.File,
    userId: string,
    transactionId: string,
  ): Promise<string> {
    const userDir = path.join(LOCAL_UPLOAD_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `receipt-${transactionId}${ext}`;
    const filePath = path.join(userDir, filename);

    fs.writeFileSync(filePath, file.buffer);

    return `/uploads/receipts/${userId}/${filename}`;
  }

  private async deleteFile(url: string): Promise<void> {
    try {
      if (url.includes('cloudinary.com')) {
        // Extract public_id from Cloudinary URL
        const parts = url.split('/');
        const folderAndFile = parts.slice(-3).join('/');
        const publicId = folderAndFile.replace(/\.[^.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
      } else {
        // Local file
        const filePath = path.resolve(__dirname, '../../..', url.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete receipt file');
    }
  }
}

export const receiptService = new ReceiptService();
