/* proHUB Script Coverage: tropes, genre fingerprint, content advisory and production complexity.
   A trope here is a recognisable pattern the script uses, found by rules. Using one is not a flaw; the notes say what to ask of it. */
(function () {
  'use strict';
  var C = window.PHCov, U = C.util, L = C.LEX, wc = U.wc;
  var R = function (s, f) { return new RegExp(s, f || 'i'); };

  /* where: A = action, D = dialogue, H = scene headings. win = [from,to] as a fraction of the script. */
  var T = [
    { id: 'wake', name: 'Waking Up', fam: 'Opening', kind: 'cliche', where: 'A', rx: R('\\b(alarm clock|wakes? up|wakes with a start|eyes (snap|fly|shoot) open|bolts upright|jolts awake|awakens|alarm (goes off|buzzes|rings))\\b'), win: [0, 0.06], tip: 'Open on the character already doing something that shows who they are, with the day already in motion.' },
    { id: 'mirror', name: 'Mirror Scene', fam: 'Opening', kind: 'cliche', where: 'A', rx: R('\\b(stares|looks|gazes) (at (himself|herself|his reflection|her reflection)|into the mirror)|\\breflection in the (bathroom )?mirror|\\bstudies (his|her) (face|reflection)'), win: [0, 0.2], tip: 'If the mirror stays, let it reveal something the audience cannot see otherwise (an injury, a disguise, a lie).' },
    { id: 'blackopen', name: 'Black Screen Opening', fam: 'Opening', kind: 'convention', where: 'A', rx: R('^(\\W*)(over )?black\\b|\\bBLACK\\.|FADE IN:?\\s*BLACK|we hear .{0,40}over black'), win: [0, 0.03], tip: 'A sound-first opening works when the first image pays off the sound.' },
    { id: 'vo', name: 'Voice-over Narration', fam: 'Device', kind: 'device', special: 'vo', tip: 'Make the voice-over say what the picture cannot, or contradict it, rather than describing what we see.' },
    { id: 'dream', name: 'Dream Sequence', fam: 'Device', kind: 'cliche', where: 'A', rx: R('\\b(dream|dreams|dreaming|nightmare|wakes? (from|up from))\\b'), min: 2, tip: 'Dreams risk reading as a cheat; tie any dream image to a choice the character makes next.' },
    { id: 'flash', name: 'Flashback', fam: 'Device', kind: 'device', where: 'AH', rx: R('\\bFLASHBACK|\\bBACK TO (THE )?PRESENT|\\bYEARS (EARLIER|LATER|AGO)|\\bMEMORY\\b|\\bFLASH ?CUT|\\bLATER THAT|\\bONE (YEAR|MONTH|WEEK) (EARLIER|LATER)|\\bTHE PAST', 'i'), min: 1, tip: 'Enter a flashback late and leave it early, and make each one answer a question the present scene raises.' },
    { id: 'weather', name: 'Weather as Mood', fam: 'Setting', kind: 'cliche', special: 'weather', tip: 'Rain at a funeral is the first thing everyone writes. Pick a weather that argues with the mood.' },
    { id: 'funeral', name: 'Funeral Scene', fam: 'Setting', kind: 'convention', where: 'H', rx: R('FUNERAL|CEMETERY|GRAVEYARD|BURIAL|GRAVESIDE|WAKE\\b'), tip: 'Give the funeral a conflict: someone uninvited, an argument over the eulogy, a secret at the graveside.' },
    { id: 'news', name: 'Exposition by News Broadcast', fam: 'Dialogue', kind: 'cliche', where: 'AD', rx: R('\\b(news anchor|newscast|news report|tv news|the news (says|reports)|reporter on (tv|the television)|radio announcer|broadcast(er)?|anchorwoman|anchorman|on the (television|tv|radio))\\b'), min: 2, tip: 'Let the audience learn the news from a character who is affected by it, not from an anchor.' },
    { id: 'clock', name: 'Ticking Clock', fam: 'Plot device', kind: 'convention', where: 'AD', rx: R('\\b(countdown|timer|ticking|ticks down|minutes (left|remaining)|hours (left|remaining)|\\d+ (hours|minutes|days) (left|until|before|to go)|deadline|clock (ticks|counts)|running out of time|time is running)\\b'), min: 2, tip: 'Show the clock on the page at least three times and let the hero lose time on purpose.' },
    { id: 'chosen', name: 'The Chosen One', fam: 'Character', kind: 'cliche', where: 'D', rx: R('\\b(chosen one|the one who|destiny|prophecy|you were born to|only you can|it\'?s your (destiny|fate)|meant to be)\\b'), tip: 'Make the hero choose the job rather than be handed it by prophecy.' },
    { id: 'dying', name: 'Dying Words', fam: 'Plot device', kind: 'cliche', special: 'dying', tip: 'Cut the speech down to a single line the survivor misinterprets or ignores.' },
    { id: 'fridge', name: 'Dead Loved One Motivation', fam: 'Character', kind: 'cliche', where: 'D', rx: R('\\b(my|his|her|their) (wife|girlfriend|daughter|son|husband|family|partner|brother|sister) (was|were|is) (killed|murdered|dead|gone)|\\b(since|after) (my|his|her) (wife|husband|daughter|son|partner) (died|was killed)'), tip: 'If a death drives the hero, give it a specific moment in the script rather than a line of backstory.' },
    { id: 'revenge', name: 'Revenge Motive', fam: 'Plot device', kind: 'convention', where: 'AD', rx: R('\\b(revenge|vengeance|avenge|payback|make them pay|settle the score)\\b'), min: 2, tip: 'Test what the hero loses by getting revenge; the best versions cost something.' },
    { id: 'heist', name: 'Heist / The Job', fam: 'Plot device', kind: 'convention', where: 'AD', rx: R('\\b(heist|the job|safe-?cracker|inside man|get(away)? driver|vault|blueprints?|the score)\\b'), min: 3, tip: 'Plant the plan clearly, then break it in a way the audience did not predict.' },
    { id: 'chase', name: 'Chase Sequence', fam: 'Action', kind: 'convention', where: 'A', rx: R('\\b(chase[sd]?|chasing|pursues|pursuit|pursuing|speeds after|races after|runs after|tears after)\\b'), min: 2, tip: 'Give every chase a turn: a change of terrain, a new obstacle or a decision.' },
    { id: 'explosion', name: 'Escalating Explosion', fam: 'Action', kind: 'convention', where: 'A', rx: R('\\b(explodes|explosion|fireball|blows up|detonates|blast)\\b'), min: 4, tip: 'Make the next explosion cost a person we know.' },
    { id: 'walkaway', name: 'Walking Away From the Explosion', fam: 'Action', kind: 'cliche', where: 'A', rx: R('\\bwalks? (away )?(from|past|calmly) (the )?(explosion|blast|fire|flames)|doesn\'?t (look|turn) back|without (looking|turning) back'), tip: 'Replace the cool walk with a reaction that is specific to the character.' },
    { id: 'lastjob', name: 'One Last Job', fam: 'Plot device', kind: 'cliche', where: 'D', rx: R('\\b(one last (job|time|mission|case)|last job|before i retire|retir(e|es|ed|ing) in|my last (day|case))\\b'), tip: 'Cut the retirement line and let the stakes show in the job itself.' },
    { id: 'tooold', name: '"Too Old For This"', fam: 'Dialogue', kind: 'cliche', where: 'D', rx: R('\\btoo old for (this|that)\\b|\\bgetting too old\\b'), tip: 'Show age through what the character avoids or improvises, not through a line.' },
    { id: 'monologue', name: 'Villain Monologue', fam: 'Character', kind: 'cliche', special: 'villain', tip: 'Break the speech with an interruption or a physical action and cut the explanation of the plan.' },
    { id: 'refuse', name: 'Refusal of the Call', fam: 'Structure', kind: 'convention', where: 'D', rx: R('\\b(i\'?m not (going|doing)|not my (problem|fight|business)|count me out|i\'?m out|find someone else|i can\'?t help you|leave me out of this)\\b'), win: [0.03, 0.4], tip: 'Make the reason for refusing something the later story pays off.' },
    { id: 'montage', name: 'Montage', fam: 'Device', kind: 'device', where: 'AH', rx: R('\\bMONTAGE\\b|\\bSERIES OF SHOTS\\b|\\bQUICK CUTS\\b|\\bSEVERAL ANGLES\\b|\\bINTERCUT\\b'), min: 1, tip: 'Give each beat of the montage a different image and end on a small change in the character.' },
    { id: 'training', name: 'Training Montage', fam: 'Device', kind: 'cliche', where: 'AH', rx: R('\\bTRAINING\\b|\\bPRACTICE\\b|\\bREHEARSAL\\b|\\bworkout\\b|\\bsparring\\b'), min: 3, tip: 'Let one training moment go badly in a way that matters later.' },
    { id: 'meetcute', name: 'Meet-cute Collision', fam: 'Character', kind: 'cliche', where: 'A', rx: R('\\b(bumps? into|collides with|spills? (coffee|drink|her|his)|knocks? (the )?(coffee|papers|books) )\\b'), tip: 'Start the couple in the middle of a disagreement rather than a collision.' },
    { id: 'rainkiss', name: 'Kiss in the Rain', fam: 'Setting', kind: 'cliche', special: 'rainkiss', tip: 'Put the kiss somewhere that costs them something to be there.' },
    { id: 'airport', name: 'Declaration at the Last Minute', fam: 'Structure', kind: 'cliche', where: 'AD', rx: R('\\b(stop the wedding|speak now|don\'?t get on (that|the) (plane|train)|at the airport|runs? to the (airport|station|church)|before (the|her|his) (plane|flight|train) (leaves|takes off))\\b'), tip: 'Change the setting of the confession or let it fail.' },
    { id: 'explain', name: 'Villain Explains the Plan', fam: 'Dialogue', kind: 'cliche', where: 'D', rx: R('\\b(let me explain|my plan|here\'?s what (i|we)\'?(m|re|ll)|now you\'?ll (see|know)|you see,? (it|i|the)|did you really think)\\b'), win: [0.55, 1], tip: 'Reveal the plan through what the villain does, and keep one detail back.' },
    { id: 'standoff', name: 'Standoff', fam: 'Action', kind: 'convention', where: 'A', rx: R('\\b(standoff|stand-off|stand off|guns? (drawn|pointed|trained)|point(s|ing)? (a |his |her )?(gun|pistol|rifle|weapon)s? at|aims? (a |his |her )?(gun|pistol|rifle) at)\\b'), min: 3, tip: 'Make each standoff end differently and let a third party change it.' },
    { id: 'speech', name: 'Inspirational Speech', fam: 'Dialogue', kind: 'cliche', special: 'speech', tip: 'Let the speech fail on the first attempt, or give it to the least likely person.' },
    { id: 'sacrifice', name: 'Heroic Sacrifice', fam: 'Plot device', kind: 'convention', where: 'AD', rx: R('\\b(sacrifice[sd]?|gives? (his|her) life|takes? the bullet|stays? behind|i\'?ll (hold|stay|cover)|go without me)\\b'), win: [0.5, 1], min: 2, tip: 'Set the sacrificed thing up earlier so the audience has already paid for it.' },
    { id: 'justintime', name: 'Rescue In The Nick of Time', fam: 'Plot device', kind: 'cliche', where: 'AD', rx: R('\\b(just in time|in the nick of time|at the last (second|moment|minute)|with seconds to spare|with (a )?second to spare)\\b'), tip: 'Let the rescue arrive late enough to cost something.' },
    { id: 'cavalry', name: 'Cavalry Arrives', fam: 'Plot device', kind: 'cliche', where: 'A', rx: R('\\b(cavalry|reinforcements? (arrive|arrives)|backup arrives|squad cars? (arrive|pull up) (just|in time)|help arrives)\\b'), win: [0.6, 1], tip: 'Make the hero solve the problem before help arrives, or make help the problem.' },
    { id: 'betray', name: 'Betrayal / Traitor', fam: 'Plot device', kind: 'convention', where: 'AD', rx: R('\\b(traitor|betray(ed|al|s)?|double-?cross(ed)?|the mole|snitch|backstabb\\w+|sold us out|you sold)\\b'), min: 2, tip: 'Plant two or three small tells earlier so the betrayal feels earned.' },
    { id: 'hacker', name: 'Hacker Magic', fam: 'Plot device', kind: 'cliche', where: 'AD', rx: R('\\b(i\'?m in|hacks? (into|the)|access granted|firewall|decrypt\\w*|mainframe|download(ing)? the (files|data)|bypass(es)? (the )?security)\\b'), min: 2, tip: 'Make the obstacle human (a favor, a bluff) rather than a progress bar.' },
    { id: 'enhance', name: 'Enhance the Image', fam: 'Plot device', kind: 'cliche', where: 'AD', rx: R('\\benhance (that|the|it)|zoom in on (that|the)|clean (it|that) up'), tip: 'Find the clue through a person or an object, not a magic image fix.' },
    { id: 'phonedead', name: 'Convenient Dead Battery / No Signal', fam: 'Plot device', kind: 'cliche', where: 'AD', rx: R('\\b(battery (dies|is dead|died|dead)|no (signal|service|bars|reception)|phone (dies|is dead|died))\\b'), tip: 'Remove the phone problem by setting the story where phones are not the issue.' },
    { id: 'tooquiet', name: '"It\'s Too Quiet"', fam: 'Dialogue', kind: 'cliche', where: 'D', rx: R('\\btoo quiet\\b'), tip: 'Show the quiet through detail (a bird that stops, a missing sound).' },
    { id: 'split', name: '"Let\'s Split Up"', fam: 'Dialogue', kind: 'cliche', where: 'D', rx: R('\\blet\'?s split up\\b|\\bwe should split up\\b'), tip: 'Give the group a reason to separate that is about their conflict, not the plot.' },
    { id: 'tear', name: 'Single Tear', fam: 'Prose', kind: 'cliche', where: 'A', rx: R('\\b(single tear|a tear (rolls|falls|runs|trickles|slides)|tears (stream|roll|well|fill))\\b'), tip: 'Describe what the character does to avoid crying.' },
    { id: 'clap', name: 'Slow Clap', fam: 'Prose', kind: 'cliche', where: 'A', rx: R('\\bslow clap|begins to clap slowly|starts clapping slowly'), tip: 'Pick another way for the room to turn.' },
    { id: 'window', name: 'Staring Out the Window', fam: 'Prose', kind: 'cliche', where: 'A', rx: R('\\b(stares|gazes|looks|stands) (out )?(of |through |at )?(the |a |his |her )?window\\b|\\bgazes out\\b'), min: 3, tip: 'Give the character something to do with their hands while they think.' },
    { id: 'drink', name: 'Pouring a Drink to Ponder', fam: 'Prose', kind: 'cliche', where: 'A', rx: R('\\bpours? (himself|herself)? ?(a |another )?(drink|whiskey|scotch|bourbon|glass|vodka)|\\bdowns (a|the) (shot|drink|glass)'), min: 3, tip: 'Vary the habit: the character who never drinks, or who is making the drink for someone else.' },
    { id: 'fourth', name: 'Breaking the Fourth Wall', fam: 'Device', kind: 'device', where: 'A', rx: R('\\b(to camera|looks (directly )?(into|at) (the )?camera|addresses the camera|turns to the camera)\\b'), tip: 'Break the wall once for a reason, not as a habit.' },
    { id: 'amnesia', name: 'Amnesia / Lost Memory', fam: 'Plot device', kind: 'cliche', where: 'AD', rx: R('\\b(amnesia|can\'?t remember (who|anything|what)|lost (his|her) memory|memory loss|don\'?t remember (who|anything))\\b'), tip: 'Make what the character cannot remember a choice rather than an accident.' },
    { id: 'twin', name: 'Twin / Double / Clone', fam: 'Plot device', kind: 'device', where: 'AD', rx: R('\\b(twin brother|twin sister|identical twin|clone|doppelg\\w+|evil twin|lookalike|double)\\b'), min: 2, tip: 'Let the double force the hero to confront something the hero has been avoiding.' },
    { id: 'timetravel', name: 'Time Travel / Loop', fam: 'Plot device', kind: 'device', where: 'AD', rx: R('\\b(time (travel|machine|loop|traveler|traveller)|back in time|paradox|the timeline|alternate timeline|change the past)\\b'), min: 2, tip: 'State the rules once, early, and never bend them without a cost.' },
    { id: 'allhead', name: 'It Was All In His Head', fam: 'Plot device', kind: 'cliche', where: 'AD', rx: R('\\b(all (in )?(his|her|your) (head|mind)|never (existed|real)|was dead (the )?whole time|imaginary (friend|person)|he was never there)\\b'), tip: 'If the reality twist stays, give the audience a clue on every earlier page.' },
    { id: 'dontgo', name: '"Don\'t Go In There"', fam: 'Horror', kind: 'cliche', where: 'D', rx: R('\\b(don\'?t go (in|there|down|up|out)|is anyone there|who\'?s there|hello\\?? ?is (anybody|someone))\\b'), tip: 'Give the character a rational reason to go in.' },
    { id: 'catscare', name: 'The Cat Jump-Scare', fam: 'Horror', kind: 'cliche', where: 'A', rx: R('\\bcat (jumps|leaps|knocks|darts)|it\'?s (just|only) a cat|(just|only) the wind'), tip: 'Use a scare that belongs to this place and these people.' },
    { id: 'partner', name: 'Buddy Partners', fam: 'Character', kind: 'convention', where: 'D', rx: R('\\bpartner\\b'), min: 12, tip: 'Give the partners opposite methods and one belief in common.' },
    { id: 'turnbadge', name: 'Turn In Your Badge', fam: 'Character', kind: 'cliche', where: 'D', rx: R('\\b(turn in your (badge|gun)|you\'?re (off|suspended)|by the book|you\'?re off the case|hand over your (badge|gun))\\b'), tip: 'Let the consequence come from the character’s own violation, not a boss.' },
    { id: 'bad_feeling', name: 'Stock Lines of Dialogue', fam: 'Dialogue', kind: 'cliche', special: 'stock', tip: 'Each stock line can be replaced with the specific thing this character would say.' },
    { id: 'nuclear', name: 'Cold War / Doomsday Device', fam: 'Plot device', kind: 'convention', where: 'AD', rx: R('\\b(nuclear|missile|warhead|doomsday|detonat\\w+ (the )?bomb|launch codes?|red button)\\b'), min: 3, tip: 'Keep the device offscreen and show its threat in faces and procedures.' },
    { id: 'prophet', name: 'Mentor Figure', fam: 'Character', kind: 'convention', where: 'D', rx: R('\\b(old (man|master|friend)|my (teacher|mentor|master)|the (master|mentor)|let me teach you|you have much to learn)\\b'), min: 2, tip: 'Give the mentor a want that conflicts with the hero’s.' },
    { id: 'plantpay', name: 'Planted and Paid-off Objects', fam: 'Structure', kind: 'device', special: 'plant', tip: 'Keep these; add a second payoff in a different register (comic, then tragic).' },
    { id: 'ending_road', name: 'Ending on the Road / Horizon', fam: 'Ending', kind: 'cliche', special: 'endroad', tip: 'Close on an image that carries the theme rather than a general sense of leaving.' },
    { id: 'trap', name: 'Door Closes: Trapped Inside', fam: 'Horror', kind: 'convention', where: 'A', rx: R('\\b(door (slams|locks|slams shut|swings shut|closes behind)|locked in|trapped (inside|in the)|sealed in|no way out)\\b'), min: 3, tip: 'Make the way out visible in the room before it is needed.' },
    { id: 'villainlair', name: 'Evil Lair / Control Room', fam: 'Setting', kind: 'cliche', where: 'H', rx: R('LAIR|HIDEOUT|CONTROL ROOM|COMMAND CENTER|WAR ROOM|BUNKER|SECRET (BASE|FACILITY|LAB)|UNDERGROUND (BASE|COMPLEX|LAB)'), min: 2, tip: 'Make the villain’s space an ordinary one that reveals a habit.' },
    { id: 'drunk', name: 'Drunk / Drug Truth-telling', fam: 'Dialogue', kind: 'convention', where: 'A', rx: R('\\b(drunk|drunkenly|slurs|slurring|stoned|high on|wasted)\\b'), min: 4, tip: 'Use impairment to reveal what the character would hide, but make the other person remember it.' }
  ];
  C.TROPES = T;

  function inWin(h, win, m) { if (!win) return true; var f = (h.pg - 1) / Math.max(1, m.pages); return f >= win[0] && f <= win[1]; }

  C.tropes = function (m, X) {
    var out = [];
    T.forEach(function (t) {
      var hits = [];
      if (t.special) {
        var sp = C.tropeSpecial[t.special]; hits = sp ? sp(m, X) : [];
      } else {
        if (/A/.test(t.where)) hits = hits.concat(X.scanA(t.rx, 200));
        if (/D/.test(t.where)) hits = hits.concat(X.scanD(t.rx, 200));
        if (/H/.test(t.where)) m.live.forEach(function (s) { if (t.rx.test(s.heading || '')) hits.push(X.hitOf(s, s.pg0, s.heading, {})); });
      }
      hits = hits.filter(function (h) { return inWin(h, t.win, m); });
      var seen = {}; hits = hits.filter(function (h) { var k = h.si + '|' + h.q; if (seen[k]) return false; seen[k] = 1; return true; });
      var min = t.min || 1;
      if (hits.length >= min) out.push({ id: t.id, name: t.name, fam: t.fam, kind: t.kind, tip: t.tip, n: hits.length, hits: hits.slice(0, 12) });
    });
    var w = { cliche: 3, convention: 1, device: 0.5 };
    out.sort(function (a, b) { return (b.n * w[b.kind]) - (a.n * w[a.kind]); });
    return out;
  };

  C.tropeSpecial = {
    vo: function (m, X) {
      var hits = []; m.speeches.forEach(function (sp) { if (/\((V\.?O|VOICE ?OVER|NARRAT)/i.test(sp.cue) || /^NARRATOR$/.test(sp.ch)) hits.push(X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, 0, 0, 100), { ch: sp.ch })); });
      return hits.length >= 6 ? hits : [];
    },
    weather: function (m, X) {
      var hits = []; m.live.forEach(function (s) { if (/FUNERAL|CEMETERY|GRAVE|BURIAL|CHURCH/.test(s.heading) && /\b(rain|raining|storm|thunder|overcast|grey sky|gray sky|downpour)\b/i.test(s.aT || '')) hits.push(X.hitOf(s, s.pg0, s.heading, {})); });
      return hits;
    },
    dying: function (m, X) {
      var hits = [];
      m.live.forEach(function (s) {
        s.speeches.forEach(function (sp, k) {
          var li = sp.rows.length ? sp.rows[sp.rows.length - 1].i : -1; if (li < 0) return;
          var near = s.paras.filter(function (p) { return p.li > li && p.li < li + 8; })[0];
          if (near && /\b(dies|goes limp|eyes (close|glaze|roll)|last breath|breathes (his|her) last|head (falls|lolls)|body (goes|falls) (limp|slack))\b/i.test(near.txt) && wc(sp.txt) >= 12) hits.push(X.hitOf(s, sp.pg, C.snip(sp.txt, 0, 0, 100), { ch: sp.ch }));
        });
      });
      return hits;
    },
    villain: function (m, X) {
      var hits = []; var a = X.antag; if (!a) return hits;
      m.speeches.forEach(function (sp) { if (sp.ch === a.name && wc(sp.txt) >= 80 && m.posOf(sp.pg) > 0.6) hits.push(X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, 0, 0, 100), { ch: sp.ch })); });
      return hits;
    },
    rainkiss: function (m, X) {
      var hits = []; m.live.forEach(function (s) { if (/\bkiss(es|ing)?\b/i.test(s.aT || '') && /\b(rain|raining|downpour|storm)\b/i.test(s.aT || '')) hits.push(X.hitOf(s, s.pg0, s.heading, {})); });
      return hits;
    },
    speech: function (m, X) {
      var hits = []; var rx = /\b(together|never give up|we can|we will|fight|believe|stand|brave|courage|today|freedom|our)\b/gi;
      m.speeches.forEach(function (sp) { if (wc(sp.txt) >= 60 && m.posOf(sp.pg) > 0.55 && U.count(rx, sp.txt) >= 3 && !(X.antag && sp.ch === X.antag.name)) hits.push(X.hitOf(m.scenes[sp.sc], sp.pg, C.snip(sp.txt, 0, 0, 100), { ch: sp.ch })); });
      return hits;
    },
    stock: function (m, X) {
      var hits = [];
      L.cliches.forEach(function (c) { var rx = new RegExp(c[1].source, c[1].flags.replace('g', '') + 'g'); X.scanD(rx, 30).forEach(function (h) { h.stock = c[0]; hits.push(h); }); });
      return hits.length >= 3 ? hits : [];
    },
    plant: function (m, X) {
      var res = C.plantPay(m, X); return res.pairs.map(function (p) { return X.hitOf(p.first, p.first.pg0, p.word + ': planted Sc ' + p.first.num + ', paid off Sc ' + p.last.num, {}); }).slice(0, 12);
    },
    endroad: function (m, X) {
      var last = m.live[m.live.length - 1]; if (!last) return [];
      var tail = (last.paras.slice(-2).map(function (p) { return p.txt; }).join(' '));
      if (/\b(sunset|sunrise|horizon|drives? (away|off)|road (stretches|ahead)|walks? (away|off) (into|toward|down)|disappears? (into|over) the)\b/i.test(tail)) return [X.hitOf(last, last.pg0, C.snip(tail, 0, 0, 110), {})];
      return [];
    }
  };

  /* objects planted early (first 35%) and mentioned again late (last 30%) */
  C.plantPay = function (m, X) {
    var rx = new RegExp(window.PH_AUTO.prop.source, 'gi'), by = {};
    m.live.forEach(function (s) { var mm; rx.lastIndex = 0; var seen = {}; while ((mm = rx.exec(s.aT || ''))) { var w = window.PH_NORM ? PH_NORM(mm[0]) : mm[0].toLowerCase(); if (seen[w]) continue; seen[w] = 1; (by[w] = by[w] || []).push(s); } });
    var pairs = [], total = 0;
    Object.keys(by).forEach(function (w) {
      var a = by[w]; if (a.length < 2) return; total++;
      var early = a.filter(function (s) { return m.scenePos(s) <= 0.35; }), late = a.filter(function (s) { return m.scenePos(s) >= 0.7; });
      if (early.length && late.length) pairs.push({ word: w, first: early[0], last: late[late.length - 1], n: a.length });
    });
    pairs.sort(function (x, y) { return y.n - x.n; });
    return { pairs: pairs, total: total };
  };

  /* ---------- genre fingerprint ---------- */
  C.genres = function (m, X) {
    var tx = X.allA + ' ' + X.allD, n = Math.max(1, wc(tx)) / 1000, out = [];
    Object.keys(L.genres).forEach(function (g) { var c = U.count(L.genres[g], tx); out.push({ g: g, raw: c, d: c / n }); });
    var tot = U.sum(out.map(function (o) { return o.d; })) || 1;
    out.forEach(function (o) { o.share = o.d / tot; });
    out.sort(function (a, b) { return b.d - a.d; });
    return out;
  };

  /* ---------- content advisory ---------- */
  C.content = function (m, X) {
    var all = X.allA + ' ' + X.allD, d = X.allD;
    var f = U.count(L.profane.f, all), s = U.count(L.profane.s, all), mild = U.count(L.profane.mild, all), god = U.count(L.profane.god, all);
    var sex = U.count(L.sexual, all), vio = U.count(L.violence, all), drug = U.count(L.drugs, all);
    var hits = { f: X.scanD(L.profane.f, 8).concat(X.scanA(L.profane.f, 4)), vio: X.scanA(L.violence, 400), sex: X.scanA(L.sexual, 8).concat(X.scanD(L.sexual, 4)) };
    var vioDen = vio / Math.max(1, m.pages);
    var tier = 'G';
    if (mild + god > 0 || vio > 5) tier = 'PG';
    if (s > 0 || (f > 0 && f <= 3) || vioDen > 0.6 || sex > 3 || drug > 12) tier = 'PG-13';
    if (f >= 4 || sex >= 12 || vioDen > 1.8 || s > 25) tier = 'R';
    var reasons = [];
    if (f) reasons.push(f + ' uses of the strongest profanity' + (f > 3 ? ' (more than four usually means R)' : ''));
    if (s) reasons.push(s + ' uses of “shit”');
    if (vio) reasons.push(vio + ' violent words (' + vioDen.toFixed(1) + ' per page)');
    if (sex) reasons.push(sex + ' sexual references');
    if (drug) reasons.push(drug + ' drink or drug references');
    return { f: f, s: s, mild: mild, god: god, sex: sex, vio: vio, drug: drug, vioDen: vioDen, tier: tier, reasons: reasons, hits: hits };
  };

  /* ---------- production complexity (budget legibility) ---------- */
  C.complexity = function (m, X) {
    var live = m.live, n = Math.max(1, live.length), tags = { stunt: 0, vfx: 0, extra: 0, vehicle: 0, animal: 0, sfx: 0, vfxScenes: 0 };
    var rxs = {}; Object.keys(window.PH_AUTO).forEach(function (k) { rxs[k] = new RegExp(window.PH_AUTO[k].source, 'gi'); });
    var per = live.map(function (s) {
      var t = s.aT || '', sc = 0, c = {};
      ['stunt', 'vfx', 'extra', 'vehicle', 'animal', 'sfx'].forEach(function (k) { var x = U.count(rxs[k], t); c[k] = x; tags[k] += x; if (x) sc += k === 'vfx' ? 3 : k === 'stunt' ? 3 : k === 'animal' ? 2 : 1; });
      if (/NIGHT/.test(s.heading)) sc += 1; if (/^EXT/.test(s.ie)) sc += 1; sc += Math.min(4, s.speeches.map(function (x) { return x.ch; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).length / 2);
      return sc;
    });
    var cast = m.order.filter(function (c) { return c.speeches >= 3; }).length;
    var locs = X.locs.length, night = X.night / n, ext = X.ext / n;
    var score = Math.min(1, ((tags.stunt + tags.vfx * 2 + tags.vehicle + tags.animal) / n) / 3) * 30 + Math.min(1, cast / 60) * 20 + Math.min(1, locs / 90) * 20 + night * 15 + ext * 15;
    var tier = score < 22 ? 'Micro / low budget' : score < 42 ? 'Modest budget' : score < 62 ? 'Mid-budget' : 'High budget';
    var cv = U.stdev(per) / (U.mean(per) || 1);
    return { tags: tags, cast: cast, locs: locs, night: night, ext: ext, score: score, tier: tier, cv: cv, per: per };
  };
})();
