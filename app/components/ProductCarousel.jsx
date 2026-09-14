'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { objects } from '../../lib/objects.mjs';
import './ProductCarousel.css';

export default function ProductCarousel({ onSwiperInit, finalImageRef }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stageWidth, setStageWidth] = useState(1200);

  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const progressRef = useRef(0);
  const activeIndexRef = useRef(0);
  const tweenRef = useRef(null);

  // Drag / Inertia state
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startProgressRef = useRef(0);
  const lastXRef = useRef(0);
  const lastTimeRef = useRef(0);
  const velocityRef = useRef(0);
  const hasMovedRef = useRef(false);

  const totalSlides = objects.length;

  // Measure stage width for responsive orbital calculations
  const updateDimensions = useCallback(() => {
    if (stageRef.current) {
      setStageWidth(stageRef.current.offsetWidth || window.innerWidth);
    } else if (typeof window !== 'undefined') {
      setStageWidth(window.innerWidth);
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  // Keep refs in sync
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Animate to a specific slide with rapid acceleration and smooth ease-out deceleration
  const goToSlide = useCallback((targetIndex, customDuration = null) => {
    const clamped = Math.max(0, Math.min(totalSlides - 1, targetIndex));
    
    if (tweenRef.current) {
      tweenRef.current.kill();
    }

    const currentP = progressRef.current;
    const distance = Math.abs(clamped - currentP);
    const duration = customDuration !== null ? customDuration : Math.min(1.1, Math.max(0.65, 0.45 + distance * 0.3));

    const proxy = { p: currentP };
    tweenRef.current = gsap.to(proxy, {
      p: clamped,
      duration: duration,
      ease: 'power3.out', // Rapid initial acceleration, gentle ease-out deceleration
      onUpdate: () => {
        progressRef.current = proxy.p;
        setProgress(proxy.p);
      },
      onComplete: () => {
        progressRef.current = clamped;
        setProgress(clamped);
        setActiveIndex(clamped);
      }
    });

    setActiveIndex(clamped);
  }, [totalSlides]);

  // Expose API compatible with Swiper interface for page.jsx ScrollTrigger
  useEffect(() => {
    if (onSwiperInit) {
      const swiperAdapter = {
        slideTo: (index, duration) => {
          goToSlide(index, duration ? duration / 1000 : 0.75);
        },
        get activeIndex() {
          return activeIndexRef.current;
        },
        destroyed: false,
      };
      onSwiperInit(swiperAdapter);
    }
  }, [onSwiperInit, goToSlide]);

  // Pointer drag and touch swipe with realistic inertia
  const handlePointerDown = (e) => {
    // Only handle primary button
    if (e.button !== undefined && e.button !== 0) return;

    if (tweenRef.current) {
      tweenRef.current.kill();
    }

    isDraggingRef.current = true;
    hasMovedRef.current = false;
    startXRef.current = e.clientX;
    startProgressRef.current = progressRef.current;
    lastXRef.current = e.clientX;
    lastTimeRef.current = performance.now();
    velocityRef.current = 0;

    if (containerRef.current) {
      containerRef.current.classList.add('is-dragging');
    }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;

    const currentX = e.clientX;
    const dx = currentX - startXRef.current;

    if (Math.abs(dx) > 4) {
      hasMovedRef.current = true;
    }

    const now = performance.now();
    const dt = now - lastTimeRef.current;
    if (dt > 10) {
      // px / ms
      velocityRef.current = (currentX - lastXRef.current) / dt;
      lastXRef.current = currentX;
      lastTimeRef.current = now;
    }

    // Responsive drag sensitivity
    const dragDistancePerSlide = Math.min(360, stageWidth * 0.32);
    let deltaProgress = -dx / dragDistancePerSlide;

    let targetP = startProgressRef.current + deltaProgress;

    // Apply elastic friction when dragging beyond bounds
    if (targetP < 0) {
      targetP = targetP * 0.3;
    } else if (targetP > totalSlides - 1) {
      const over = targetP - (totalSlides - 1);
      targetP = (totalSlides - 1) + over * 0.3;
    }

    progressRef.current = targetP;
    setProgress(targetP);
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    if (containerRef.current) {
      containerRef.current.classList.remove('is-dragging');
    }

    const currentP = progressRef.current;
    // Velocity is px/ms. Negative vx means moving left -> progress increases (next slide)
    const dragDistancePerSlide = Math.min(360, stageWidth * 0.32);
    const vProgress = -(velocityRef.current * 1000) / dragDistancePerSlide; // slides/sec

    // Project resting point based on release momentum
    const projected = currentP + vProgress * 0.24;
    let targetIndex = Math.round(projected);

    // Fallback if dragged significantly without high velocity
    const netDrag = currentP - startProgressRef.current;
    if (Math.abs(netDrag) > 0.4 && targetIndex === Math.round(startProgressRef.current)) {
      targetIndex = netDrag > 0 ? Math.ceil(startProgressRef.current) : Math.floor(startProgressRef.current);
    }

    targetIndex = Math.max(0, Math.min(totalSlides - 1, targetIndex));

    // Dynamic duration based on momentum
    const dist = Math.abs(targetIndex - currentP);
    const duration = Math.min(1.0, Math.max(0.55, 0.4 + dist * 0.32));

    goToSlide(targetIndex, duration);
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      goToSlide(activeIndex + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      goToSlide(activeIndex - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="product-carousel-container"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Sculptural Collection Orbital Carousel"
    >
      {/* 3D Perspective Orbital Stage */}
      <div ref={stageRef} className="orbital-stage">
        {objects.map((p, i) => {
          // Calculate relative offset from continuous progress
          const delta = i - progress;
          const absDelta = Math.abs(delta);

          // Orbital Geometry & Trigonometry
          const stepAngle = stageWidth < 600 ? 0.48 : 0.42; // radians
          const theta = delta * stepAngle;

          // X-Axis: elliptical circular projection across stage
          const rx = Math.min(stageWidth * 0.44, 580);
          const x = rx * Math.sin(theta);

          // Y-Axis: Curved Arc simulating revolving around a focal point in space
          // Foreground center is at Y = 0; flanking items curve gently upward along the orbit
          const ry = stageWidth < 600 ? 45 : 80;
          const y = -ry * (1 - Math.cos(theta));

          // Z-Axis (Depth & Parallax): center pushes forward, flanks recede into mid-ground
          const rz = stageWidth < 600 ? 140 : 220;
          const centerPush = Math.max(0, 70 * (1 - absDelta * 1.5));
          const z = -rz * (1 - Math.cos(theta)) + centerPush - absDelta * 40;

          // Scale: Significant foreground enlargement for center card, shrinking into flanks
          const scale = Math.max(0.56, 1.08 - 0.24 * Math.pow(Math.min(absDelta, 3), 0.85));

          // 3D Rotations (Inward facing heading & arc roll)
          const rotY = -theta * (180 / Math.PI) * 0.65;
          const rotZ = -delta * 2.6;

          // Z-Index hierarchy: ensures active center card is always on top
          const zIndex = Math.round(100 - absDelta * 20);

          // Parallax lighting & atmospheric depth
          const opacity = Math.max(0.24, 1 - absDelta * 0.28);
          const blur = Math.min(3.5, Math.max(0, (absDelta - 0.7) * 1.8));

          const isCenter = Math.abs(i - activeIndex) === 0;

          return (
            <article
              key={p.id}
              className={`orbital-product-card swiper-product-card ${isCenter ? 'is-active' : ''}`}
              style={{
                transform: `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), ${z.toFixed(2)}px) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${scale.toFixed(4)})`,
                zIndex: zIndex,
                opacity: opacity,
                filter: blur > 0.1 ? `blur(${blur.toFixed(1)}px) brightness(${(1 - absDelta * 0.08).toFixed(2)})` : 'none',
                pointerEvents: absDelta > 2.2 ? 'none' : 'auto',
              }}
              onClick={() => {
                if (!hasMovedRef.current && i !== activeIndex) {
                  goToSlide(i);
                }
              }}
              aria-current={isCenter ? 'true' : 'false'}
            >
              <div className="card-photo">
                <img
                  ref={i === totalSlides - 1 ? finalImageRef : undefined}
                  src={p.image}
                  alt={p.description}
                  draggable={false}
                />
                <div className="photo-plinth-glow" />
              </div>

              <div className="card-text-container">
                <div className="card-header">
                  <div className="card-titles">
                    <span className="card-number eyebrow">0{i + 1} / 0{totalSlides}</span>
                    <h3 className="card-title">{p.title}</h3>
                  </div>
                  <span className="card-arrow" aria-hidden="true">↗</span>
                </div>

                <div className="card-tags">
                  <span className="card-tag">{p.form}</span>
                  <span className="card-tag-separator">·</span>
                  <span className="card-tag">{p.material}</span>
                </div>

                <p className="card-description">{p.description}</p>

                {isCenter && (
                  <div className="card-active-indicator">
                    <span className="indicator-pulse" />
                    <span>Active Study</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Orbital Navigation Controls & Pagination Meter */}
      {/* <div className="orbital-navigation-bar" aria-label="Carousel navigation">
        <button
          type="button"
          className="orbital-nav-btn orbital-prev"
          onClick={() => goToSlide(activeIndex - 1)}
          disabled={activeIndex === 0}
          aria-label="Previous study"
        >
          <span aria-hidden="true">←</span>
        </button>

        <div className="orbital-pagination" role="tablist">
          {objects.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Jump to study ${item.id}: ${item.title}`}
                className={`orbital-dot ${isActive ? 'is-active' : ''}`}
                onClick={() => goToSlide(idx)}
              >
                <span className="dot-inner" />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="orbital-nav-btn orbital-next"
          onClick={() => goToSlide(activeIndex + 1)}
          disabled={activeIndex === totalSlides - 1}
          aria-label="Next study"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div> */}

      {/* Subtle interaction cue */}
      {/* <div className="orbital-hint" aria-hidden="true">
        <span>DRAG OR SCROLL TO ORBIT</span>
      </div> */}
    </div>
  );
}
