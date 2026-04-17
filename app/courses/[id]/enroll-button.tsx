"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, CreditCard, GraduationCap, Tag, X } from "lucide-react"

const GOLD = "var(--brand-gold)"
const BLACK = "#0a0a0a"

interface EnrollButtonProps {
  courseId: string
  coursePrice: number
  isLoggedIn: boolean
}

export function EnrollButton({ courseId, coursePrice, isLoggedIn }: EnrollButtonProps) {
  const [loading, setLoading] = useState(false)
  const [discountCode, setDiscountCode] = useState("")
  const [codeInput, setCodeInput] = useState("")
  const [discountPct, setDiscountPct] = useState<number | null>(null)
  const [discountAmountEur, setDiscountAmountEur] = useState<number | null>(null)
  const [discountId, setDiscountId] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const router = useRouter()

  // Compute the price after whichever discount type is active
  const effectivePrice = discountAmountEur !== null
    ? Math.max(0, coursePrice - discountAmountEur)
    : discountPct !== null
      ? Math.max(0, coursePrice * (1 - discountPct / 100))
      : coursePrice

  const isFreeAfterDiscount = effectivePrice === 0
  const hasDiscount = discountCode !== ""

  // ── Validate discount code ──────────────────────────────────────────────────
  const handleApplyCode = async () => {
    if (!codeInput.trim()) return
    setValidating(true)
    setCodeError(null)

    const res = await fetch("/api/discounts/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: codeInput.trim() }),
    })

    const data = await res.json()

    if (!res.ok) {
      setCodeError(data.error ?? "Invalid code")
    } else {
      setDiscountCode(data.code)
      setDiscountPct(data.discount_percent ?? null)
      setDiscountAmountEur(data.discount_amount_eur ?? null)
      setDiscountId(data.id)
      setShowCodeInput(false)
      setCodeInput("")
    }

    setValidating(false)
  }

  const handleRemoveCode = () => {
    setDiscountCode("")
    setDiscountPct(null)
    setDiscountAmountEur(null)
    setDiscountId(null)
    setCodeError(null)
  }

  // ── Free enroll (course is €0 or discount brings it to €0) ─────────────────
  const handleFreeEnroll = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/auth/login?redirect=/courses/${courseId}`)
        return
      }

      const { error } = await supabase
        .from("enrollments")
        .insert({
          user_id: user.id,
          course_id: courseId,
          ...(discountId ? { discount_code_id: discountId } : {}),
        })

      if (error) throw error

      // Increment discount code usage if one was applied
      if (discountId) {
        await fetch(`/api/admin/discounts/${discountId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uses_count: 1 }),
        }).catch(() => {/* non-blocking */})
      }

      // Fire enrollment notification (free path)
      await fetch("/api/notifications/enrollment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          paymentMethod: discountId ? "discount_code" : "free",
          discountCode: discountCode || undefined,
          amountPaidEur: 0,
        }),
      }).catch(() => {/* non-blocking */})

      router.refresh()
      router.push(`/courses/${courseId}/learn`)
    } catch (err) {
      console.error("Error enrolling:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── Paid enroll → Stripe Checkout ──────────────────────────────────────────
  const handleStripeCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/checkout/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          discountCodeId:      discountId ?? undefined,
          discountPercent:     discountPct ?? undefined,
          discountAmountEur:   discountAmountEur ?? undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("Checkout session error:", data.error)
        return
      }

      // Redirect to Stripe-hosted checkout page
      window.location.href = data.url
    } catch (err) {
      console.error("Error creating checkout session:", err)
    } finally {
      setLoading(false)
    }
  }

  // ── Main click handler ──────────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/courses/${courseId}`)
      return
    }

    // Free course or 100% discounted → direct enrollment, no Stripe
    if (coursePrice === 0 || isFreeAfterDiscount) {
      await handleFreeEnroll()
      return
    }

    // Paid course → Stripe Checkout
    await handleStripeCheckout()
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const isPaid = coursePrice > 0 && !isFreeAfterDiscount

  return (
    <div className="space-y-3">
      {/* Applied discount badge */}
      {hasDiscount && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">
              {discountAmountEur !== null
                ? <>€{discountAmountEur.toFixed(2)} off — code <span className="font-mono">{discountCode}</span></>
                : <>{discountPct}% off — code <span className="font-mono">{discountCode}</span></>
              }
              {isFreeAfterDiscount && <span className="ml-1 font-bold">· Free!</span>}
            </span>
          </div>
          <button onClick={handleRemoveCode} className="text-green-600 hover:text-green-400">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Discount code input */}
      {showCodeInput && !discountCode && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter discount code"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError(null) }}
              onKeyDown={e => e.key === "Enter" && handleApplyCode()}
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
              autoFocus
            />
            <button
              onClick={handleApplyCode}
              disabled={validating || !codeInput.trim()}
              className="rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50"
              style={{ background: GOLD, color: BLACK }}
            >
              {validating ? "…" : "Apply"}
            </button>
          </div>
          {codeError && (
            <p className="text-xs text-red-400">{codeError}</p>
          )}
          <button
            onClick={() => { setShowCodeInput(false); setCodeError(null) }}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Price preview when discount is partial (not 100% free) */}
      {hasDiscount && !isFreeAfterDiscount && (
        <div className="rounded-lg p-3 text-center" style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)" }}>
          <span className="mr-2 text-sm line-through" style={{ color: "rgba(255,255,255,0.4)" }}>
            €{coursePrice.toFixed(2)}
          </span>
          <span className="text-lg font-black" style={{ color: GOLD }}>
            €{effectivePrice.toFixed(2)}
          </span>
          <span className="ml-1 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>after discount</span>
        </div>
      )}

      {/* Main CTA button */}
      <Button
        className="w-full gap-2"
        size="lg"
        onClick={handleEnroll}
        disabled={loading}
        style={{ background: GOLD, color: BLACK, fontWeight: 700 }}
      >
        {loading ? (
          <Spinner className="h-4 w-4" />
        ) : isPaid ? (
          <CreditCard className="h-4 w-4" />
        ) : (
          <GraduationCap className="h-4 w-4" />
        )}
        {!isLoggedIn
          ? "Sign in to Enroll"
          : coursePrice === 0 || isFreeAfterDiscount
            ? "Enroll Now — Free"
            : `Pay €${effectivePrice.toFixed(0)} & Enroll`
        }
      </Button>

      {/* Payment methods note */}
      {isLoggedIn && isPaid && (
        <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Card · iDEAL · SEPA · Secure checkout via Stripe
        </p>
      )}

      {/* "Have a discount code?" toggle link */}
      {isLoggedIn && coursePrice > 0 && !discountCode && !showCodeInput && (
        <button
          onClick={() => setShowCodeInput(true)}
          className="flex w-full items-center justify-center gap-1.5 text-xs"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          <Tag className="h-3 w-3" />
          Have a discount code?
        </button>
      )}
    </div>
  )
}
