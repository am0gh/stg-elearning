export interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  instructor_name: string
  instructor_avatar: string | null
  price: number
  duration_hours: number
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  description: string | null
  video_url: string | null
  duration_minutes: number
  order_index: number
  is_free: boolean
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  enrolled_at: string
  completed_at: string | null
}

export interface LessonProgress {
  id: string
  user_id: string
  lesson_id: string
  completed: boolean
  progress_seconds: number
  completed_at: string | null
  updated_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface CourseWithLessons extends Course {
  lessons: Lesson[]
}

export interface EnrollmentWithCourse extends Enrollment {
  courses: Course
}
