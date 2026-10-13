export type ToastType = 'block' | 'unblock' | 'verified' | 'unverified' | 'info' | 'success' | 'warn' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  timestamp: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastService {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.toasts]));
  }

  show(title: string, message: string, type: ToastType = 'info', durationMs: number = 4500) {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastItem = {
      id,
      title,
      message,
      type,
      timestamp: Date.now(),
    };

    // Add to toasts (show newest at top)
    this.toasts = [newToast, ...this.toasts.slice(0, 4)];
    this.notify();

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }

    return id;
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  clear() {
    this.toasts = [];
    this.notify();
  }
}

export const toastService = new ToastService();

/**
 * Global helper function to trigger right-side notification
 */
export function showAppToast(title: string, message: string, type: ToastType = 'info', durationMs = 4500) {
  return toastService.show(title, message, type, durationMs);
}
