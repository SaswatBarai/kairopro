/** A stand-in for the browser's `EventSource` (jsdom has none) that a test
 * can push frames into. Frame ids become `lastEventId`, like the real one. */
export class FakeEventSource {
  static CLOSED = 2;
  static instances: FakeEventSource[] = [];

  readyState = 0;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;
  private listeners = new Map<string, Array<(e: unknown) => void>>();

  constructor(public url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(name: string, fn: (e: unknown) => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), fn]);
  }

  close() {
    this.closed = true;
    this.readyState = FakeEventSource.CLOSED;
  }

  /** Delivers a named SSE frame with a JSON body. */
  emit(name: string, data: unknown, id: number) {
    const event = { data: JSON.stringify(data), lastEventId: String(id) };
    for (const fn of this.listeners.get(name) ?? []) fn(event);
  }

  /** Delivers a bare event with no data, like a dropped connection. */
  emitBare(name: string) {
    for (const fn of this.listeners.get(name) ?? []) fn({ type: name });
  }

  static reset() {
    FakeEventSource.instances = [];
  }

  static get latest(): FakeEventSource {
    return FakeEventSource.instances.at(-1)!;
  }
}
