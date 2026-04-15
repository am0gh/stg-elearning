"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import type { Course, Lesson, LessonProgress } from "@/lib/types"
import { 
  ArrowLeft,
  ArrowRight, 
  CheckCircle2, 
  ChevronLeft, 
  Circle, 
  GraduationCap, 
  Menu,
  Play,
  X
} from "lucide-react"

interface LessonPlayerProps {
  course: Course
  lessons: Lesson[]
  currentLesson: Lesson
  progressMap: Record<string, LessonProgress>
  initialProgress: number
}

export function LessonPlayer({
  course,
  lessons,
  currentLesson,
  progressMap,
  initialProgress,
}: LessonPlayerProps) {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [completing, setCompleting] = useState(false)

  const currentIndex = lessons.findIndex(l => l.id === currentLesson.id)
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null
  
  const completedCount = Object.values(progressMap).filter(p => p.completed).length
  const progressPercent = (completedCount / lessons.length) * 100

  const markComplete = async () => {
    setCompleting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: currentLesson.id,
          completed: true,
          completed_at: new Date().toISOString(),
        })

      router.refresh()
      
      if (nextLesson) {
        router.push(`/courses/${course.id}/learn?lesson=${nextLesson.id}`)
      }
    } catch (error) {
      console.error("Error marking complete:", error)
    } finally {
      setCompleting(false)
    }
  }

  const isCurrentCompleted = progressMap[currentLesson.id]?.completed

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/courses/${course.id}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="hidden sm:block">
            <h1 className="text-sm font-medium text-foreground line-clamp-1">{course.title}</h1>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {lessons.length} lessons completed
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2 sm:flex">
            <Progress value={progressPercent} className="h-2 w-32" />
            <span className="text-sm text-muted-foreground">{Math.round(progressPercent)}%</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Video Player */}
        <div className="flex flex-1 flex-col">
          <div className="relative aspect-video w-full bg-black">
            {currentLesson.video_url ? (
              <iframe
                src={currentLesson.video_url}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <p>Video not available</p>
              </div>
            )}
          </div>
          
          {/* Lesson Info */}
          <div className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-3xl">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <span>Lesson {currentIndex + 1} of {lessons.length}</span>
                <span>•</span>
                <span>{currentLesson.duration_minutes} min</span>
              </div>
              
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                {currentLesson.title}
              </h2>
              
              <p className="mb-6 text-muted-foreground">
                {currentLesson.description}
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                {!isCurrentCompleted && (
                  <Button onClick={markComplete} disabled={completing} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    {completing ? "Marking..." : "Mark as Complete"}
                  </Button>
                )}
                
                {isCurrentCompleted && (
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <CheckCircle2 className="h-5 w-5" />
                    Completed
                  </div>
                )}
                
                <div className="flex gap-2">
                  {prevLesson && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/courses/${course.id}/learn?lesson=${prevLesson.id}`}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Previous
                      </Link>
                    </Button>
                  )}
                  {nextLesson && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/courses/${course.id}/learn?lesson=${nextLesson.id}`}>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          className={`absolute right-0 top-14 z-40 h-[calc(100vh-3.5rem)] w-80 border-l border-border bg-card transition-transform lg:relative lg:top-0 lg:h-auto lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-border p-4">
              <h3 className="font-semibold text-foreground">Course Content</h3>
              <p className="text-sm text-muted-foreground">
                {lessons.length} lessons
              </p>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-2">
                {lessons.map((lesson, index) => {
                  const isCompleted = progressMap[lesson.id]?.completed
                  const isCurrent = lesson.id === currentLesson.id
                  
                  return (
                    <Link
                      key={lesson.id}
                      href={`/courses/${course.id}/learn?lesson=${lesson.id}`}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                        isCurrent
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-accent" />
                        ) : isCurrent ? (
                          <Play className="h-5 w-5" />
                        ) : (
                          <Circle className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium line-clamp-2 ${isCurrent ? "text-primary" : "text-foreground"}`}>
                          {index + 1}. {lesson.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lesson.duration_minutes} min
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </ScrollArea>
            
            {completedCount === lessons.length && (
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-3 rounded-lg bg-accent/20 p-3 text-accent">
                  <GraduationCap className="h-6 w-6" />
                  <div>
                    <p className="font-medium">Course Completed!</p>
                    <p className="text-xs opacity-80">Congratulations!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
