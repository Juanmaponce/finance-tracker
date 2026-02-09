import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Trash2, Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CategoryIcon } from '@/components/atoms/category-icon';
import { useUploadReceipt, useDeleteReceipt } from '@/hooks/use-receipts';
import { compressImage, validateImageFile } from '@/utils/image-compress';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Transaction } from '@/types/transaction';

interface TransactionDetailDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { mutateAsync: uploadReceipt, isPending: isUploading } = useUploadReceipt();
  const { mutateAsync: removeReceipt, isPending: isDeleting } = useDeleteReceipt();

  if (!transaction) return null;

  const isExpense = transaction.type === 'EXPENSE';
  const receiptUrl = transaction.receiptUrl;

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !transaction) return;

    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const compressed = await compressImage(file);
      await uploadReceipt({ transactionId: transaction.id, file: compressed });
      toast.success('Recibo subido');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al subir recibo';
      toast.error(message);
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleDeleteReceipt() {
    if (!transaction) return;
    try {
      await removeReceipt(transaction.id);
      toast.success('Recibo eliminado');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al eliminar recibo';
      toast.error(message);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md mx-auto max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de transaccion</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Amount and category */}
            <div className="flex items-center gap-3">
              <CategoryIcon icon={transaction.category.icon} color={transaction.category.color} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {transaction.description || transaction.category.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transaction.category.name} · {formatDate(transaction.date)}
                </p>
              </div>
              <p className={`text-lg font-bold ${isExpense ? 'text-expense' : 'text-income'}`}>
                {isExpense ? '-' : '+'}
                {formatCurrency(transaction.amount, transaction.currency)}
              </p>
            </div>

            {/* Receipt section */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Recibo</p>

              {receiptUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(receiptUrl)}
                    className="w-full"
                  >
                    <img
                      src={receiptUrl}
                      alt="Recibo"
                      className="w-full max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </button>
                  <div className="flex gap-2 p-2 bg-muted/50">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewUrl(receiptUrl)}
                      className="flex-1"
                    >
                      <Download className="size-4 mr-1" />
                      Ver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteReceipt}
                      disabled={isDeleting}
                      className="text-destructive hover:text-destructive"
                    >
                      {isDeleting ? (
                        <span className="size-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary-500 hover:bg-primary-50/50 transition-colors"
                >
                  {isUploading ? (
                    <>
                      <span className="size-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="size-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Agregar foto de recibo</span>
                      <span className="text-xs text-muted-foreground">
                        JPEG, PNG o WebP (max 5MB)
                      </span>
                    </>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Subir recibo"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Full-screen receipt preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
          role="dialog"
          aria-label="Vista previa del recibo"
        >
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Cerrar vista previa"
          >
            <X className="size-6" />
          </button>
          <img
            src={previewUrl}
            alt="Recibo completo"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
