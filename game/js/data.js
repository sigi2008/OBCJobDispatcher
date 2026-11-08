'use strict';
// ---------- Spieldaten: Gegenstände, Rezepte, Bauteile, Ruinen, Überlebende ----------

const ITEMS = {
  wood:    { name: 'Holz' },
  stone:   { name: 'Stein' },
  fiber:   { name: 'Fasern' },
  berries: { name: 'Beeren' },
  flower:  { name: 'Blumen' },
  shell:   { name: 'Muscheln' },
  metal:   { name: 'Metallschrott' },
  planks:  { name: 'Bretter' },
  rope:    { name: 'Seil' },
  iron:    { name: 'Eisen' },
  bread:   { name: 'Brot' },
  crystal: { name: 'Kristall' },
};
const ITEM_ORDER = Object.keys(ITEMS);

// Sammelbare Objekte in der Welt
// tool: benötigtes Werkzeug, tier: Mindeststufe, hp: Schläge, solid: Kollisionsradius
const OBJ = {
  oak:      { name: 'Eiche',        tool: 'axe',  tier: 1, hp: 4, solid: 10, drops: { wood: 3 }, regrow: 240, tree: true },
  birch:    { name: 'Birke',        tool: 'axe',  tier: 1, hp: 3, solid: 9,  drops: { wood: 3 }, regrow: 240, tree: true },
  pine:     { name: 'Tanne',        tool: 'axe',  tier: 1, hp: 4, solid: 10, drops: { wood: 4 }, regrow: 260, tree: true },
  palm:     { name: 'Palme',        tool: 'axe',  tier: 1, hp: 3, solid: 8,  drops: { wood: 2, fiber: 2 }, regrow: 260, tree: true },
  snowpine: { name: 'Schneetanne',  tool: 'axe',  tier: 1, hp: 5, solid: 10, drops: { wood: 5 }, regrow: 300, tree: true },
  rock:     { name: 'Felsen',       tool: 'pick', tier: 1, hp: 5, solid: 13, drops: { stone: 3 }, regrow: 300 },
  ore:      { name: 'Erzbrocken',   tool: 'pick', tier: 1, hp: 7, solid: 13, drops: { metal: 2, stone: 1 }, regrow: 400 },
  crystal:  { name: 'Kristalle',    tool: 'pick', tier: 2, hp: 6, solid: 9,  drops: { crystal: 1 }, regrow: 600 },
  bush:     { name: 'Beerenstrauch',tool: null,   tier: 0, hp: 1, solid: 0,  drops: { berries: 3 }, regrow: 120 },
  fiber:    { name: 'Hohes Gras',   tool: null,   tier: 0, hp: 1, solid: 0,  drops: { fiber: 2 }, regrow: 150 },
  stick:    { name: 'Äste',         tool: null,   tier: 0, hp: 1, solid: 0,  drops: { wood: 1 }, regrow: 260 },
  pebble:   { name: 'Kiesel',       tool: null,   tier: 0, hp: 1, solid: 0,  drops: { stone: 1 }, regrow: 260 },
  shell:    { name: 'Muschel',      tool: null,   tier: 0, hp: 1, solid: 0,  drops: { shell: 1 }, regrow: 400 },
  scrap:    { name: 'Schrott',      tool: null,   tier: 0, hp: 2, solid: 0,  drops: { metal: 2 }, regrow: 500 },
  flowers:  { name: 'Wildblumen',   tool: null,   tier: 0, hp: 1, solid: 0,  drops: { flower: 2 }, regrow: 200 },
};

const RECIPES = [
  { id: 'axe1',   name: 'Steinaxt',          desc: 'Fällt Bäume.',                     need: { wood: 3, stone: 2, fiber: 2 }, tool: ['axe', 1] },
  { id: 'pick1',  name: 'Steinspitzhacke',   desc: 'Baut Felsen und Erz ab.',          need: { wood: 3, stone: 3, fiber: 2 }, tool: ['pick', 1] },
  { id: 'planks', name: 'Bretter ×2',        desc: 'Gesägtes Holz zum Bauen.',         need: { wood: 3 }, give: { planks: 2 } },
  { id: 'rope',   name: 'Seil',              desc: 'Aus Fasern geflochten.',           need: { fiber: 3 }, give: { rope: 1 } },
  { id: 'shoes',  name: 'Wanderschuhe',      desc: '+20% Laufgeschwindigkeit.',        need: { fiber: 6, wood: 2, shell: 2 }, upgrade: 'shoes' },
  { id: 'iron',   name: 'Eisen',             desc: 'Aus Schrott geschmolzen.',         need: { metal: 2, wood: 1 }, give: { iron: 1 }, req: 'workshop' },
  { id: 'axe2',   name: 'Eisenaxt',          desc: 'Doppelt so schnell.',              need: { iron: 3, planks: 2 }, tool: ['axe', 2], req: 'workshop' },
  { id: 'pick2',  name: 'Eisenspitzhacke',   desc: 'Doppelt so schnell, baut Kristalle ab.', need: { iron: 3, planks: 2 }, tool: ['pick', 2], req: 'workshop' },
  { id: 'bike',   name: 'Fahrrad',           desc: 'Doppelt so schnell an Land!',      need: { iron: 4, planks: 4, rope: 2 }, vehicle: 'bike', req: 'workshop' },
  { id: 'lamp',   name: 'Handlaterne',       desc: 'Leuchtet nachts heller.',          need: { iron: 1, crystal: 1, wood: 2 }, upgrade: 'lamp', req: 'workshop' },
];

