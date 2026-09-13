import { ConflictError, ValidationError } from "../../lib/errors";

/**
 * Interval scheduler with registration, cancellation, and overlap
 * protection. A slow job never stacks: if a run is still in flight when the
 * next tick fires, the tick is skipped.
 */
export interface Scheduler {
  /** Register a recurring job. Throws on a duplicate id or a non-positive
   * interval. The first run happens after one full interval. */
  register(
    id: string,
    intervalMs: number,
    job: () => void | Promise<void>,
  ): void;
  /** Stop a job. Returns whether it was registered. */
  cancel(id: string): boolean;
  /** Stop every job. */
  cancelAll(): void;
}

interface Registration {
  timer: NodeJS.Timeout;
  job: () => void | Promise<void>;
  running: boolean;
}

export class IntervalScheduler implements Scheduler {
  readonly #jobs = new Map<string, Registration>();
  #stopped = false;

  register(
    id: string,
    intervalMs: number,
    job: () => void | Promise<void>,
  ): void {
    if (this.#jobs.has(id)) {
      throw new ConflictError({
        message: `A job is already registered as "${id}"`,
      });
    }
    if (!Number.isInteger(intervalMs) || intervalMs <= 0) {
      throw new ValidationError({
        message: "Interval must be a positive number of milliseconds",
        details: { intervalMs },
      });
    }
    if (this.#stopped) {
      throw new ConflictError({ message: "The scheduler has been stopped" });
    }

    const registration: Registration = {
      timer: undefined as unknown as NodeJS.Timeout,
      job,
      running: false,
    };
    registration.timer = setInterval(() => {
      void this.#tick(id, registration);
    }, intervalMs);
    // Never keep the process alive for a background job.
    registration.timer.unref();
    this.#jobs.set(id, registration);
  }

  async #tick(id: string, registration: Registration): Promise<void> {
    if (registration.running) return; // overlap protection
    registration.running = true;
    try {
      await registration.job();
    } catch {
      // A failing scheduled job must not crash the process. Phase 4's usage
      // sweeper and later jobs log their own failures.
    } finally {
      registration.running = false;
    }
  }

  cancel(id: string): boolean {
    const registration = this.#jobs.get(id);
    if (!registration) return false;
    clearInterval(registration.timer);
    this.#jobs.delete(id);
    return true;
  }

  cancelAll(): void {
    for (const id of [...this.#jobs.keys()]) this.cancel(id);
    this.#stopped = true;
  }
}

/** The process scheduler. */
export const scheduler: Scheduler = new IntervalScheduler();
