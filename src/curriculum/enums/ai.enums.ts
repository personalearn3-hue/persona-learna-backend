export interface PersonalizedCurriculum {
  courseTitle: string;
  curriculumCreator?: string;
  institutionName?: string;
  dateCreated?: string;
  tutorName?: string;
  preliminaryInfo?: string;
  professorContact?: string;
  courseRequirements?: string;
  technologyRequirements?: string;
  studentName: string;
  estimatedTotalDuration: string;
  modules: Array<{
    title: string;
    summary: string;
    recommendedDuration: string;
  }>;
}

export interface MicroLesson {
  moduleTitle: string;
  lessonNumber: number;
  lessonTitle: string;
  duration: string; // "2-5 minutes"
  script: string;
  quizzes: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }>;
}

export interface MicroLessonOutput {
  courseTitle: string;
  studentName: string;
  totalModules: number;
  modules: Array<{
    moduleTitle: string;
    moduleNumber: number;
    lessons: MicroLesson[];
  }>;
}