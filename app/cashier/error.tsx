"use client"

import { useEffect } from "react"
import { WarningCircle } from "@phosphor-icons/react"
import { PageHeader } from "@/components/page-header"

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <PageHeader title="System Error" backHref="/" />
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <WarningCircle weight="duotone" className="h-10 w-10" />
        </div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground">Terjadi Kesalahan</h2>
        <p className="mb-8 max-w-md text-sm text-muted-foreground">
          Maaf, sistem mengalami kendala saat memuat Cashier Register.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-xl bg-primary px-8 py-4 font-bold text-primary-foreground shadow-sm transition-transform active:scale-95"
        >
          Muat Ulang
        </button>
      </div>
    </div>
  )
}
