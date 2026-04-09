---
# ===== IDENTITY =====
project: xSuite
codename: null
brand_name: xSuite
parent_company: Flowza AI
codebase: "C:/Users/SPACELAB/Documents/GitHub/Space_Recovery"
vault_path: null

# ===== LIFECYCLE =====
stage: seed
created: 2026-04-09
last_updated: 2026-04-09
last_audit: null

# ===== BUSINESS CONTEXT =====
business_type: saas
industry: data recovery
target_audience: "Independent and mid-size data recovery labs needing a full ERP + CRM — job tracking, inventory, customer management, invoicing"

# ===== POSITIONING (Dunford Framework) =====
positioning:
  status: not_started
  confidence: {}
  competitive_alternatives: []
  unique_attributes: []
  value: []
  best_fit_customers: []
  market_category: null
  onlyness_statement: null
  positioning_statement: null

# ===== MESSAGING (Miller StoryBrand) =====
messaging:
  status: not_started
  brandscript:
    character: null
    problem:
      villain: null
      external: null
      internal: null
      philosophical: null
    guide:
      empathy: null
      authority: null
    plan: []
    cta:
      direct: null
      transitional: null
    success: null
    failure: null
    transformation: null
  tagline: null
  trueline: null
  elevator_pitch: null

# ===== VOICE (NN/g + Aaker + Jung) =====
voice:
  status: not_started
  dimensions:
    funny_serious: null
    formal_casual: null
    respectful_irreverent: null
    enthusiastic_matter_of_fact: null
  personality: null
  personality_secondary: null
  archetype: null
  sounds_like: []
  not_like: []
  vocabulary:
    use: []
    avoid: []
  examples:
    on_brand: []
    off_brand: []

# ===== VISUAL IDENTITY (Chris Do Stylescapes) =====
visual:
  status: not_started
  chosen_direction: null
  directions: []
  colors:
    primary: null
    secondary: null
    accent: null
    neutrals: []
    palette_rationale: null
  typography:
    heading: null
    body: null
    mono: null
    pairing_rationale: null
  imagery_style: null
  icon_style: null
  logo_direction: null

# ===== EXISTING DESIGN SYSTEM (pre-brand-toolkit) =====
# Captured here so positioning/visual skills can reference what's already built
existing_design:
  palette:
    background: "#0f172a"  # Dark navy (slate-900 range)
    accents: "teal/emerald"
  typography:
    heading: "Syne"
    body: "DM Sans"
  style: "Glassmorphism cards, dark theme"
  icons: "lucide-react"
  formalized: false

# ===== ASSET INVENTORY =====
assets:
  existing:
    - type: css_theme
      location: "Tailwind config + component styles"
      intentionality: 3
      consistency: 3
      quality: 4
      notes: "Dark navy + teal/emerald, glassmorphism. Functional but not strategy-driven."
    - type: fonts
      location: "Syne (headings), DM Sans (body)"
      intentionality: 3
      consistency: 4
      quality: 4
      notes: "Good pairing. Syne is distinctive for headings."
    - type: colors
      location: "Tailwind classes throughout components"
      intentionality: 2
      consistency: 3
      quality: 3
      notes: "Dark navy base with teal/emerald accents. No formalized palette or token system."
  gaps:
    - type: brand_guide
      priority: critical
      recommendation: "Formalize brand guidelines through positioning → visual pipeline"
    - type: logo
      priority: critical
      recommendation: "No logo direction established yet"
    - type: tagline
      priority: important
      recommendation: "Needs positioning and messaging work first"
  inconsistencies: []

# ===== INTELLIGENCE =====
intelligence:
  competitors: []
  inspiration: []
  last_scan: null
---

## Brand Story

xSuite is an AI-powered, multi-tenant SaaS platform built by Flowza AI for the data recovery industry. It's a full ERP + CRM system managing cases, devices, clients, finances, inventory, HR, and supplier relationships for data recovery labs.

The first customer deployment is Space Recovery. The product targets independent and mid-size data recovery labs that currently cobble together spreadsheets, generic CRMs, and manual processes to run their operations.

The existing UI was built function-first — dark navy aesthetic with glassmorphism, Syne headings, DM Sans body text, lucide-react icons. It works well but wasn't driven by brand strategy. This brand-toolkit process will either validate or evolve these choices.

## Decision Log

### 2026-04-09 - Brand brief created
Initialized brand-brief.md via brand-toolkit:start. Captured existing design system state. Beginning brand formalization process starting with positioning.

## Notes

- Space Recovery is the first customer/deployment, not the product brand
- xSuite is the product; Flowza AI is the parent company
- Existing design decisions (dark navy, Syne, glassmorphism) should be evaluated during visual identity phase — they may be validated by strategy or may need evolution
- CLAUDE.md notes: "Do not use purple/indigo/violet color schemes in UI" — this is a known constraint
