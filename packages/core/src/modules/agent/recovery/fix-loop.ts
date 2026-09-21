import {
  classifyFailure,
  type FailureCategory,
  type FailureSignal,
} from "./classify";
import {
  buildDegradationLadder,
  describeDegradation,
  type DegradationLevel,
} from "./degradation";
import { logRecoveryFailure } from "./logger";
import { isDegradable, type ConcernCategory } from "./rules";

/**
 * Bounded repair (Phase 17 / AI-7) — the driver `classify.ts`, `rules.ts`,
 * and `degradation.ts` all exist to serve. Generic over what an "attempt"
 * actually does (an LLM completion, a re-run of a command, …); the caller
 * supplies `attempt`, this file only owns the budget, the classification
 * gate, and the degradation policy.
 *
 * Budgets: at most `maxAttemptsPerError` (5) total attempts, cycling
 * through at most `maxDistinctApproaches` (3) approaches before either
 * escalating to the next degradation level (degradable units) or halting
 * (never-degradable units, which never move off `"full"`).
 */

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_MAX_APPROACHES = 3;

export interface AttemptFailure {
  signal: FailureSignal;
}

export type AttemptOutcome<T> =
  { ok: true; value: T } | { ok: false; failure: AttemptFailure };

export interface AttemptInput {
  task: string;
  /** The previous attempt's observed failure, fed back so the next attempt
   * can address it — `undefined` on the first attempt. */
  previousFailure?: string;
  attempt: number;
  approach: number;
  level: DegradationLevel;
}

export interface RunFixLoopInput<T> {
  /** The unit of work this loop is repairing — usually a file path. */
  unitName: string;
  /** What this unit is about — `rules.ts` decides degradability from this,
   * and only this; the caller is responsible for tagging it correctly. */
  concern: ConcernCategory;
  originalTask: string;
  buildId?: string | null;
  maxAttemptsPerError?: number;
  maxDistinctApproaches?: number;
  attempt: (input: AttemptInput) => Promise<AttemptOutcome<T>>;
  /** Fired once per degradation step, before the next attempt runs — the
   * seam a caller uses to publish an internal build event. */
  onDegrade?: (step: { level: DegradationLevel; message: string }) => void;
}

export type FixLoopResult<T> =
  | { status: "succeeded"; value: T; attempts: number; level: DegradationLevel }
  | { status: "omitted"; attempts: number; message: string }
  | {
      status: "halted";
      reason: "never-degradable" | "unrecognized-failure" | "exhausted";
      attempts: number;
    };

export async function runFixLoop<T>(
  input: RunFixLoopInput<T>,
): Promise<FixLoopResult<T>> {
  const maxAttempts = input.maxAttemptsPerError ?? DEFAULT_MAX_ATTEMPTS;
  const maxApproaches = input.maxDistinctApproaches ?? DEFAULT_MAX_APPROACHES;
  const degradable = isDegradable(input.concern);
  const ladder = buildDegradationLadder(input.originalTask);

  let attempts = 0;
  let approach = 1;
  let ladderIndex = 0;
  let previousFailure: string | undefined;
  let lastCategory: FailureCategory = "unknown";

  while (attempts < maxAttempts) {
    const step = ladder[ladderIndex]!;
    if (step.level === "omit" || step.task === null) {
      const message = describeDegradation("omit", input.unitName);
      await logRecoveryFailure({
        buildId: input.buildId,
        step: input.unitName,
        errorType: lastCategory,
        message: previousFailure ?? "Exhausted the degradation ladder.",
        attempt: attempts,
        approach,
        resolution: "omitted",
        resolved: true, // terminal, reported — the build can proceed
      });
      return { status: "omitted", attempts, message };
    }

    attempts += 1;
    const outcome = await input.attempt({
      task: step.task,
      previousFailure,
      attempt: attempts,
      approach,
      level: step.level,
    });

    if (outcome.ok) {
      return {
        status: "succeeded",
        value: outcome.value,
        attempts,
        level: step.level,
      };
    }

    const category = classifyFailure(outcome.failure.signal);
    lastCategory = category;
    previousFailure = outcome.failure.signal.message;

    if (category === "unknown") {
      await logRecoveryFailure({
        buildId: input.buildId,
        step: input.unitName,
        errorType: "unrecognized",
        message: previousFailure,
        attempt: attempts,
        approach,
        resolution: "halted:unrecognized",
        resolved: false,
      });
      return { status: "halted", reason: "unrecognized-failure", attempts };
    }

    if (!degradable) {
      if (approach >= maxApproaches) {
        await logRecoveryFailure({
          buildId: input.buildId,
          step: input.unitName,
          errorType: "never-degradable",
          message: previousFailure,
          attempt: attempts,
          approach,
          resolution: "halted:never-degradable",
          resolved: false,
          detail: { concern: input.concern },
        });
        return { status: "halted", reason: "never-degradable", attempts };
      }
      approach += 1;
      continue;
    }

    if (approach >= maxApproaches) {
      approach = 1;
      ladderIndex += 1;
      const nextStep = ladder[ladderIndex];
      if (nextStep) {
        const message = describeDegradation(nextStep.level, input.unitName);
        input.onDegrade?.({ level: nextStep.level, message });
        await logRecoveryFailure({
          buildId: input.buildId,
          step: input.unitName,
          errorType: category,
          message: previousFailure,
          attempt: attempts,
          approach,
          resolution: `degraded:${nextStep.level}`,
          resolved: false,
        });
      }
    } else {
      approach += 1;
    }
  }

  await logRecoveryFailure({
    buildId: input.buildId,
    step: input.unitName,
    errorType: lastCategory,
    message: previousFailure ?? "Exhausted the attempt budget.",
    attempt: attempts,
    approach,
    resolution: "halted:exhausted",
    resolved: false,
  });
  return { status: "halted", reason: "exhausted", attempts };
}
