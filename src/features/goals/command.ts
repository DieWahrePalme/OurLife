import type { Goal } from './types';

export type GoalCommandResult =
  | { ok: true; goal: Goal; amount: number }
  | { ok: false; error: string };

const COMMAND_START = /^\/goal(\s|$)/i;
const COMMAND = /^\/goal\s+(.+?)\s+([+-]?\d+(?:[.,]\d+)?)\s*(?:%|[^\d\s]*)$/i;

export function isGoalCommand(text: string): boolean {
  return COMMAND_START.test(text.trim());
}

function findGoal(goals: readonly Goal[], name: string): Goal | null {
  const wanted = name.trim().toLowerCase();
  const exact = goals.find((g) => g.name.toLowerCase() === wanted);
  if (exact) return exact;
  const prefixed = goals.filter((g) => g.name.toLowerCase().startsWith(wanted));
  return prefixed.length === 1 ? prefixed[0] : null;
}

/** Reads text like "/goal car +50" or "/goal website -10%". */
export function parseGoalCommand(text: string, goals: readonly Goal[]): GoalCommandResult {
  const match = COMMAND.exec(text.trim());
  if (!match) return { ok: false, error: 'Write it like /goal car +50' };
  const goal = findGoal(goals, match[1]);
  if (!goal) return { ok: false, error: `No goal called "${match[1]}". Create it under Goals first.` };
  const amount = Number.parseFloat(match[2].replace(',', '.'));
  if (!Number.isFinite(amount) || amount === 0) return { ok: false, error: 'Add a number like +50 or -20.' };
  return { ok: true, goal, amount };
}

export function formatAmount(amount: number, unit: string): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
  const value = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 }).format(Math.abs(amount));
  return unit === '%' ? `${sign}${value}%` : `${sign}${value}${unit ? ` ${unit}` : ''}`;
}

export function commandText(goal: Goal, amount: number): string {
  return `/goal ${goal.name} ${amount > 0 ? '+' : '-'}${Math.abs(amount)}`;
}
