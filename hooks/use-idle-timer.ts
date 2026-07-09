import { useEffect, useState } from 'react';
import { useKioskStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export function useIdleTimer(timeoutMs: number = 60000, warningMs: number = 10000) {
  const { items, clearCart } = useKioskStore();
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    let warningTimeout: NodeJS.Timeout;
    let clearRunner: NodeJS.Timeout;

    const resetTimer = () => {
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

    resetTimer();

    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    events.forEach(event => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(clearRunner);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [items.length, timeoutMs, warningMs, clearCart, router]);

  return { showWarning };
}
