/**
 * Australian suburbs for local SEO pages (/fuel/{slug}).
 *
 * Curated list of major, high-search-volume suburbs and regional centres across
 * all 8 states/territories. Each page shows live local prices, so the content
 * is genuinely unique per suburb (not thin/doorway content).
 *
 * To add more: append entries with an accurate centroid lat/lng. Keep the list
 * to places people actually search — quality beats quantity for SEO.
 *
 * slug format: {name-kebab}-{state-lower}-{postcode}
 */

export type Suburb = {
  slug: string;
  name: string;
  state: string;   // NSW | VIC | QLD | WA | SA | TAS | ACT | NT
  postcode: string;
  lat: number;
  lng: number;
};

export const SUBURBS: Suburb[] = [
  // ── NSW (Sydney metro) ──────────────────────────────────────────────
  { slug: 'parramatta-nsw-2150',  name: 'Parramatta',  state: 'NSW', postcode: '2150', lat: -33.8150, lng: 151.0011 },
  { slug: 'liverpool-nsw-2170',   name: 'Liverpool',   state: 'NSW', postcode: '2170', lat: -33.9203, lng: 150.9237 },
  { slug: 'penrith-nsw-2750',     name: 'Penrith',     state: 'NSW', postcode: '2750', lat: -33.7510, lng: 150.6940 },
  { slug: 'blacktown-nsw-2148',   name: 'Blacktown',   state: 'NSW', postcode: '2148', lat: -33.7711, lng: 150.9057 },
  { slug: 'bankstown-nsw-2200',   name: 'Bankstown',   state: 'NSW', postcode: '2200', lat: -33.9171, lng: 151.0349 },
  { slug: 'chatswood-nsw-2067',   name: 'Chatswood',   state: 'NSW', postcode: '2067', lat: -33.7969, lng: 151.1803 },
  { slug: 'hornsby-nsw-2077',     name: 'Hornsby',     state: 'NSW', postcode: '2077', lat: -33.7020, lng: 151.0990 },
  { slug: 'castle-hill-nsw-2154', name: 'Castle Hill', state: 'NSW', postcode: '2154', lat: -33.7320, lng: 151.0050 },
  { slug: 'campbelltown-nsw-2560',name: 'Campbelltown',state: 'NSW', postcode: '2560', lat: -34.0650, lng: 150.8140 },
  { slug: 'hurstville-nsw-2220',  name: 'Hurstville',  state: 'NSW', postcode: '2220', lat: -33.9670, lng: 151.1020 },
  { slug: 'cronulla-nsw-2230',    name: 'Cronulla',    state: 'NSW', postcode: '2230', lat: -34.0560, lng: 151.1530 },
  { slug: 'manly-nsw-2095',       name: 'Manly',       state: 'NSW', postcode: '2095', lat: -33.7969, lng: 151.2870 },
  { slug: 'bondi-nsw-2026',       name: 'Bondi',       state: 'NSW', postcode: '2026', lat: -33.8915, lng: 151.2767 },
  // ── NSW (regional) ──────────────────────────────────────────────────
  { slug: 'newcastle-nsw-2300',   name: 'Newcastle',   state: 'NSW', postcode: '2300', lat: -32.9283, lng: 151.7817 },
  { slug: 'wollongong-nsw-2500',  name: 'Wollongong',  state: 'NSW', postcode: '2500', lat: -34.4250, lng: 150.8930 },
  { slug: 'gosford-nsw-2250',     name: 'Gosford',     state: 'NSW', postcode: '2250', lat: -33.4270, lng: 151.3420 },
  { slug: 'wagga-wagga-nsw-2650', name: 'Wagga Wagga', state: 'NSW', postcode: '2650', lat: -35.1180, lng: 147.3690 },
  { slug: 'tamworth-nsw-2340',    name: 'Tamworth',    state: 'NSW', postcode: '2340', lat: -31.0920, lng: 150.9320 },
  { slug: 'dubbo-nsw-2830',       name: 'Dubbo',       state: 'NSW', postcode: '2830', lat: -32.2430, lng: 148.6010 },
  { slug: 'orange-nsw-2800',      name: 'Orange',      state: 'NSW', postcode: '2800', lat: -33.2840, lng: 149.1000 },
  { slug: 'coffs-harbour-nsw-2450',name: 'Coffs Harbour',state: 'NSW',postcode: '2450', lat: -30.2963, lng: 153.1135 },
  { slug: 'port-macquarie-nsw-2444',name: 'Port Macquarie',state:'NSW',postcode:'2444', lat: -31.4310, lng: 152.9080 },
  { slug: 'albury-nsw-2640',      name: 'Albury',      state: 'NSW', postcode: '2640', lat: -36.0737, lng: 146.9135 },

  // ── VIC (Melbourne metro) ───────────────────────────────────────────
  { slug: 'st-kilda-vic-3182',    name: 'St Kilda',    state: 'VIC', postcode: '3182', lat: -37.8678, lng: 144.9810 },
  { slug: 'richmond-vic-3121',    name: 'Richmond',    state: 'VIC', postcode: '3121', lat: -37.8230, lng: 144.9980 },
  { slug: 'footscray-vic-3011',   name: 'Footscray',   state: 'VIC', postcode: '3011', lat: -37.7990, lng: 144.8990 },
  { slug: 'box-hill-vic-3128',    name: 'Box Hill',    state: 'VIC', postcode: '3128', lat: -37.8190, lng: 145.1220 },
  { slug: 'dandenong-vic-3175',   name: 'Dandenong',   state: 'VIC', postcode: '3175', lat: -37.9870, lng: 145.2150 },
  { slug: 'frankston-vic-3199',   name: 'Frankston',   state: 'VIC', postcode: '3199', lat: -38.1430, lng: 145.1230 },
  { slug: 'werribee-vic-3030',    name: 'Werribee',    state: 'VIC', postcode: '3030', lat: -37.9000, lng: 144.6620 },
  { slug: 'ringwood-vic-3134',    name: 'Ringwood',    state: 'VIC', postcode: '3134', lat: -37.8140, lng: 145.2300 },
  { slug: 'brighton-vic-3186',    name: 'Brighton',    state: 'VIC', postcode: '3186', lat: -37.9070, lng: 144.9920 },
  { slug: 'chelsea-vic-3196',     name: 'Chelsea',     state: 'VIC', postcode: '3196', lat: -38.0520, lng: 145.1180 },
  { slug: 'edithvale-vic-3196',   name: 'Edithvale',   state: 'VIC', postcode: '3196', lat: -38.0380, lng: 145.1120 },
  { slug: 'carlton-vic-3053',     name: 'Carlton',     state: 'VIC', postcode: '3053', lat: -37.8000, lng: 144.9670 },
  { slug: 'preston-vic-3072',     name: 'Preston',     state: 'VIC', postcode: '3072', lat: -37.7410, lng: 145.0010 },
  // ── VIC (regional) ──────────────────────────────────────────────────
  { slug: 'geelong-vic-3220',     name: 'Geelong',     state: 'VIC', postcode: '3220', lat: -38.1499, lng: 144.3617 },
  { slug: 'ballarat-vic-3350',    name: 'Ballarat',    state: 'VIC', postcode: '3350', lat: -37.5622, lng: 143.8503 },
  { slug: 'bendigo-vic-3550',     name: 'Bendigo',     state: 'VIC', postcode: '3550', lat: -36.7570, lng: 144.2780 },
  { slug: 'shepparton-vic-3630',  name: 'Shepparton',  state: 'VIC', postcode: '3630', lat: -36.3820, lng: 145.3990 },
  { slug: 'mildura-vic-3500',     name: 'Mildura',     state: 'VIC', postcode: '3500', lat: -34.1850, lng: 142.1620 },

  // ── QLD (Brisbane metro) ────────────────────────────────────────────
  { slug: 'fortitude-valley-qld-4006',name:'Fortitude Valley',state:'QLD',postcode:'4006',lat:-27.4570,lng:153.0340 },
  { slug: 'chermside-qld-4032',   name: 'Chermside',   state: 'QLD', postcode: '4032', lat: -27.3850, lng: 153.0310 },
  { slug: 'mount-gravatt-qld-4122',name:'Mount Gravatt',state:'QLD', postcode: '4122', lat: -27.5410, lng: 153.0810 },
  { slug: 'ipswich-qld-4305',     name: 'Ipswich',     state: 'QLD', postcode: '4305', lat: -27.6160, lng: 152.7600 },
  { slug: 'logan-central-qld-4114',name:'Logan Central',state:'QLD', postcode: '4114', lat: -27.6390, lng: 153.1090 },
  { slug: 'redcliffe-qld-4020',   name: 'Redcliffe',   state: 'QLD', postcode: '4020', lat: -27.2300, lng: 153.1100 },
  // ── QLD (regional) ──────────────────────────────────────────────────
  { slug: 'gold-coast-qld-4217',  name: 'Gold Coast',  state: 'QLD', postcode: '4217', lat: -28.0023, lng: 153.4145 },
  { slug: 'maroochydore-qld-4558',name: 'Maroochydore',state: 'QLD', postcode: '4558', lat: -26.6580, lng: 153.0920 },
  { slug: 'cairns-qld-4870',      name: 'Cairns',      state: 'QLD', postcode: '4870', lat: -16.9203, lng: 145.7710 },
  { slug: 'townsville-qld-4810',  name: 'Townsville',  state: 'QLD', postcode: '4810', lat: -19.2590, lng: 146.8169 },
  { slug: 'toowoomba-qld-4350',   name: 'Toowoomba',   state: 'QLD', postcode: '4350', lat: -27.5610, lng: 151.9540 },
  { slug: 'mackay-qld-4740',      name: 'Mackay',      state: 'QLD', postcode: '4740', lat: -21.1440, lng: 149.1860 },
  { slug: 'rockhampton-qld-4700', name: 'Rockhampton', state: 'QLD', postcode: '4700', lat: -23.3780, lng: 150.5110 },
  { slug: 'bundaberg-qld-4670',   name: 'Bundaberg',   state: 'QLD', postcode: '4670', lat: -24.8660, lng: 152.3490 },

  // ── WA (Perth metro) ────────────────────────────────────────────────
  { slug: 'fremantle-wa-6160',    name: 'Fremantle',   state: 'WA',  postcode: '6160', lat: -32.0569, lng: 115.7439 },
  { slug: 'joondalup-wa-6027',    name: 'Joondalup',   state: 'WA',  postcode: '6027', lat: -31.7448, lng: 115.7661 },
  { slug: 'rockingham-wa-6168',   name: 'Rockingham',  state: 'WA',  postcode: '6168', lat: -32.2770, lng: 115.7290 },
  { slug: 'midland-wa-6056',      name: 'Midland',     state: 'WA',  postcode: '6056', lat: -31.8880, lng: 116.0100 },
  { slug: 'armadale-wa-6112',     name: 'Armadale',    state: 'WA',  postcode: '6112', lat: -32.1490, lng: 116.0140 },
  // ── WA (regional) ───────────────────────────────────────────────────
  { slug: 'mandurah-wa-6210',     name: 'Mandurah',    state: 'WA',  postcode: '6210', lat: -32.5290, lng: 115.7230 },
  { slug: 'bunbury-wa-6230',      name: 'Bunbury',     state: 'WA',  postcode: '6230', lat: -33.3270, lng: 115.6410 },
  { slug: 'geraldton-wa-6530',    name: 'Geraldton',   state: 'WA',  postcode: '6530', lat: -28.7740, lng: 114.6090 },
  { slug: 'kalgoorlie-wa-6430',   name: 'Kalgoorlie',  state: 'WA',  postcode: '6430', lat: -30.7490, lng: 121.4660 },
  { slug: 'albany-wa-6330',       name: 'Albany',      state: 'WA',  postcode: '6330', lat: -35.0270, lng: 117.8840 },

  // ── SA (Adelaide metro + regional) ──────────────────────────────────
  { slug: 'glenelg-sa-5045',      name: 'Glenelg',     state: 'SA',  postcode: '5045', lat: -34.9800, lng: 138.5140 },
  { slug: 'norwood-sa-5067',      name: 'Norwood',     state: 'SA',  postcode: '5067', lat: -34.9210, lng: 138.6300 },
  { slug: 'port-adelaide-sa-5015',name: 'Port Adelaide',state: 'SA', postcode: '5015', lat: -34.8480, lng: 138.5070 },
  { slug: 'salisbury-sa-5108',    name: 'Salisbury',   state: 'SA',  postcode: '5108', lat: -34.7590, lng: 138.6410 },
  { slug: 'elizabeth-sa-5112',    name: 'Elizabeth',   state: 'SA',  postcode: '5112', lat: -34.7120, lng: 138.6710 },
  { slug: 'marion-sa-5043',       name: 'Marion',      state: 'SA',  postcode: '5043', lat: -35.0090, lng: 138.5560 },
  { slug: 'mount-gambier-sa-5290',name: 'Mount Gambier',state:'SA',  postcode: '5290', lat: -37.8290, lng: 140.7820 },

  // ── ACT ─────────────────────────────────────────────────────────────
  { slug: 'belconnen-act-2617',   name: 'Belconnen',   state: 'ACT', postcode: '2617', lat: -35.2380, lng: 149.0660 },
  { slug: 'tuggeranong-act-2900', name: 'Tuggeranong', state: 'ACT', postcode: '2900', lat: -35.4170, lng: 149.0680 },
  { slug: 'gungahlin-act-2912',   name: 'Gungahlin',   state: 'ACT', postcode: '2912', lat: -35.1840, lng: 149.1330 },
  { slug: 'woden-act-2606',       name: 'Woden',       state: 'ACT', postcode: '2606', lat: -35.3440, lng: 149.0870 },

  // ── TAS ─────────────────────────────────────────────────────────────
  { slug: 'launceston-tas-7250',  name: 'Launceston',  state: 'TAS', postcode: '7250', lat: -41.4391, lng: 147.1358 },
  { slug: 'devonport-tas-7310',   name: 'Devonport',   state: 'TAS', postcode: '7310', lat: -41.1810, lng: 146.3500 },
  { slug: 'burnie-tas-7320',      name: 'Burnie',      state: 'TAS', postcode: '7320', lat: -41.0560, lng: 145.9060 },

  // ── NT ──────────────────────────────────────────────────────────────
  { slug: 'palmerston-nt-0830',   name: 'Palmerston',  state: 'NT',  postcode: '0830', lat: -12.4860, lng: 130.9830 },
  { slug: 'alice-springs-nt-0870',name: 'Alice Springs',state:'NT',  postcode: '0870', lat: -23.6980, lng: 133.8807 },
];

export const suburbBySlug = (slug: string): Suburb | undefined =>
  SUBURBS.find((s) => s.slug === slug);
