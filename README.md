# VESTIGE — digital archive

Next.js App Router with the existing GSAP / ScrollTrigger newspaper, object and magazine journey. The original photographs and frame sequences are retained.

## Architecture

- `lib/objects.mjs`: six object records, image paths, descriptive observations, curator notes, material groups, archive counts, discovery and saved-memory validation.
- `app/components/ArchiveExperience.jsx`: editorial collection, dynamic index, selected study, local object memory, random discovery and magazine entry.
- `app/components/ObjectStudy.jsx`: passport, keyboard/touch material lens, light surrounds, visible structure annotations and curator note.
- `app/page.jsx`: existing cinematic journey, collection entry points, archive continuation and native catalog dialog.
- `app/archive.css`: scoped editorial archive styles and an unpinned reduced-motion alternative.
- `app/CinematicPreloader.jsx`: supplied MP4, real-time thin progress line, readiness gate, session flag, scroll lock and failure deadline.

The long introduction uses `sessionStorage` (`vestige-preloader-seen`). Studied objects use `localStorage` (`vestige-studied`). Both tolerate unavailable storage. Opening a study marks it studied; it is not a wishlist. The dialog uses native Escape, focus containment and focus restoration.

## Asset accuracy

Object records describe the supplied imagery and existing collection copy. Maker, age, provenance and dimensions remain unrecorded. Material groups are descriptive, not certificates. No scale scene is fabricated.

Light Study changes the photographic surround, not the product pixels. True relighting needs additional photographs or a calibrated 3D asset. Structure annotates visible regions; it is not an X-ray and does not claim to reveal internal construction. A physically accurate exploded view needs separately masked components or 3D source assets. The archive history describes digital documentation, not an invented ownership history.

Ascend retains `/products/ascend.png` and the existing `magazine-ending` frame sequence. No product substitution, media regeneration, or video conversion is performed.

## Commands

- `npm run dev`: preview on port 3001.
- `npm run build`: production static export in `out`; preloader retained in `out/videos`.
- `npm test`: archive-data and existing journey tests.
- `node --experimental-test-isolation=none --test tests/*.test.mjs`: tests when the environment blocks worker processes.
- `node scripts/verify-assets.mjs`: existing frame asset checks.

## Manual checks

Fresh session: muted video, 2px progress line, inert page and scroll lock, completion/fade/unlock. Reload: session skip. Reduced motion: no intro playback or pinned canvas journey. Inspect every object; use lens by pointer, touch drag and arrow keys. Switch light surrounds and structure annotations. Verify studied markers after reopen, discovery selection, Escape and focus return. Enter Archive from Ascend and scrub forward/back through the original magazine. Check portrait/landscape without horizontal overflow.
