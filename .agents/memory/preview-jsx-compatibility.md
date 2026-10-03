---
name: Preview JSX compatibility
description: Development-only parser failures caused by instrumentation of generic JSX components.
---

Do not assume that a passing TypeScript check and production build guarantee that Replit's development preview can parse explicit generic JSX component arguments.

**Why:** The development instrumentation inserted metadata attributes between a component name and its type argument, generating invalid JSX. The unchanged source passed TypeScript and the production build, which does not enable that instrumentation.

**How to apply:** For a development-only JSX parser error, compare the reported transformed JSX against the original source. Specialize the generic component with a TypeScript instantiation expression outside JSX and render that alias. Removing the JSX type argument alone can widen union props to strings, even with typed options, so preserve the original type safety.