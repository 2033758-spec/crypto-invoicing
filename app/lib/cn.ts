// shadcn/ui pattern: clsx + tailwind-merge. Deduplicates conflicting Tailwind
// classes (e.g. `px-4 px-6` → `px-6`) so CVA variants compose cleanly with
// caller-provided className overrides.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
