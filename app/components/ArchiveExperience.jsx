'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { objects, archiveCounts, chooseObject, readStudied } from '../../lib/objects.mjs';
import ObjectStudy from './ObjectStudy';

export default function ArchiveExperience({ initialId = null, onArchive, compact = false }) {
  const sequenceId = useId();
  const [selected, setSelected] = useState(initialId);
  const [studied, setStudied] = useState([]);
  const [discovery, setDiscovery] = useState(null);
  const study = useRef(null);
  useEffect(() => {
    const sync = (event) => { if (Array.isArray(event?.detail)) { setStudied(event.detail); return; } try { setStudied(readStudied(localStorage.getItem('vestige-studied'))); } catch { } };
    sync(); window.addEventListener('vestige-study', sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener('vestige-study', sync); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    if (!selected) return;
    let previous = studied; try { previous = readStudied(localStorage.getItem('vestige-studied')); } catch { }
    const next = [...new Set([...previous, selected])]; setStudied(next);
    try { localStorage.setItem('vestige-studied', JSON.stringify(next)); } catch { }
    window.dispatchEvent(new CustomEvent('vestige-study', { detail: next }));
  }, [selected]);
  function open(id) { setSelected(id); }
  useEffect(() => {
    if (selected) { study.current?.scrollIntoView({ behavior: 'instant', block: 'start' }); study.current?.focus({ preventScroll: true }); }
  }, [selected]);
  const current = objects.find(o => o.id === selected);
  return <div className={`archive-experience ${compact ? 'archive-experience--compact' : ''}`}>
    <section className="archive-introduction"><p className="eyebrow">VESTIGE / DIGITAL ARCHIVE</p><h2>Objects have<br /><em>memory.</em></h2><div className="archive-intro-note"><span className="eyebrow">FIELD NOTES / VOLUME II</span><p>A record of form, material and the spaces between. Six objects, examined slowly.</p><a href={`#${sequenceId}`}>Enter the collection ↓</a></div></section>
    <section className="archive-sequence" id={sequenceId} aria-label="The sculptural collection">
      <p className="eyebrow">THE SCULPTURAL COLLECTION / LIGHT · FORM · BALANCE</p>
      {objects.map((object, index) => <article className="archive-entry" key={object.id}>
        <div className="archive-entry-number"><span>{object.id}</span>{studied.includes(object.id) && <small>STUDIED</small>}</div>
        <button className="archive-entry-image" onClick={() => open(object.id)} aria-label={`Study ${object.title}`}><img src={object.image} width={object.imageWidth} height={object.imageHeight} alt={object.description} loading="lazy" decoding="async" /></button>
        <div className="archive-entry-copy"><p className="eyebrow">OBJECT / {object.id}</p><h3>{object.title}</h3><p>{object.description}</p><button onClick={() => open(object.id)}>Study object ↗</button></div>
      </article>)}
    </section>
    <section className="archive-index"><p className="eyebrow">ARCHIVE INDEX / CURRENT RECORD</p><dl>{Object.entries(archiveCounts()).map(([label, count]) => <div key={label}><dt>{label}</dt><dd>{String(count).padStart(2, '0')}</dd></div>)}</dl></section>
    <section ref={study} tabIndex={-1} className="archive-study-target" aria-label="Selected object study">
      {current ? <><div className="archive-controls object-selector" aria-label="Choose an object">{objects.map(o => <button key={o.id} aria-pressed={selected === o.id} onClick={() => open(o.id)}>{o.id} / {o.title}</button>)}</div><ObjectStudy key={current.id} object={current} onArchive={onArchive} /></> : <div className="archive-study-invitation"><p className="eyebrow">OBJECT PASSPORT / MATERIAL / LIGHT / STRUCTURE</p><h2>Look a little closer.</h2><button onClick={() => open('001')}>Study the first object ↗</button></div>}
    </section>
    <section className="archive-discovery"><p className="eyebrow">ANOTHER WAY INTO THE COLLECTION</p><h2>Leave room<br />for <em>discovery.</em></h2><button onClick={() => setDiscovery(chooseObject(discovery?.id || selected))}>Discover an object ↗</button>{discovery && <div className="discovery-result" aria-live="polite"><p className="eyebrow">THE ARCHIVE SELECTED / {discovery.id}</p><h3>{discovery.title}</h3><button onClick={() => open(discovery.id)}>Explore object →</button></div>}</section>
    <section className="archive-mode"><p className="eyebrow">ARCHIVE MODE / OBJECT FILED</p><img src="/frames/magazine-ending/0001.webp" width="1920" height="1080" alt="Ascend in the existing magazine archive sequence" loading="lazy" /><div><h2>From object<br />to <em>printed memory.</em></h2><p>Follow Ascend into the physical archive.</p><button onClick={onArchive}>Enter the magazine ↗</button></div></section>
  </div>;
}
