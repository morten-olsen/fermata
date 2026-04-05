---
name: broken-glass-philosophy
description: No hacks — refactor properly. Hacks propagate throughout the codebase.
type: feedback
---

Broken glass philosophy: any hack quickly propagates throughout the codebase. Always prefer good engineering and proper refactoring over bolting on workarounds.

**Why:** The user has observed that shortcuts and hacks become patterns that spread. One compromised abstraction leads to others copying the pattern.

**How to apply:** When implementing features or fixing bugs, always choose the clean architectural solution even if it requires more files touched. Services should be pure domain logic — no UI-awareness. Hooks own the reactive read-side. Components just render. Don't add throttles, debounces, or bespoke hacks to work around architectural gaps — fix the architecture instead.
