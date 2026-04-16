"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, GraduationCap, Tag, X } from "lucide-react"

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
  const [discountId, setDiscountId] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [showCodeInput, setShowCodeInput] = useState(false)
  const router = useRouter()

  const effectivePrice = discountPct !== null
    ? Math.max(0, coursePrice * (1 - discountPct / 100))
    : coursePrice

  const isFreeAfterDiscount = effectivePrice === 0

  // ── Validate discount code ─────────────────────────────────────────────────
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
      setDiscountPct(data.discount_percent)
      setDiscountId(data.id)
      setShowCodeInput(false)
      setCodeInput("")
    }

    setValidating(false)
  }

  const handleRemoveCode = () => {
    setDiscountCode("")
    setDiscountPct(null)
    setDiscountId(null)
    setCodeError(null)
  }

  // ── Enroll ─────────────────────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/courses/${courseId}`)
      return
    }

    // Paid course with no 100% discount — show discount code prompt
    if (coursePrice > 0 && !isFreeAfterDiscount) {
      if (!showCodeInput) {
        setShowCodeInput(true)
        return
      }
      // If they still have a partial discount but no 100% off, do nothing (future Stripe)
      return
    }

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
        .insert({ user_id: user.id, course_id: courseId })

      if (error) throw error

      // Increment discount code usage count if one was applied
      if (discountId) {
        await fetch(`/api/admin/discounts/${discountId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uses_count: (discountPct !== null ? 1 : 0) }),
        }).catch(() => {/* non-blocking */})
      }

      router.refresh()
      router.push(`/courses/${courseId}/learn`)
    } catch (error) {
      console.error("Error enrolling:", error)
    } finally {
      setLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Applied discount badge */}
      {discountCode && discountPct !== null && (
        <div
          className="flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <span className="text-sm font-semibold text-green-400">
              {discountPct}% off — code <span className="font-mono">{discountCode}</span>
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
        ) : (
          <GraduationCap className="h-4 w-4" />
        )}
        {!isLoggedIn
          ? "Sign in to Enroll"
          : coursePrice === 0 || isFreeAfterDiscount
            ? "Enroll Now — Free"
            : "Enroll Now"
        }
      </Button>

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
