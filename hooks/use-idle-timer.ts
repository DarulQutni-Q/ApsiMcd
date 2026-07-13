import { useEffect, useRef, useState } from 'react';
import { useKioskStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export function useIdleTimer(timeoutMs: number = 60000, warningMs: number = 10000) {
  const { items, clearCart } = useKioskStore();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const resetRef = useRef<() => void>(() => {});

  useEffect(() => {
    let warningTimeout: ReturnType<typeof setTimeout>;
    let clearRunner: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(warningTimeout);
      clearTimeout(clearRunner);
      setShowWarning(false);

      if (items.length > 0) {
        warningTimeout = setTimeout(() => {
          setShowWarning(true);

          clearRunner = setTimeout(() => {
            clearCart();
            setShowWarning(false);
            // router.push('/');
          }, warningMs);
        }, timeoutMs - warningMs);
      }
    };

    resetRef.current = reset;
    reset();
    resetRef.current = reset;

    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    events.forEach((event) => window.addEventListener(event, reset));

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(clearRunner);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [items.length, timeoutMs, warningMs, clearCart, router]);

  return { showWarning, dismiss: () => resetRef.current() };
}
