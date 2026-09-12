'use client';

import { useEffect, useRef, useState } from 'react';

const SESSION_KEY = 'vestige-preloader-seen';
const FADE_MS = 750;

export default function CinematicPreloader({ ready, onPhaseChange }) {
  const video = useRef(null);
  const [phase, setPhase] = useState('playing');
  const [finished, setFinished] = useState(false);
  const [resourcesReady, setResourcesReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (phase === 'done') return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const skip = () => {
      setPhase('done');
      onPhaseChange('done');
    };
    let seen = false;
    try { seen = sessionStorage.getItem(SESSION_KEY) === '1'; } catch {}
    if (seen || motion.matches) { skip(); return; }

    let disposed = false;
    const media = video.current;
    const prevent = event => event.preventDefault();
    const elements = [document.documentElement, document.body];
    const previous = elements.map(element => ({
      value: element.style.getPropertyValue('overflow'),
      priority: element.style.getPropertyPriority('overflow'),
    }));
    elements.forEach(element => element.style.setProperty('overflow', 'hidden'));
    window.addEventListener('wheel', prevent, { passive: false });
    window.addEventListener('touchmove', prevent, { passive: false });
    const reduce = () => { if (motion.matches) skip(); };
    motion.addEventListener('change', reduce);

    const loaded = () => {
      Promise.resolve(document.fonts?.ready).then(() => {
        if (!disposed) setResourcesReady(true);
      });
    };
    if (document.readyState === 'complete') loaded();
    else window.addEventListener('load', loaded, { once: true });

    // Playback completion is the normal gate; these only handle broken media/loading.
    const deadline = window.setTimeout(() => setFailed(true), 25000);
    media.muted = true;
    media.src = '/videos/preloader.mp4';
    media.play()?.catch(() => { if (!disposed) setFailed(true); });

    return () => {
      disposed = true;
      clearTimeout(deadline);
      window.removeEventListener('load', loaded);
      window.removeEventListener('wheel', prevent);
      window.removeEventListener('touchmove', prevent);
      motion.removeEventListener('change', reduce);
      elements.forEach((element, index) => {
        const { value, priority } = previous[index];
        if (value) element.style.setProperty('overflow', value, priority);
        else element.style.removeProperty('overflow');
      });
      media.pause();
      media.removeAttribute('src');
      media.load();
    };
  }, [onPhaseChange, phase === 'done']);

  useEffect(() => {
    if (phase !== 'playing' || !(failed || (finished && ready && resourcesReady))) return;
    setPhase('fading');
    onPhaseChange('fading');
  }, [failed, finished, ready, resourcesReady, phase, onPhaseChange]);

  useEffect(() => {
    if (phase !== 'fading') return;
    const timer = setTimeout(() => {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      setPhase('done');
      onPhaseChange('done');
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [phase, onPhaseChange]);

  if (phase === 'done') return null;
  return (
    <div className={`cinematic-preloader cinematic-preloader--${phase}`}>
      <video ref={video} autoPlay muted playsInline preload="auto" tabIndex={-1}
        aria-hidden="true"
        disablePictureInPicture disableRemotePlayback
        onPlaying={event => event.currentTarget.classList.add('has-frame')}
        onTimeUpdate={event => {
          const { currentTime, duration } = event.currentTarget;
          if (Number.isFinite(duration) && duration > 0) {
            setProgress(Math.min(1, currentTime / duration));
          }
        }}
        onEnded={() => { setProgress(1); setFinished(true); }} onError={() => setFailed(true)} />
      <div className="cinematic-loading-status" role="progressbar" aria-label="Loading website"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}
        aria-valuetext={finished ? 'Introduction complete. Preparing website.' : 'Playing introduction.'}>
        <div className="cinematic-loading-word" aria-hidden="true">
          <span className="cinematic-loading-lettering">LOAD</span>
          <div className="cinematic-loading-segments">
            <span className="cinematic-loading-marker" style={{ left: `${progress * 100}%` }}>
              {Math.round(progress * 100)}
            </span>
            {Array.from({ length: 20 }, (_, index) => (
              <i key={index} className={progress >= (index + 1) / 20 ? 'is-filled' : ''} />
            ))}
          </div>
          <span className="cinematic-loading-lettering">NG</span>
        </div>
      </div>
    </div>
  );
}
