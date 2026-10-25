/* proHUB shared breakdown vocabulary: the words that tag a scene automatically on import. */
(function () {
  function re(words) { return new RegExp('\\b(' + words + ')\\b', 'gi'); }
  window.PH_AUTO = {
    prop: re('cleaver|knife|knives|gun|pistol|revolver|rifle|phone|cell phone|letter|photo|photograph|bottle|keys?|bag|suitcase|briefcase|backpack|wallet|purse|lantern|flashlight|torch|radio|book|notebook|journal|camera|lipstick|badge|lanyard|laptop|tablet|newspaper|envelope|package|box|candle|mug|map|necklace|umbrella|cane|sword|axe|hammer|shovel|rope|handcuffs|ticket|passport|clock|mirror|painting|television|laser|syringe|pills?|cigarette|lighter|toolbox|crowbar|binoculars'),
    vehicle: re('cars?|sedan|trucks?|vans?|motorcycle|bikes?|bicycle|helicopter|boat|ship|airplane|plane|jet|bus|taxi|cab|train|ambulance|limo|limousine|scooter|tractor|mustang|squad car|police car|jeep|suv'),
    animal: re('dogs?|cats?|horses?|birds?|cows?|pigs?|wolf|wolves|bears?|snakes?|rats?|crows?|ravens?|owls?|deer|fish|rabbits?|puppy|puppies|kitten|spiders?'),
    sfx: re('explosions?|explodes?|fire|flames?|smoke|fog|rain|snow|blood|gunshots?|gunfire|shatters?|sparks?|lightning|steam|fireworks?|debris|smash(es)?'),
    stunt: re('fights?|fighting|leaps?|jumps?|falls?|punch(es)?|kicks?|tackles?|chase[sd]?|chasing|crash(es)?|charges|dives?|climbs?|slams?|struggles?|wrestles?|chokes?|shoves?|dodges?|tumbles?|swings'),
    vfx: re('searchlights?|hologram|glow(s|ing)?|membrane|portal|beam|monster|creature|ghost|teleports?|force field|spaceship|alien|aliens'),
    extra: re('crowds?|onlookers|patrons|passersby|pedestrians|bystanders|diners|guests|students|soldiers|police|cops|customers|audience|villagers|mob|shoppers|commuters|waiters|workers|party'),
    sound: re('music|song|siren|alarm|echo|screams?|whistle|bell|knocks?|thunder|footsteps|buzzer|doorbell|ringtone'),
    wardrobe: re('coat|uniform|dress|jacket|hat|robe|apron|nightgown|suit|tuxedo|gown|hoodie|scarf|gloves?|boots?|shoes?|sneakers|heels|helmet|mask|costume|glasses|sunglasses|vest|sweater|pajamas|swimsuit|armor'),
    mu: re('blood|bloody|bleeding|bruises?|bruised|scars?|wounds?|sweat|sweating|black eye|burns|tattoo|wig|beard|stubble|pale|muddy|injured|makeup')
  };
  /* one spelling per item, so "key" and "keys" are a single line in the breakdown */
  window.PH_NORM = function (w) {
    w = String(w).toLowerCase().trim();
    if (w.length < 4 || /(ss|us|is)$/.test(w) || w === 'knives' || w === 'wolves') return w === 'knives' ? 'knife' : w === 'wolves' ? 'wolf' : w;
    if (/(ch|sh|x)es$/.test(w) || /sses$/.test(w)) return w.replace(/es$/, '');
    if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
    if (/s$/.test(w)) return w.slice(0, -1);
    return w;
  };
})();
