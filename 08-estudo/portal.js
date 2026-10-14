(() => {
 const hero=document.querySelector('.hero'); const controls=document.querySelector('.motion-controls');
 const replay=document.getElementById('replay'), pause=document.getElementById('pause');
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
 const reset=()=>{hero.classList.remove('paused');pause.textContent='Mettre en pause';pause.setAttribute('aria-pressed','false');};
 const play=()=>{reset();hero.classList.remove('playing');void hero.offsetWidth;if(!reduced.matches)hero.classList.add('playing');};
 replay.addEventListener('click',play);
 pause.addEventListener('click',()=>{if(reduced.matches)return;const paused=hero.classList.toggle('paused');pause.textContent=paused?'Reprendre':'Mettre en pause';pause.setAttribute('aria-pressed',String(paused));});
 const layers=[...document.querySelectorAll('.glass')];
 Promise.all(layers.map(img=>img.decode ? img.decode() : new Promise((ok,no)=>{if(img.complete){img.naturalWidth?ok():no();}else{img.addEventListener('load',ok,{once:true});img.addEventListener('error',no,{once:true});}}))).then(()=>{hero.classList.add('animated');controls.hidden=reduced.matches;play();}).catch(()=>{controls.hidden=true;});
 const motionChanged=()=>{hero.classList.remove('playing');reset();controls.hidden=reduced.matches||!hero.classList.contains('animated');};
 if(reduced.addEventListener)reduced.addEventListener('change',motionChanged);
 if('IntersectionObserver' in window&&!reduced.matches){const nodes=document.querySelectorAll('.reveal');document.body.classList.add('ready');const ob=new IntersectionObserver(items=>items.forEach(e=>{if(e.isIntersecting){e.target.classList.remove('waiting');ob.unobserve(e.target);}}),{threshold:.12});nodes.forEach(n=>{n.classList.add('waiting');ob.observe(n);});}
})();