---
name: TraceNest Observability Design System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#45464d'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#4648d4'
  on-secondary: '#ffffff'
  secondary-container: '#6063ee'
  on-secondary-container: '#fffbff'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#001e2f'
  on-tertiary-container: '#008cc7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#c9e6ff'
  tertiary-fixed-dim: '#89ceff'
  on-tertiary-fixed: '#001e2f'
  on-tertiary-fixed-variant: '#004c6e'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-hero:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.035em
  display-hero-mobile:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.025em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.015em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: -0.005em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  mono-metric:
    fontFamily: JetBrains Mono
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: -0.02em
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: -0.01em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  gutter-lg: 1.5rem
  margin: 1.5rem
  margin-mobile: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system establishes a high-precision, technical aesthetic tailored for elite engineering teams and cloud infrastructure operators. Blending the utilitarian rigor of Linear, the structural composure of Vercel, and the ambient polish of Stripe, the interface projects clarity, operational stability, and rapid legibility under high cognitive load.

The design movement combines **Engineering Minimalism** with **Subtle Atmospheric Glassmorphism**. Layouts utilize strict grid discipline, luminous neutral surfaces, razor-thin borders, and purposeful chromatic cues. Data density is treated as a first-class feature: negative space breathes without squandering screen real estate, ensuring complex tracing topologies, distributed telemetry, and raw log streams feel effortless to navigate.

## Colors

The palette relies on a surgical light-mode balance engineered to prevent eye strain during long debugging sessions:

- **Surface & Canvas Architecture:**
  - Base Canvas: Pure white (`#FFFFFF`) to anchor primary focus planes.
  - Sub-Canvas & Panes: Slate light tint (`#F8FAFC`) for toolbars, sidebars, and inactive surfaces.
  - Inset Wells & Log Shells: Muted zinc neutral (`#F1F5F9`) for code terminals and nested trace panels.

- **Structural Outlines:**
  - Default Borders: Refined hairline slate (`#E2E8F0`).
  - Active/Emphasized Borders: Mid slate (`#CBD5E1`).
  - Glass Border Overlay: Semi-transparent white-on-dark rim (`rgba(255, 255, 255, 0.7)` on layered cards, or `rgba(15, 23, 42, 0.08)` on light backdrops).

- **Chromatic Accents & Observability Semantics:**
  - Action Primary: Deep void slate (`#0F172A`) for high-gravity CTAs and authoritative headings.
  - Telemetry Accent: Soft electric indigo (`#6366F1`) and spectral violet (`#8B5CF6`) for traces, selections, and linear trends.
  - Latency / Network: Cyan-sky (`#0EA5E9`) for HTTP pipelines and bandwidth rates.
  - Status Emerald: Vivid mint (`#10B981`) for uptime, 2xx responses, and nominal service nodes.
  - Status Amber: Warm safety gold (`#F59E0B`) for degraded spans and queue warnings.
  - Status Crimson: Sharp carmine (`#EF4444`) for errors, panics, and 5xx alerts.

## Typography

The typographic hierarchy is split intentionally across cognitive domains:

1. **Structural & Editorial (`Geist`):** Delivers clean neo-grotesque authority with systematic tabular capability. High-level metric titles and view headers carry aggressive negative letter-spacing (`-0.02em` to `-0.035em`) to eliminate visual slack.
2. **System Interface & Body (`Inter`):** Handles general interface navigation, tooltips, documentation, and user-generated metadata. Set at `13px` for baseline high-density productivity without sacrificing readability.
3. **Telemetry & Code (`JetBrains Mono`):** Applied to log ingestion timestamps, trace hash identifiers, IP addresses, latency figures, and SQL query snippets. Numbers render in tabular mode (`font-variant-numeric: tabular-nums`) so values align vertically across streaming tables.

## Layout & Spacing

This design system uses a compact, fluid 12-column analytical grid flanked by persistent navigation shells.

- **Workspace Layout Engine:**
  - Desktop Viewports (>= 1280px): Fixed collapsed/expandable utility sidebar (width: `240px` or `64px`), 12-column content container with max-width `1600px`, dynamic split-screen capabilities for waterfall trace graphs.
  - Tablet Breakpoints (768px - 1279px): Collapsible drawer navigation, 8-column layout, sticky log timeline controls.
  - Mobile Form Factor (< 768px): Single-column reflow, bottom-sheet inspector panels, horizontal scrolling enabled strictly for raw log tables with frozen identifier columns.

