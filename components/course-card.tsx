import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Clock } from "lucide-react"
import type { Course } from "@/lib/types"

interface CourseCardProps {
  course: Course
}

const GOLD = "#C9A227"
const PURPLE = "#3D0057"

const levelStyles: Record<string, { label: string; bg: string; color: string }> = {
  beginner: { label: "Beginner", bg: GOLD, color: "#0a0a0a" },
  intermediate: { label: "Intermediate", bg: PURPLE, color: "#ffffff" },
  advanced: { label: "Advanced", bg: "rgba(255,255,255,0.12)", color: "#ffffff" },
}

export function CourseCard({ course }: CourseCardProps) {
  const level = levelStyles[course.level] ?? levelStyles.beginner

  return (
    <Link href={`/courses/${course.id}`} className="block">
      <Card
        className="group h-full overflow-hidden transition-all duration-300 hover:-translate-y-1"
        style={{ borderColor: "rgba(201,162,39,0.2)" }}
      >
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={course.thumbnail_url ?? "/placeholder.svg"}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span
            className="absolute left-3 top-3 rounded px-2.5 py-1 text-xs font-bold"
            style={{ background: level.bg, color: level.color }}
          >
            {level.label}
          </span>
        </div>

        <CardContent className="p-4">
          <h3
            className="mb-2 line-clamp-2 text-lg font-semibold transition-colors"
            style={{ color: "white" }}
          >
            {course.title}
          </h3>
          <p className="mb-4 line-clamp-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            {course.description}
          </p>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={course.instructor_avatar ?? undefined} />
              <AvatarFallback className="text-xs" style={{ background: GOLD, color: "#0a0a0a" }}>
                {course.instructor_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              {course.instructor_name}
            </span>
          </div>
        </CardContent>

        <CardFooter
          className="border-t px-4 py-3"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)" }}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              <Clock className="h-4 w-4" />
              <span>{course.duration_hours}h · Self-paced</span>
            </div>
            <span className="text-lg font-bold" style={{ color: GOLD }}>
              {course.price === 0 ? "Free" : `€${course.price}`}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