// Platzierbare Bauteile (Bau-Modus)
// floor: begehbar/unter Figuren, solid: Kollision, water: nur auf Flachwasser, light: Lichtradius
const BUILDS = [
  { id: 'path',     name: 'Steinweg',     need: { stone: 1 },               floor: true, desc: 'Schneller laufen.' },
  { id: 'bridge',   name: 'Holzsteg',     need: { planks: 2 },              floor: true, water: true, desc: 'Über Flachwasser.' },
  { id: 'fence',    name: 'Zaun',         need: { wood: 1 },                solid: true },
  { id: 'wall',     name: 'Steinmauer',   need: { stone: 2 },               solid: true },
  { id: 'campfire', name: 'Lagerfeuer',   need: { wood: 3, stone: 2 },      solid: true, light: 150 },
  { id: 'lantern',  name: 'Laterne',      need: { wood: 2, metal: 1 },      solid: true, light: 130 },
  { id: 'flowerbed',name: 'Blumenbeet',   need: { flower: 2, wood: 1 },     floor: true },
  { id: 'garden',   name: 'Beerenbeet',   need: { wood: 3, fiber: 2 },      floor: true, desc: 'Lässt Beeren wachsen.' },
  { id: 'sapling',  name: 'Setzling',     need: { wood: 1, fiber: 2 },      desc: 'Wächst zum Baum.' },
  { id: 'bench',    name: 'Bank',         need: { planks: 3 },              solid: true },
  { id: 'chest',    name: 'Truhe',        need: { planks: 4, iron: 1 },     solid: true },
  { id: 'tent',     name: 'Zelt',         need: { fiber: 6, wood: 3 },      solid: true },
  { id: 'well',     name: 'Brunnen',      need: { stone: 10, rope: 2 },     solid: true },
  { id: 'statue',   name: 'Kristallstatue', need: { stone: 6, crystal: 1 }, solid: true, light: 90 },
  { id: 'shellpath',name: 'Muschelpfad',  need: { shell: 1 },               floor: true, desc: 'Hübsch & schnell.' },
];
const BUILD_BY_ID = Object.fromEntries(BUILDS.map(b => [b.id, b]));

// Verlassene Orte zum Wiederaufbauen
const LANDMARKS = {
  cabin: {
    name: 'Verlassene Hütte', w: 4, h: 2, sw: 150, sh: 150,
    stages: [{ wood: 8, stone: 4 }, { wood: 12, fiber: 6 }, { planks: 6, rope: 2 }],
    reward: 'Dein Zuhause! Lager, Bett und Platz für 2 Überlebende.',
  },
  workshop: {
    name: 'Alte Werkstatt', w: 5, h: 3, sw: 180, sh: 165,
    stages: [{ wood: 15, stone: 10 }, { planks: 10, rope: 4 }, { metal: 6, stone: 10 }],
    reward: 'Schaltet Eisen, Eisenwerkzeuge und das Fahrrad frei.',
  },
  ship: {
    name: 'Gestrandetes Schiff', w: 6, h: 2, sw: 220, sh: 200,
    stages: [{ planks: 14, rope: 6 }, { iron: 6, planks: 10 }, { rope: 8, fiber: 12, wood: 10 }],
    reward: 'Ein Segelboot! Damit erreichst du ferne Inseln.',
  },
  house: {
    name: 'Ruinenhaus', w: 3, h: 2, sw: 116, sh: 130,
    stages: [{ wood: 12, stone: 8 }, { planks: 8, rope: 2 }],
    reward: 'Platz für 2 weitere Überlebende.',
  },
  windmill: {
    name: 'Windmühle', w: 3, h: 2, sw: 120, sh: 210,
    stages: [{ wood: 20, stone: 12 }, { planks: 12, rope: 6, iron: 2 }],
    reward: 'Mahlt Mehl – backt regelmäßig Brot ins Lager.',
  },
  greenhouse: {
    name: 'Gewächshaus', w: 4, h: 3, sw: 150, sh: 140,
    stages: [{ wood: 10, stone: 10 }, { planks: 10, crystal: 2 }],
    reward: 'Lässt Beeren und Blumen ins Lager wachsen.',
  },
  garage: {
    name: 'Alte Garage', w: 4, h: 3, sw: 150, sh: 130,
    stages: [{ stone: 20, wood: 10 }, { iron: 10, rope: 4, planks: 8 }],
    reward: 'Ein Motorroller – blitzschnell an Land!',
  },
  lighthouse: {
    name: 'Leuchtturm', w: 3, h: 3, sw: 110, sh: 270,
    stages: [{ stone: 25, wood: 10 }, { planks: 12, iron: 6 }, { crystal: 4, rope: 4 }],
    reward: 'Sein Licht enthüllt die ganze Karte.',
  },
  hangar: {
    name: 'Ballonhangar', w: 6, h: 3, sw: 220, sh: 250,
    stages: [{ planks: 20, rope: 12 }, { iron: 12, fiber: 30 }, { crystal: 6, bread: 5 }],
    reward: 'Ein Heißluftballon – flieg über alles hinweg!',
  },
};

