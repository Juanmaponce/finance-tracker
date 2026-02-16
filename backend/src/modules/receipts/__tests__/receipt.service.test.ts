import { receiptService } from '../receipt.service';
import { prisma } from '../../../lib/prisma';
import { cloudinary } from '../../../lib/cloudinary';
import { NotFoundError, ForbiddenError } from '../../../lib/errors';
import fs from 'fs';

jest.mock('../../../lib/cloudinary', () => ({
  cloudinary: { uploader: { upload_stream: jest.fn(), destroy: jest.fn() } },
  isCloudinaryConfigured: false,
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ReceiptService', () => {
  const userId = 'user-123';
  const transactionId = 'tx-1';

  beforeEach(() => jest.clearAllMocks());

  describe('upload', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'receipt.jpg',
    } as Express.Multer.File;

    it('should upload receipt locally when cloudinary is not configured', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId,
        receiptUrl: null,
        deletedAt: null,
      });
      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({});

      const result = await receiptService.upload(userId, transactionId, mockFile);

      expect(result).toContain(`/uploads/receipts/${userId}/receipt-${transactionId}.jpg`);
      expect(mockedPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { receiptUrl: expect.stringContaining('receipt') },
      });
    });

    it('should replace existing receipt when uploading new one', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId,
        receiptUrl: '/uploads/receipts/user-123/receipt-tx-1.jpg',
        deletedAt: null,
      });
      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({});

      const result = await receiptService.upload(userId, transactionId, mockFile);

      expect(result).toContain(`/uploads/receipts/${userId}/receipt-${transactionId}.jpg`);
    });

    it('should create user directory if it does not exist', async () => {
      (mockedFs.existsSync as jest.Mock).mockReturnValue(false);
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId,
        receiptUrl: null,
        deletedAt: null,
      });
      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({});

      await receiptService.upload(userId, transactionId, mockFile);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining(userId), {
        recursive: true,
      });
    });

    it('should use file extension from original filename', async () => {
      const pngFile = {
        buffer: Buffer.from('test'),
        originalname: 'photo.png',
      } as Express.Multer.File;
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId,
        receiptUrl: null,
        deletedAt: null,
      });
      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({});

      const result = await receiptService.upload(userId, transactionId, pngFile);

      expect(result).toContain('.png');
    });

    it('should throw NotFoundError if transaction not found', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(receiptService.upload(userId, transactionId, mockFile)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ForbiddenError if user does not own the transaction', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId: 'other',
        receiptUrl: null,
      });

      await expect(receiptService.upload(userId, transactionId, mockFile)).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('delete', () => {
    it('should delete a local receipt and clear URL', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId,
        receiptUrl: '/uploads/receipts/user-123/receipt-tx-1.jpg',
        deletedAt: null,
      });
      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({});

      await receiptService.delete(userId, transactionId);

      expect(mockedPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { receiptUrl: null },
      });
    });

    it('should attempt to delete cloudinary file when URL contains cloudinary.com', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId,
        receiptUrl: 'https://res.cloudinary.com/demo/finance-tracker/user-123/receipt-tx-1.jpg',
        deletedAt: null,
      });
      (mockedPrisma.transaction.update as jest.Mock).mockResolvedValue({});
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: 'ok' });

      await receiptService.delete(userId, transactionId);

      expect(cloudinary.uploader.destroy).toHaveBeenCalled();
      expect(mockedPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId },
        data: { receiptUrl: null },
      });
    });

    it('should throw NotFoundError if transaction not found', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(receiptService.delete(userId, transactionId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the transaction', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId: 'other',
        receiptUrl: '/some/url.jpg',
      });

      await expect(receiptService.delete(userId, transactionId)).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError if no receipt attached', async () => {
      (mockedPrisma.transaction.findFirst as jest.Mock).mockResolvedValue({
        id: transactionId,
        userId,
        receiptUrl: null,
      });

      await expect(receiptService.delete(userId, transactionId)).rejects.toThrow(NotFoundError);
    });
  });
});
