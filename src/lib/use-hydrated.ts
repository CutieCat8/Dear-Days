"use client";

import { useSyncExternalStore } from "react";

const subscribeNever = () => () => {};

/**
 * false while the page is still server-rendered HTML, true once React has taken over in the browser.
 * Forms that carry secrets keep their submit button disabled until then: a click (or Enter) before hydration would
 * be a native browser submit and never reach the form's onSubmit handler.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeNever, () => true, () => false);
}
