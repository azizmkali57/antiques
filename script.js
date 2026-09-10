const progress = document.querySelector('.progress span');
const soundToggle = document.querySelector('.sound-toggle');
const videos = [...document.querySelectorAll('video')];
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = `${Math.min(100, (window.scrollY / max) * 100)}%`;
}, {passive:true});
soundToggle.addEventListener('click', () => {
  const next = !soundToggle.classList.contains('is-on');
  soundToggle.classList.toggle('is-on', next);
  soundToggle.setAttribute('aria-pressed', String(next));
  soundToggle.lastChild.textContent = next ? ' sound on' : ' sound off';
  videos.forEach(video => { video.muted = !next; });
});
