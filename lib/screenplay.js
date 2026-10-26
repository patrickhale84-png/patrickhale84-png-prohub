/* proHUB shared screenplay reader: character-cue rules, the text parser, scene derivation and file readers.
   Used by filmHUB and the Script Coverage page so both read a script the same way. */
(function(){
/* Strict character-cue rules shared by every tool (parser, schedule, call sheet, evaluator). */
(function(){
if(window.SNCue)return;
var EXT=/\s*\((?:V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT['’]?D\.?|CONT\.?|CONTINUED|CONTINUING|ON (?:THE )?(?:PHONE|RADIO|TV|SCREEN|SPEAKER|INTERCOM|COMM)|INTO (?:THE )?(?:PHONE|RADIO|MIC)|FILTERED|PRE-?LAP|OFF|OFFSCREEN|SUBTITLED|SUBTITLE|MORE|LIVE|ON MONITOR|ON COMPUTER|ON CELL)\)\s*$/i;
/* sounds, onomatopoeia, camera/direction/time labels, props and screen text that are NOT speakers */
var SFX='BANG|BANGS|BOOM|BOOMS|CRASH|CRASHES|SMASH|SMASHES|SLAM|SLAMS|THUD|THUDS|THUMP|THUMPS|WHACK|WHAM|POW|BAM|BLAM|CLICK|CLICKS|CLACK|CLANG|CLANK|CLINK|CLUNK|CREAK|CREAKS|KNOCK|KNOCKS|KNOCKING|RING|RINGS|RINGING|BEEP|BEEPS|BEEPING|BUZZ|BUZZES|BUZZING|DING|DONG|CHIME|CHIMES|HONK|HONKS|SIREN|SIRENS|ALARM|ALARMS|GUNSHOT|GUNSHOTS|GUNFIRE|SHOT|SHOTS|BLAST|EXPLOSION|EXPLOSIONS|SCREECH|SCREECHES|SQUEAL|SQUEALS|SPLASH|SPLASHES|SPLAT|SPLUTTER|SIZZLE|HISS|HISSES|WHOOSH|WHOOSHES|SWOOSH|ZAP|ZING|THWACK|THWIP|SNAP|SNAPS|CRACK|CRACKS|POP|POPS|CRUNCH|RUMBLE|RUMBLES|ROAR|ROARS|GROWL|GROWLS|BARK|BARKS|BARKING|HOWL|HOWLS|MEOW|WOOF|TICK|TOCK|TICKING|DRIP|DRIPS|WHIR|WHIRR|HUM|HUMS|HUMMING|THROB|STATIC|FEEDBACK|ECHO|ECHOES|SCREAM|SCREAMS|SCREAMING|GASP|GASPS|SOB|SOBS|SIGH|SIGHS|COUGH|COUGHS|LAUGHTER|LAUGHS|APPLAUSE|CHEERS|CHEERING|SILENCE|MUSIC|SONG|SOUND|SOUNDS|NOISE|NOISES|SFX|FX|VFX|SOUND EFFECT|SOUND EFFECTS|ENGINE|ENGINES|THUNDER|LIGHTNING|FLASH|FLASHES|SIGN|TEXT|TITLE|SUPER|SUBTITLE|CAPTION|CHYRON|INSERT|ANGLE|POV|CLOSE|WIDE|PAN|TILT|ZOOM|PUSH|PULL|TRACK|TRACKING|CUT|CUTS|DISSOLVE|FADE|BACK|LATER|EARLIER|MEANWHILE|MORNING|EVENING|AFTERNOON|NIGHT|DAY|DAWN|DUSK|SUNRISE|SUNSET|CONTINUOUS|MOMENTS|SAME|INTERCUT|FLASHBACK|MONTAGE|BEAT|PAUSE|END|CONTINUED|MORE|BLACK|BLACKNESS|DARKNESS|DARK|WHITE|BLANK|OVER|UNDER|NOTE|NOTES|WARNING|DANGER|EXIT|OPEN|CLOSED|STOP|GO|ACTION|CUT TO|HELLO|HELP|LOOK|WATCH|RUN|FREEZE|FIRE|STOP|WAIT|NO|YES|OKAY|OK|WOW|OH|AH|UH|UM|HM|HMM|HA|HAHA|SHH|SHHH|PSST|AAH|AGH|ARGH|UGH|EW|EEK|YIKES|WHOA|HEY|HUH|PHEW|YAY|OOF|OW|OUCH|BRR|GRR|MMM|ER|EH'.split('|');
var SFXSET={};SFX.forEach(function(w){SFXSET[w]=1});
var BAD_START=/^(?:A|AN|AND|OR|BUT|IF|IN|ON|AT|BY|TO|OF|AS|IS|IT|HE|SHE|WE|THEY|HIS|HER|ITS|OUR|THEIR|THIS|THAT|THESE|THOSE|ALL|ANY|SOME|EVERY|NO|NOT|WITH|FROM|INTO|OVER|UNDER|THEN|WHEN|WHILE|SUDDENLY|ANGLE ON|CLOSE ON|CLOSE UP|WIDE ON|BACK TO|CUT TO|SMASH CUT|MATCH CUT|FADE|DISSOLVE|TITLE|SUPER|INSERT|INTERCUT|END OF|THE END|MORE)\b/;
var ABBR=/\b(?:MR|MRS|MS|DR|ST|JR|SR|LT|SGT|CPT|COL|GEN|PROF|CPL|PVT|FR|REV|MAJ|DET|OFC|OFFICER)\.$/;
function strip(s){var p;do{p=s;s=s.replace(EXT,'')}while(s!==p);return s.trim()}
/* returns the cleaned speaker name, or null if this can't be a character */
function name(raw){
  var s=String(raw==null?'':raw).trim();
  if(!s) return null;
  s=s.replace(/^@/,'').replace(/\s*\^$/,'').replace(/^\d+[A-Z]?\.?\s+(?=[A-Z])/,'').trim();
  s=strip(s);
  if(!s||s.length<2||s.length>30) return null;
  if(/[a-z]/.test(s)) return null;                         /* cues are capitals only */
  if(!/^[A-Z][A-Z0-9 '’.\-&#\/]*$/.test(s)) return null;      /* letters, digits, ' . - & # only */
  if(/[!?,:;"“”(){}\[\]<>*_=~|\\]/.test(s)) return null;
  if(/^(?:INT|EXT|EST|I\/E)\b/.test(s)) return null;
  if(/[.]$/.test(s)&&!ABBR.test(s)&&!/(?:\b[A-Z]\.){2,}$/.test(s)) return null;           /* sentences end in a full stop; names don't */
  var ws=s.split(/\s+/).filter(Boolean);
  if(ws.length>4) return null;
  var letters=(s.match(/[A-Z]/g)||[]).length; if(letters<2) return null;
  if(/\d/.test(s)&&!/^[A-Z][A-Z'’.\-& ]*\s#?\d{1,2}$/.test(s)) return null;   /* digits only as a trailing number: GUARD 2 */
  if(/(.)\1{2,}/.test(s.replace(/\s/g,''))) return null;     /* AAAAH, BRRRING */
  if(BAD_START.test(s)&&!/^THE\s+[A-Z]{2,}(?:\s[A-Z]{2,})?$/.test(s)) return null;
  var bare=s.replace(/\s#?\d{1,2}$/,'');
  if(SFXSET[bare]) return null;                            /* whole name is a sound/label */
  for(var i=0;i<ws.length;i++){var w=ws[i].replace(/[^A-Z]/g,''); if(w&&SFXSET[w]&&ws.length>1&&i===ws.length-1&&!/^(?:MR|MRS|DR)$/.test(ws[0])&&!/^(?:KING|QUEEN|SHOT)$/.test(w)) return null; }
  if(ws.length>1&&ws.some(function(w){return /^[A-Z]{4,}ING$/.test(w)})) return null;   /* "DOOR SLAMMING" is action */
  if(ws.length>1&&ws.some(function(w){return SFXSET[w.replace(/[^A-Z]/g,'')]&&/^(?:BANG|BOOM|CRASH|THUD|KNOCK|RING|BEEP|BUZZ|CLICK|GUNSHOT|SIREN|ALARM|EXPLOSION|SCREAM)S?$/.test(w.replace(/[^A-Z]/g,''))})) return null;
  return bare;
}
function typeOf(n){return String(n&&n.type||'').toUpperCase().replace(/-/g,'_')}
/* demote any CHARACTER line that fails the rules or is not followed by dialogue / a parenthetical */
function demote(nodes){
  if(!nodes||!nodes.length) return nodes;
  for(var i=0;i<nodes.length;i++){
    var n=nodes[i]; if(typeOf(n)!=='CHARACTER') continue;
    var nx=nodes[i+1], nt=nx?typeOf(nx):'';
    var ok=name(n.text)!==null&&(nt==='DIALOGUE'||nt==='PARENTHETICAL');
    if(ok&&nt==='PARENTHETICAL'){ var n2=nodes[i+2]; ok=!!n2&&typeOf(n2)==='DIALOGUE'; }
    if(!ok){ n.type=(n.type===n.type.toLowerCase()?'action':'ACTION'); if(n.type==='ACTION'&&n.text===n.text.toUpperCase()&&n.text.length>40) {} }
  }
  return nodes;
}
window.SNCue={name:name,demote:demote,strip:strip};
})();
})();
(function(){
'use strict';
var AUTO=window.PH_AUTO||{prop:1,vehicle:1,animal:1,sfx:1,stunt:1,vfx:1,extra:1,sound:1,wardrobe:1,mu:1};
function parseText(text){
  function emit(o){if(gap){o.pb=1;gap=false;}out.push(o);}
  var out=[],gap=false,speaker=false,rows=String(text||'').split(/\r?\n/).map(function(r){return r.replace(/\t/g,'        ').replace(/<[^>]+>/g,'').replace(/\s+$/,'');});
  /* layout detection: numbered headings without INT./EXT. (e.g. "12  HIS VIEW"), and page-slug scripts ("A1" under a dashed rule) */
  var NUMH=/^\s*(\d+[A-Z]?)\s+([A-Z][A-Z0-9 .,'"&\/\-\u2013\u2014()#!?:;]*[A-Z0-9)!?.])\s*$/,SLUG=/^\s*[A-Z]{0,2}\d+[A-Z]{0,2}\s*$/;
  var numN=0,slugN=0;
  rows.forEach(function(r,i){if(NUMH.test(r)&&!/[a-z]/.test(r)&&(!rows[i-1]||!rows[i-1].trim())&&i+1<rows.length&&(rows[i+1]||'').trim()==='')numN++;if(/^-{20,}\s*$/.test(r)&&SLUG.test(rows[i+1]||'')&&String(rows[i+2]||'').trim())slugN++;});
  var mode=slugN>=10?'slug':(numN>=8?'num':'');
  if(mode==='slug'){var nr=[],last='';
    for(var i=0;i<rows.length;i++){var r=rows[i];
      if(/^-{20,}\s*$/.test(r)||/^\s*\d{1,2}\/\d{1,2}\/\d{2,4}\s+\S*\s*[a-z]?\d*\s*$/.test(r))continue;
      if(SLUG.test(r)){var j=i+1;while(j<rows.length&&!rows[j].trim())j++;var nx=rows[j]||'';
        if(/^\s*CONTINUED\b/i.test(nx)){i=j;continue;}
        if(r.trim()!==last&&nx.trim()&&!/[a-z]/.test(nx)){last=r.trim();nr.push('\u0001'+nx.trim());i=j;continue;}
        continue;}
      nr.push(r);}
    rows=nr;}
  /* Fountain forced scene heading: a line starting with a dot */
  rows=rows.map(function(r){return /^\s*\.[A-Za-z]/.test(r)?'\u0001'+r.replace(/^\s*\./,'').trim():r;});
  var fa={};rows.forEach(function(r,i){if(/^\s*![A-Za-z0-9"'(]/.test(r)){fa[i]=r.replace(/^\s*!/,'').trim();rows[i]=new Array(80).join(' ')+fa[i];}});
  /* bare location headings (no INT./EXT., e.g. "HOTEL LOBBY") set apart by blank lines at the action indent */
  if(!mode){(function(){var ind=function(r){return r.length-r.replace(/^\s+/,'').length;},cnt={},cand=[],TR=/^(FADE|CUT|DISSOLVE|FLARE|SMASH|MATCH|IRIS|WIPE|THE END|CONTINUED|MORE|SUPER|TITLE|INTERCUT|BACK TO)\b/;
    rows.forEach(function(r,i){if(/[a-z]/.test(r)&&(!rows[i-1]||!rows[i-1].trim())){var a=ind(r);cnt[a]=(cnt[a]||0)+1;}});
    var ks=Object.keys(cnt).sort(function(x,y){return cnt[y]-cnt[x];});if(!ks.length)return;var A=+ks[0];
    var real=rows.filter(function(r){return /^\s*(\d+[A-Z]?\s+)?(INT|EXT|EST|I\/E)[.\s\/]/.test(r)&&!/[a-z]/.test(r);}).length;
    rows.forEach(function(r,i){var t=r.trim();if(t&&!/[a-z]/.test(t)&&/[A-Z]{2}/.test(t)&&ind(r)===A&&t.length<60&&!(rows[i-1]||'').trim()&&rows[i+1]!==undefined&&!rows[i+1].trim()&&!TR.test(t)&&!/[:;]$/.test(t.replace(/\s+$/,''))||t&&/^[A-Z][A-Z ]+:\s+[A-Z][A-Z .,'-]+$/.test(t)&&ind(r)===A&&!(rows[i-1]||'').trim()&&rows[i+1]!==undefined&&!rows[i+1].trim())cand.push(i);});
    if(cand.length>=8&&cand.length>real*3){cand.forEach(function(i){rows[i]='\u0001'+rows[i].trim();});}})();}
  /* cue column statistics: veto speaker candidates (centered signs, titles) that sit off the script's cue/dialogue columns */
  var veto={};
  Object.keys(fa).forEach(function(i){rows[i]=fa[i];veto[i]=1;});
  (function(){var ind=function(r){return r.length-r.replace(/^\s+/,'').length;},cand=[],ci={},di={};
    rows.forEach(function(r,i){var t=r.trim();if(!t||!window.SNCue||SNCue.name(t)===null)return;var nx=rows[i+1];if(!nx||!nx.trim())return;cand.push(i);var a=ind(r),b=ind(nx);ci[a]=(ci[a]||0)+1;di[b]=(di[b]||0)+1;});
    if(cand.length<25)return;
    function mode(o){var k=Object.keys(o).sort(function(x,y){return o[y]-o[x];})[0];return {v:+k,share:o[k]/cand.length};}
    var C=mode(ci),D=mode(di);if(C.share<.6||D.share<.5||C.v-D.v<4)return;
    cand.forEach(function(i){var a=ind(rows[i]),b=ind(rows[i+1]),pv=rows[i-1]||'';
      var nn=rows[i+1].trim();if((Math.abs(a-C.v)>3&&(/^\(/.test(nn)||Math.abs(b-D.v)>3))||(/^\(/.test(nn)?false:Math.abs(b-D.v)>6)&&Math.abs(a-C.v)>3||(pv.trim()&&!/[a-z]/.test(pv)&&ind(pv)>=a-4&&!/^\s*\(/.test(pv)&&!/[.!?,"'-]\s*$/.test(pv)&&ind(pv)>=C.v-3&&false)||(pv.trim()&&!/[a-z]/.test(pv)&&!/^\s*\(/.test(pv)&&!/^\s*(\d+[A-Z]?\s+)?(INT|EXT|EST|I\/E)\b/.test(pv)&&!/[:.]\s*$/.test(pv.trim().slice(-1))&&pv.trim().length>2&&!/\)\s*$/.test(pv)))veto[i]=1;});})();
  /* shot headings printed in the cue column ("THE CLIFFS" over a description) are action; inline cues ("Miller Hell no, two-thirds.") */
  var inl={};
  (function(){if(!window.SNCue)return;
    var cands=[],freq={},demote={};
    rows.forEach(function(r,i){var t=r.trim();if(!t||r.charAt(0)==='\u0001'||veto[i]||SNCue.name(t)===null)return;var nx=rows[i+1];if(!nx||!nx.trim())return;var k=t.replace(/\s*\(.*?\)\s*$/,'');freq[k]=(freq[k]||0)+1;cands.push(i);});
    if(cands.length<25)return;
    var VS=/^[A-Z][a-z]+s\b/,NOTV=/^(Yes|Lots|Jesus|This|His|Hers|Us|Always|Sometimes|Thanks|Guess|Less|Unless|Bless|Dress|Perhaps|Does|Has|Was|Is|Its|Gus|Besides|Ladies|Gentlemen|Friends|Guys|Boys|Folks|Gents|Pass|Mess|Miss|Press|Kids|Cops|Men|Okays|Hers|Across|Towards|Afterwards|Ours|Yours|Theirs|Sirs|Cheers|Congratulations|Whereas|Sunglasses|Hands|Gods|Dogs|Ass|Bastards|Boss|Always|Nevermind)\b/,PRON=/\b(I|I'm|I'll|I've|I'd|you|you're|your|we|we're|my|me|us|our|let's|it's|that's|don't|can't|yes|no|sir|please|what|why|how|hey)\b/i;
    cands.forEach(function(i){var t=rows[i].trim(),k=t.replace(/\s*\(.*?\)\s*$/,''),first=rows[i+1].trim(),blk='',j=i+1;
      while(rows[j]&&rows[j].trim()&&j<i+8){blk+=' '+rows[j].trim();j++;}
      if(/^\(/.test(first))return;
      if(!PRON.test(blk)&&((VS.test(first)&&!NOTV.test(first)&&/^\S+\s+(a|an|the|up|out|over|through|into|on|at|in|off|to|down|his|her|him|them|around|back|across|along|from|slowly|quickly|away|toward|towards|with|for|by|it|their|its|empty|again|closer|nearer)\b/.test(first))||(freq[k]<=1&&/( AND | IS | ARE |EVERYWHERE|^(THREE|TWO|FOUR|OTHER) )/.test(k)||freq[k]<=2&&/^(THE|ANOTHER|A|AN|IN|AT|ON|NEAR|HALF|STILL|MORE|DIRECT|ONE|BEHIND|UNDER)\b/.test(k)))){demote[i]=1;veto[i]=1;freq[k]--;}});
    var known={},toks={};Object.keys(freq).forEach(function(k){if(freq[k]>=4){known[k.toUpperCase()]=1;k.toUpperCase().split(/\s+/).forEach(function(w){toks[w]=1;});}});
    var n=0,tmp={};
    rows.forEach(function(r,i){var t=r.trim();if(!t||r.charAt(0)==='\u0001'||(rows[i-1]||'').trim()||!/[a-z]/.test(t)||!/^[A-Z][a-z]/.test(t))return;
      var w=t.split(/\s+/);
      for(var m=Math.min(3,w.length-1);m>=1;m--){var nm=w.slice(0,m).join(' ').toUpperCase();
        if(!known[nm])continue;
        var x=w[m];
        if(/^[A-Z]/.test(x)&&!(VS.test(x)&&!NOTV.test(x))&&!/(ed|ing)\b/.test(x)&&!/['’]s$/.test(x)&&!toks[x.replace(/[^A-Za-z]/g,'').toUpperCase()]){tmp[i]=m;n++;}
        break;}});
    if(n>=15)inl=tmp;})();
  /* numbered speakers ("PLAYER 1", "GUARD 2") that repeat are names, not margin scene numbers */
  var keepNum={};(function(){var c={},b={};rows.forEach(function(r){var t=r.trim(),m=/^([A-Z][A-Z'.\-]*(?:\s+[A-Z][A-Z'.\-]*)*)\s+(\d{1,2})$/.exec(t);if(m){c[t]=(c[t]||0)+1;(b[m[1]]=b[m[1]]||{})[m[2]]=1;}});
    Object.keys(c).forEach(function(t){var base=t.replace(/\s+\d{1,2}$/,'');if(c[t]>=2&&Object.keys(b[base]).length<=4)keepNum[t]=1;});})();
  rows.forEach(function(raw,ix,arr){
    var t=keepNum[raw.trim()]?raw.trim():raw.replace(/(^\s*\d+[A-Z]?\s+|\s+\d+[A-Z]?$|^\*\d+\*)/g,'').trim();
    if(mode==='num'&&/^\s*\d+[A-Z]?\s+OMITTED\s*$/.test(raw)){speaker=false;return;}
    if(mode==='num'&&NUMH.test(raw)&&!/[a-z]/.test(raw)&&(!arr[ix-1]||!arr[ix-1].trim())){emit({type:'scene-heading',text:NUMH.exec(raw)[2].trim()});speaker=false;return;}
    if(raw.charAt(0)==='\u0001'){emit({type:'scene-heading',text:raw.slice(1)});speaker=false;return;}
    if(!t){speaker=false;gap=true;return;}
    /* page furniture inside the text: (MORE), CONTINUED, bare page numbers, omitted-scene markers */
    if(/^\(?\s*(MORE|CONT['’]?D|CONTINUED)\s*\)?:?$/i.test(t)||/^(\d+[A-Z]?\s+)?(THRU\s+)?OMITTED\s*$/i.test(t.replace(/\t/g,' '))&&!/[a-z]/.test(t.replace(/omitted/i,''))){if(/OMITTED/i.test(t))speaker=false;return;}
    if(/^\s*\d{1,3}[A-Z]?\.?\s*$/.test(raw)&&!String(arr[ix-1]||'').trim()&&!String(arr[ix+1]||'').trim()){return;}
    if(inl[ix]){var w=t.split(/\s+/);emit({type:'character',text:w.slice(0,inl[ix]).join(' ').toUpperCase()});emit({type:'dialogue',text:w.slice(inl[ix]).join(' ')});speaker=true;return;}
    var ht=t.replace(/^\d+\s+/,''),cl=t.replace(/\s*\((CONT['’]D|V\.O\.|O\.S\.|O\.C\.)\)\s*$/i,'').trim(),type='action';
    if(/^(INT\.|EXT\.|EST\.|INT\/EXT\.|I\/E\.)/i.test(ht)||(/^(INT|EXT)\s*(?:[\/&]\s*(?:INT|EXT)\s*)?[.\s]\s*[A-Z\d]/.test(ht)&&!/[a-z]/.test(ht))){type='scene-heading';speaker=false;}
    else if(/^\(.*\)$/.test(t)){type='parenthetical';}
    else if(/TO:$/.test(t.toUpperCase())||/^(DISSOLVE|SMASH CUT|MATCH CUT|CUT|FADE (IN|OUT)|IRIS (IN|OUT)|WIPE)\b[A-Z :.]*$/.test(t)&&t.length<30){type='transition';speaker=false;}
    else if(window.SNCue&&!veto[ix]&&SNCue.name(t)!==null&&String(arr[ix+1]||'').trim()&&!/^(INT|EXT|EST|I\/E)[.\s\/]/i.test(String(arr[ix+1]).trim())){type='character';speaker=true;}
    else if(speaker){type='dialogue';}
    emit({type:type,text:t});
  });
  return out;
}
function normType(t){return String(t||'action').toLowerCase().replace(/_/g,'-');}
function cname(c){return String(c).replace(/\(.*?\)/g,'').trim();}

function derive(lines){
  var scenes=[],cur=null,speaker=null;
  lines.forEach(function(l,li){
    var t=(l.text||'').trim();if(!t)return;
    if(l.type==='character'&&window.SNCue){var nx=lines[li+1],nt=nx?nx.type:'';if(SNCue.name(t)===null||!(nt==='dialogue'||nt==='parenthetical')){l.type='action';}}
    if(l.type==='scene-heading'){
      var h=t.replace(/^\d+[A-Z]?\s+/,'').replace(/\s+\d+[A-Z]?$/,'').toUpperCase();
      h=h.replace(/^(INT|EXT)\s*(?:&|AND|\/)\s*(EXT|INT)\b\.?/,'INT/EXT.').replace(/^(INT|EXT)\s+(?=[A-Z])/,'$1. ');
      var m=h.match(/^(INT\.\/EXT\.|INT\/EXT\.|I\/E\.|INT\.|EXT\.|EST\.)\s*(.*?)(?:\s+[-–—]\s+([A-Z][A-Z .\/]*))?$/)||h.match(/^()(.*?)(?:\s+[-–—]\s+((?:EARLY |LATE )?(?:DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|SUNSET|SUNRISE)[A-Z .\/]*))$/)||[];
      var sn=l.sn&&!scenes.some(function(z){return z.num===l.sn;})?l.sn:null;
      cur={num:sn||String(scenes.length+1),sn:sn?1:0,heading:h,ie:(m[1]||'INT.').replace(/\./g,''),loc:(m[2]||h).trim(),tod:((m[3]||'DAY').trim().split(/\s+/)[0]),cast:[],words:0,lines:[],tags:{},notes:'',omit:!!l.om,hrv:l.rv?1:0,dlg:{}};
      Object.keys(AUTO).forEach(function(k){cur.tags[k]=[];});
      scenes.push(cur);speaker=null;return;
    }
    if(!cur)return;
    cur.lines.push(l);cur.words+=t.split(/\s+/).length;
    if(l.type==='character'){speaker=window.SNCue?(SNCue.name(t)||cname(t)):cname(t);if(cur.cast.indexOf(speaker)<0)cur.cast.push(speaker);}
    else if(l.type==='dialogue'&&speaker){cur.dlg[speaker]=(cur.dlg[speaker]||0)+t.split(/\s+/).length;}
    else if(l.type!=='parenthetical'){speaker=null;}
    if(l.type==='action'||l.type==='dialogue'){
      Object.keys(AUTO).forEach(function(k){(t.match(AUTO[k])||[]).forEach(function(w){w=window.PH_NORM?PH_NORM(w):w.toLowerCase();if(cur.tags[k].indexOf(w)<0)cur.tags[k].push(w);});});
    }
  });
  var cum=0;
  scenes.forEach(function(s){s.eighths=Math.max(1,Math.round(s.words/185*8));s.pg=Math.floor(cum)+1;cum+=s.eighths/8;});
  return scenes;
}

/* ---------- file readers (text, Fountain, FDX, JSON, PDF) ---------- */
var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',PDFW='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
function loadPdf(){return new Promise(function(res,rej){if(window.pdfjsLib){res();return;}var s=document.createElement('script');s.src=PDFJS;s.onload=function(){try{pdfjsLib.GlobalWorkerOptions.workerSrc=PDFW;}catch(e){}res();};s.onerror=function(){rej(new Error('PDF reader could not load (needs internet). Paste the text instead, or use a .txt / .fdx / .fountain file.'));};document.head.appendChild(s);});}
function readPDF(file){return loadPdf().then(function(){return file.arrayBuffer();}).then(function(buf){return pdfjsLib.getDocument({data:buf}).promise;}).then(async function(pdf){var acc=[];for(var i=1;i<=pdf.numPages;i++){var pg=await pdf.getPage(i),tc=await pg.getTextContent(),by={};tc.items.forEach(function(it){var y=Math.round(it.transform[5]);(by[y]=by[y]||[]).push({x:it.transform[4],s:it.str});});Object.keys(by).map(Number).sort(function(a,b){return b-a;}).forEach(function(y){var s=by[y].sort(function(a,b){return a.x-b.x;}).map(function(t){return t.s;}).join(' ').trim();if(s)acc.push(s);});acc.push('');}return acc.join('\n');});}
function readFDX(file){return file.text().then(function(t){var x=new DOMParser().parseFromString(t,'text/xml'),acc=[];Array.prototype.forEach.call(x.getElementsByTagName('Paragraph'),function(p){var ty=(p.getAttribute('Type')||'').toLowerCase(),s=Array.prototype.map.call(p.getElementsByTagName('Text'),function(n){return n.textContent;}).join('').trim();if(!s)return;if(ty.indexOf('scene')>=0||ty.indexOf('character')>=0)acc.push(s.toUpperCase());else if(ty.indexOf('parenthetical')>=0)acc.push('('+s.replace(/^\(|\)$/g,'')+')');else acc.push(s);if(ty.indexOf('scene')>=0||ty.indexOf('dialogue')>=0||ty.indexOf('action')>=0||ty.indexOf('transition')>=0)acc.push('');});return acc.join('\n');});}
function readJSON(file){return file.text().then(function(t){var d=JSON.parse(t),l=[];if(d.script&&Array.isArray(d.script.lines))l=d.script.lines;else if(Array.isArray(d.lines))l=d.lines;else if(Array.isArray(d))l=d;return l.map(function(x){return typeof x==='string'?x:(x.value||x.text||'');}).join('\n');});}
function readFile(file){var n=file.name.toLowerCase();if(/\.pdf$/.test(n))return readPDF(file);if(/\.fdx$/.test(n))return window.PHX&&PHX.readFDX?PHX.readFDX(file):readFDX(file);if(/\.json$/.test(n))return readJSON(file);return file.text();}

window.PHScript={parseText:parseText,derive:derive,normType:normType,cname:cname,readFile:readFile};
})();
