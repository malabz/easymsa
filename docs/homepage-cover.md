# Alignment cover and selected B icon

Local revision, 2026-10-04. No push, publication, backend change or task execution.

- B (conserved column) has been reconstructed as a transparent SVG with regularized geometry and exact #0F766E. Used by the site header and favicon. Source attribution is in public/brand/README.md.
- The cover shows the MSA heading, one-sentence introduction, five illustrative nucleotide rows and a scroll-down action. Its minimum height is the viewport minus the existing navigation.
- The video player is removed from the cover. The latest requested revision adds Start analysis and Explore example buttons below the introduction, describes large-scale DNA / RNA datasets in both languages, and highlights the scroll-down action in green. Scrolling reaches the original workflow. Existing workflow, methods and footer components remain unchanged.
- An 8-second CSS animation brings nucleotide positions into alignment and highlights a shared column, with 180ms stagger between rows. A/C/G/T use muted teal, blue-gray, ochre and mauve. Gaps appear without changing sequence characters. Pause control is available; offscreen/background animation pauses. Following the user's request for visible movement, reduced-motion environments retain the same motion at a gentler 12-second pace.
- Old video source assets remain archived but are no longer imported or requested by the homepage.
- Browser inspection: desktop 1440 × 900 and mobile 390 × 844 show the next section beginning below the viewport, no video elements and no horizontal overflow. Scroll-down focuses the workflow, and offscreen animation is paused.
- Local evidence: C:/mnt/d/code/easymsa-cover-final/desktop-zh.png and mobile-zh.png. Production build includes TypeScript validation. No new automated test suite was added or run in this revision.

## Motion repair

The global reduced-motion rule in index.css set all animation durations to 0.01ms and iteration counts to one using !important. The previous cover-specific 12-second declaration therefore never took effect. Computed browser styles confirmed a duration of 1e-05s and one iteration, despite animation-play-state reporting running.

The cover now overrides both important declarations only for `.alignment-animation .alignment-base` in the reduced-motion media query. Other site animations retain their existing accessibility behavior. Verified actual changing cell positions in the browser, a 12s/infinite computed cycle, and manual pause. Build passed. Evidence: motion-fixed-1.png and motion-fixed-2.png under C:/mnt/d/code/easymsa-cover-final.

## Cover entry points

Production build passed after the entry-point update. Browser inspection confirmed links to #/submit and #/examples/alignment-small, the green workflow action, and a running animation. Screenshot: C:/mnt/d/code/easymsa-cover-final/home-entries.png. This revision remains local.
