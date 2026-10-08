"use client";

import { createContext, useContext } from "react";

/**
 * Lets a page draw a full-viewport 3D scene *between* the app shell's background layers and its text.
 * The shell renders a fixed host (below the sidebar/main content, above the page background) only after a page calls
 * `setImmersive(true)`; the page then portals its canvas into `host`.
 */
export type SceneHostValue = {
  host: HTMLElement | null;
  setImmersive: (on: boolean) => void;
};

export const SceneHostContext = createContext<SceneHostValue | null>(null);

export function useSceneHost() {
  return useContext(SceneHostContext);
}