- **Cadence & Density:**
  Spacing derives from a tight 4px baseline rhythm (`0.25rem`, `0.5rem`, `0.75rem`, `1.25rem`, `2rem`). Layout margins favor condensed efficiency, avoiding excessive dead margins common in consumer apps so engineers can monitor deep distributed systems without continuous scrolling.

## Elevation & Depth

Visual hierarchy eschews heavy drop shadows in favor of ambient multi-stop diffusion, translucent glass layers, and micro-bevels:

- **Surface 0 (Canvas Base):** Flat `#FFFFFF` or `#F8FAFC`. Zero elevation.
- **Surface 1 (Floating Cards & Dashboard Tiles):** Semi-opaque background (`rgba(255, 255, 255, 0.85)`) with `backdrop-filter: blur(12px)`, encircled by a crisp `1px` border (`rgba(226, 232, 240, 0.8)`). 
  - Micro-shadow formula: `box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 12px rgba(15, 23, 42, 0.02);`
- **Surface 2 (Popovers, Select Menus, & Command K Palettes):** Pure `#FFFFFF` surface with `backdrop-filter: blur(16px)`:
  - Shadow formula: `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 12px 24px -4px rgba(15, 23, 42, 0.06);`
  - Border: `1px solid #CBD5E1`.
- **Primary Interactive Inset Glow:** High-contrast buttons employ an ultra-fine internal top-edge highlight (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16)`) paired with a bottom contact shadow (`0 1px 2px rgba(15, 23, 42, 0.3)`), creating a tactile, precision-tooled presence.

## Shapes

The design system adopts a calibrated **Soft** corner radius architecture (`roundedness: 1`):

- Micro-elements (Badges, tags, checkboxes, inline code pills): `0.25rem` (4px).
- Standard UI (Buttons, text inputs, select dropdowns): `0.375rem` (6px).
- Containers & Cards (Telemetry cards, graph frames, modal sheets): `0.5rem` (8px).
- Status Pulse Indicators & Avatars: Fully circular (`9999px`).

Avoid bulbous, overly rounded containers; corners must stay crisp and engineering-precise to reinforce the impression of speed and density.

## Components

### Buttons
- **Primary:** Background `#0F172A`, text `#FFFFFF`, border `1px solid #0F172A`. Features an inner top highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.18)`). On hover, background shifts to `#1E293B`.
- **Secondary (Outlined):** Background `#FFFFFF`, text `#0F172A`, border `1px solid #E2E8F0`, subtle shadow (`0 1px 2px rgba(0,0,0,0.03)`). Hover: background `#F8FAFC`, border `#CBD5E1`.
- **Ghost / Icon:** Transparent background, text `#64748B`. Hover: background `#F1F5F9`, text `#0F172A`.

### Status Badges & Live Pulse Dots
- Status badges feature a low-saturation pastel fill, crisp text, and a live radiating dot:
  - **Healthy:** Background `rgba(16, 185, 129, 0.10)`, text `#047857`, border `1px solid rgba(16, 185, 129, 0.20)`. Contains a 6px `#10B981` circular dot with a CSS ping-animation aura.
  - **Degraded:** Background `rgba(245, 158, 11, 0.10)`, text `#B45309`, border `1px solid rgba(245, 158, 11, 0.20)`.
  - **Critical:** Background `rgba(239, 68, 68, 0.10)`, text `#B91C1C`, border `1px solid rgba(239, 68, 68, 0.20)`.

### Form Controls & Inputs
- **Input Fields:** Background `#FFFFFF`, height `32px` (dense) or `38px` (default), border `1px solid #E2E8F0`, font `Inter 13px`. Focus state triggers a dual ring: `1px solid #6366F1` and `0 0 0 3px rgba(99, 102, 241, 0.12)`.
- **Checkboxes & Radios:** Sharp 4px radius boxes with `#0F172A` active states and high-contrast white glyph checkmarks.

### Cards & Telemetry Tiles
- Built with acrylic frosted surface (`rgba(255, 255, 255, 0.9)`), `backdrop-blur: 8px`, and `1px solid #E2E8F0`. 
- Header rows divide with a clean horizontal hairline border (`1px solid #F1F5F9`), keeping metric counters visibly distinct from graph visualizations.

### Log Stream & Trace Waterfall Rows
- Alternating subtle stripe on hover (`#F8FAFC`).
- Split layout: Fixed-width timestamp column (`JetBrains Mono 11px`, `#64748B`), log-level pill, and expandable code/payload block with syntax highlighting in muted developer tokens.