# BrandGuard AI — Implementation Plan & System Architecture

## 1. Executive Summary & Problem Alignment
**BrandGuard AI** is a production-quality, enterprise-grade brand governance platform built for **Inkloom AI**. It solves the critical bottleneck in high-velocity marketing teams: auditing multi-channel content (ad copy, launch announcements, press releases, landing pages, and visual creatives) against strict brand guidelines, deterministic terminology rules, and factual enterprise specs.

Unlike superficial grammar checkers or black-box LLM prompts, BrandGuard implements a **traceable, multi-tiered compliance pipeline**:
1. **Deterministic Rule Engine**: High-precision zero-latency regex, banned terms, preferred replacements, and required disclaimers.
2. **Semantic Knowledge Base (RAG)**: Document chunking, embeddings with `all-MiniLM-L6-v2`, and cosine similarity retrieval over PostgreSQL `pgvector`.
3. **AI Claim Verifier & Tone Analyzer**: Evidence-grounded claim analysis classifying every claim into explicit states:
   - `Supported by retrieved evidence`
   - `Contradicted by retrieved evidence`
   - `Unsupported by available evidence`
   - `Uncertain or ambiguous`
4. **Visual Compliance Engine**: Multiscale OpenCV template matching for brand logos, dominant color extraction via K-means clustering, and delta-E color distance against approved brand palettes.
5. **AI Fix Generator**: Intent-preserving, one-click replacement suggestions with inline character span replacement.
6. **Immutable Audit Trail & Intelligence**: SOC 2 compliance activity logging, reviewer decision telemetry, and ambiguous rule drift detection.

---

## 2. Design System — Mandatory Pastel Palette Migration

Per the Inkloom specification and provided palette swatch, the application is migrating completely away from the previous dark purple/black theme to a **sophisticated, light enterprise pastel design system**:

### Primary Pastel Palette
- **Periwinkle Blue**: `#819DCC` (Primary brand accent, interactive elements, verified badges)
- **Mist Blue**: `#9CC1D4` (Secondary actions, info badges, subtle borders)
- **Soft Mint**: `#D4E9E0` / `#AEE1D4` (Success states, accepted fixes, clean approvals)
- **Dusty Pink**: `#E9C2D4` (High-severity warnings, critical violations, flagged spans)
- **Soft Rose**: `#F3DCE7` (Medium warnings, unverified pills, subtle alerts)

### Surface & Typography Tokens
- **Main Background**: `#F6F7FA`
- **Card / Surface Background**: `#FFFFFF`
- **Main Text**: `#202838` (High contrast, accessible WCAG AA/AAA)
- **Secondary Text**: `#465166`
- **Border / Divider**: `#E3E7EF`
- **Card Shadow**: `0 2px 12px rgba(32, 40, 56, 0.05), 0 1px 2px rgba(32, 40, 56, 0.08)`

---

## 3. Technology Stack & Component Boundaries

### Frontend (Next.js 16 + React 19 + TypeScript)
- **Framework**: Next.js 16 App Router with Turbopack
- **Styling**: Tailwind CSS + Custom CSS Variables matching the 5-color pastel tokens
- **Icons**: Lucide React (`lucide-react`)
- **Animation**: Framer Motion (`framer-motion`) with `prefers-reduced-motion` safety
- **Routing**:
  - `/`: Command Center Dashboard (KPIs, active review queue, compliance stats)
  - `/submit`: Multi-mode Submission (Text editor, PDF/DOCX/PNG upload, 3 instant test presets)
  - `/review/[id]`: Interactive Review Workspace (Inline text highlights, side-by-side diff, claim evidence drawer, one-click fix applicator, bounding box vision overlay, force approval, comment log)
  - `/knowledge`: Single Source of Truth (Guideline upload, chunk viewer, live vector search tester, rule builder)
  - `/visual`: Visual Brand Asset Library (Logo registry, hex color palette builder, contrast guidelines)
  - `/audit`: Immutable Governance Timeline (Action stream, user attribution, filtering)
  - `/insights`: Compliance Intelligence (AI precision, false positive rate, ambiguous rule drift)

### Backend (Python FastAPI + PostgreSQL pgvector)
- **API Framework**: FastAPI with Pydantic v2 schemas
- **Database**: PostgreSQL with `pgvector` extension (Neon serverless direct connection)
- **ORM**: SQLAlchemy 2.0 with connection pooling
- **AI / LLM Integration**: OpenAI-compatible client configured for Groq / fast inference endpoints
- **Embeddings**: `sentence-transformers` (`all-MiniLM-L6-v2`) generating 384-dimensional normalized vectors
- **Document Extractors**: PyMuPDF (`fitz`) for PDF page extraction, `python-docx` for Word documents
- **Vision Pipeline**: OpenCV (`cv2`) for multiscale template matching and K-means dominant color extraction, `pytesseract` for OCR text extraction

---

## 4. Current State Audit & Remediation Plan

| Module | Current State | Defect / Gap Identified | Required Remediation |
|---|---|---|---|
| **Theme & Aesthetics** | Dark violet / black theme | Conflicts with mandatory 5-color pastel design system | Replace global CSS variables and all component inline styles with the pastel palette tokens (`#F6F7FA`, `#819DCC`, etc.). |
| **Pipeline Visualization** | Static loading text | No visual stage-by-stage animated progress | Implement Framer Motion 9-stage animated pipeline stepper component. |
| **Claim Verification** | Basic claim finding | Needs explicit 4-state classification (`Supported`, `Contradicted`, `Unsupported`, `Uncertain`) | Update `rag_judge.py` prompt & schemas to return explicit verification states and evidence citations. |
| **Inline Highlight / Diff** | Basic text tab and diff tab | Can be streamlined with side-by-side comparison and editable draft | Provide split view with inline highlights on original copy and live editable draft with accepted fixes. |
| **Visual Checks** | Basic logo/palette endpoints | UI needs clean pastel swatches, logo upload preview, and explicit limitations | Add full color swatch cards, logo previews, and clear OpenCV detection badges. |
| **Automated Tests** | No automated test runner configured | Pytest was not installed in venv | Install pytest, write full test suite for rules, RAG, claim verification, endpoints, and validation. |

---

## 5. Phased Execution Roadmap

1. **Phase 1: Design Tokens & Global Pastel System**: Overhaul `globals.css` with semantic pastel CSS variables, update `Nav.tsx`, `Badges.tsx`, and card containers.
2. **Phase 2: Animated Pipeline & Core Review Workflow**: Build `PipelineProgress.tsx` with Framer Motion, update `review/[id]/page.tsx` with explicit claim states, side-by-side diff, and interactive fix application.
3. **Phase 3: Claim Verification & RAG Hardening**: Standardize `rag_judge.py` to output explicit verification states (`Supported`, `Contradicted`, `Unsupported`, `Uncertain`).
4. **Phase 4: Visual Asset Governance**: Modernize `visual/page.tsx` with pastel palettes, hex validators, and OpenCV template match displays.
5. **Phase 5: Knowledge Base & Audit Streamline**: Modernize `knowledge/page.tsx`, `audit/page.tsx`, and `insights/page.tsx` with Lucide icons, pastel chart bars, and filters.
6. **Phase 6: Automated Testing & Verification**: Write and run pytest test suite covering rule engine, vector retrieval, claim states, and API endpoints.
7. **Phase 7: Documentation & Startup Delivery**: Update `README.md` with complete installation commands, architecture diagrams, and acceptance testing results.
