---
name: Chart compatibility
description: A React/Recharts compatibility issue that silently hides chart axes, legends, and tooltips.
---

When using Recharts 2 with React 19, pass axes, grids, legends, and tooltips as direct chart children or an array of elements, not inside a React fragment.

**Why:** Recharts 2's installed react-is 18 dependency does not recognize React 19 fragments. Charts can still draw their data series while silently omitting the fragment's axes, grid, legend, and tooltip.

**How to apply:** Check rendered axes and legends when creating or extracting charts. Revisit this constraint if the chart library or react-is dependency changes.