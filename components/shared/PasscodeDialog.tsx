"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LockKey } from "@phosphor-icons/react";
import { Card, CardContent } from "@/components/ui/card";

interface PasscodeDialogProps {
  isOpen: boolean;
  role: string;
  onSuccess: (passcode: string) => void;
}

export function PasscodeDialog({ isOpen, role, onSuccess }: PasscodeDialogProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.length < 6) {
      triggerError();
      return;
    }

    setIsLoading(true);

    try {
      // 1. Lakukan request ke API verifikasi (ini akan gagal jika PIN salah/tidak ada di DB)
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode, role })
      });

      const data = await res.json();

      // 2. Jika OK, panggil onSuccess yang menutup modal
      if (res.ok && data.success) {
        onSuccess(passcode);
      } else {
        triggerError(); // Jika API membalas 401 Unauthorized
      }
    } catch (err) {
      triggerError();
    } finally {
      setIsLoading(false);
    }
  };

  const triggerError = () => {
    setError(true);
    setPasscode("");
    setTimeout(() => setError(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md p-4"
          >
            <Card className="border-border/50 shadow-2xl">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <LockKey weight="duotone" className="h-8 w-8" />
                </div>
                <h2 className="mb-2 text-2xl font-bold capitalize text-foreground">{role} Access</h2>
                <p className="mb-8 text-sm text-muted-foreground">Please enter your 6-digit PIN to access this dashboard.</p>

                <form onSubmit={handleSubmit} className="w-full">
                  <input
                    type="password"
                    maxLength={6}
                    value={passcode}
                    disabled={isLoading}
                    onChange={(e) => setPasscode(e.target.value.replace(/\D/g, ''))}
                    className={`mb-6 w-full rounded-xl border-2 bg-background p-4 text-center text-3xl font-black tracking-widest outline-none transition-colors ${
                      error ? "border-destructive text-destructive" : "border-border text-foreground focus:border-primary"
                    }`}
                    placeholder="••••"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-primary py-4 font-bold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Unlock Dashboard"}
                  </button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}