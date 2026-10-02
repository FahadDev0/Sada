export type QuestionType =
  | 'SHORT_TEXT'
  | 'LONG_TEXT'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'DROPDOWN'
  | 'RATING'
  | 'SCALE'
  | 'NUMBER'
  | 'DATE'

export type SurveyStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED'
export type Lang = 'ar' | 'en'

export interface QuestionSettings {
  min?: number | null
  max?: number | null
  minLabel?: string | null
  maxLabel?: string | null
}

export interface Question {
  id: string
  type: QuestionType
  title: string
  description?: string | null
  required: boolean
  options: string[]
  settings: QuestionSettings | null
}

export interface Survey {
  id: string
  slug: string
  title: string
  description: string | null
  language: Lang
  status: SurveyStatus
  themeColor: string
  thankYouMessage: string | null
  oneResponsePerDevice: boolean
  closesAt: string | null
  createdAt: string
  updatedAt: string
  responseCount: number
  questions: Question[]
}

export interface SurveySummary {
  id: string
  slug: string
  title: string
  language: Lang
  status: SurveyStatus
  themeColor: string
  questionCount: number
  responseCount: number
  closesAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SurveyInput {
  title: string
  description: string | null
  language: Lang
  themeColor: string
  thankYouMessage: string | null
  oneResponsePerDevice: boolean
  closesAt: string | null
  questions: Array<Omit<Question, 'id'> & { id: string | null }>
}

export interface PublicSurvey {
  slug: string
  title: string
  description: string | null
  language: Lang
  themeColor: string
  thankYouMessage: string | null
  oneResponsePerDevice: boolean
  acceptingResponses: boolean
  questions: Question[]
}

export type AnswerValue = string | string[] | number

export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  googleLinked: boolean
}

export interface AuthResponse {
  token: string
  user: User
}

export interface PublicConfig {
  googleClientId: string | null
  googleEnabled: boolean
  aiEnabled: boolean
}

export interface OptionCount {
  label: string
  count: number
  percent: number
}

export interface QuestionResult {
  questionId: string
  type: QuestionType
  title: string
  answered: number
  skipped: number
  options: OptionCount[]
  average: number | null
  min: number | null
  max: number | null
  nps: number | null
  textAnswers: { value: string; submittedAt: string }[]
}

export interface SurveyResults {
  surveyId: string
  totalResponses: number
  firstResponseAt: string | null
  lastResponseAt: string | null
  timeline: { date: string; count: number }[]
  questions: QuestionResult[]
}

export interface ResponseItem {
  id: string
  submittedAt: string
  answers: Record<string, AnswerValue>
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

export interface Insights {
  summary: string
  highlights: string[]
  recommendations: string[]
  basedOnResponses: number
}

export interface AiUsage {
  enabled: boolean
  used: number
  limit: number
}
