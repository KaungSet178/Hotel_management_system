/**
 * Curated Unsplash photography used as demo imagery.
 *
 * Hotlinking keeps the repo free of large binary assets. Every image goes
 * through `<ImageWithFallback/>` which swaps to a deterministic picsum image
 * and finally a branded gradient offline, so the UI never shows broken images.
 */

const u = (id: string, w = 1200, h = 800): string =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=70`;

export const IMG = {
  resortPool: u('1566073771259-6a8506099945'),
  hotelRoom: u('1582719508461-905c673771fd'),
  luxuryRoom: u('1611892440504-42a792e24d32'),
  endlessPool: u('1590490360182-c33d57733427'),
  lobby: u('1520250497591-112f2f40a3f4'),
  bedroom: u('1571003123894-1f0594d2b5d9'),
  resort: u('1445019980597-93fa8acb246c'),
  bathroom: u('1587985064135-0366536eab42'),
  bedWhite: u('1464082354059-27db6ce50048'),
  bedroomDark: u('1505693416388-ac5ce068fe85'),
  interior: u('1522708323590-d24dbb6b0267'),
  apartment: u('1502672260266-1c1ef2d93688'),
  poolVilla: u('1542314831-068cd1dbfeeb'),
  villaBathtub: u('1584132967334-10e028bd69f7'),
  poolSunset: u('1540541338287-41700207dee6'),
  restaurant: u('1414235077428-338989a2e8c0'),
  water: u('1507525428034-b723cf961d3e'),
  building: u('1512918728675-ed5a9ecdebfd'),
} as const;