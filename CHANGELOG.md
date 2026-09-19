# Changelog

All notable project versions are recorded here. GitHub is the canonical delivery surface for project artifacts.

## [0.4.0] - 2026-09-19

### Added

- Generalized product contract `CatalogItem` covering physical goods, menu items, services, digital goods and offline experiences, with business lifecycle separated from marketing readiness.
- `trendfit/brand_assets.py` deterministic validation for Brand, CatalogItem, Variant, Availability, Claim, EvidenceRef, OnboardingBatch and BrandAssetSnapshot, including immutable snapshots with content hashes.
- Cross-category synthetic samples for Petlibro, Nayuki and BreezeCare; Python and browser-side contract tests.
- Brand asset workspace at `/brand-assets`: product search and combined filters, readiness dashboard, master-detail asset view, Claim management, evidence lineage with page and row locators, and version snapshots.
- Explainable selection at `/selection-tasks`: deterministic hard-rule filtering followed by transparent candidate ranking, explicit non-selection reasons, deterministic selection snapshot keys, and empty results instead of rule-bypassing recommendations.
- Unified workspace shell: four top-level entries (热点雷达 / 品牌中心 / 决策中心 / 反馈入口), shared brand context across pages via URL parameters and local persistence, and cross-page links that prevent cross-brand mix-ups.
- Dual brief paths: brand-led briefs that may proceed without a matching product but must bind brand and topic versions, and product-led briefs gated by a valid selection snapshot.

### Changed

- Frontend package version advanced from 0.3.0 to 0.4.0.
- `web/vite.config.ts` sets `inspectorPort: false` so the local dev server can start under the macOS sandbox.
- Product changes now require an approved product-framework PRD before implementation.

### Notes

- The website remains a local human-in-the-loop workspace on synthetic data. Brand file parsing, live source collection, online model assessment, accounts, cloud storage and public deployment are still outside this release.
- Selection scores are rule-match degrees, not CTR, CVR, GMV or ROI predictions.

## [0.3.1] - 2026-09-06

- Completed vibe-coding STEP 05 with a code-derived architecture explanation, tradeoffs, technical lessons, risks, redesign notes, five-minute interview script, and common interview questions.
- Replaced the outdated roadmap with a prioritized v0.4.0–v0.8.0 delivery plan covering PDF/PPT brand onboarding, real source adapters, topic clustering and freshness, multimodal understanding, online assessment, evaluation, cloud collaboration, and campaign learning.
- Recommended v0.4.0 brand onboarding as the next vertical slice; no future product capability is represented as already implemented.

## [0.3.0] - 2026-09-06

### Added

- Local Radar Room website with topic browsing, search and filters, brand switching, evidence details, and Brief workbench.
- Editable brand and Brief copies, guarded unsaved navigation, append-only human feedback, export, and browser-local persistence.
- Versioned public website bundle with full source coverage, explicit synthetic and calendar states, content hashes, and browser-side validation.
- Frontend contract tests, Python risk tests, production build checks, responsive browser QA, and CI coverage.

### Changed

- Completed vibe-coding STEP 04 and advanced the project from website architecture to a functional local MVP.
- Kept live collection, online model generation, accounts, cloud storage, and public deployment outside this release.

## [0.2.7] - 2026-09-06

- Confirmed Radar Room (B) as the website visual direction.
- Added STEP 03 architecture, PRD-to-page mapping, state and data gap analysis, future collection boundary, and five build checkpoints.
- Added durable project memory; website implementation awaits STEP 04 confirmation.
- No production website code or live data services added.

## [0.2.6] - 2026-09-06

### Added

- Three visibly distinct, responsive landing-page explorations: Signal Editorial, Radar Room, and Cultural Atlas.
- Static comparison hub and a Chinese design rationale covering benefits, risks, and application fit.

### Changed

- Recommended Signal Editorial as the primary direction for the interview demo.
- Paused before architecture and v0.3.0 implementation pending explicit visual confirmation.

## [0.2.5] - 2026-09-06

### Added

- Review-ready Chinese PRD for the v0.3.0 web demo.
- Five-page information architecture, interview demo story, data mapping, interaction rules, priorities, and acceptance criteria.
- Explicit review choices for default brand, advertiser input, language, visual direction, Brief operations, and deployment.

### Changed

- Gated v0.3.0 implementation on user approval of the PRD.

## [0.2.4] - 2026-09-06

### Added

- Stable frontend views for brands, trends, opportunities, Briefs, feedback, and validation.
- Deterministic view generator with manifest hashes and source-run lineage.
- Append-only human feedback contract that cannot overwrite model decisions.
- Checked-in web-demo fixtures and five focused view-data tests.

### Changed

- Completed the public Phase 2 Agent-core data bridge and set v0.3.0 web demo as the next milestone.

## [0.2.3] - 2026-09-06

### Added

- China-market cross-brand run with Petlibro and Nayuki over one shared synthetic trend pool.
- Reusable advertiser profile, brand-independent topic, assessment matrix, and Brief contracts.
- Validator and six tests for cross-category coverage, version lineage, rejected ideas, and unverified trends.
- Documentation of how the private 2025 Naisnow strategy deck informed hypotheses without publishing personal data or treating the French plan as current China-market fact.

### Changed

- Set v0.2.4 view-data and feedback contracts as the bridge to the v0.3.0 web demo.

## [0.2.2] - 2026-09-06

### Added

- Product roadmap from the current Agent-core stage to a clickable web demo and live source integration.
- Phase 2 definition, six components to standardize, and cross-brand acceptance criteria.
- Five-page demo concept centered on switching advertisers over a shared trend pool.

### Changed

- Separated the product roadmap into decision foundation, Agent core, web demo, and live-operation stages.
- Set v0.2.3 cross-brand demonstration as the next implementation milestone.

## [0.2.1] - 2026-09-06

### Added

- High-level marketing trend discovery Agent workflow that starts from a replaceable advertiser profile.
- Three independent signal layers: broad culture, category and usage occasions, and brand-adjacent conversations.
- Source-role framework derived from the existing creator anchors without hard-coding individual accounts.

### Changed

- Reframed Phase 2 as a cross-brand capability architecture before detailed collectors and task steps.
- Moved account lists, batch sizes, multimodal implementation details, and scheduling into later iterations.

## [0.2.0] - 2026-09-06

### Added

- Phase 2 workflow blueprint for active trend discovery, multimodal evidence processing, topic clustering, freshness verification, and human review.
- Versioned delivery plan from v0.2.1 discovery batches through v0.2.4 end-to-end review runs.

### Changed

- Defined GitHub commits and version entries as the required delivery record for future project outputs.

## [0.1.0] - 2026-09-04

### Added

- Public synthetic Petlibro demo.
- Evidence normalization and deterministic lineage gates.
- Unit tests and GitHub Actions workflow.
- Product capability blueprint and portfolio description.
