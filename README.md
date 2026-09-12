# VESTIGE

Next.js App Router, GSAP ScrollTrigger, and Framer Motion for catalog hover interactions.

## Current journey

1. The newspaper reveal from `hero image.mp4` (`hero-journey`).
2. The same continuous video reveals a silver-toned sculpture with bronze-colored triangular forms and left/right descriptions. The two chapters share 76 frames across the full 17.66-second clip, including its first and last frames.
3. Six-image horizontal collection, ending with the supplied Ascend image.
4. A fixed image clone morphs from the final card into the closing scene.
5. Closing gold animation (`gold-ending`), followed by a scroll-driven catalog overlay on its held final frame.

Each stage has its own scroll range. Videos use canvas frame sequences; scrolling reverses their progress. No autoplay drives the scenes.

## Assets and commands

The current site uses 148 WebP frames: 76 native-resolution 848×478 opening frames and 72 closing frames. Six PNG images remain under `public/products`. The superseded opening sequences were removed; original user videos in Downloads are unchanged. The opening uses one preload queue and one canvas with a bounded decoded cache.

- `npm run dev`: local preview.
- `npm run build`: static export to `out`.
- `node scripts/verify-assets.mjs`: verify all active frame dimensions and numbering.
- `node scripts/extract-frames.mjs [source-directory]`: regenerate missing sequences, defaulting to Downloads. Source filenames are listed in `lib/assets.mjs`.

Completed frame sequences are retained during extraction. `lib/journey.mjs` and its tests document the previous archive prototype; the current page uses `app/page.jsx`.
