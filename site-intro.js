(() => {
  'use strict';
  const overlay=document.getElementById('site-intro');
  const frame=document.getElementById('site-intro-frame');
  const progress=document.getElementById('site-intro-progress');
  const main=document.querySelector('main');
  const storageKey='portrait-ascii-upload-intro-v2';
  let finished=false,ready=false,loadTimeout;
  const seen=()=>{try{return sessionStorage.getItem(storageKey)==='seen';}catch{return false;}};
  const remember=()=>{try{sessionStorage.setItem(storageKey,'seen');}catch{}};
  if(seen()||new URLSearchParams(location.search).has('home')){
    document.documentElement.classList.remove('intro-active');
    return;
  }
  function finish(completed=true){
    if(finished)return;finished=true;clearTimeout(loadTimeout);
    if(completed)remember();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold=completed&&!reduced?900:0;
    setTimeout(()=>{
      document.documentElement.classList.add('intro-revealing');
      document.documentElement.classList.remove('intro-active');
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        document.documentElement.classList.add('intro-revealed');
        overlay.classList.add('is-leaving');
      }));
      setTimeout(()=>{
        overlay.hidden=true;frame.src='about:blank';main.inert=false;
        document.documentElement.classList.remove('intro-revealing','intro-revealed');
        document.getElementById('portrait')?.focus({preventScroll:true});
      },reduced?0:1900);
    },hold);
    window.removeEventListener('message',onMessage);
  }
  function onMessage(event){
    if(event.source!==frame.contentWindow||event.data?.channel!=='portrait-ascii-intro')return;
    if(location.origin!=='null'&&event.origin!==location.origin)return;
    if(event.data.type==='ready'){ready=true;clearTimeout(loadTimeout);}
    else if(event.data.type==='ended')finish();
    else if(event.data.type==='error')finish(false);
    else if(event.data.type==='progress'&&Number.isFinite(event.data.progress))progress.style.transform=`scaleX(${Math.max(0,Math.min(1,event.data.progress))})`;
  }
  overlay.hidden=false;main.inert=true;
  window.addEventListener('message',onMessage);
  frame.addEventListener('error',()=>finish(false));
  frame.src='./intro-ascii.html?v=uploaded-20261026-v2';
  loadTimeout=setTimeout(()=>{if(!ready)finish(false);},20000);
})();
