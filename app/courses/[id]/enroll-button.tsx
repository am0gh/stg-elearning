"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"
import { GraduationCap } from "lucide-react"

interface EnrollButtonProps {
  courseId: string
  isLoggedIn: boolean
}

export function EnrollButton({ courseId, isLoggedIn }: EnrollButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEnroll = async () => {
    if (!isLoggedIn) {
      router.push(`/auth/login?redirect=/courses/${courseId}`)
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
        .insert({
          user_id: user.id,
          course_id: courseId,
        })

      if (error) throw error

      router.refresh()
      router.push(`/courses/${courseId}/learn`)
    } catch (error) {
      console.error("Error enrolling:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      className="w-full gap-2" 
      size="lg" 
      onClick={handleEnroll}
      disabled={loading}
    >
      {loading ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <GraduationCap className="h-4 w-4" />
      )}
      {isLoggedIn ? "Enroll Now" : "Sign in to Enroll"}
    </Button>
  )
}
