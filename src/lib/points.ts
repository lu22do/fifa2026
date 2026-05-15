import type { BetCategory, MatchStage } from './types'

export const stageMultiplier: Record<MatchStage, number> = {
  group: 1,
  round_of_16: 2,
  quarter_final: 3,
  semi_final: 4,
  third_place: 5,
  final: 6,
}

export const categoryText: Record<BetCategory, string> = {
  match_result: 'Match Result',
  btts: 'Both Teams to Score',
  total_goals: 'Total Goals',
  correct_score: 'Correct Score',
  first_goalscorer: 'First Goalscorer',
}

export const matchOutcomeOptions = [
  { value: 'home', label: 'Home Win' },
  { value: 'draw', label: 'Draw' },
  { value: 'away', label: 'Away Win' },
]

export const bttsOptions = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
]

export const totalGoalsOptions = [
  { value: 'over', label: 'Over 2.5' },
  { value: 'under', label: 'Under 2.5' },
]

export const scoreOptions = ['0-0', '1-0', '0-1', '2-1', '1-2', '2-2', '3-1', '1-3', '3-2', '2-3']
