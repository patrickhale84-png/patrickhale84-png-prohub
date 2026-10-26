/* proHUB Script Coverage: shared helpers, vocabularies and the script model.
   Everything here is rules-based and deterministic: the same script always gives the same numbers. */
(function () {
  'use strict';
  var C = window.PHCov = window.PHCov || {};

  /* ---------- small helpers ---------- */
  function W(s) { return String(s || '').match(/[A-Za-z0-9][A-Za-z0-9'’-]*/g) || []; }
  function wc(s) { return W(s).length; }
  function lc(s) { return String(s || '').toLowerCase(); }
  function sum(a) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i]; return t; }
  function mean(a) { return a.length ? sum(a) / a.length : 0; }
  function median(a) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y; }), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
  function stdev(a) { if (a.length < 2) return 0; var m = mean(a); return Math.sqrt(mean(a.map(function (x) { return (x - m) * (x - m); }))); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pctile(a, p) { if (!a.length) return 0; var b = a.slice().sort(function (x, y) { return x - y; }); var i = (b.length - 1) * p; var lo = Math.floor(i), hi = Math.ceil(i); return b[lo] + (b[hi] - b[lo]) * (i - lo); }
  function sentences(s) {
    s = String(s || '').replace(/\s+/g, ' ').trim(); if (!s) return [];
    var out = [], cur = '', parts = s.split(/(?<=[.!?…]["')\]]?)\s+/);
    parts.forEach(function (p) {
      if (cur && /(^|\s)(Mr|Mrs|Ms|Dr|St|Jr|Sr|Capt|Col|Gen|Sgt|Lt|Mt|vs|etc|No)\.$/.test(cur)) cur += ' ' + p;
      else { if (cur) out.push(cur); cur = p; }
    });
    if (cur) out.push(cur);
    return out;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function rxList(str, flags) { return new RegExp('\\b(?:' + str.trim().split(/\s+/).map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/_/g, '\\s+'); }).join('|') + ')\\b', flags || 'gi'); }
  function count(rx, s) { var m = String(s || '').match(rx); return m ? m.length : 0; }
  function title(s) { return String(s || '').toLowerCase().replace(/(^|[\s'’-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }
  function lev(a, b) {
    if (a === b) return 0; if (Math.abs(a.length - b.length) > 2) return 3;
    var p = [], i, j; for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) { var c = [i]; for (j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
    return p[b.length];
  }
  /* map a measured value onto 1..10: inside `good` = 10, at the edge of `ok` = 6, falling to 1 beyond */
  function band(v, good, ok) {
    if (v >= good[0] && v <= good[1]) return 10;
    var lo = v < good[0], edge = lo ? ok[0] : ok[1], g = lo ? good[0] : good[1];
    var span = Math.abs(g - edge) || 1, d = Math.abs(v - g);
    if (d <= span) return 10 - 4 * d / span;
    var far = Math.abs(ok[1] - ok[0]) || 1;
    return clamp(6 - 5 * (d - span) / (far * 0.6), 1, 6);
  }
  function lin(v, a, b) { if (a === b) return 5.5; return clamp(1 + 9 * (v - a) / (b - a), 1, 10); }
  C.util = { W: W, wc: wc, lc: lc, sum: sum, mean: mean, median: median, stdev: stdev, clamp: clamp, pctile: pctile, sentences: sentences, esc: esc, rxList: rxList, count: count, title: title, lev: lev, band: band, lin: lin };

  /* ---------- vocabularies ---------- */
  var L = C.LEX = {};
  L.stakes = rxList('die dies dead death kill killed killing murder lose lost losing save saving survive survival last_chance only_chance everything nothing_left or_else deadline countdown hostage ransom war end_of_the_world destroy destroyed doomed trapped running_out_of_time no_way_out');
  L.stakesIf = /\b(if we don'?t|if I don'?t|or (else|they'?ll|we'?ll|I'?ll|he'?ll|she'?ll|everyone)|unless|before (it'?s|they|he|she|we|the) |or we'?re (all )?(dead|finished|done)|your life|our lives)\b/gi;
  L.threat = rxList('kill die dead hate destroy enemy pay mine weak fool power blood gun death hurt afraid never revenge crush finish punish suffer beg bury traitor liar coward');
  L.conflict = rxList('kill die dead shoot fire run help no stop gun blood fight scream hurt attack bomb dead murder enemy trap escape hide danger afraid lie liar betray');
  L.deflect = /\b(never ?mind|forget it|it'?s nothing|i'?m fine|doesn'?t matter|whatever|drop it|leave it|not now|let'?s not|some other time|it'?s (nothing|fine|okay)|i don'?t (want to )?(talk|discuss))\b/gi;
  L.onNose = /\b(i feel (so |really |very )?(sad|angry|scared|alone|lost|guilty|hurt|empty|happy|afraid|worthless)|i'?m (so |really |very )?(sad|angry|scared|afraid|lonely|jealous|hurt|depressed|worthless|heartbroken)|you make me feel|what i'?m trying to say|the thing is|i just want you to know|i need you to understand|let me explain|here'?s the thing|the truth is|i have to tell you|i don'?t know how to say|i love you so much|you don'?t understand how|i'?ve always (loved|hated|wanted|been afraid))\b/gi;
  L.exposition = /\b(as you know|you know that|remember when|like i (told|said to) you|as i (said|told you)|you already know|as we (all )?know|you'?re aware|let me remind you|in case you forgot|you were (born|raised|there)|we'?ve been (partners|friends|married) for|my (late )?(wife|husband|father|mother) (died|was)|ten years ago|twenty years ago|years ago i)\b/gi;
  L.filler = /\b(um+|uh+|you know|i mean|well,|so,|like,|kind of|sort of|basically|actually|literally|honestly)\b/gi;
  L.greet = /^(hi|hello|hey|good (morning|evening|afternoon)|how are you|what'?s up|how'?s it going)\b/i;
  L.bye = /\b(bye|goodbye|see you|take care|talk (to you )?later|good ?night)\W*$/i;
  L.unfilm = /\b(thinks?|thought|realizes?|realized|remembers?|remembered|wonders?|wondered|knows?|knew|decides?|decided|wishes|wished|hopes?|hoped|imagines?|imagined|understands?|understood|believes?|believed|feels? (that|like|as if|a (sense|pang|wave))|is (someone|a man|a woman) who|has always|used to|can'?t help but|doesn'?t (know|realize)|(we|he|she|they|it) (learn|learns|realize|realizes)|reminds? (him|her|them)|reminiscent|nostalgi\w+|(hate|hates|love|loves|fear|fears|want|wants|need|needs|miss|misses) (him|her|them|it|this|that|everything))\b/gi;
  L.hedge = /\b(begins? to|starts? to|seems? to|appears? to|tries to|attempts? to|looks? like|kind of|sort of|almost|nearly|seemingly|apparently|somehow)\b/gi;
  L.camera = /\b(ANGLE ON|CLOSE ON|CLOSE-UP|CLOSEUP|CLOSE UP|WIDE ON|WIDE SHOT|PAN TO|PANS|TRACKING|TRACK ON|POV|WE SEE|WE HEAR|WE FOLLOW|WE PUSH|WE PULL|CAMERA|PUSH IN|PULL BACK|ZOOM|INSERT|ON SCREEN|REVEAL|SMASH CUT|MATCH CUT|CUT TO|FADE)\b/g;
  L.passive = /\b(is|are|was|were|being|been|be) (\w+ed|shot|hit|seen|taken|given|found|caught|made|thrown|driven|held|left|torn|broken|known|done|killed|struck|forced)( by\b|\b)/gi;
  L.progressive = /\b(is|are) (\w+ing)\b/gi;
  L.pastRx = /\b(walked|looked|turned|opened|closed|stood|sat|ran|went|came|saw|took|picked|grabbed|stared|smiled|nodded|moved|pulled|pushed|reached|crossed|entered|stepped|jumped|fell|rose|held|threw|watched|waited|said|asked|replied|answered|began|started|stopped|lit|put|set|left|walked|drove|climbed|opened|shut|slammed)\b/gi;
  L.presentRx = /\b(walks|looks|turns|opens|closes|stands|sits|runs|goes|comes|sees|takes|picks|grabs|stares|smiles|nods|moves|pulls|pushes|reaches|crosses|enters|steps|jumps|falls|rises|holds|throws|watches|waits|says|asks|replies|answers|begins|starts|stops|lights|puts|sets|leaves|drives|climbs|shuts|slams)\b/gi;
  L.adverb = /\b\w{3,}ly\b/gi;
  L.notAdverb = /^(only|family|early|likely|lonely|friendly|lovely|silly|belly|jelly|holy|ugly|daily|ally|rely|reply|apply|supply|fly|july|italy|rally|bully|curly|lily|molly|billy|sally|emily|kelly|holly|dolly|wally|ally|assembly|butterfly|anomaly|monopoly|homily|comply|imply|multiply|oily|hilly|jolly|surly|wily|gully|folly|tally|bubbly|scaly|woolly|chilly|silly|deadly|costly|elderly|orderly|timely|lively|manly|unlikely|likely|friendly|ghastly|ghostly|ugly|ably)$/i;
  L.melo = /\b(sobs?|weeps?|wails?|screams? in (agony|despair|anguish)|tears (stream|roll|well|pour)|a single tear|bursts into tears|falls to (his|her|their) knees|collapses (in|into) tears|heart ?broken|devastated|anguish\w*|agoniz\w+)\b/gi;
  L.body = rxList('swallows trembles shakes shivers clenches flinches blinks jaw breath breathes exhales inhales sweat sweats blushes flushes tears gasps winces grimaces shudders stiffens tenses fists knuckles throat lip bites_her_lip bites_his_lip pulse heartbeat goosebumps hands_shake voice_cracks');
  L.reaction = rxList('smiles frowns hesitates swallows trembles flinches stares glances nods shrugs sighs winces grimaces blinks pauses freezes stiffens laughs grins smirks recoils softens relaxes tenses clenches flushes');
  L.observe = /^(is|are|looks?|watch\w*|stares?|listens?|waits?|sits?|stands?|sees?|hears?|notices?|remains?|stays?|seems?|appears?|glances?|gazes?|regards?|observes?|considers?)$/i;
  L.sense = {
    sound: rxList('hum hums humming buzz buzzes buzzing roar roars rumble rumbles echo echoes clatter clatters creak creaks creaking hiss hisses thud thuds whisper whispers whispering rattle rattles drone drones ring rings chime chimes crackle crackles pounding murmur murmurs murmuring squeak squeaks groan groans click clicks clicking static howl howls wail wails siren sirens screech screeches'),
    touch: rxList('rough smooth cold warm hot cool damp wet dry slick sticky sharp soft hard coarse gritty icy burning numb sweaty greasy silky velvet leather rust rusty splinter splinters texture stinging'),
    smell: rxList('smell smells smelling stench scent reeks reek aroma odor fragrance perfume musty rotten stink stinks sour acrid'),
    taste: rxList('taste tastes tasting bitter sweet salty sour metallic coppery flavor'),
    sight: rxList('glint glints glow glows glowing flicker flickers flickering shimmer shadow shadows gleam gleams dim dimly bright blinding haze mist fog dusty faded stained cracked peeling')
  };
  L.humor = rxList('laughs laughing laughter laughter chuckles giggles grins smirks joke jokes joking funny kidding snickers amused hilarious punchline comic');
  L.grief = rxList('funeral grave burial coffin casket mourn mourns mourning grief grieving widow widower condolences died passed_away loss lost_his lost_her obituary cemetery tombstone');
  L.release = rxList('tears hug hugs hugged embrace embraces laughs laughter exhales breath silence smiles weeps cries sobs kneels collapses rests relief forgive forgives peace home sunrise');
  L.selfGoal = /\b(i want|i need|i'?m going to|i have to|i'?ve got to|i must|i will|i'?ll|i can'?t|i won'?t|i'?m not going to|let'?s|we have to|we need to|we'?ve got to|we must|gotta)\b/gi;
  L.backstoryTell = /\b(when i was (a )?(kid|child|boy|girl|young|little|your age)|back then|years ago|my (father|dad|mother|mom|brother|sister|wife|husband) (used to|always|never|died|was)|growing up|i grew up|ever since i was|long time ago|in those days)\b/gi;
  L.backstoryShow = /\b(old photo\w*|faded|framed (photo|picture)|scar|scars|worn|tattoo|wedding ring|medal|medals|trophy|trophies|yellowed|dusty|childhood|keepsake|heirloom|diary|letters? from|uniform|dog tags|name ?tag|initials)\b/gi;
  L.setup = /\b(something'?s wrong|bad feeling|i have a feeling|promise me|never again|don'?t (ever|forget)|remember this|mark my words|one day|someday|you'?ll see|before (it'?s|this is) over|if anything happens|just in case|keep this|take this)\b/gi;
  L.moral = /\b(had to|no choice|right thing|wrong thing|deserve\w*|forgive\w*|guilt\w*|innocent|fair|justice|conscience|sin|sins|sinned|blame|responsib\w+|consequence\w*|worth it|lesser evil|greater good|crime|punish\w*)\b/gi;
  L.social = rxList('government corporation company police cops court judge prison jail army military senator president mayor union class poor rich money debt rent job boss workers immigrant refugee race racist gender rights law laws media news press church school hospital insurance bank taxes politics political rebellion revolution protest');
  L.universal = rxList('family mother father mom dad son daughter brother sister child children baby wife husband home house friend love hope fear death money food water sleep dream dreams kiss birthday wedding funeral school life');
  L.simile = /\b(like a|like an|as if|as though|as \w+ as|resembl\w+|reminiscent of|the way a)\b/gi;
  L.silence = /\b(beat|silence|pause|a moment|says nothing|doesn'?t (answer|respond|speak|reply)|no (answer|response|reply)|(is )?silent|speechless|long look|holds (his|her|the) (gaze|look))\b/gi;
  L.suspense = rxList('silence shadow shadows creak creaks creaking footsteps whisper whispers dark darkness quiet still waiting listens echo cold breath door_opens slowly distant behind');
  L.homophone = [];
  L.profane = { f: /\bf+u+c+k\w*|\bmotherf\w+/gi, s: /\bshit\w*/gi, mild: /\b(bitch\w*|bastard\w*|dick|asshole\w*|pussy|cock|cunt|damn\w*|goddamn\w*|hell|piss\w*|crap)\b/gi, god: /\b(jesus christ|goddamn\w*|for christ'?s sake|oh my god)\b/gi };
  L.sexual = rxList('sex sexual naked nude breasts orgasm makes_love making_love undresses undressed strips topless lingerie bed_together aroused erection intercourse seduces seduction moans moaning bedroom_scene panties bra thrust');
  L.violence = rxList('kills killed shoots shot stabs stabbed blood bloody corpse corpses wound wounded wounds gunshot gunfire explodes explosion bomb beaten beats punches strangles choked chokes dead body bodies decapitated severed gore torture tortured slashes executes executed massacre slaughter');
  L.drugs = rxList('cocaine heroin meth marijuana weed joint pills syringe overdose high stoned drunk drinks whiskey vodka beer wine bourbon scotch liquor bottle needle crack acid lsd mushrooms cigarette cigarettes smokes');
  L.slurs = /\b(retard\w*|spaz\w*|crippl\w*|gypsy|gypsies|savage\w*|primitive|exotic|oriental|colored|midget\w*|tranny|faggot\w*|fag|dyke|nigg\w+|chink\w*|spic\w*|wetback\w*|kike\w*|redskin\w*|squaw|hysterical|crazy|insane|lunatic|psycho|schizo|bipolar|mental)\b/gi;
  L.slurHard = /\b(retard\w*|spaz|tranny|faggot\w*|fag|dyke|nigg\w+|chink\w*|spic\w*|wetback\w*|kike\w*|redskin\w*|squaw|gypsy|gypsies|oriental|midget\w*)\b/gi;
  L.generic = /^(room|house|home|street|road|office|kitchen|bedroom|bathroom|living room|hallway|hall|building|car|apartment|restaurant|bar|store|shop|field|yard|garden|park|forest|woods|city|town|lobby|stairs|staircase|corridor|alley|parking lot|porch|garage|basement|attic|school|classroom|hospital|church|cell|warehouse|factory|beach|lake|river|mountain|desert|farm|barn|bridge|tunnel|elevator|roof|rooftop|balcony|courtyard|cafeteria|kitchenette|den|study|library|dining room|waiting room|hotel room|motel room|airport|train station|station)$/i;
  L.period = [
    { y: [0, 1990], bad: /\b(cell ?phone|smart ?phone|internet|e-?mail|text message|texting|wifi|wi-fi|google|facebook|laptop|selfie|download|website|online|app|usb|dvd|gps|bluetooth|podcast|streaming|hashtag|twitter|instagram|youtube|uber|iphone|android|emoji)\b/gi },
    { y: [0, 1960], bad: /\b(television set|tv|computer|microwave|zip code|teenager|jet lag|astronaut|laser|transistor|credit card|plastic surgery)\b/gi },
    { y: [0, 1920], bad: /\b(okay|ok|radio|airplane|movie|movies|telephone booth|supermarket|teenager|weekend|jazz|hello)\b/gi }
  ];
  /* theme families: word stems that mark a theme when they cluster */
  L.themes = {
    'justice and revenge': rxList('justice revenge vengeance avenge punish punishment law crime guilty innocent trial verdict sentence deserve judge'),
    'love and desire': rxList('love loved loves loving lover kiss desire passion heart romance affair marry marriage wedding longing adore'),
    'family and belonging': rxList('family mother father mom dad son daughter brother sister home child children parents belong orphan blood_ties'),
    'power and corruption': rxList('power control corrupt corruption authority obey rule rules command order orders king throne greed ambition empire'),
    'freedom and confinement': rxList('free freedom escape prison trapped cage locked chains confined captive imprisoned liberty cell'),
    'truth and deception': rxList('truth lie lies liar lying secret secrets hidden conceal betray betrayal fake pretend deceive mask trick'),
    'faith and doubt': rxList('god faith prayer pray church believe belief doubt soul heaven hell sin devil miracle religion priest'),
    'identity and self': rxList('identity who_am_i myself yourself real fake name mask become changed pretend self remember forget'),
    'survival and fear': rxList('survive survival fear afraid terror run hide escape alive dying danger threat panic trapped'),
    'guilt and redemption': rxList('guilt guilty forgive forgiveness redeem redemption sorry regret atone mistake blame shame sin'),
    'loyalty and betrayal': rxList('loyal loyalty trust betray betrayal friend friends partner promise traitor faithful abandon'),
    'war and duty': rxList('war duty honor soldier battle enemy mission orders sacrifice country fight army hero'),
    'ambition and success': rxList('success dream ambition win winning ahead career rich money fame prove champion famous achieve'),
    'isolation and connection': rxList('alone lonely loneliness isolated nobody together connection stranger distance abandoned silence apart'),
    'memory and time': rxList('remember memory memories forget past future time yesterday tomorrow years ago history before again'),
    'mortality and loss': rxList('death die dying dead grave funeral loss lost mourn grief gone widow mortality'),
    'class and money': rxList('money poor rich debt rent job boss wages afford broke wealthy owe bank cheap expensive'),
    'nature and technology': rxList('machine computer technology system nature animals forest science experiment future robot virus signal program')
  };
  L.genres = {
    horror: rxList('scream screams blood dark darkness creaks shadow shadows monster killer corpse ghost fear terrified masked knife victim grave haunted demon evil nightmare'),
    thriller: rxList('chase gun agent conspiracy bomb hostage kill detective suspect secret trap spy surveillance escape ransom'),
    crime: rxList('detective cop police murder victim badge evidence suspect robbery gangster cigarette whiskey crime scene case captain lieutenant interrogation'),
    war: rxList('soldier soldiers troops battle trench captain sergeant enemy bunker grenade platoon rifle artillery regiment sir mission beach general'),
    scifi: rxList('space ship alien laser planet robot computer android future scientist experiment spacecraft orbit signal system virus time_travel'),
    comedy: rxList('laughs joke awkward grins giggles embarrassed prank party drunk funny kidding ridiculous silly stupid idiot'),
    drama: rxList('cries tears family hospital funeral mother father silence hugs sobs truth marriage divorce sick doctor'),
    romance: rxList('kiss kisses love wedding date flowers embrace dance beautiful darling honey sweetheart'),
    action: rxList('explodes chase gunfire fight crash punches kicks bullets grenade helicopter car_chase tackles'),
    fantasy: rxList('sword magic wizard king dragon castle spell kingdom queen prince quest sorcerer'),
    western: rxList('saloon sheriff horse ranch rifle outlaw desert cattle posse frontier cowboy'),
    adventure: rxList('island jungle expedition treasure map explore ship river mountain cave journey')
  };
  /* common misspellings and typos with fixes (applied as whole words, case kept) */
  L.typos = {
    recieve: 'receive', recieved: 'received', seperate: 'separate', seperated: 'separated', definately: 'definitely', definatly: 'definitely', occured: 'occurred', occuring: 'occurring', untill: 'until', wierd: 'weird',
    beleive: 'believe', tommorow: 'tomorrow', tomorow: 'tomorrow', accomodate: 'accommodate', adress: 'address', begining: 'beginning', calender: 'calendar', comming: 'coming', existance: 'existence',
    foriegn: 'foreign', freind: 'friend', freinds: 'friends', goverment: 'government', happend: 'happened', immediatly: 'immediately', independant: 'independent', knowlege: 'knowledge', liason: 'liaison',
    millenium: 'millennium', neccessary: 'necessary', necesary: 'necessary', noticable: 'noticeable', occassion: 'occasion', persistant: 'persistent', posession: 'possession', prefered: 'preferred',
    publically: 'publicly', realy: 'really', refered: 'referred', relevent: 'relevant', rythm: 'rhythm', succesful: 'successful', successfull: 'successful', suprise: 'surprise', suprised: 'surprised',
    tendancy: 'tendency', thier: 'their', truely: 'truly', wich: 'which', writting: 'writing', wether: 'whether', alot: 'a lot', infront: 'in front', noone: 'no one', irregardless: 'regardless',
    supposably: 'supposedly', accross: 'across', agressive: 'aggressive', apparant: 'apparent', arguement: 'argument', basicly: 'basically', buisness: 'business', carefull: 'careful', catagory: 'category',
    cemetary: 'cemetery', collegue: 'colleague', concious: 'conscious', curiousity: 'curiosity', decieve: 'deceive', desparate: 'desperate', dissapear: 'disappear', dissapoint: 'disappoint',
    embarass: 'embarrass', enviroment: 'environment', excellant: 'excellent', exagerate: 'exaggerate', familar: 'familiar', finaly: 'finally', fourty: 'forty', gaurd: 'guard', garantee: 'guarantee', harrass: 'harass',
    hieght: 'height', humourous: 'humorous', ignorence: 'ignorance', intresting: 'interesting', jewelery: 'jewelry', judgement: 'judgment', lenght: 'length', lightening: 'lightning', maintainance: 'maintenance',
    mispell: 'misspell', neice: 'niece', ocassion: 'occasion', oppurtunity: 'opportunity', paralel: 'parallel', pasttime: 'pastime', percieve: 'perceive', playwrite: 'playwright', possable: 'possible',
    probly: 'probably', priviledge: 'privilege', pronounciation: 'pronunciation', questionaire: 'questionnaire', reccomend: 'recommend', rediculous: 'ridiculous', religous: 'religious', remeber: 'remember',
    resistence: 'resistance', responsability: 'responsibility', sargent: 'sergeant', scedule: 'schedule', sentance: 'sentence', sieze: 'seize', similiar: 'similar', sincerly: 'sincerely', speach: 'speech',
    strenght: 'strength', surprize: 'surprise', temperture: 'temperature', thourough: 'thorough', tounge: 'tongue', tyrany: 'tyranny', vaccuum: 'vacuum', vegtable: 'vegetable', visable: 'visible',
    wensday: 'Wednesday', whereever: 'wherever', wich: 'which', wont: "won't", dont: "don't", cant: "can't", isnt: "isn't", doesnt: "doesn't", didnt: "didn't", couldnt: "couldn't", wouldnt: "wouldn't",
    shouldnt: "shouldn't", wasnt: "wasn't", werent: "weren't", havent: "haven't", hasnt: "hasn't", youre: "you're", theyre: "they're", thats: "that's", whats: "what's", ive: "I've", im: "I'm", hes: "he's",
    shes: "she's", aint: "ain't", couldve: "could've", wouldve: "would've", shouldve: "should've", lets: "let's"
  };
  L.typoRisky = { wont: 1, lets: 1, hes: 1, shes: 1, im: 1, ive: 1, thats: 1, whats: 1, aint: 1 };
  L.cliches = [
    ['I have a bad feeling about this', /\bbad feeling about (this|that)\b/i], ['We\'re running out of time', /\brunning out of time\b/i], ['It\'s too quiet', /\btoo quiet\b/i],
    ['Let\'s split up', /\blet'?s split up\b/i], ['What could possibly go wrong', /\bwhat could (possibly )?go wrong\b/i], ['I\'m too old for this', /\btoo old for (this|that)\b/i],
    ['This isn\'t over', /\bthis (isn'?t|is not) over\b/i], ['You have no idea what you\'re dealing with', /\byou have no idea (what|who) you'?re (dealing|messing) with\b/i],
    ['Trust me', /\btrust me\b/i], ['I can explain', /\bi can explain\b/i], ['It\'s complicated', /\bit'?s complicated\b/i], ['We need to talk', /\bwe (need|have) to talk\b/i],
    ['Who are you?', /\bwho (the hell )?are you\??\s*$/i], ['What the hell is going on?', /\bwhat the (hell|fuck) is going on\b/i], ['You don\'t understand', /\byou don'?t understand\b/i],
    ['It\'s not what it looks like', /\bnot what it looks like\b/i], ['I\'ll be back', /\bi'?ll be back\b/i], ['Get out of here', /\bget (the hell )?out of here\b/i], ['Stay with me', /\bstay with me\b/i],
    ['You\'re not going to die', /\byou'?re not going to die\b/i], ['I\'m getting too close', /\bgetting too close\b/i], ['Not on my watch', /\bnot on my watch\b/i], ['Over my dead body', /\bover my dead body\b/i],
    ['Do you trust me?', /\bdo you trust me\b/i], ['Follow my lead', /\bfollow my lead\b/i], ['Nobody gets hurt', /\bnobody gets hurt\b/i], ['We\'re not so different', /\b(we'?re|you and i are) not (so|that) different\b/i],
    ['You\'ll never get away with this', /\bnever get away with this\b/i], ['Wait, what?', /^wait,? what\??$/i], ['It\'s a trap', /\bit'?s a trap\b/i], ['Say something!', /^say something[.!]*$/i]
  ];
  L.imageWords = rxList('light dark dawn dusk sun moon sky sea ocean water road door window face eyes hand hands tree snow rain fire smoke silence shadow home empty alone distance horizon fade black white');
  L.goalVerbs = /\b(?:have to|need to|must|going to|gonna|got to|gotta|want to|trying to|try to|here to|come to|came to|plan to|intend to|will)\s+((?:find|get|stop|save|catch|kill|reach|escape|rescue|bring|protect|destroy|prove|win|survive|stay|bury|deliver|steal|free|expose|take|make|build|fix|break|solve|understand|convince|return|retrieve|recover|warn|defend|win|beat|leave|clear)(?:\s+[a-z'’-]+){1,5})/gi;
  L.roles = ['detective', 'cop', 'police officer', 'soldier', 'captain', 'sergeant', 'lieutenant', 'colonel', 'doctor', 'surgeon', 'nurse', 'teacher', 'professor', 'student', 'lawyer', 'judge', 'scientist', 'journalist', 'reporter', 'writer', 'author', 'thief', 'burglar', 'killer', 'assassin', 'hitman', 'mother', 'father', 'widow', 'widower', 'boy', 'girl', 'teenager', 'priest', 'sheriff', 'deputy', 'pilot', 'astronaut', 'agent', 'spy', 'farmer', 'chef', 'cook', 'musician', 'singer', 'artist', 'painter', 'boxer', 'fighter', 'cowboy', 'outlaw', 'gambler', 'convict', 'prisoner', 'mercenary', 'engineer', 'mechanic', 'driver', 'taxi driver', 'waitress', 'bartender', 'banker', 'salesman', 'secretary', 'photographer', 'psychiatrist', 'therapist', 'drifter', 'orphan', 'king', 'queen', 'prince', 'princess', 'knight', 'wizard', 'hacker', 'programmer', 'ranger', 'marine', 'sailor', 'fisherman', 'miner', 'racer', 'athlete', 'coach', 'ex-cop', 'ex-con', 'veteran', 'immigrant', 'refugee', 'nanny', 'janitor', 'clerk', 'accountant', 'architect', 'inventor', 'director', 'actor', 'actress'];
  L.genreName = { horror: 'horror', thriller: 'thriller', crime: 'crime drama', war: 'war drama', scifi: 'science-fiction', comedy: 'comedy', drama: 'drama', romance: 'romance', action: 'action', fantasy: 'fantasy', western: 'western', adventure: 'adventure' };

  /* ---------- the script model ---------- */
  var RL = 54; /* rendered lines per page */
  function parseMeta(raw) {
    var meta = { title: '', author: '' }, m;
    if (/<(html|head|body|title|script)\b/i.test(raw.slice(0, 4000))) {
      var tm = /<title[^>]*>([^<]{1,120})<\/title>/i.exec(raw);
      raw = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head)\b[\s\S]*?<\/\1>/gi, '');
      if (tm && !meta.title) { var tt = tm[1].replace(/\s*[-|:]\s*(script|screenplay|imsdb|.*movie script).*$/i, '').replace(/\s+(script|screenplay)$/i, '').trim(); if (tt && /[A-Za-z]/.test(tt)) meta.title = tt; }
    }
    m = raw.match(/^\s*Title:\s*(.+)$/im); if (m) meta.title = m[1].trim();
    m = raw.match(/^\s*Author:\s*(.+)$/im); if (m) meta.author = m[1].trim();
    if (!meta.title || !meta.author) {
      var head = raw.split(/\r?\n/).slice(0, 80).map(function (r) { return r.replace(/<[^>]+>/g, '').trim(); });
      var cut = head.findIndex(function (r) { return /^\s*(\d+\s+)?(INT|EXT|I\/E)[.\s\/]/i.test(r) || /^FADE IN/i.test(r); }); if (cut < 0) cut = head.length;
      var pre = head.slice(0, cut).filter(Boolean);
      if (!meta.title) {
        var t = pre.find(function (r) { return !/[a-z]/.test(r) && r.length > 1 && r.length < 70 && !/^(FADE|CUT|SUPER|TITLE)/.test(r) && !/^[-_=*]+$/.test(r); });
        if (!t) t = pre.find(function (r) { return /^(?:[A-Z]\s){4,}[A-Z]$/.test(r.trim()); });
        if (t) meta.title = /^(?:[A-Za-z]\s){3,}[A-Za-z]/.test(t) ? t.replace(/\s{2,}/g, '\u0001').replace(/\s/g, '').replace(/\u0001/g, ' ') : t;
      }
      if (!meta.author) { for (var i = 0; i < pre.length; i++) { var a = pre[i].match(/^(?:written\s+)?by\s*:?\s*(.*)$/i); if (a) { meta.author = (a[1] || pre[i + 1] || '').trim(); break; } } }
    }
    meta.title = meta.title.replace(/\s+(?:movie\s+)?script\s+by\b.*$/i, '').replace(/\s+-\s+by\b.*$/i, '').replace(/:\s*(final|draft|shooting script)\b.*$/i, '').replace(/^["'“”]+|["'“”]+$/g, '').replace(/\s+/g, ' ').trim();
    if (meta.title.length > 70) meta.title = '';
    return meta;
  }

  C.model = function (raw, opts) {
    opts = opts || {};
    raw = String(raw || '').replace(/\r/g, '');
    var S = window.PHScript, meta = parseMeta(raw);
    var body = raw.replace(/^\s*(Title|Author|Credit|Source|Draft date|Contact|Copyright):.*$/gim, '');
    var L0 = S.parseText(body);
    L0.forEach(function (l, i) { l.i = i; });
    var orphans = [];
    L0.forEach(function (l, i) { if (l.type === 'character') { var nx = L0[i + 1]; if (!nx || (nx.type !== 'dialogue' && nx.type !== 'parenthetical')) orphans.push(i); } });
    var scenes = S.derive(L0);
    var m = { raw: raw, meta: meta, lines: L0, scenes: scenes, orphans: orphans, fmt: opts.format || 'FEATURE', speeches: [], paras: [], chars: {}, order: [] };
    var cum = 0, wordsA = 0, wordsD = 0, charNames = {};
    scenes.forEach(function (s, si) {
      s.idx = si; s.hli = null; if (s.lines.length) { var f0 = s.lines[0].i; if (f0 > 0 && L0[f0 - 1] && L0[f0 - 1].type === 'scene-heading') s.hli = f0 - 1; else if (s.lines[0].type === 'scene-heading') s.hli = f0; else s.hli = f0; } s.pg0 = cum / RL; var rl = 2; s.speeches = []; s.paras = []; s.trans = [];
      var cur = null, lastAct = false, wA = 0, wD = 0, rawHead = '';
      s.lines.forEach(function (l) {
        var t = String(l.text || '').trim(); if (!t) return;
        var ty = l.type;
        if (ty === 'character') {
          var nm = window.SNCue ? (SNCue.name(t) || S.cname(t)) : S.cname(t);
          cur = { ch: nm, cue: t, txt: '', par: [], rows: [], sc: si, pg: (cum + rl) / RL, li: l.i };
          s.speeches.push(cur); m.speeches.push(cur); rl += 1; lastAct = false;
        } else if (ty === 'parenthetical') { if (cur) cur.par.push(t); rl += 1; lastAct = false; }
        else if (ty === 'dialogue' && cur) { cur.txt += (cur.txt ? ' ' : '') + t; cur.rows.push(l); rl += Math.ceil(t.length / 35); wD += wc(t); lastAct = false; }
        else if (ty === 'transition') { s.trans.push({ text: t, li: l.i, pg: (cum + rl) / RL }); rl += 2; cur = null; lastAct = false; }
        else { /* action, or dialogue with no speaker */
          cur = null;
          var np = !lastAct || l.pb;
          if (np) { var p = { txt: t, rows: [l], sc: si, pg: (cum + rl) / RL, li: l.i, rl: 0 }; s.paras.push(p); m.paras.push(p); rl += 1; }
          else { var q = s.paras[s.paras.length - 1]; q.txt += ' ' + t; q.rows.push(l); }
          var last = s.paras[s.paras.length - 1]; last.rl = (last.rl || 0) + Math.ceil(t.length / 60);
          rl += Math.ceil(t.length / 60); wA += wc(t); lastAct = true;
        }
      });
      s.rl = rl; s.pages = rl / RL; s.wA = wA; s.wD = wD; s.words = wA + wD;
      cum += rl; wordsA += wA; wordsD += wD;
    });
    (function () { var prev = -1; scenes.forEach(function (s) { if (s.hli == null) { for (var k = prev + 1; k < L0.length; k++) if (L0[k].type === 'scene-heading') { s.hli = k; break; } } if (s.hli != null) prev = s.hli; }); })();
    m.totalRL = cum; m.pages = cum / RL; m.wordsA = wordsA; m.wordsD = wordsD; m.words = wordsA + wordsD;
    m.live = scenes.filter(function (s) { return !s.omit; });
    /* characters */
    m.speeches.forEach(function (sp) {
      var c = m.chars[sp.ch]; if (!c) { c = m.chars[sp.ch] = { name: sp.ch, speeches: 0, words: 0, scenes: {}, first: sp.pg, last: sp.pg, text: [], par: 0, voiceOver: 0 }; m.order.push(c); }
      c.speeches++; c.words += wc(sp.txt); c.scenes[sp.sc] = 1; c.last = sp.pg; c.text.push(sp.txt); c.par += sp.par.length;
      if (/\((V\.?O|O\.?S)/i.test(sp.cue)) c.voiceOver++;
    });
    m.order.sort(function (a, b) { return b.words - a.words; });
    m.order.forEach(function (c) { c.nScenes = Object.keys(c.scenes).length; c.share = m.wordsD ? c.words / m.wordsD : 0; });
    m.protag = m.order[0] || null;
    /* position helpers */
    m.posOf = function (pg) { return m.pages ? clamp(pg / m.pages, 0, 1) : 0; };
    m.sceneAt = function (frac) { var t = frac * m.pages, r = m.live[0]; for (var i = 0; i < m.live.length; i++) { if (m.live[i].pg0 <= t) r = m.live[i]; else break; } return r; };
    m.scenePos = function (s) { return m.pages ? (s.pg0 + s.pages / 2) / m.pages : 0; };
    return m;
  };
})();
