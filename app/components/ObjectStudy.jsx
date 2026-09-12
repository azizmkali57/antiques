'use client';
import { useEffect, useRef, useState } from 'react';
import { lightStudies } from '../../lib/objects.mjs';

export function ObjectPassport({ object }) {
  return <section className="object-passport" aria-label="Object passport">
    <p className="eyebrow">OBJECT PASSPORT / {object.id}</p>
    <dl>{['form','material','surface','composition','status'].map(field=><div key={field}><dt>{field}</dt><dd>{object[field]}</dd></div>)}</dl>
    <p className="archive-caption">{object.provenance}. Dimensions unrecorded.</p>
    <p className="eyebrow">ARCHIVE HISTORY</p>
    <ol className="archive-history">{object.archiveHistory.map(step=><li key={step}>{step}</li>)}</ol>
  </section>;
}

export default function ObjectStudy({ object, onArchive }) {
  const root=useRef(null);
  useEffect(()=>{
    if(matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const entries=root.current.querySelectorAll('.object-passport dl>div,.curator-note');
    const observer=new IntersectionObserver(changes=>changes.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{threshold:.1});
    entries.forEach(entry=>{entry.classList.add('archive-reveal');observer.observe(entry);});
    return()=>{observer.disconnect();entries.forEach(entry=>entry.classList.remove('archive-reveal','is-visible'));};
  },[object.id]);
  const [mode,setMode]=useState('object');
  const [light,setLight]=useState('morning');
  const [point,setPoint]=useState({x:50,y:50});
  const [detail,setDetail]=useState('surface');
  function move(event) {
    if(mode!=='lens') return;
    const rect=event.currentTarget.getBoundingClientRect();
    setPoint({x:Math.max(0,Math.min(100,(event.clientX-rect.left)/rect.width*100)),y:Math.max(0,Math.min(100,(event.clientY-rect.top)/rect.height*100))});
  }
  function keyMove(event) {
    const offsets={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};
    if(mode!=='lens'||!offsets[event.key]) return;
    event.preventDefault();const [x,y]=offsets[event.key];
    setPoint(p=>({x:Math.max(0,Math.min(100,p.x+x)),y:Math.max(0,Math.min(100,p.y+y))}));
  }
  return <article ref={root} className="object-study">
    <div className="study-heading"><p className="eyebrow">OBJECT STUDY / {object.id}</p><h2>{object.title}</h2><p>{object.description}</p></div>
    <div className="study-layout">
      <div className="study-visual-column">
        <div className="archive-controls" aria-label="Inspection mode">
          {[['object','Full object'],['lens','Material lens'],['structure','Structure']].map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>setMode(value)}>{label}</button>)}
        </div>
        <div className={`study-visual study-visual--${mode}`} style={{background:lightStudies[light].background}}
          tabIndex={mode==='lens'?0:undefined} role={mode==='lens'?'group':undefined}
          aria-label={mode==='lens'?'Material lens. Use arrow keys or drag to inspect the photograph.':undefined}
          onPointerMove={move} onPointerDown={event=>{if(mode==='lens'){event.currentTarget.setPointerCapture(event.pointerId);move(event);}}} onKeyDown={keyMove}>
          <img className="study-original" src={object.image} width={object.imageWidth} height={object.imageHeight} alt={object.description} loading="lazy" />
          {mode==='lens'&&<div className="material-lens" style={{clipPath:`circle(22% at ${point.x}% ${point.y}%)`}} aria-hidden="true">
            <img src={object.image} alt="" style={{transform:`scale(${detail==='detail'?3:2})`,transformOrigin:`${point.x}% ${point.y}%`}} />
          </div>}
          {mode==='structure'&&<div className="structure-labels" aria-label="Visible form regions">{object.structure.map((part,i)=><span key={part.label} style={{top:`${part.position}%`}}>{part.label}<i /></span>)}</div>}
        </div>
        {mode==='lens'&&<div className="archive-controls"><button aria-pressed={detail==='surface'} onClick={()=>setDetail('surface')}>Surface ×2</button><button aria-pressed={detail==='detail'} onClick={()=>setDetail('detail')}>Detail ×3</button><span className="archive-caption">Move, drag or use arrow keys.</span></div>}
        {mode==='structure'&&<p className="archive-caption">Photographic form study — visible regions, not an X-ray or a reconstruction of hidden parts.</p>}
        <div className="light-study"><p className="eyebrow">LIGHT STUDY / SURROUND</p><div className="archive-controls">{Object.entries(lightStudies).map(([value,study])=><button key={value} onClick={()=>setLight(value)} aria-pressed={light===value}>{study.label}</button>)}</div><p className="archive-caption">{lightStudies[light].note}. The original photograph remains unchanged.</p></div>
      </div>
      <ObjectPassport object={object} />
    </div>
    <section className="curator-note"><p className="eyebrow">CURATOR’S NOTE</p><blockquote>{object.curatorNote}</blockquote><span className="archive-caption">VESTIGE / FIELD NOTES</span></section>
    {object.id==='006'&&<div className="file-object"><p className="eyebrow">OBJECT / 006 → THE PHYSICAL ARCHIVE</p><p>The same form. A different page.</p><button onClick={onArchive}>Enter archive mode ↗</button></div>}
  </article>;
}
