# AcmeDesk Design System & Style Guide

> **Purpose**: This document is the single source of truth for building new admin pages
> and components in the AcmeDesk frontend. Any agent, developer, or contributor should
> be able to produce pixel-consistent pages by following these patterns exactly.
>
> **Reference standard**: The **Leads page** (`pages/admin/Leads.tsx`) is the canonical
> reference for all patterns. When in doubt, match Leads.

---

## Table of Contents

1. [Architecture & Layout](#1-architecture--layout)
2. [Breakpoints](#2-breakpoints)
3. [Typography](#3-typography)
4. [Color System](#4-color-system)
5. [Spacing & Sizing](#5-spacing--sizing)
6. [Border Radius](#6-border-radius)
7. [Shadows](#7-shadows)
8. [Page Wrapper](#8-page-wrapper)
9. [Page Header](#9-page-header)
10. [Filter / Action Bar](#10-filter--action-bar)
11. [KPI / Stat Cards](#11-kpi--stat-cards)
12. [Data Tables](#12-data-tables)
13. [Pagination](#13-pagination)
14. [View Toggle](#14-view-toggle)
15. [Tab Navigation](#15-tab-navigation)
16. [Section Headers](#16-section-headers)
17. [Section Cards](#17-section-cards)
18. [Badges & Pills](#18-badges--pills)
19. [Avatars](#19-avatars)
20. [Buttons](#20-buttons)
21. [Chat Bubbles](#21-chat-bubbles)
22. [Empty States](#22-empty-states)
23. [Loading Skeletons](#23-loading-skeletons)
24. [Trend Indicators](#24-trend-indicators)
25. [Sticky Save Bar](#25-sticky-save-bar)
26. [Kanban Board](#26-kanban-board)
27. [Dialog / Modal](#27-dialog--modal)
28. [Channel Metadata Utility](#28-channel-metadata-utility)
29. [Animations & Transitions](#29-animations--transitions)
30. [Accessibility](#30-accessibility)
31. [Dark Mode](#31-dark-mode)
32. [TypeScript Conventions](#32-typescript-conventions)

---

## 1. Architecture & Layout

### AdminLayout wrapper

All admin pages render inside `AdminLayout.tsx`, which provides:

```
<main id="main-content" className="flex-1 px-6 pt-6 pb-10">
  <PageTransition>
    <Outlet />        ← your page renders here
  </PageTransition>
</main>
```

- **Desktop sidebar**: 240 px expanded, 64 px collapsed (fixed left, full height)
- **Mobile drawer**: 280 px wide, z-index 70, overlay z-index 60
- **TopBar**: sticky, 56 px height
- Content area gets `margin-left` equal to sidebar width (animated 200 ms)

Each page then adds its **own** wrapper on top of this base padding. See [Page Wrapper](#8-page-wrapper).

### File structure convention

```
frontend/src/pages/admin/<PageName>.tsx    — page component
frontend/src/components/admin/             — shared admin components
frontend/src/lib/channelMeta.tsx           — channel metadata utility
frontend/src/components/ui/                — shadcn/ui primitives (DO NOT MODIFY)
```

---

## 2. Breakpoints

| Token | Width    | Notes                              |
|-------|----------|------------------------------------|
| `sm`  | 640 px   | Small tablets, large phones        |
| `md`  | 768 px   | Tablets                            |
| `lg`  | **960 px** | **NOT the Tailwind default 1024 px** |
| `xl`  | 1200 px  | Desktop                            |
| `2xl` | 1400 px  | Large desktop                      |

> **Critical**: `lg` is 960 px in this project, not 1024 px. Always verify in
> `tailwind.config.ts` if unsure.

---

## 3. Typography

### Font families

| Token             | Family             | Usage                           |
|-------------------|--------------------|---------------------------------|
| `font-heading`    | Plus Jakarta Sans  | Page titles, card labels, tabs  |
| `font-sans` / `font-description` | Satoshi | Body text, descriptions, chat |
| `font-mono`       | Geist Mono         | Numbers, scores, timestamps     |

### Font size tokens (from `tailwind.config.ts`)

| Token               | Size   | Weight | Line Height | Tracking    |
|----------------------|--------|--------|-------------|-------------|
| `text-h1`            | 3.5rem | 700    | 1.1         | -0.02em     |
| `text-h2`            | 2.5rem | 700    | 1.2         | -0.01em     |
| `text-h3`            | 2rem   | 700    | 1.3         | -0.01em     |
| `text-h4`            | 1.5rem | 700    | 1.4         | 0           |
| `text-h5`            | 1.25rem| 700    | 1.4         | 0           |
| `text-h6`            | 1rem   | 700    | 1.5         | 0           |
| `text-description`   | 1.25rem| 500    | 1.6         | 0           |
| `text-chat`          | 0.875rem| 400   | 1.5         | 0           |
| `text-technical`     | 0.875rem| 450   | 1.4         | 0           |
| `text-body`          | 0.875rem| 400   | 1.5         | 0           |
| `text-body-sm`       | 0.8125rem| 400  | 1.5         | 0           |
| `text-label`         | 0.8125rem| 500  | 1.4         | 0.01em      |
| `text-label-sm`      | 0.75rem| 500    | 1.4         | 0.01em      |
| `text-caption`       | 0.6875rem| 400  | 1.4         | 0.01em      |

### Common inline typography patterns

```tsx
// Page title
<h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">

// Page description
<p className="text-sm text-muted-foreground mt-1 font-description">

// Card stat label
className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1"

// Card stat value
className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground"

// Table header cell
className="text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground"

// Timestamp
className="text-[10px] text-muted-foreground/60 font-mono"
```

---

## 4. Color System

All colors use HSL via CSS custom properties. Reference `index.css` for exact values.

### Semantic tokens

| Token            | Light                  | Dark                   |
|------------------|------------------------|------------------------|
| `background`     | `0 0% 100%`            | `224 24% 6%`           |
| `foreground`     | `224 24% 12%`          | `220 14% 96%`          |
| `card`           | `0 0% 100%`            | `224 24% 8%`           |
| `muted`          | `220 14% 96%`          | `224 20% 14%`          |
| `muted-foreground`| `220 9% 46%`          | `220 9% 56%`           |
| `accent`         | `228 66% 97%`          | `228 40% 16%`          |
| `primary`        | `228 66% 47%`          | `228 66% 60%`          |
| `border`         | `220 13% 91%`          | `224 20% 16%`          |

### Status colors

| Token     | Usage                    |
|-----------|--------------------------|
| `success` | Positive states, online  |
| `warning` | Caution, pending         |
| `error`   | Errors, destructive      |
| `info`    | Informational            |

### Inline status color classes (used in badges)

```tsx
// Green / success
"bg-emerald-500/10 text-emerald-400 border-emerald-500/20"

// Amber / warning
"bg-amber-500/10 text-amber-400 border-amber-500/20"

// Red / error
"bg-rose-500/10 text-rose-400 border-rose-500/20"

// Blue / info
"bg-blue-500/10 text-blue-400 border-blue-500/20"

// Purple / special
"bg-violet-500/10 text-violet-400 border-violet-500/20"
```

### Gray scale

Tokens `gray-50` through `gray-950`. In dark mode the scale is inverted
(gray-50 is darkest, gray-950 is lightest).

### Brand color

`--brand-primary` defaults to `228 66% 47%` (light) / `228 66% 60%` (dark).
`--primary` aliases `--brand-primary`. Override `--brand-primary` for
enterprise white-labeling.

---

## 5. Spacing & Sizing

### Page-level spacing

- **Page wrapper padding**: `p-4 sm:p-6 lg:p-8 pb-32`
- **Gap between header and content**: `gap-6` (from the flex-col on the wrapper)
- **Max content width**: `max-w-[1600px] mx-auto w-full`

### Component spacing conventions

| Context                 | Value           |
|-------------------------|-----------------|
| Gap between sections    | `gap-6`         |
| Gap inside card grids   | `gap-3`         |
| Card internal padding   | `p-3 sm:p-4`   |
| Table cell padding      | `px-3 py-3`    |
| Filter bar gap          | `gap-2`         |
| Button icon gap         | `gap-1.5`       |

---

## 6. Border Radius

| Token        | Value  | Usage                    |
|--------------|--------|--------------------------|
| `rounded-sm` | 6 px   | Small inputs, badges     |
| `rounded-md` | 8 px   | Buttons, default         |
| `rounded-lg` | 12 px  | Cards, dropdowns         |
| `rounded-xl` | 16 px  | Large cards, table wraps |
| `rounded-full`| 9999 px| Avatars, pills          |
| `rounded-2xl`| —      | Chat bubbles             |

---

## 7. Shadows

| Token        | CSS Variable     | Usage                     |
|--------------|------------------|---------------------------|
| `shadow-soft-sm` / `shadow-soft` | `--shadow-sm` | Default card elevation |
| `shadow-soft-md` / `shadow-medium` | `--shadow-md` | Hover state, dropdowns |
| `shadow-soft-lg` / `shadow-strong` | `--shadow-lg` | Modals, popovers      |
| `shadow-chat`    | `--shadow-chat` | Chat widget              |

Light mode shadows use `hsl(224 24% 12%)` at low opacity.
Dark mode shadows use `hsl(0 0% 0%)` at higher opacity.

---

## 8. Page Wrapper

### Standard pages (all pages except Inbox)

```tsx
<div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full">
  {/* Page header */}
  {/* Filter bar (optional) */}
  {/* KPI cards (optional) */}
  {/* Main content (table, cards, etc.) */}
</div>
```

### Inbox (special full-height layout)

```tsx
<div className="flex flex-col gap-6 w-full min-w-0 h-full">
  {/* Header — uses px/pt padding only, no bottom padding (gap handles it) */}
  <div className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
    {/* Same h1/p pattern as standard pages */}
  </div>
  {/* 3-column layout fills remaining height */}
</div>
```

---

## 9. Page Header

Every page starts with a header block. The exact pattern:

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
  {/* Left side: title + description */}
  <div>
    <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none">
      Page Title
    </h1>
    <p className="text-sm text-muted-foreground mt-1 font-description">
      Brief description of what this page does.
    </p>
  </div>

  {/* Right side: action buttons (optional) */}
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
      <Icon className="h-3.5 w-3.5" />
      Action
    </Button>
  </div>
</div>
```

### Rules

- Title is always `<h1>` with `font-heading`
- Description is always `<p>` with `text-sm text-muted-foreground mt-1 font-description`
- On mobile, title and buttons stack vertically (`flex-col`); on `sm+` they sit side-by-side
- Never put an icon before the title text (the Radio icon anti-pattern was removed from Channels)

---

## 10. Filter / Action Bar

Sits below the page header, inside the `gap-6` flow.

```tsx
<div className="flex flex-wrap items-center gap-2">
  {/* Search input */}
  <div className="relative">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    <Input
      placeholder="Search..."
      className="h-9 w-full sm:w-[220px] pl-8 text-xs"
    />
  </div>

  {/* Select filters */}
  <Select>
    <SelectTrigger className="h-9 w-[140px] text-xs">
      <SelectValue placeholder="Filter..." />
    </SelectTrigger>
    {/* ... */}
  </Select>

  {/* Advanced filters toggle (optional) */}
  <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
    <SlidersHorizontal className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Advanced</span>
  </Button>

  {/* Spacer pushes right-side actions */}
  <div className="flex-1" />

  {/* Right-side actions */}
  <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
    <Download className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Export</span>
  </Button>
</div>
```

### Rules

- All filter controls use `h-9 text-xs`
- Icons inside buttons are `h-3.5 w-3.5`
- Labels hide on mobile via `hidden sm:inline`
- Use `flex-wrap` so items wrap gracefully on narrow screens
- Gap is always `gap-2`
- Clear filters button: `Button variant="link" size="sm" className="text-primary text-xs"`

---

## 11. KPI / Stat Cards

### Grid layouts by card count

```tsx
// 4 cards
className="grid grid-cols-2 lg:grid-cols-4 gap-3"

// 5 cards
className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"

// 6 cards
className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
```

### Card template

```tsx
<div className="relative overflow-hidden rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm group">
  {/* Gradient accent on hover */}
  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

  <div className="relative">
    {/* Label */}
    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground mb-1">
      Total Leads
    </p>

    {/* Value */}
    <p className="text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground">
      1,234
    </p>

    {/* Optional: trend indicator */}
    <div className="mt-1">
      {/* See Trend Indicators section */}
    </div>
  </div>
</div>
```

### Rules

- Each card has a gradient overlay with the card's accent color (e.g., `from-emerald-500/5`, `from-primary/5`)
- Values always use `font-mono` for numeric alignment
- Labels are all-caps with `tracking-wider`
- Hover state: `hover:border-primary/20 hover:shadow-soft-sm`

---

## 12. Data Tables

### Desktop table

```tsx
<div className="rounded-xl border bg-card overflow-hidden">
  <table className="w-full hidden sm:table">
    <thead>
      <tr className="border-b bg-muted/30">
        <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground">
          Name
        </th>
        {/* More columns... */}
        <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden lg:table-cell">
          Score {/* Hidden below lg */}
        </th>
        <th className="px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground hidden xl:table-cell">
          Source {/* Hidden below xl */}
        </th>
      </tr>
    </thead>
    <tbody className="divide-y">
      <tr className="cursor-pointer transition-colors hover:bg-muted/50">
        <td className="px-3 py-3 text-sm">
          {/* Cell content */}
        </td>
        {/* Match visibility: hidden lg:table-cell, hidden xl:table-cell */}
      </tr>
    </tbody>
  </table>

  {/* Mobile card list */}
  <div className="sm:hidden divide-y">
    {/* See Mobile Card pattern below */}
  </div>
</div>
```

### Progressive column disclosure

Columns hide at breakpoints using `hidden lg:table-cell`, `hidden xl:table-cell`,
`hidden 2xl:table-cell`. **Never use horizontal scrolling.**

Priority order (always visible → hidden first):
1. Primary identifier (name, subject) — always visible
2. Status — always visible
3. Secondary info (channel, date) — `hidden lg:table-cell`
4. Tertiary info (score, source) — `hidden xl:table-cell`
5. Rare columns — `hidden 2xl:table-cell`

### Mobile card list

```tsx
<div className="sm:hidden divide-y">
  <div className="p-3 flex items-start gap-3 cursor-pointer hover:bg-muted/50 transition-colors">
    {/* Avatar or icon */}
    <Avatar size="sm" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">Name</span>
        <Badge />
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">
        Secondary info
      </p>
    </div>
  </div>
</div>
```

### Row states

```tsx
// Default hover
className="cursor-pointer transition-colors hover:bg-muted/50"

// Selected row
className="bg-primary/5 hover:bg-primary/8"
```

---

## 13. Pagination

```tsx
<div className="flex items-center justify-between px-4 py-3 border-t">
  {/* Left: count */}
  <span className="text-[11px] text-muted-foreground font-mono">
    Showing 1-20 of 156
  </span>

  {/* Right: controls */}
  <div className="flex items-center gap-1">
    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1}>
      <ChevronLeft className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === totalPages}>
      <ChevronRight className="h-3.5 w-3.5" />
    </Button>
  </div>
</div>
```

---

## 14. View Toggle

Used on Leads page to switch between table and kanban views.

```tsx
<div className="flex rounded-lg border bg-card overflow-hidden">
  <button
    className={cn(
      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold font-heading transition-all",
      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
    )}
  >
    <LayoutList className="h-[13px] w-[13px]" />
    <span className="hidden sm:inline">Table</span>
  </button>
  {/* Repeat for Kanban */}
</div>
```

### Rules

- Icon size: 13 px (`h-[13px] w-[13px]`)
- Label hidden on mobile: `hidden sm:inline`
- Active: `bg-primary/10 text-primary`
- Inactive: `text-muted-foreground hover:text-foreground hover:bg-accent/50`

---

## 15. Tab Navigation

### 3-breakpoint responsive pattern (Chatbot page reference)

Tabs data must include a `shortLabel` field for mobile truncation.

```tsx
const TABS = [
  { id: "hours", label: "Business Hours", shortLabel: "Hours", icon: Clock },
  // ...
] as const;
```

**Mobile (`<sm`)** — 3×2 grid of pill cards with short labels:

```tsx
<div className="grid grid-cols-3 gap-1.5 sm:hidden">
  {TABS.map(tab => (
    <button
      key={tab.id}
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold font-heading transition-all",
        isActive
          ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
          : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
      )}
    >
      <tab.icon className="h-3.5 w-3.5" />
      {tab.shortLabel}
    </button>
  ))}
</div>
```

**Small tablet / half-desktop (`sm`–`lg`)** — 3×2 grid with full labels:

```tsx
<div className="hidden sm:grid lg:hidden grid-cols-3 gap-2">
  {TABS.map(tab => (
    <button className={cn(
      "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold font-heading transition-all",
      isActive
        ? "bg-primary/10 text-primary border-primary/30 shadow-sm"
        : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80 hover:bg-accent/50"
    )}>
      <tab.icon className="h-3.5 w-3.5" />
      {tab.label}
    </button>
  ))}
</div>
```

**Desktop (`lg+`)** — single inline row with dividers:

```tsx
<div className="hidden lg:flex items-center gap-1 w-fit">
  {TABS.map((tab, i) => (
    <Fragment key={tab.id}>
      {i > 0 && <div className="h-5 w-px bg-border mx-0.5" />}
      <button className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold font-heading transition-all whitespace-nowrap",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
      )}>
        <tab.icon className="h-3.5 w-3.5" />
        {tab.label}
      </button>
    </Fragment>
  ))}
</div>
```

---

## 16. Section Headers

Used in Analytics and similar pages to introduce content sections.

```tsx
<div className="flex items-center gap-2 mb-4">
  <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
  <span className="text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground whitespace-nowrap">
    Revenue Overview
  </span>
  <div className="flex-1 h-px bg-border" />
</div>
```

### Rules

- Icon: `h-4 w-4 shrink-0 text-primary`
- Title: `text-xs font-semibold uppercase tracking-wider font-heading text-muted-foreground whitespace-nowrap`
- Divider line: `flex-1 h-px bg-border` (stretches to fill remaining width)
- Bottom margin: `mb-4`

---

## 17. Section Cards

Used on the Chatbot page for form sections.

```tsx
{/* Outer wrapper */}
<div className="rounded-xl overflow-hidden transition-all duration-200 border border-border bg-card hover:border-border/80">
  {/* Header */}
  <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-border">
    <h2 className="text-sm sm:text-base font-semibold font-heading text-foreground">
      Section Title
    </h2>
    <p className="text-xs text-muted-foreground mt-0.5 font-description">
      Optional description
    </p>
  </div>

  {/* Body */}
  <div className="px-4 sm:px-6 py-5 sm:py-6">
    {/* Form fields, toggles, etc. */}
  </div>
</div>
```

---

## 18. Badges & Pills

### Status badge

```tsx
<span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-heading tracking-wide transition-colors">
```

Color classes per status:

| Status    | Classes                                                    |
|-----------|------------------------------------------------------------|
| Active    | `bg-emerald-500/10 text-emerald-400 border-emerald-500/20` |
| Pending   | `bg-amber-500/10 text-amber-400 border-amber-500/20`      |
| Closed    | `bg-gray-500/10 text-gray-400 border-gray-500/20`         |
| Hot       | `bg-rose-500/10 text-rose-400 border-rose-500/20`         |
| New       | `bg-blue-500/10 text-blue-400 border-blue-500/20`         |

Optional dot indicator before label:

```tsx
<span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
```

### Channel pill

Use the shared `<ChannelPill>` component from `@/lib/channelMeta`. See [Channel Metadata Utility](#28-channel-metadata-utility).

```tsx
<span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium {meta.className}">
  <ChannelIcon channel={channel} size={12} />
  <span className="hidden sm:inline">{meta.label}</span>
</span>
```

### Score badge

```tsx
<span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold font-mono tracking-wide">
  85
</span>
```

Score color thresholds:
- 80+: `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`
- 50–79: `bg-amber-500/10 text-amber-400 border-amber-500/20`
- <50: `bg-rose-500/10 text-rose-400 border-rose-500/20`

---

## 19. Avatars

```tsx
<div className={cn(
  "rounded-full bg-gradient-to-br from-primary/80 to-violet-600/80",
  "flex items-center justify-center font-bold text-white",
  "ring-2 ring-background shrink-0 select-none tracking-wide",
  // Size variants:
  // sm:
  "h-7 w-7 text-[10px]",
  // md:
  "h-9 w-9 text-xs",
  // lg:
  "h-12 w-12 text-sm",
)}>
  JS {/* Initials */}
</div>
```

### Rules

- Always use gradient: `from-primary/80 to-violet-600/80`
- Ring: `ring-2 ring-background` (creates separation from card backgrounds)
- Text: `font-bold text-white tracking-wide`
- Display 1–2 uppercase initials

---

## 20. Buttons

### Standard action button (in headers / filter bars)

```tsx
<Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
  <Plus className="h-3.5 w-3.5" />
  <span className="hidden sm:inline">Add New</span>
</Button>
```

### Icon-only button (pagination, close)

```tsx
<Button variant="ghost" size="icon" className="h-7 w-7">
  <X className="h-3.5 w-3.5" />
</Button>
```

### Primary action button

```tsx
<Button size="sm" className="h-9 text-xs gap-1.5">
  <Save className="h-3.5 w-3.5" />
  Save Changes
</Button>
```

### Size reference

| Context              | Height | Text   | Icon         |
|----------------------|--------|--------|--------------|
| Filter bar / header  | `h-9`  | `text-xs` | `h-3.5 w-3.5` |
| Pagination           | `h-7`  | —      | `h-3.5 w-3.5` |
| Inline small         | `h-8`  | `text-xs` | `h-3 w-3`   |

### Rules

- Always use `gap-1.5` between icon and label
- Hide labels on mobile with `hidden sm:inline` when space is tight
- Use `variant="outline"` for secondary actions, default/no variant for primary

---

## 21. Chat Bubbles

### User message (right-aligned)

```tsx
<div className="flex justify-end">
  <div className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%] sm:max-w-[75%]">
    <p className="text-sm leading-relaxed">Message text</p>
    <span className="text-[10px] text-primary-foreground/60 font-mono mt-1 block text-right">
      2:34 PM
    </span>
  </div>
</div>
```

### Assistant message (left-aligned)

```tsx
<div className="flex justify-start">
  <div className="bg-muted border rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[85%] sm:max-w-[75%]">
    <p className="text-sm text-foreground leading-relaxed">Response text</p>
    <span className="text-[10px] text-muted-foreground/60 font-mono mt-1 block">
      2:35 PM
    </span>
  </div>
</div>
```

### Rules

- User bubble: `rounded-2xl rounded-br-md` (sharp bottom-right corner)
- Assistant bubble: `rounded-2xl rounded-bl-md` (sharp bottom-left corner)
- Max width: `max-w-[85%] sm:max-w-[75%]`
- Timestamp: `text-[10px]` or `text-[11px]`, `font-mono`, reduced opacity (`/60`)

---

## 22. Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 px-4 text-center">
  {/* Icon circle */}
  <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
    <Inbox className="h-5 w-5 text-muted-foreground" />
  </div>

  {/* Primary text */}
  <p className="text-sm text-muted-foreground font-medium">
    No results found
  </p>

  {/* Secondary text */}
  <p className="text-xs text-muted-foreground/60 mt-1">
    Try adjusting your filters or search terms.
  </p>

  {/* Optional: clear button */}
  <Button variant="link" size="sm" className="text-primary text-xs mt-2">
    Clear filters
  </Button>
</div>
```

### Rules

- Icon circle: `h-12 w-12` (or `h-14 w-14` for emphasis) with `bg-muted`
- Inner icon: `h-5 w-5 text-muted-foreground`
- Container padding: `py-16`
- Text stack: `text-sm font-medium` primary, `text-xs text-muted-foreground/60` secondary

---

## 23. Loading Skeletons

### Table skeleton

```tsx
<div className="rounded-xl border bg-card overflow-hidden">
  <table className="w-full hidden sm:table">
    <thead>
      <tr className="border-b bg-muted/30">
        <th className="px-3 py-3"><Skeleton className="h-3 w-16" /></th>
        {/* Repeat for each column */}
      </tr>
    </thead>
    <tbody className="divide-y">
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i}>
          <td className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
          {/* ... */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### Card grid skeleton

```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
  {Array.from({ length: 4 }).map((_, i) => (
    <Skeleton key={i} className="h-[120px] rounded-xl" />
  ))}
</div>
```

### Mobile card list skeleton

```tsx
<div className="sm:hidden divide-y">
  {Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="p-4 space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  ))}
</div>
```

### Rules

- Use `<Skeleton>` from `@/components/ui/skeleton`
- Match the shape of what's loading (table rows, cards, etc.)
- Use `rounded-xl` for card skeletons to match card radius
- Typically show 5 placeholder rows for tables

---

## 24. Trend Indicators

```tsx
<span className={cn(
  "inline-flex items-center gap-0.5 text-xs font-mono font-medium",
  trend > 0 && "text-emerald-500",
  trend < 0 && "text-rose-500",
  trend === 0 && "text-muted-foreground",
)}>
  {trend > 0 && <TrendingUp className="h-3 w-3" />}
  {trend < 0 && <TrendingDown className="h-3 w-3" />}
  {trend === 0 && <Minus className="h-3 w-3" />}
  {Math.abs(trend)}%
</span>
```

### Rules

- Always `font-mono` for the number
- Icon: `h-3 w-3`
- Positive: `text-emerald-500` + `TrendingUp`
- Negative: `text-rose-500` + `TrendingDown`
- Neutral: `text-muted-foreground` + `Minus`

---

## 25. Sticky Save Bar

Used on the Chatbot page when form fields have unsaved changes.

```tsx
<div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 bg-card/95 backdrop-blur-sm border-t px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 z-10">
  <p className="text-xs text-muted-foreground font-description">
    You have unsaved changes
  </p>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" className="h-8 text-xs">
      Discard
    </Button>
    <Button size="sm" className="h-8 text-xs gap-1.5">
      <Save className="h-3 w-3" />
      Save
    </Button>
  </div>
</div>
```

### Rules

- **`sticky bottom-0`** — not `fixed` (fixed overlaps content and ignores scroll context)
- Negative margins `-mx-4 sm:-mx-6 lg:-mx-8` to bleed edge-to-edge within the page wrapper
- Matching positive padding `px-4 sm:px-6 lg:px-8` to align content
- `bg-card/95 backdrop-blur-sm` for frosted glass effect
- `z-10` to sit above content

---

## 26. Kanban Board

Used on the Leads page as an alternative to the table view.

### Column layout

```tsx
<div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
  {columns.map(col => (
    <div key={col.id} className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold font-heading text-muted-foreground uppercase tracking-wider">
            {col.title}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted rounded-full px-1.5 py-0.5">
            {col.count}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {col.items.map(item => (
          <div className="rounded-xl border bg-card p-3 cursor-grab hover:border-primary/20 hover:shadow-soft-sm transition-all">
            {/* Card content */}
          </div>
        ))}
      </div>
    </div>
  ))}
</div>
```

### Rules

- Horizontal scrolling is acceptable here (it's a kanban, not a data table)
- Column width: `w-[280px] sm:w-[300px]`
- Use `snap-x snap-mandatory` + `snap-start` for mobile snapping
- Card hover matches KPI card hover: `hover:border-primary/20 hover:shadow-soft-sm`
- DnD: use `cursor-grab` default, `cursor-grabbing` while dragging

---

## 27. Dialog / Modal

Used for detail views (Leads detail, Conversations detail).

```tsx
<Dialog>
  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0">
    {/* Header */}
    <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-6 py-4 z-10">
      <DialogTitle className="font-heading text-base font-semibold text-foreground">
        Detail Title
      </DialogTitle>
      <DialogDescription className="text-xs text-muted-foreground mt-0.5">
        Description
      </DialogDescription>
    </div>

    {/* Body */}
    <div className="px-6 py-5 space-y-6">
      {/* Content sections */}
    </div>
  </DialogContent>
</Dialog>
```

### Rules

- `max-w-2xl` for standard detail dialogs
- `max-h-[85vh] overflow-y-auto` to prevent full-page takeover
- `p-0` on `DialogContent`, manual padding on header/body
- Sticky header with `bg-card/95 backdrop-blur-sm`
- Always include `DialogTitle` and `DialogDescription` for accessibility

---

## 28. Channel Metadata Utility

**File**: `frontend/src/lib/channelMeta.tsx`

This is the single source of truth for channel icons, labels, and colors.

### Exports

| Export                | Type                        | Description                          |
|-----------------------|-----------------------------|--------------------------------------|
| `CHANNEL_META`        | `Record<string, ChannelMeta>` | Full metadata map                  |
| `CHANNEL_KEYS`        | `readonly string[]`         | All channels except aliases          |
| `CAMPAIGN_CHANNEL_KEYS` | `readonly string[]`       | Channels for campaigns (no "web")    |
| `ChannelKey`          | Type                        | Union type of valid channel keys     |
| `ChannelIcon`         | Component                   | Renders brand icon with brand color  |
| `ChannelPill`         | Component                   | Badge with icon + label              |

### Usage

```tsx
import { ChannelIcon, ChannelPill, CHANNEL_META, CHANNEL_KEYS } from "@/lib/channelMeta";

// Icon only
<ChannelIcon channel="whatsapp" size={14} />

// Full pill badge
<ChannelPill channel="whatsapp" size="md" />

// Access metadata
const meta = CHANNEL_META["whatsapp"];
// meta.label → "WhatsApp"
// meta.brandColor → "#25D366"
// meta.className → "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
// meta.gradient → "from-emerald-500/20 to-emerald-500/5"
```

### Available channels

| Key         | Label       | Brand Color | Icon             |
|-------------|-------------|-------------|------------------|
| `web`       | Web         | `#3B82F6`   | `FaGlobe`        |
| `whatsapp`  | WhatsApp    | `#25D366`   | `FaWhatsapp`     |
| `instagram` | Instagram   | `#E4405F`   | `FaInstagram`    |
| `facebook`  | Facebook    | `#0084FF`   | `FaFacebookMessenger` |
| `messenger` | Messenger   | `#0084FF`   | `FaFacebookMessenger` |
| `email`     | Email       | `#8B5CF6`   | `FaEnvelope`     |
| `sms`       | SMS         | `#EC4899`   | `BsChatDotsFill` |

---

## 29. Animations & Transitions

### Tailwind animations (from `tailwind.config.ts`)

| Class                      | Duration | Easing                                   |
|----------------------------|----------|------------------------------------------|
| `animate-fade-in`          | 0.2s     | ease-out                                 |
| `animate-accordion-down`   | 0.2s     | ease-out                                 |
| `animate-accordion-up`     | 0.2s     | ease-out                                 |
| `animate-spinner-smooth`   | 1s       | linear infinite                          |
| `animate-success-checkmark`| 0.5s     | ease-out                                 |
| `animate-scale-in`         | 0.5s     | cubic-bezier(0.34, 1.56, 0.64, 1)       |

### CSS animations (from `index.css`)

| Class                    | Description                          |
|--------------------------|--------------------------------------|
| `.animate-pulse-gentle`  | Gentle scale + shadow pulse (2s)     |
| `.animate-fade-in`       | Simple opacity fade (0.3s)           |
| `.skeleton-shimmer`      | Loading shimmer gradient (1.5s)      |
| `.page-transition-*`     | Page enter/exit transitions (0.2s)   |
| `.sidebar-nav-item`      | Sidebar item slide-in (260ms)        |

### Transition defaults for interactive elements

```tsx
// Standard hover transition
className="transition-colors"          // color changes only
className="transition-all duration-200" // all properties, 200ms

// Card hover
className="transition-all duration-200 hover:border-primary/20 hover:shadow-soft-sm"
```

### Reduced motion

All animations respect `prefers-reduced-motion: reduce` and the `.reduce-motion`
class. When adding new animations, always include:

```css
@media (prefers-reduced-motion: reduce) {
  .your-animation {
    animation: none;
  }
}

.reduce-motion .your-animation {
  animation: none;
}
```

---

## 30. Accessibility

### Focus indicators

All interactive elements get visible focus via `index.css`:

```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: var(--radius-md);
}
```

### Skip link

`AdminLayout` includes a skip-to-content link:

```tsx
<a href="#main-content" className="sr-only focus:not-sr-only ...">
  Skip to main content
</a>
```

### Screen reader text

Use `sr-only` class for visually hidden but accessible text:

```tsx
<span className="sr-only">Close dialog</span>
```

### ARIA patterns

- Dialogs: `role="dialog"` + `aria-modal="true"` + `aria-label`
- Icon-only buttons: always include `aria-label` or `sr-only` text
- Charts: `role="img"` + `aria-label` describing the chart
- Decorative icons: `aria-hidden="true"` (the `ChannelIcon` component does this)
- Mobile sidebar drawer: `role="dialog"` + `aria-modal="true"`

### Color contrast

- All semantic colors are WCAG AA compliant (4.5:1 contrast ratio)
- High contrast mode available via `.high-contrast` class (WCAG AAA where possible)
- Minimum font size: 14 px (`0.875rem`) for body text

---

## 31. Dark Mode

- Toggled via class-based strategy: `<html class="dark">`
- All colors switch via CSS custom properties (no conditional Tailwind classes needed)
- Shadow opacity increases in dark mode (uses pure black instead of foreground color)
- Gray scale inverts (gray-50 becomes darkest)
- Brand primary shifts lighter: `228 66% 47%` → `228 66% 60%`
- High contrast dark mode: `.high-contrast.dark` class

### Rules

- **Never** hardcode light/dark colors in component classes (e.g., don't use `text-gray-900 dark:text-gray-100`)
- Always use semantic tokens: `text-foreground`, `bg-card`, `border-border`, etc.
- Exception: status/brand colors like `text-emerald-400`, `bg-amber-500/10` work in both modes because they use fixed opacity

---

## 32. TypeScript Conventions

### Strict optional properties

`exactOptionalPropertyTypes: true` is enabled. You cannot assign `undefined` to optional properties.

```tsx
// BAD — TypeScript error
const options: Options = { foo: condition ? value : undefined };

// GOOD — spread pattern
const options: Options = {
  ...(condition ? { foo: value } : {}),
};

// GOOD — destructure to remove
const { unwantedProp, ...rest } = original;
```

### Radix UI Checkbox

Use `onCheckedChange` instead of `onChange`:

```tsx
// BAD
<Checkbox onChange={handler} />

// GOOD
<Checkbox onCheckedChange={handler} />
```

### Component patterns

- Use named exports (not default exports) for page components
- Use `cn()` from `@/lib/utils` for conditional class merging
- Import types with `import type { ... }` when possible

---

## Quick Reference Cheat Sheet

```
Page wrapper:     flex flex-col gap-6 p-4 sm:p-6 lg:p-8 pb-32 max-w-[1600px] mx-auto w-full
Title:            font-heading text-xl sm:text-2xl font-bold text-foreground tracking-tight leading-none
Description:      text-sm text-muted-foreground mt-1 font-description
Filter control:   h-9 text-xs
Filter icon:      h-3.5 w-3.5
Card grid (6):    grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3
Card padding:     p-3 sm:p-4
Card label:       text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider font-heading text-muted-foreground
Card value:       text-xl sm:text-2xl lg:text-3xl font-bold font-mono tracking-tight text-foreground
Table wrapper:    rounded-xl border bg-card overflow-hidden
Table header:     border-b bg-muted/30
Table th:         px-3 py-3 text-left text-[10px] font-semibold uppercase tracking-wider font-heading text-muted-foreground
Row hover:        cursor-pointer transition-colors hover:bg-muted/50
Badge:            inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold font-heading
Avatar:           rounded-full bg-gradient-to-br from-primary/80 to-violet-600/80 ring-2 ring-background
Empty state:      flex flex-col items-center justify-center py-16 px-4 text-center
Skeleton card:    h-[120px] rounded-xl
Pagination:       flex items-center justify-between px-4 py-3 border-t
```
