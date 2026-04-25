// Curated Unsplash URLs for Uhambo East Africa.
// Sized via Unsplash's URL params for next/image optimization.
const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const IMG = {
  heroSavanna: u("1523805009345-7448845a9e53", 2400),
  kenyaElephants: u("1534177616072-ef7dc120449d"),
  tanzaniaZanzibar: u("1589330273594-fade1ee91647"),
  ugandaGorilla: u("1516426122078-c23e76319801"),
  rwandaHills: u("1488831295922-1112f2c46f8e"),
  safariJeep: u("1547471080-7cc2caa01a7e"),
  dianiBeach: u("1507525428034-b723cf961d3e"),
  stoneTown: u("1589308078059-be1415eab4c4"),
  ngorongoro: u("1551632811-561732d1e306"),
  murchisonFalls: u("1504432842672-1a79f78e4084"),
  lakeKivu: u("1516026672322-bc52d61a55d5"),
  masaiMara: u("1534777367038-9404f45b869a"),
  maraRiverLodge: u("1566073771259-6a8506099945"),
  obsidianSuites: u("1582719508461-905c673771fd"),
  landCruiser: "/assets/toyota-land-cruiser.png",
  alphard: "/assets/alphard.png",
  noah: "/assets/noah.png",
  tenSeaterVan: "/assets/10-seater-van.png",
  vanFleet: "/assets/10-seater-van.png",
  coaster: "/assets/coaster.png",
  expeditionTruck: "/assets/expedition-truck.png",
  cultureCity: u("1571115764595-644a1f56a55c"),
  aboutStory: u("1517486808906-6ca8b3f04846"),
  contactHero: u("1469474968028-56623f02e42e"),
  adminMap: u("1502920917128-1aa500764cbd"),
};
