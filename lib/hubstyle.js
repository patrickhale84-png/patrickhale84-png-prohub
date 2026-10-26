/* Recolours hub tiles to flat accent colours like filmHUB, picking black or white text by brightness. */
(function(){
  function rgb(s){var m=/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(s||'');if(m)return[+m[1],+m[2],+m[3]];m=/#([0-9a-f]{6})/i.exec(s||'');return m?[parseInt(m[1].slice(0,2),16),parseInt(m[1].slice(2,4),16),parseInt(m[1].slice(4),16)]:null}
  function lum(c){return(0.299*c[0]+0.587*c[1]+0.114*c[2])/255}
  function pass(){
    document.querySelectorAll('.mtile').forEach(function(t){
      if(t.getAttribute('data-hs'))return;
      var c=null,st=t.getAttribute('style')||'';
      var m=/border-top:\s*\d+px solid\s*(#[0-9a-f]{6})/i.exec(st);if(m)c=rgb(m[1]);
      if(!c){var cs=getComputedStyle(t);var bg=(cs.backgroundImage||'')+' '+(cs.backgroundColor||'');var all=bg.match(/rgba?\([^)]*\)/g)||[];for(var i=0;i<all.length;i++){var r=rgb(all[i]);if(r&&!/,\s*0\)$/.test(all[i])){c=r;break}}}
      if(!c)return;
      /* lift very dark tile colours so they read as bright flat tiles */
      var l=lum(c);if(l<.32){var k=.45/Math.max(l,.08);c=c.map(function(v){return Math.min(255,Math.round(v*k))})}
      var dark=lum(c)>.58;
      t.style.setProperty('--hs-c','rgb('+c.join(',')+')');t.style.setProperty('--hs-k',dark?'#000':'#fff');t.style.setProperty('--hs-b',dark?'rgba(0,0,0,.2)':'rgba(0,0,0,.38)');
      t.setAttribute('data-hs','1');
    });
  }
  if(document.readyState!=='loading')pass();else document.addEventListener('DOMContentLoaded',pass);
  setTimeout(pass,400);setTimeout(pass,1500);
  try{new MutationObserver(pass).observe(document.documentElement,{childList:true,subtree:true})}catch(e){}
})();
