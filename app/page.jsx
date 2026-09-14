'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { objects } from '../lib/objects.mjs';
import './archive.css';
import CinematicPreloader from './CinematicPreloader';
import ProductCarousel from './components/ProductCarousel';

const chapters = ['The opening', 'The object', 'The collection', 'A closer look', 'The next discovery'];

export default function Home() {
  const root = useRef();
  const newspaper = useRef();
  const ending = useRef();
  const swiperRef = useRef(null);
  const clone = useRef();
  const finalImage = useRef();
  const dialog = useRef();
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!catalogOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [catalogOpen]);
  function openCatalog() {
    setCatalogOpen(true); dialog.current.showModal();
  }

  // Shared in-memory frame cache
  const introBlobsRef = useRef(new Map());
  const drawPaperRef = useRef(null);

  const [chapter, setChapter] = useState(0);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState(false);

  const [appReady, setAppReady] = useState(false);
  const [preloaderPhase, setPreloaderPhase] = useState('playing');

  // Keep the existing frame cache ready behind the cinematic introduction.
  useEffect(() => {
    let disposed = false;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setAppReady(true); return; }
    const controller = new AbortController();
    const totalIntro = 59;
    const indices = Array.from({ length: totalIntro }, (_, i) => i);
    let cursor = 0;
    const concurrency = 6;

    async function worker() {
      while (cursor < indices.length && !disposed) {
        const idx = indices[cursor++];
        try {
          const r = await fetch(`/frames/hero-journey/${String(idx + 1).padStart(4, '0')}.webp`, { signal: controller.signal });
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
        }
      }
    }

    Promise.all(Array.from({ length: concurrency }, () => worker())).then(() => {
      if (disposed) return;
      drawPaperRef.current?.(0);
      setAppReady(true);
    });

    return () => {
      disposed = true;
      controller.abort();
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (preloaderPhase === 'done') ScrollTrigger.refresh();
  }, [preloaderPhase]);

  // GSAP scroll and canvas setup
  useEffect(() => {
    if (reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

      let rafId = null;
      let lastPaintedTarget = -1;

      const paint = () => {
        rafId = null;
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
        const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        const w = Math.round(innerWidth * dpr);
        const h = Math.round(innerHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        const imgW = img.width || 1696;
        const imgH = img.height || 956;
        const ratio = Math.max(w / imgW, h / imgH);
        const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (context) {
          context.imageSmoothingEnabled = true;
          context.imageSmoothingQuality = 'high';
          context.drawImage(
            img,
            (w - imgW * ratio) / 2,
            (h - imgH * ratio) / 2,
            imgW * ratio,
            imgH * ratio
          );
        }
        lastPaintedTarget = target;
      };

      const requestPaint = () => {
        if (!rafId && !disposed) {
          rafId = requestAnimationFrame(paint);
        }
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
          while (cache.size > 36) {
            const k = cache.keys().next().value;
            cache.get(k).close();
            cache.delete(k);
          }
          if (n === target || Math.abs(n - target) < Math.abs(lastPaintedTarget - target)) {
            requestPaint();
          }
        } catch (e) {
          console.warn(`Frame decode failed: ${slug}/${n}`, e);
        } finally {
          pending.delete(n);
        }
      }

      async function fetchFrame(n) {
        if (n >= totalFrames || disposed) return;
        if (blobs.has(n)) {
          if (Math.abs(n - target) < 4) decode(n);
          return;
        }
        busy++;
        try {
          const r = await fetch(`/frames/${slug}/${String(n + 1).padStart(4, '0')}.webp`);
          if (!r.ok) return;
          const blob = await r.blob();
          if (disposed) return;
          blobs.set(n, blob);
          if (Math.abs(n - target) < 4) decode(n);
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
        requestPaint();
        for (let d = 1; d <= 4; d++) {
          decode(target + d);
          decode(target - d);
        }
      };

      if (!externalBlobs) pump();
      if (blobs.has(0)) {
        decode(0);
      }
      cleanup.push(() => {
        if (rafId) cancelAnimationFrame(rafId);
        cache.forEach(i => i.close());
      });
      return render;
    }

    const drawPaper = sequence(newspaper.current, 'hero-journey', 59, introBlobsRef.current);
    drawPaperRef.current = drawPaper;
    const drawEnd = sequence(ending.current, 'magazine-ending', 54);

    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray('.scroll-scene');
      const distance = innerWidth <= 700 ? [100, 100, 220, 100, 150] : [240, 280, 350, 170, 330];

      function state(i) {
        setChapter(i);
        gsap.set('.newspaper-layer', { visibility: i <= 1 ? 'visible' : 'hidden' });
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
        .to(nf, { p: 1, duration: 1, ease: 'none', onUpdate: () => drawPaper(nf.p * 0.45) }, 0)
        .to('.intro', { opacity: 0, y: -35, duration: 0.22 }, 0);

      const hf = { p: 0 };
      gsap.timeline({
        scrollTrigger: {
          trigger: sections[1],
          start: () => triggers[1].start,
          end: () => triggers[1].end,
          scrub: true
        }
      })
        .to(hf, { p: 1, duration: 0.88, ease: 'none', onUpdate: () => drawPaper(0.45 + hf.p * 0.55) }, 0)
        .fromTo('.object-note', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.13, stagger: 0.035 }, 0)
        .to('.newspaper-layer,.hero-layer', { opacity: 0, duration: 0.12 }, 0.88);

      gsap.to({ p: 0 }, {
        p: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: sections[2],
          start: () => triggers[2].start,
          end: () => triggers[2].end,
          scrub: true,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (swiperRef.current && !swiperRef.current.destroyed) {
              const totalSlides = objects.length;
              const index = Math.round(self.progress * (totalSlides - 1));
              if (swiperRef.current.activeIndex !== index) {
                swiperRef.current.slideTo(index);
              }
            }
          }
        }
      });



      const size = () => 3000 * Math.max(innerWidth / 1920, innerHeight / 1080);
      const centerX = () => innerWidth / 2;
      const centerY = () => innerHeight / 2 - 25 * Math.max(innerWidth / 1920, innerHeight / 1080);

      gsap.timeline({
        scrollTrigger: {
          trigger: sections[3],
          start: () => triggers[3].start,
          end: () => triggers[3].end,
          scrub: true,
          invalidateOnRefresh: true
        }
      })
        .fromTo(
          clone.current,
          {
            x: centerX,
            y: centerY,
            width: 0,
            height: 0,
            opacity: 1
          },
          {
            x: () => centerX() - size() / 2,
            y: () => centerY() - size() / 2,
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
        drawPaper(window.scrollY >= triggers[1].start ? 0.45 + hf.p * 0.55 : nf.p * 0.45);
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
  }, [reducedMotion]);

  function jump(i) {
    if (reducedMotion) { document.querySelector(i >= 2 ? ".shopping-layer" : ".newspaper-layer")?.scrollIntoView(); return; }
    const s = document.querySelectorAll('.scroll-scene')[i];
    const t = ScrollTrigger.getAll().find(t => t.trigger === s && t.pin);
    if (t) window.scrollTo({ top: t.start + 1, behavior: 'instant' });
  }

  return (
    <>
      <CinematicPreloader ready={appReady} onPhaseChange={setPreloaderPhase} />
      <main ref={root} className={`cinematic-site cinematic-site--${preloaderPhase} ${reducedMotion ? 'reduced-archive' : ''}`} inert={preloaderPhase !== 'done'}>
      {/* Main Interactive World */}
      <div className="world">
        <div className="newspaper-layer">
          <img className="full-frame" src="/frames/hero-journey/0001.webp" alt="A newspaper reveals a silver-toned sculpture with bronze-colored triangular forms" />
          <canvas ref={newspaper} />
          <div className="intro">
            <p className="eyebrow">FIELD NOTES / VOLUME II</p>
            <h1>Nothing is<br />ever <em>lost.</em></h1>
            <p>Only waiting to be found.</p>
            <button onClick={() => jump(1)}>SCROLL TO DISCOVER ↓</button>
          </div>
        </div>

        <div className="hero-layer">


          <aside className="object-note object-left">
            <p className="eyebrow">OBJECT STUDY / {objects[1].id}</p>
            <h2>Geometry,<br /><em>in motion.</em></h2>
            <p>A silver-toned cube meets angular, bronze-colored forms. As the sculpture turns, its contrasting surfaces reveal a new composition.</p>
            <span className="object-footnote">THE SCULPTURAL COLLECTION</span>
          </aside>
          <aside className="object-note object-right">
            <p className="eyebrow">LIGHT / FORM / BALANCE</p>
            <h3>A different<br /><em>perspective.</em></h3>
            <p>Brushed metallic planes catch the light against warm, textured triangles. A dark plinth and stitched tan base ground the composition.</p>
            <div className="object-spec"><span>FORM</span><b>Cube & triangular forms</b></div>
            <div className="object-spec"><span>EXPRESSION</span><b>Silver & bronze tones</b></div>
          </aside>
        </div>

        <div className="shopping-layer">
          <div className="collection-label">
            <p className="eyebrow">THE COLLECTION / {objects.length} STUDIES</p>
            {/* <h2>Material. <em>Made memorable.</em></h2> */}
          </div>
          <ProductCarousel 
            onSwiperInit={(swiper) => { swiperRef.current = swiper; }} 
            finalImageRef={finalImage} 
          />
        </div>

        <div className="morph-backdrop" />
        <img className="morph-clone" ref={clone} src={objects[5].image} alt="Gold stepped sculpture emerging from the collection" />
        <img className="handoff-frame full-frame" src="/frames/magazine-ending/0001.webp" alt="" />

        <div className="ending-layer">
          <img className="full-frame" src="/frames/magazine-ending/0001.webp" alt="Gold stepped sculpture" />
          <canvas ref={ending} />
          <div className="closing">
            <h2 className="closing-title"><span>EXPLORE</span> <span>OUR</span> <span>PRODUCT</span></h2>
            <div className="closing-details">
              <p>Find the form that speaks to you.</p>
              <button onClick={() => openCatalog()}>View the collection ↗</button>
            </div>
          </div>
        </div>
      </div>

      <div className="film" />
      <header>
        <a href="#" className="brand-logo" onClick={e => { e.preventDefault(); jump(0); }} aria-label="Wildform Studio home">
          <img src="/logo-white.png" alt="Wildform Studio" className="brand-logo-img brand-logo-dark-mode" width="140" height="42" />
          <img src="/logo.png" alt="Wildform Studio" className="brand-logo-img brand-logo-light-mode" width="140" height="42" />
        </a>
        
        <div className="header-actions">
          <div className="search-container">
            <svg className="action-icon search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" className="search-input" placeholder="Search..." />
          </div>
          <button className="action-btn" aria-label="Account">
            <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </button>
          <button className="action-btn" aria-label="Cart">
            <svg className="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          </button>
        </div>
      </header>

      <nav className="rail" aria-label="Chapters">
        {chapters.map((c, i) => (
          <button key={c} aria-label={c} aria-current={chapter === i ? 'step' : undefined} onClick={() => jump(i)}>
            0{i + 1}<i />
          </button>
        ))}
      </nav>

      <div className="progress-line" style={{ transform: `scaleX(${percent / 100})` }} />


      {chapters.map(c => <section className="scroll-scene" key={c} aria-label={c} />)}

      <dialog ref={dialog} className="catalog" aria-label="The collection" onClose={() => setCatalogOpen(false)} onClick={e => { if (e.target === dialog.current) dialog.current.close(); }}>
        <div className="catalog-heading">
          <span className="brand-logo catalog-brand-logo">
            <img src="/logo.png" alt="Wildform Studio" className="brand-logo-img" width="130" height="39" />
          </span>
          <button autoFocus onClick={() => dialog.current.close()}>Close ×</button>
        </div>
        <p className="eyebrow">THE COLLECTION</p>
        <h2>Six studies in presence.</h2>
        <div className="product-grid">
          {objects.map((p, i) => (
            <article key={p.title}>
              <img src={p.image} alt={p.description} loading="lazy" />
              <h3>{p.title}</h3>
              <p>{p.description}</p>
            </article>
          ))}
        </div>
      </dialog>

      <footer>
        <div className="footer-content">
          <div className="footer-demo-info">
            <h4>About VESTIGE</h4>
            <p>A curated collection of vintage and modern artifacts. Quality, history, and design.</p>
          </div>
          <div className="footer-links">
            <a href="#">Terms of Service</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Contact Us</a>
            <a href="#">FAQ</a>
          </div>
        </div>
      </footer>
    </main>
    </>
  );
}
