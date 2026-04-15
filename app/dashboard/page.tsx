import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/server"
import { BookOpen, Clock, GraduationCap, Play, Trophy } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect("/auth/login?redirect=/dashboard")
  }

  // Get user's enrollments with course data
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select(`
      *,
      courses (*)
    `)
    .eq("user_id", user.id)
    .order("enrolled_at", { ascending: false })

  // Get all lesson progress for the user
  const { data: allProgress } = await supabase
    .from("lesson_progress")
    .select("*, lessons(*)")
    .eq("user_id", user.id)
    .eq("completed", true)

  // Get lesson counts per course
  const courseIds = enrollments?.map(e => e.course_id) ?? []
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, course_id")
    .in("course_id", courseIds)

  // Calculate progress per course
  const lessonCountByCoure = new Map<string, number>()
  lessons?.forEach(l => {
    lessonCountByCoure.set(l.course_id, (lessonCountByCoure.get(l.course_id) ?? 0) + 1)
  })

  const completedByCoure = new Map<string, number>()
  allProgress?.forEach(p => {
    if (p.lessons) {
      const courseId = p.lessons.course_id
      completedByCoure.set(courseId, (completedByCoure.get(courseId) ?? 0) + 1)
    }
  })

  const totalCompleted = allProgress?.length ?? 0
  const totalCourses = enrollments?.length ?? 0
  const completedCourses = enrollments?.filter(e => {
    const total = lessonCountByCoure.get(e.course_id) ?? 0
    const completed = completedByCoure.get(e.course_id) ?? 0
    return total > 0 && completed === total
  }).length ?? 0

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      
      <main className="flex-1 py-8">
        <div className="container mx-auto max-w-7xl px-4">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user.user_metadata?.full_name ?? user.email?.split("@")[0]}!
            </h1>
            <p className="mt-2 text-muted-foreground">
              Pick up where you left off — your lessons are waiting.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: BookOpen, label: "Courses Enrolled", value: totalCourses },
              { icon: Play, label: "Lessons Watched", value: totalCompleted },
              { icon: Trophy, label: "Courses Completed", value: completedCourses },
              { icon: GraduationCap, label: "Keep Dancing", value: "💃" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* My Courses */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">My Courses</h2>
              <Button variant="outline" asChild>
                <Link href="/courses">Browse More</Link>
              </Button>
            </div>

            {enrollments && enrollments.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {enrollments.map((enrollment) => {
                  const course = enrollment.courses
                  const totalLessons = lessonCountByCoure.get(enrollment.course_id) ?? 0
                  const completedLessons = completedByCoure.get(enrollment.course_id) ?? 0
                  const progressPercent = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
                  const isCompleted = totalLessons > 0 && completedLessons === totalLessons

                  return (
                    <Card key={enrollment.id} className="overflow-hidden">
                      <div className="relative aspect-video">
                        <Image
                          src={course.thumbnail_url ?? "/placeholder.svg"}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                        {isCompleted && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Badge className="gap-1 bg-accent text-accent-foreground">
                              <Trophy className="h-3 w-3" />
                              Completed
                            </Badge>
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="mb-2 line-clamp-2 font-semibold text-foreground">
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{course.duration_hours}h total</span>
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-border bg-muted/30 p-4">
                        <div className="w-full space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {completedLessons} of {totalLessons} lessons
                            </span>
                            <span className="font-medium text-foreground">
                              {Math.round(progressPercent)}%
                            </span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                          <Button className="mt-2 w-full gap-2" asChild>
                            <Link href={`/courses/${course.id}/learn`}>
                              <Play className="h-4 w-4" />
                              {progressPercent > 0 ? "Continue" : "Start"} Learning
                            </Link>
                          </Button>
                        </div>
                      </CardFooter>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="p-12 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  No courses yet
                </h3>
                <p className="mb-6 text-muted-foreground">
                  Ready to start dancing? Get instant access to Level 1 today.
                </p>
                <Button asChild>
                  <Link href="/courses">Browse Courses</Link>
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
