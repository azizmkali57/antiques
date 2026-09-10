# VESTIGE

Next.js App Router, GSAP ScrollTrigger, and Framer Motion for catalog hover interactions.

## Current journey

1. The supplied gold-sculpture transition opening (`gold-intro`).
2. Rotating gold sculpture with left and right editorial descriptions (`gold-hero`).
3. Six-image horizontal collection, ending with the supplied Ascend image.
4. A fixed image clone morphs from the final card into the closing scene.
5. Closing gold animation (`gold-ending`), followed by a scroll-driven catalog overlay on its held final frame.

Each stage has its own scroll range. Videos use canvas frame sequences; scrolling reverses their progress. No autoplay drives the scenes.

## Assets and commands

The current site uses 720 WebP frames in three folders under `public/frames`, and six PNG images under `public/products`. Old unused images and sequences were removed. Original user files in Downloads are unchanged.

- `npm run dev`: local preview.
- `npm run build`: static export to `out`.
- `node scripts/verify-assets.mjs`: verify all active frame dimensions and numbering.
- `node scripts/extract-frames.mjs [source-directory]`: regenerate missing sequences, defaulting to Downloads. Source filenames are listed in `lib/assets.mjs`.

Completed frame sequences are retained during extraction. `lib/journey.mjs` and its tests document the previous archive prototype; the current page uses `app/page.jsx`.
