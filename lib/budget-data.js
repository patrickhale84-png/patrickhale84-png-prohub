/* Starter rate cards and fringe structures for the union budget.
   Every row carries a status so the budget can show how far to trust it:
     current   = taken from a published 2026-27 rate sheet
     older     = published, but from an earlier contract year: check before relying on it
     statutory = set by law (tax and statutory pay): confirm for your state or province
     assumed   = a working estimate, not a published rate
   All of it can be edited or replaced inside the budget. Nothing here replaces the signed agreement. */
(function () {
  var AS = '2026-10';
  function r(id, region, ag, name, unit, rate, fringe, src, status, note) { return { id: id, region: region, agreement: ag, name: name, unit: unit, rate: rate, fringe: fringe, source: src, status: status || 'current', asOf: AS, note: note || '' }; }
  function f(name, kind, v, cap, status, src, basis) { return { name: name, kind: kind, v: v, cap: cap || 0, status: status || 'current', source: src || '', basis: basis || '' }; }

  var CCY = { US: '$', CA: 'C$', UK: '£' };

  var RATES = [
    /* SAG-AFTRA, 2026-27 period (7/1/26 to 6/30/27) */
    r('sag-day', 'US', 'SAG-AFTRA', 'Day performer (theatrical, over $2M)', 'day', 1283, 'US-SAG', 'AMPTP 2026-30 SAG-AFTRA rate sheet; Wrapbook SAG guide'),
    r('sag-week', 'US', 'SAG-AFTRA', 'Weekly performer (theatrical, over $2M)', 'week', 4456, 'US-SAG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),
    r('sag-3day', 'US', 'SAG-AFTRA', '3-day performer (TV, half or one hour)', 'flat', 3252, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-low-day', 'US', 'SAG-AFTRA', 'Day performer, Low Budget ($700K to $2M)', 'day', 834, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-low-week', 'US', 'SAG-AFTRA', 'Weekly performer, Low Budget ($700K to $2M)', 'week', 2896, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-mod-day', 'US', 'SAG-AFTRA', 'Day performer, Moderate Low ($300K to $700K)', 'day', 449.05, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-mod-week', 'US', 'SAG-AFTRA', 'Weekly performer, Moderate Low ($300K to $700K)', 'week', 1559.6, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-ulb-day', 'US', 'SAG-AFTRA', 'Day performer, Ultra Low ($300K or less)', 'day', 256.6, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-tv-half', 'US', 'SAG-AFTRA', 'Major role, half-hour TV', 'week', 7057, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-tv-hour', 'US', 'SAG-AFTRA', 'Major role, one-hour TV', 'week', 11290, 'US-SAG', 'Wrapbook SAG guide, 2026-27'),
    r('sag-stunt-day', 'US', 'SAG-AFTRA', 'Stunt performer, day', 'day', 1283, 'US-SAG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),
    r('sag-stunt-week', 'US', 'SAG-AFTRA', 'Stunt performer, week', 'week', 4785, 'US-SAG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),
    r('sag-stuntco-day', 'US', 'SAG-AFTRA', 'Stunt coordinator, flat deal, day (theatrical)', 'day', 1996, 'US-SAG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),
    r('sag-stuntco-week', 'US', 'SAG-AFTRA', 'Stunt coordinator, flat deal, week (theatrical)', 'week', 7872, 'US-SAG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),
    r('sag-bg', 'US', 'SAG-AFTRA', 'Background actor, general', 'day', 231, 'US-SAG-BG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),
    r('sag-bg-sa', 'US', 'SAG-AFTRA', 'Background actor, special ability', 'day', 241, 'US-SAG-BG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),
    r('sag-standin', 'US', 'SAG-AFTRA', 'Stand-in or photo double', 'day', 270, 'US-SAG-BG', 'AMPTP 2026-30 SAG-AFTRA rate sheet'),

    /* DGA, 2026-27 */
    r('dga-dir-low', 'US', 'DGA', 'Director, feature, low budget', 'week', 15843, 'US-DGA-DIR', 'AMPTP 2026-30 DGA rates, 3-101'),
    r('dga-dir-med', 'US', 'DGA', 'Director, feature, medium budget', 'week', 18007, 'US-DGA-DIR', 'AMPTP 2026-30 DGA rates, 3-101'),
    r('dga-dir-high', 'US', 'DGA', 'Director, feature, high budget', 'week', 25214, 'US-DGA-DIR', 'AMPTP 2026-30 DGA rates, 3-101'),
    r('dga-dir-tv', 'US', 'DGA', 'Director, network one-hour TV, per episode', 'flat', 58808, 'US-DGA-DIR', 'AMPTP 2026-30 DGA rates, 10-101'),
    r('dga-upm', 'US', 'DGA', 'Unit Production Manager (studio week, feature)', 'week', 7197, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 13-101(a)'),
    r('dga-1ad', 'US', 'DGA', 'First Assistant Director (studio week, feature)', 'week', 6843, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 13-101(a)'),
    r('dga-k2ad', 'US', 'DGA', 'Key Second Assistant Director (studio week, feature)', 'week', 4585, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 13-101(a)'),
    r('dga-22ad', 'US', 'DGA', 'Second Second Assistant Director (studio week, feature)', 'week', 4329, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 13-101(a)'),
    r('dga-upm-tv', 'US', 'DGA', 'Unit Production Manager (TV programs)', 'week', 6534, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 24-403(a)(1)'),
    r('dga-1ad-tv', 'US', 'DGA', 'First Assistant Director (TV programs)', 'week', 6209, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 24-403(a)(1)'),
    r('dga-k2ad-tv', 'US', 'DGA', 'Key Second Assistant Director (TV programs)', 'week', 4311, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 24-403(a)(1)'),
    r('dga-22ad-tv', 'US', 'DGA', 'Second Second Assistant Director (TV programs)', 'week', 4093, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 24-403(a)(1)'),
    r('dga-fee-upm', 'US', 'DGA', 'Production fee, UPM (per week)', 'week', 1560, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 13-101(b)'),
    r('dga-fee-1ad', 'US', 'DGA', 'Production fee, First AD (per week)', 'week', 1270, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 13-101(b)'),
    r('dga-fee-k2ad', 'US', 'DGA', 'Production fee, Key Second AD (per week)', 'week', 967, 'US-DGA-BTL', 'AMPTP 2026-30 DGA rates, 13-101(b)'),

    /* WGA, 2026-27 (rates effective from 5/2/26) */
    r('wga-sp-high', 'US', 'WGA', 'Original screenplay incl. treatment, high budget', 'flat', 150139, 'US-WGA', 'AMPTP 2026-30 WGA wage rates, p.82'),
    r('wga-sp-low', 'US', 'WGA', 'Original screenplay incl. treatment, low budget', 'flat', 80735, 'US-WGA', 'AMPTP 2026-30 WGA wage rates, p.82'),
    r('wga-spx-high', 'US', 'WGA', 'Screenplay excl. treatment, high budget', 'flat', 103822, 'US-WGA', 'AMPTP 2026-30 WGA wage rates, p.82'),
    r('wga-spx-low', 'US', 'WGA', 'Screenplay excl. treatment, low budget', 'flat', 50448, 'US-WGA', 'AMPTP 2026-30 WGA wage rates, p.82'),
    r('wga-week', 'US', 'WGA', 'Writer, week-to-week', 'week', 7511, 'US-WGA', 'AMPTP 2026-30 WGA wage rates, p.93'),
    r('wga-tv-hr-high', 'US', 'WGA', 'One-hour TV story and teleplay, high budget', 'flat', 34422, 'US-WGA', 'AMPTP 2026-30 WGA wage rates, p.102'),
    r('wga-tv-hr-low', 'US', 'WGA', 'One-hour TV story and teleplay, low budget', 'flat', 27718, 'US-WGA', 'AMPTP 2026-30 WGA wage rates, p.102'),

    /* Teamsters 399, studio minimums, 2026-27 (hourly) */
    r('t399-coord', 'US', 'Teamsters 399', 'Transportation Coordinator (weekly)', 'week', 4305.6, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-captain', 'US', 'Teamsters 399', 'Driver Captain', 'hour', 60.86, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-cocaptain', 'US', 'Teamsters 399', 'Co-Captain', 'hour', 54.28, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-driver', 'US', 'Teamsters 399', 'Driver (autos, wagons, minivans)', 'hour', 48.08, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-driver-grp', 'US', 'Teamsters 399', 'Driver (3521 group)', 'hour', 51.84, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D', 'current', 'Check the classification label against the Black Book.'),
    r('t399-cameracar', 'US', 'Teamsters 399', 'Camera car driver', 'hour', 59.63, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-van', 'US', 'Teamsters 399', 'Production van driver/operator', 'hour', 60.86, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-dispatcher', 'US', 'Teamsters 399', 'Dispatcher', 'hour', 54.28, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-wrangler', 'US', 'Teamsters 399', 'Wrangler', 'hour', 50.41, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-mechanic', 'US', 'Teamsters 399', 'Automotive mechanic', 'hour', 54.65, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),
    r('t399-animal', 'US', 'Teamsters 399', 'Animal trainer (stable)', 'hour', 69.8, 'US-T399', 'Local 399 Basic Feature Wage Rates 2024-27, period D'),

    /* IATSE Local 600, Central Region studio minimums, 2026-27 (daily-hire = hourly x 8) */
    r('i600-dp', 'US', 'IATSE 600 (Central)', 'Director of Photography, daily', 'day', 1168.16, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-dp-wk', 'US', 'IATSE 600 (Central)', 'Director of Photography, weekly (43.2 hr guarantee)', 'week', 5618.59, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-op', 'US', 'IATSE 600 (Central)', 'Camera Operator, daily', 'day', 722.16, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-op-wk', 'US', 'IATSE 600 (Central)', 'Camera Operator, weekly', 'week', 3573.07, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-1ac', 'US', 'IATSE 600 (Central)', 'First Assistant Camera, hourly', 'hour', 65.95, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-1ac-wk', 'US', 'IATSE 600 (Central)', 'First Assistant Camera, weekly', 'week', 2849.73, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-2ac', 'US', 'IATSE 600 (Central)', 'Second Assistant Camera, hourly', 'hour', 60.83, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-2ac-wk', 'US', 'IATSE 600 (Central)', 'Second Assistant Camera, weekly', 'week', 2634.24, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-dit', 'US', 'IATSE 600 (Central)', 'Digital Imaging Technician, daily', 'day', 744.32, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-dit-wk', 'US', 'IATSE 600 (Central)', 'Digital Imaging Technician, weekly', 'week', 3410.8, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-still', 'US', 'IATSE 600 (Central)', 'Still Photographer, daily', 'day', 629.36, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),
    r('i600-still-wk', 'US', 'IATSE 600 (Central)', 'Still Photographer, weekly', 'week', 2918.8, 'US-IATSE', 'ICG Local 600 Central Region Rate Card 2026-27, Panel 3'),

    /* UBCP/ACTRA (Canada). The 2023-2026 BCMPA rate sheet has run its course: treat as older */
    r('ubcp-pa', 'CA', 'UBCP/ACTRA', 'Principal actor, one role, daily fee', 'day', 644, 'CA-ACTRA', 'UBCP/ACTRA BCMPA rate sheet, effective 23 Mar 2025', 'older', 'The 2023-2026 term has ended. Check the current agreement.'),
    r('ubcp-actor', 'CA', 'UBCP/ACTRA', 'Actor, one role, daily fee', 'day', 434.71, 'CA-ACTRA', 'UBCP/ACTRA BCMPA rate sheet, effective 23 Mar 2025', 'older', 'The 2023-2026 term has ended. Check the current agreement.')
  ];

  var FRINGES = {
    'US-NONE': { name: 'No fringe', region: 'US', items: [] },
    'US-NONU': { name: 'Non-union crew (payroll taxes and workers comp)', region: 'US', items: [
      f('Social Security (employer)', 'pct', 6.2, 184500, 'statutory', 'SSA 2026 wage base: confirm'),
      f('Medicare (employer)', 'pct', 1.45, 0, 'statutory', 'IRS'),
      f('Federal unemployment (FUTA)', 'pct', 0.6, 7000, 'statutory', 'IRS, after the state credit'),
      f('State unemployment (CA new employer)', 'pct', 3.4, 7000, 'statutory', 'EDD: change for your state'),
      f('Employment Training Tax (CA)', 'pct', 0.1, 7000, 'statutory', 'EDD: change for your state'),
      f('Workers compensation', 'pct', 4, 0, 'assumed', 'Rates vary widely by class and carrier: replace with your quote')
    ] },
    'US-SAG': { name: 'SAG-AFTRA principal performer', region: 'US', items: null, base: 'US-NONU', extra: [
      f('SAG-AFTRA pension and health', 'pct', 22, 232000, 'current', 'Wrapbook SAG guide gives 22%; the wage cap is from an older source (2022): confirm')
    ] },
    'US-SAG-BG': { name: 'SAG-AFTRA background', region: 'US', items: null, base: 'US-NONU', extra: [
      f('SAG-AFTRA pension and health (background)', 'pct', 21.5, 232000, 'current', 'Wrapbook SAG guide; wage cap from an older source: confirm')
    ] },
    'US-DGA-DIR': { name: 'DGA director', region: 'US', items: null, base: 'US-NONU', extra: [
      f('DGA pension', 'pct', 19, 0, 'older', 'Showbiz Labor Guide, effective 7/1/2021: confirm'),
      f('DGA health', 'pct', 14.5, 0, 'older', 'Showbiz Labor Guide, effective 7/1/2021: confirm')
    ] },
    'US-DGA-BTL': { name: 'DGA UPM and assistant directors', region: 'US', items: null, base: 'US-NONU', extra: [
      f('DGA pension', 'pct', 19.5, 0, 'older', 'Showbiz Labor Guide, effective 7/1/2021: confirm'),
      f('DGA vacation', 'pct', 4, 0, 'older', 'Showbiz Labor Guide, effective 7/1/2021: confirm'),
      f('DGA holiday', 'pct', 3.72, 0, 'older', 'Showbiz Labor Guide, effective 7/1/2021: confirm'),
      f('DGA health', 'pct', 14.5, 0, 'older', 'Showbiz Labor Guide, effective 7/1/2021: confirm')
    ] },
    'US-WGA': { name: 'WGA writer', region: 'US', items: null, base: 'US-NONU', extra: [
      f('WGA pension', 'pct', 11.25, 225000, 'older', 'Rate from Showbiz Labor Guide (2022); the $225,000 cap is in the 2026 MBA: confirm the rate'),
      f('WGA health', 'pct', 11.5, 325000, 'older', 'Rate from Showbiz Labor Guide (2022); the $325,000 cap is in the 2026 MBA: confirm the rate'),
      f('WGA paid parental leave', 'pct', 0.5, 0, 'older', 'Showbiz Labor Guide (2022)')
    ] },
    'US-IATSE': { name: 'IATSE crew (Los Angeles area)', region: 'US', items: null, base: 'US-NONU', extra: [
      f('Motion Picture Industry Pension and Health (per hour worked)', 'hourly', 15.7475, 0, 'current', 'Greenslate: MPIPHP Rate Group 40 from 2 Aug 2026 ($14.8875 to $15.7475): top of range used'),
      f('Vacation and holiday', 'pct', 8, 0, 'assumed', 'Working estimate: confirm against the agreement'),
      f('Gross Training Trust', 'pct', 0.25, 0, 'older', 'Showbiz Labor Guide')
    ] },
    'US-T399': { name: 'Teamsters 399', region: 'US', items: null, base: 'US-NONU', extra: [
      f('Motion Picture Industry Pension and Health (per hour worked)', 'hourly', 15.7475, 0, 'current', 'Greenslate: MPIPHP Rate Group 40 from 2 Aug 2026: top of range used'),
      f('Vacation and holiday', 'pct', 8, 0, 'assumed', 'Working estimate: confirm against the Black Book')
    ] },
    'CA-NONE': { name: 'No fringe', region: 'CA', items: [] },
    'CA-NONU': { name: 'Canada payroll (statutory estimate)', region: 'CA', items: [
      f('CPP and EI (employer share, estimate)', 'pct', 8, 0, 'assumed', 'Statutory but depends on income: replace with your payroll company figure'),
      f('Vacation pay', 'pct', 4, 0, 'statutory', 'Minimum under most provincial codes'),
      f('Workers compensation (WorkSafe or WSIB)', 'pct', 2.5, 0, 'assumed', 'Varies by province and class')
    ] },
    'CA-ACTRA': { name: 'UBCP/ACTRA performer', region: 'CA', items: null, base: 'CA-NONU', extra: [
      f('Producer retirement contribution', 'pct', 7, 0, 'older', 'UBCP/ACTRA BCMPA A3102(a), 2023-2026 term'),
      f('Insurance contribution', 'pct', 6, 0, 'older', 'UBCP/ACTRA BCMPA A3101, 2023-2026 term')
    ] },
    'UK-NONE': { name: 'No fringe', region: 'UK', items: [] },
    'UK-PAYE': { name: 'UK payroll (employer costs)', region: 'UK', items: [
      f('Employer National Insurance', 'pct', 15, 0, 'statutory', 'HMRC rate from April 2025 above the secondary threshold (about GBP 5,000 a year): confirm and adjust'),
      f('Holiday pay accrual', 'pct', 12.07, 0, 'statutory', 'Statutory accrual for irregular hours'),
      f('Employer pension (auto-enrolment minimum)', 'pct', 3, 0, 'statutory', 'Minimum on qualifying earnings: many productions pay more')
    ] }
  };

  /* resolve base + extra */
  Object.keys(FRINGES).forEach(function (k) { var g = FRINGES[k]; if (!g.items) g.items = FRINGES[g.base].items.concat(g.extra || []); });

  var OT = { straightHours: 8, ot1Mult: 1.5, ot1Until: 12, ot2Mult: 2, weeklyHours: 40, weeklyOT: 1.5 };

  var ACCOUNTS = [
    ['1100', 'Story, Rights and Writers', 'ATL'], ['1200', 'Producers Unit', 'ATL'], ['1300', 'Direction', 'ATL'], ['1400', 'Principal Cast', 'ATL'], ['1500', 'Travel and Living (Above the Line)', 'ATL'],
    ['2000', 'Production Staff', 'BTL'], ['2100', 'Background Actors', 'BTL'], ['2200', 'Art Department', 'BTL'], ['2300', 'Set Construction', 'BTL'], ['2400', 'Set Dressing', 'BTL'], ['2500', 'Property', 'BTL'], ['2600', 'Special Effects', 'BTL'], ['2700', 'Wardrobe', 'BTL'], ['2800', 'Makeup and Hair', 'BTL'], ['2900', 'Stunts', 'BTL'],
    ['3000', 'Camera', 'BTL'], ['3100', 'Electrical', 'BTL'], ['3200', 'Grip', 'BTL'], ['3300', 'Production Sound', 'BTL'], ['3400', 'Transportation', 'BTL'], ['3500', 'Locations', 'BTL'], ['3600', 'Production Film, Digital and Lab', 'BTL'], ['3700', 'Stage and Studio Rentals', 'BTL'], ['3800', 'Craft Service and Catering', 'BTL'], ['3900', 'Travel and Living (Below the Line)', 'BTL'],
    ['4000', 'Editorial', 'POST'], ['4100', 'Music', 'POST'], ['4200', 'Post Sound', 'POST'], ['4300', 'Visual Effects', 'POST'], ['4400', 'Titles, Color and Finishing', 'POST'], ['4500', 'Deliverables', 'POST'],
    ['5000', 'Publicity and Marketing', 'OTHER'], ['5100', 'Legal and Accounting', 'OTHER'], ['5200', 'Insurance', 'OTHER'], ['5300', 'General Expenses and Office', 'OTHER'], ['5400', 'Completion Bond and Finance Fees', 'OTHER']
  ];

  window.PHBudgetData = { version: AS, ccy: CCY, rates: RATES, fringes: FRINGES, ot: OT, accounts: ACCOUNTS };
})();
