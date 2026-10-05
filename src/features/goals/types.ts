export interface Goal {
  id: string;
  name: string;
  target: number;
  /** "EUR", "%", "km", or empty for plain numbers. */
  unit: string;
  /** Optional deadline as YYYY-MM-DD. */
  deadline: string | null;
}

/** One change to a goal, written on a given day. */
export interface GoalEntry {
  itemId: string;
  goalId: string;
  dayNumber: number;
  amount: number;
}
