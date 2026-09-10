'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';

const products = [
  ['Infinite reflection', 'Polished steel. A study in repetition.'],
  ['Intersect', 'Weathered planes meet mirrored steel.'],
  ['Golden ratio', 'Brushed brass, reflected inward.'],
  ['Equilibrium', 'A quiet balance of mass and space.'],
  ['Cadence', 'A rhythm of light and silver.'],
  ['Ascend', 'Stepped gold forms on stitched leather.']
];

const chapters = ['The opening', 'The object', 'The collection', 'A closer look', 'The next discovery'];

export default function Home() {
  const root = useRef();
  const newspaper = useRef();
  const hero = useRef();
  const ending = useRef();
  const strip = useRef();
  const clone = useRef();
  const finalImage = useRef();
  const dialog = useRef();

  // Shared in-memory frame cache
  const introBlobsRef = useRef(new Map());
  const heroBlobsRef = useRef(new Map());
  const drawPaperRef = useRef(null);

  const [chapter, setChapter] = useState(0);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState(false);

  // Reference editorial preloader state
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isPreloaderVisible, setIsPreloaderVisible] = useState(true);
  const [isDismissing, setIsDismissing] = useState(false);

  // Preload and cache frames before revealing site
  useEffect(() => {
    let disposed = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    const totalIntro = 72;
    const indices = Array.from({ length: totalIntro }, (_, i) => i);
    let cursor = 0;
    let loaded = 0;
    const concurrency = 6;

    async function worker() {
      while (cursor < indices.length && !disposed) {
        const idx = indices[cursor++];
        try {
          const r = await fetch(`/frames/gold-intro/${String(idx + 1).padStart(4, '0')}.webp`);
          if (r.ok) {
            const blob = await r.blob();
            if (!disposed) {
              introBlobsRef.current.set(idx, blob);
              if (idx === 0 && drawPaperRef.current) {
                drawPaperRef.current(0);
              }
            }
          }
        } catch (err) {
          console.warn('Frame fetch warning:', idx, err);
        } finally {
          if (!disposed) {
            loaded++;
            const pct = Math.min(100, Math.round((loaded / totalIntro) * 100));
            setLoadingProgress(pct);
          }
        }
      }
    }

    Promise.all(Array.from({ length: concurrency }, () => worker())).then(() => {
      if (disposed) return;
      setLoadingProgress(100);
      if (drawPaperRef.current) {
        drawPaperRef.current(0);
      }

      // Warm up Chapter 2 (gold-hero) in the background
      let heroCursor = 0;
      const heroIndices = Array.from({ length: 72 }, (_, i) => i);
      async function heroWorker() {
        while (heroCursor < heroIndices.length && !disposed) {
          const hIdx = heroIndices[heroCursor++];
          try {
            const r = await fetch(`/frames/gold-hero/${String(hIdx + 1).padStart(4, '0')}.webp`);
            if (r.ok) {
              const b = await r.blob();
              if (!disposed) heroBlobsRef.current.set(hIdx, b);
            }
          } catch (_) {}
        }
      }
      Array.from({ length: 4 }, () => heroWorker());

      // Hold 100% briefly, then smoothly dissolve preloader
      setTimeout(() => {
        if (disposed) return;
        setIsDismissing(true);
        setTimeout(() => {
          if (disposed) return;
          setIsPreloaderVisible(false);
          if (typeof document !== 'undefined') {
            document.body.style.overflow = '';
          }
          ScrollTrigger.refresh();
          if (drawPaperRef.current) {
            drawPaperRef.current(0);
          }
        }, 750);
      }, 350);
    });

    return () => {
      disposed = true;
      if (typeof document !== 'undefined') {
        document.body.style.overflow = '';
      }
    };
  }, []);

  // GSAP scroll and canvas setup
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    let disposed = false;
    const cleanup = [];

    function sequence(canvas, slug, totalFrames = 72, externalBlobs = null) {
      const blobs = externalBlobs || new Map();
      const cache = new Map();
      const pending = new Set();
      let target = 0;
      let busy = 0;
      let next = 0;

      const paint = () => {
        let img = cache.get(target);
        if (!img) {
          for (let d = 1; d < totalFrames; d++) {
            if (target - d >= 0 && cache.has(target - d)) {
              img = cache.get(target - d);
              break;
            }
            if (target + d < totalFrames && cache.has(target + d)) {
              img = cache.get(target + d);
              break;
            }
          }
        }
        if (!img || disposed || !canvas) return;
        const dpr = Math.min(devicePixelRatio, 1.5);
        const w = Math.round(innerWidth * dpr);
        const h = Math.round(innerHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const imgW = img.width || 1920;
        const imgH = img.height || 1080;
        const ratio = Math.max(w / imgW, h / imgH);
        canvas.getContext('2d').drawImage(
          img,
          (w - imgW * ratio) / 2,
          (h - imgH * ratio) / 2,
          imgW * ratio,
          imgH * ratio
        );
      };

      async function decode(n) {
        if (n < 0 || n >= totalFrames || cache.has(n) || pending.has(n) || !blobs.has(n) || disposed) return;
        pending.add(n);
        try {
          const img = await createImageBitmap(blobs.get(n));
          if (disposed) {
            img.close();
            return;
          }
          cache.set(n, img);
          while (cache.size > 72) {
            const k = cache.keys().next().value;
            cache.get(k).close();
            cache.delete(k);
          }
          paint();
        } catch (e) {
          console.warn(`Frame decode failed: ${slug}/${n}`, e);
        } finally {
          pending.delete(n);
        }
      }

      async function fetchFrame(n) {
        if (n >= totalFrames || disposed) return;
        if (blobs.has(n)) {
          if (Math.abs(n - target) < 3) decode(n);
          return;
        }
        busy++;
        try {
          const r = await fetch(`/frames/${slug}/${String(n + 1).padStart(4, '0')}.webp`);
          if (!r.ok) return;
          const blob = await r.blob();
          if (disposed) return;
          blobs.set(n, blob);
          if (Math.abs(n - target) < 3) decode(n);
        } catch (e) {
          console.warn(`Frame fetch skipped: ${slug}/${n}`);
        } finally {
          busy--;
          pump();
        }
      }

      function pump() {
        while (busy < 4 && next < totalFrames && !disposed) {
          fetchFrame(next++);
        }
      }

      const render = p => {
        target = Math.floor(Math.max(0, Math.min(1, p)) * (totalFrames - 1));
        decode(target);
        paint();
        for (let d = 1; d < 3; d++) {
          decode(target + d);
          decode(target - d);
        }
      };

      pump();
      if (blobs.has(0)) {
        decode(0);
      }
      cleanup.push(() => {
        cache.forEach(i => i.close());
      });
      return render;
    }

    const drawPaper = sequence(newspaper.current, 'gold-intro', 72, introBlobsRef.current);
    drawPaperRef.current = drawPaper;
    const drawHero = sequence(hero.current, 'gold-hero', 72, heroBlobsRef.current);
    const drawEnd = sequence(ending.current, 'gold-ending', 72);

    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray('.scroll-scene');
      const distance = [240, 280, 350, 170, 330];

      function state(i) {
        setChapter(i);
        gsap.set('.newspaper-layer', { visibility: i === 0 ? 'visible' : 'hidden' });
        gsap.set('.hero-layer', { visibility: i <= 1 ? 'visible' : 'hidden' });
        gsap.set('.shopping-layer', { visibility: i <= 3 ? 'visible' : 'hidden' });
        gsap.set('.ending-layer', { visibility: i === 4 ? 'visible' : 'hidden' });
        gsap.set(clone.current, { visibility: i === 3 ? 'visible' : 'hidden' });
        gsap.set('.morph-backdrop,.handoff-frame', { visibility: i === 3 ? 'visible' : 'hidden' });
      }

      const triggers = sections.map((section, i) =>
        ScrollTrigger.create({
          trigger: section,
          start: 'top top',
          end: () => `+=${innerHeight * distance[i] / 100}`,
          pin: true,
          pinSpacing: true,
          invalidateOnRefresh: true,
          onEnter: () => state(i),
          onEnterBack: () => state(i)
        })
      );

      const nf = { p: 0 };
      gsap.timeline({
        scrollTrigger: {
          trigger: sections[0],
          start: () => triggers[0].start,
          end: () => triggers[0].end,
          scrub: true
        }
      })
        .to(nf, { p: 1, duration: 0.88, ease: 'none', onUpdate: () => drawPaper(nf.p) }, 0)
        .to('.intro', { opacity: 0, y: -35, duration: 0.22 }, 0)
        .to('.newspaper-layer', { opacity: 0, duration: 0.12 }, 0.88);

      const hf = { p: 0 };
      gsap.timeline({
        scrollTrigger: {
          trigger: sections[1],
          start: () => triggers[1].start,
          end: () => triggers[1].end,
          scrub: true
        }
      })
        .to(hf, { p: 1, duration: 0.88, ease: 'none', onUpdate: () => drawHero(hf.p) }, 0)
        .fromTo('.object-note', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.13, stagger: 0.035 }, 0)
        .to('.hero-layer', { opacity: 0, duration: 0.12 }, 0.88);

      const travel = () => {
        const card = strip.current?.lastElementChild;
        if (!card) return 0;
        return innerWidth / 2 - (card.offsetLeft + card.offsetWidth / 2);
      };

      gsap.to(strip.current, {
        x: travel,
        ease: 'none',
        scrollTrigger: {
          trigger: sections[2],
          start: () => triggers[2].start,
          end: () => triggers[2].end,
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      gsap.to('.product-card:not(:last-child)', {
        opacity: 0.28,
        filter: 'grayscale(1)',
        scrollTrigger: {
          trigger: sections[2],
          start: () => triggers[2].start + (triggers[2].end - triggers[2].start) * 0.75,
          end: () => triggers[2].end,
          scrub: true
        }
      });

      gsap.fromTo(
        '.product-card:last-child',
        { scale: 0.96 },
        {
          scale: 1,
          scrollTrigger: {
            trigger: sections[2],
            start: () => triggers[2].start + (triggers[2].end - triggers[2].start) * 0.75,
            end: () => triggers[2].end,
            scrub: true
          }
        }
      );

      let startRect;
      function measure() {
        const card = strip.current?.lastElementChild;
        if (!card || !finalImage.current) return;
        const oldScale = gsap.getProperty(card, 'scale');
        const oldX = gsap.getProperty(strip.current, 'x');
        gsap.set(card, { scale: 1 });
        gsap.set(strip.current, { x: travel() });
        startRect = finalImage.current.getBoundingClientRect();
        gsap.set(strip.current, { x: oldX });
        gsap.set(card, { scale: oldScale });
      }
      measure();

      const size = () => 800 * Math.max(innerWidth / 1920, innerHeight / 1080);

      gsap.timeline({
        scrollTrigger: {
          trigger: sections[3],
          start: () => triggers[3].start,
          end: () => triggers[3].end,
          scrub: true,
          invalidateOnRefresh: true,
          onRefreshInit: measure
        }
      })
        .fromTo(
          clone.current,
          {
            x: () => startRect?.x || 0,
            y: () => startRect?.y || 0,
            width: () => startRect?.width || 0,
            height: () => startRect?.height || 0,
            opacity: 1
          },
          {
            x: () => innerWidth / 2 - size() / 2,
            y: () => innerHeight / 2 - size() / 2 - 25 * Math.max(innerWidth / 1920, innerHeight / 1080),
            width: size,
            height: size,
            duration: 1,
            ease: 'none'
          },
          0
        )
        .fromTo('.shopping-layer', { opacity: 1 }, { opacity: 0, duration: 0.72 }, 0)
        .fromTo('.morph-backdrop', { opacity: 0 }, { opacity: 1, duration: 0.65 }, 0)
        .fromTo('.handoff-frame', { opacity: 0 }, { opacity: 1, duration: 0.16 }, 0.84)
        .to(clone.current, { opacity: 0, duration: 0.16 }, 0.84);

      const ef = { p: 0 };
      gsap.timeline({
        scrollTrigger: {
          trigger: sections[4],
          start: () => triggers[4].start,
          end: () => triggers[4].end,
          scrub: true
        }
      })
        .to(ef, { p: 1, duration: 0.86, ease: 'none', onUpdate: () => drawEnd(ef.p) }, 0)
        .fromTo('.closing-title span', { opacity: 0, y: 35 }, { opacity: 1, y: 0, stagger: 0.025, duration: 0.07 }, 0.86)
        .fromTo('.closing-details', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.07 }, 0.93);

      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: s => setPercent(Math.round(s.progress * 100))
      });

      const resize = () => {
        drawPaper(nf.p);
        drawHero(hf.p);
        drawEnd(ef.p);
      };
      window.addEventListener('resize', resize);
      cleanup.push(() => window.removeEventListener('resize', resize));

      state(0);
      ScrollTrigger.refresh();
    }, root);

    return () => {
      disposed = true;
      ctx.revert();
      cleanup.forEach(f => f());
    };
  }, []);

  function jump(i) {
    const s = document.querySelectorAll('.scroll-scene')[i];
    const t = ScrollTrigger.getAll().find(t => t.trigger === s && t.pin);
    if (t) window.scrollTo({ top: t.start + 1, behavior: 'instant' });
  }

  return (
    <main ref={root}>
      {/* Editorial Reference Split-Fill Loading Screen */}
      {isPreloaderVisible && (
        <div className={`ref-preloader ${isDismissing ? 'dismissing' : ''}`}>
          <div className="ref-preloader-grain" />

          {/* Top Ticker Row */}
          <div className="ref-ticker">
            <span>LOADING</span>
            <span>LOADING</span>
            <span>LOADING</span>
            <span>LOADING</span>
            <span>LOADING</span>
          </div>

          {/* Center Graphic Liquid-Fill Percentage */}
          <div className="ref-counter-center">
            <div
              className="ref-counter-box"
              style={{ '--fill-pct': `${loadingProgress}%` }}
            >
              <span className="ref-counter-outline">{loadingProgress}%</span>
              <span className="ref-counter-fill" aria-hidden="true">
                {loadingProgress}%
              </span>
            </div>
          </div>

          {/* Bottom Ticker Row */}
          <div className="ref-ticker">
            <span>LOADING</span>
            <span>LOADING</span>
            <span>LOADING</span>
            <span>LOADING</span>
            <span>LOADING</span>
          </div>
        </div>
      )}

      {/* Main Interactive World */}
      <div className="world">
        <div className="newspaper-layer">
          <img className="full-frame" src="/frames/gold-intro/0001.webp" alt="Gold sculpture transition opening" />
          <canvas ref={newspaper} />
          <div className="intro">
            <p className="eyebrow">FIELD NOTES / VOLUME II</p>
            <h1>Nothing is<br />ever <em>lost.</em></h1>
            <p>Only waiting to be found.</p>
            <button onClick={() => jump(1)}>SCROLL TO DISCOVER ↓</button>
          </div>
        </div>

        <div className="hero-layer">
          <img className="full-frame" src="/frames/gold-hero/0001.webp" alt="Rotating gold cube sculpture" />
          <canvas ref={hero} />
          <aside className="object-note object-left">
            <p className="eyebrow">OBJECT STUDY / 001</p>
            <h2>Geometry,<br /><em>in motion.</em></h2>
            <p>Open gold planes frame the space between them. Every turn reveals a new composition.</p>
            <span className="object-footnote">THE SCULPTURAL COLLECTION</span>
          </aside>
          <aside className="object-note object-right">
            <p className="eyebrow">LIGHT / FORM / BALANCE</p>
            <h3>A different<br /><em>perspective.</em></h3>
            <p>Reflective edges catch the light, while the open centre keeps the form beautifully weightless.</p>
            <div className="object-spec"><span>FORM</span><b>Nested geometry</b></div>
            <div className="object-spec"><span>EXPRESSION</span><b>Golden reflections</b></div>
          </aside>
        </div>

        <div className="shopping-layer">
          <div className="collection-label">
            <p className="eyebrow">THE COLLECTION / SIX STUDIES</p>
            <h2>Material. <em>Made memorable.</em></h2>
          </div>
          <div className="product-strip" ref={strip}>
            {products.map((p, i) => (
              <article className="product-card" key={p[0]}>
                <div className="card-photo">
                  <img ref={i === 5 ? finalImage : undefined} src={`/products/${i === 5 ? 'ascend' : i}.png`} alt={p[1]} />
                </div>
                <div className="card-caption">
                  <span>0{i + 1}</span>
                  <h3>{p[0]}</h3>
                  <span>↗</span>
                </div>
                <p>{p[1]}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="morph-backdrop" />
        <img className="morph-clone" ref={clone} src="/products/ascend.png" alt="Gold stepped sculpture emerging from the collection" />
        <img className="handoff-frame full-frame" src="/frames/gold-ending/0001.webp" alt="" />

        <div className="ending-layer">
          <img className="full-frame" src="/frames/gold-ending/0001.webp" alt="Gold stepped sculpture" />
          <canvas ref={ending} />
          <div className="closing">
            <h2 className="closing-title"><span>EXPLORE</span> <span>OUR</span> <span>CATALOG</span></h2>
            <div className="closing-details">
              <p>Find the form that speaks to you.</p>
              <button onClick={() => dialog.current.showModal()}>View the collection ↗</button>
            </div>
          </div>
        </div>
      </div>

      <div className="film" />
      <header>
        <a href="#" className="wordmark" onClick={e => { e.preventDefault(); jump(0); }}>VESTIGE<sup>®</sup></a>
        <span className="header-note">FORM / MATERIAL / PRESENCE</span>
        <button onClick={() => dialog.current.showModal()}>The collection ↗</button>
      </header>

      <nav className="rail" aria-label="Chapters">
        {chapters.map((c, i) => (
          <button key={c} aria-label={c} aria-current={chapter === i ? 'step' : undefined} onClick={() => jump(i)}>
            0{i + 1}<i />
          </button>
        ))}
      </nav>

      <footer>
        <span>0{chapter + 1} / 05 <b>{chapters[chapter]}</b></span>
        <span>{error ? 'Some images could not load. Reload to retry.' : 'SCROLL TO EXPLORE'}　{percent}%</span>
      </footer>
      <div className="progress-line" style={{ transform: `scaleX(${percent / 100})` }} />

      {chapters.map(c => <section className="scroll-scene" key={c} aria-label={c} />)}

      <dialog ref={dialog} className="catalog" onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
        <div className="catalog-heading">
          <span className="wordmark">VESTIGE</span>
          <button autoFocus onClick={() => dialog.current.close()}>Close ×</button>
        </div>
        <p className="eyebrow">THE COLLECTION</p>
        <h2>Six studies in presence.</h2>
        <div className="product-grid">
          {products.map((p, i) => (
            <motion.article key={p[0]} whileHover={{ y: -4 }}>
              <img src={`/products/${i === 5 ? 'ascend' : i}.png`} alt={p[1]} loading="lazy" />
              <h3>{p[0]}</h3>
              <p>{p[1]}</p>
            </motion.article>
          ))}
        </div>
      </dialog>
    </main>
  );
}