// Überlebende
const JOBS = {
  wood:    { name: 'Holzfäller/in',  yields: { wood: 3 } },
  stone:   { name: 'Steinmetz/in',   yields: { stone: 3 } },
  gather:  { name: 'Sammler/in',     yields: { fiber: 2, berries: 2 } },
  garden:  { name: 'Gärtner/in',     yields: { berries: 2, flower: 2 } },
  carp:    { name: 'Zimmerer/in',    yields: { planks: 2 } },
  rope:    { name: 'Seilmacher/in',  yields: { rope: 1 } },
  smith:   { name: 'Schmied/in',     yields: { iron: 1 }, req: 'workshop' },
  miner:   { name: 'Bergmann/frau',  yields: { metal: 2 } },
  baker:   { name: 'Bäcker/in',      yields: { bread: 1 }, req: 'windmill' },
  beach:   { name: 'Strandsammler/in', yields: { shell: 2 } },
  crystal: { name: 'Kristallsucher/in', yields: { crystal: 1 }, req: 'workshop' },
  cook:    { name: 'Koch/Köchin',    yields: { bread: 1, berries: 1 } },
};

const SURVIVORS = [
  { name: 'Lena',  job: 'gather', want: null,                hello: 'Oh! Ein Mensch! Ich dachte, ich bin ganz allein hier draußen.' },
  { name: 'Jonas', job: 'wood',   want: { berries: 5 },      hello: 'Hey du! Ich hab seit Tagen nur Rinde gekaut…' },
  { name: 'Mira',  job: 'garden', want: { flower: 3 },       hello: 'Hallo! Blumen machen mich so glücklich – hast du welche?' },
  { name: 'Theo',  job: 'stone',  want: { wood: 8 },         hello: 'Mein Feuer geht gleich aus. Kannst du mir Holz bringen?' },
  { name: 'Frieda',job: 'carp',   want: { stone: 6 },        hello: 'Ich bin Zimmerin! Mit ein paar Steinen baue ich mir Werkzeug.' },
  { name: 'Paul',  job: 'rope',   want: { fiber: 8 },        hello: 'Seile sind meine Leidenschaft. Hast du Fasern?' },
  { name: 'Ida',   job: 'smith',  want: { metal: 4 },        hello: 'Eine Werkstatt? Da könnte ich wieder schmieden!' },
  { name: 'Emil',  job: 'miner',  want: { bread: 2 },        hello: 'Ich hab so Hunger auf frisches Brot…' },
  { name: 'Greta', job: 'baker',  want: { berries: 8 },      hello: 'Ich war Bäckerin. Mit Beeren backe ich die besten Kuchen!' },
  { name: 'Oskar', job: 'beach',  want: { rope: 2 },         hello: 'Ahoi! Mein Floß ist kaputt. Hast du etwas Seil?' },
  { name: 'Nele',  job: 'crystal',want: { planks: 6 },       hello: 'Ich habe hier oben glitzernde Kristalle gesehen!' },
  { name: 'Bruno', job: 'cook',   want: { shell: 3 },        hello: 'Muscheln! Ich sammle Muscheln. Du auch?' },
];

const ANIMALS = {
  rabbit:   { name: 'Hase',  speed: 70,  names: ['Hoppel', 'Flocke', 'Möhrchen', 'Puschel'] },
  deer:     { name: 'Reh',   speed: 80,  names: ['Bambi', 'Hirschi', 'Rosa', 'Lichtung'] },
  fox:      { name: 'Fuchs', speed: 85,  names: ['Rotpelz', 'Fiete', 'Funke', 'Ronja'] },
  duck:     { name: 'Ente',  speed: 45,  names: ['Quaki', 'Paddel', 'Gustav', 'Watschel'] },
  sheep:    { name: 'Schaf', speed: 45,  names: ['Wolke', 'Wolli', 'Shaun', 'Bähbel'] },
  hedgehog: { name: 'Igel',  speed: 35,  names: ['Stachel', 'Pieks', 'Igor', 'Kugel'] },
};
