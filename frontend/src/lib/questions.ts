import {
  AlignRight,
  Calendar,
  CircleDot,
  Hash,
  ListChecks,
  SlidersHorizontal,
  Star,
  SquareChevronDown,
  TextCursorInput,
  type LucideIcon,
} from 'lucide-react'
import type { Question, QuestionType } from './types'

export const QUESTION_TYPES: QuestionType[] = [
  'SINGLE_CHOICE',
  'MULTIPLE_CHOICE',
  'DROPDOWN',
  'SHORT_TEXT',
  'LONG_TEXT',
  'RATING',
  'SCALE',
  'NUMBER',
  'DATE',
]

export const TYPE_ICONS: Record<QuestionType, LucideIcon> = {
  SHORT_TEXT: TextCursorInput,
  LONG_TEXT: AlignRight,
  SINGLE_CHOICE: CircleDot,
  MULTIPLE_CHOICE: ListChecks,
  DROPDOWN: SquareChevronDown,
  RATING: Star,
  SCALE: SlidersHorizontal,
  NUMBER: Hash,
  DATE: Calendar,
}

export const isChoice = (type: QuestionType) =>
  type === 'SINGLE_CHOICE' || type === 'MULTIPLE_CHOICE' || type === 'DROPDOWN'

export function tempId() {
  return `new-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
}

/** Sensible defaults when a question is created or its type changes. */
export function withTypeDefaults(q: Question, type: QuestionType, optionLabel: (n: number) => string): Question {
  const next: Question = { ...q, type }
  if (isChoice(type)) {
    next.options = q.options.length > 0 ? q.options : [optionLabel(1), optionLabel(2)]
  }
  if (type === 'RATING') next.settings = { max: q.settings?.max && q.settings.max <= 10 ? q.settings.max : 5 }
  else if (type === 'SCALE') next.settings = { min: 1, max: 5, minLabel: null, maxLabel: null }
  else if (type === 'NUMBER') next.settings = { min: null, max: null }
  else next.settings = null
  return next
}

export function scaleRange(q: Pick<Question, 'type' | 'settings'>): number[] {
  const min = q.type === 'RATING' ? 1 : (q.settings?.min ?? 1)
  const max = q.settings?.max ?? 5
  const out: number[] = []
  for (let v = min; v <= max; v++) out.push(v)
  return out
}

export const THEME_COLORS = ['#0e7c74', '#1d4ed8', '#7c3aed', '#be123c', '#c2410c', '#a16207', '#15803d', '#334155']
