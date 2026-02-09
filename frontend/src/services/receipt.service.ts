import type { ApiResponse } from '@/types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

function getAccessToken(): string | null {
  const stored = localStorage.getItem('auth-storage');
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    return parsed?.state?.tokens?.accessToken || null;
  } catch {
    return null;
  }
}

export async function uploadReceipt(transactionId: string, file: File): Promise<string> {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('receipt', file);

  const response = await fetch(`${API_URL}/receipts/${transactionId}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data: ApiResponse<{ receiptUrl: string }> = await response.json();

  if (!response.ok) {
    throw new Error((data as { message?: string }).message || 'Failed to upload receipt');
  }

  return data.data.receiptUrl;
}

export async function deleteReceipt(transactionId: string): Promise<void> {
  const token = getAccessToken();

  const response = await fetch(`${API_URL}/receipts/${transactionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.message || 'Failed to delete receipt');
  }
}
