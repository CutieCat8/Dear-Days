"use client";

import { useEffect, useRef, useState } from "react";

import { AlertCircleIcon } from "@/components/shared/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DEMO_READ_ONLY_EVENT, DEMO_READ_ONLY_MESSAGE } from "@/lib/demo/constants";

const VISIBLE_MS = 4500;

/** Listens for the demo read-only event (see `notifyDemoReadOnly`) and shows the alert for a few seconds. */
export function DemoAlertHost() {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function show() {
      setOpen(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setOpen(false), VISIBLE_MS);
    }
    window.addEventListener(DEMO_READ_ONLY_EVENT, show);
    return () => {
      window.removeEventListener(DEMO_READ_ONLY_EVENT, show);
      clearTimeout(timer.current);
    };
  }, []);

  if (!open) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
      <Alert className="pointer-events-auto max-w-md shadow-[var(--shadow-soft)]" variant="destructive">
        <AlertCircleIcon />
        <AlertTitle>Demo account is view-only</AlertTitle>
        <AlertDescription>{DEMO_READ_ONLY_MESSAGE}</AlertDescription>
      </Alert>
    </div>
  );
}
