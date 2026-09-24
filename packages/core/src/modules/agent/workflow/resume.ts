import { AsyncLocalStorage } from "node:async_hooks";

/**
 * "Resume from where it failed": files an earlier build of the same project
 * already finished. `generateFile` / `generateTestFile` consult this instead
 * of taking a parameter, because every phase (auth, contracts, routes,
 * pages, tests) reaches them and threading a set through each would touch
 * all of them for one optional behaviour.
 */
const store = new AsyncLocalStorage<ReadonlySet<string>>();

export function runWithReusableFiles<T>(
  files: ReadonlySet<string>,
  fn: () => Promise<T>,
): Promise<T> {
  return store.run(files, fn);
}

export function isReusableFile(path: string): boolean {
  return store.getStore()?.has(path) ?? false;
}
