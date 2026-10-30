/* ===============================================================
   « Ce qui nous relie ne fane pas » — système génératif

   FIXE        le dessin, le tracé des chemins (reseau.js),
               le découpage des têtes de fleurs (tetes.js)
   ÉVOLUE      l'énergie de chaque fleur, les impulsions en circulation
   ALGORITHME  quand une impulsion part, vers quelle fleur, à quelle
               vitesse et avec quelle intensité (hasard contrôlé par une graine)

   Règles :
   1. Laissée seule, chaque fleur perd son énergie (déclin exponentiel).
   2. Le pied du bouquet émet des impulsions à intervalles irréguliers.
   3. Une impulsion choisit plutôt une fleur affaiblie, sans certitude.
   4. À son arrivée, elle ravive la fleur, puis peut se diffuser dans
      ses ramifications, d'autant plus que la fleur est vivante.
   5. Si les connexions sont coupées, plus rien n'arrive : tout s'éteint.
   6. L'énergie se voit. Affaiblie, une fleur fane : elle perd sa couleur,
      sa tête s'incline et tombe doucement sur sa tige, elle perd des pétales.
      Nourrie, elle renaît : la couleur revient et elle se redresse,
      avec un léger rebond, comme une tige qui reprend de la force.
   7. Quand le bouquet est bien nourri, de nouvelles fleurs naissent :
      une tige pousse depuis une tige existante, puis un petit bouton éclot.
      Chaque impulsion qu'il reçoit le fait grandir : petit à petit, le bouton
      se transforme en neurone, comme les grandes fleurs du haut.
      Les têtes sont celles du dessin, tournées dans le sens de la tige.
      Les tiges nées se ramifient en rameaux terminés par un bourgeon, et de
      nouvelles fleurs peuvent naître sur les fleurs nées : le réseau grandit.
   8. Mémoire : chaque impulsion laisse sur la tige une traînée de sa couleur,
      qui s'efface lentement. Plus un chemin est emprunté, plus il reste coloré.
   =============================================================== */

const PARAMS = {
  opaciteDessin: { sombre: 0.24, clair: 0.45 }, // présence du trait quand tout est fané
  demiVieMin: 4,             // secondes pour qu'une fleur perde la moitié de son énergie
  demiVieMax: 9,
  intervalleMoyen: 0.5,      // secondes entre deux impulsions (en moyenne)
  vitesseMin: 110,           // pixels du dessin par seconde
  vitesseMax: 240,
  gainArrivee: 0.6,          // énergie apportée par une impulsion d'intensité 1
  // Chaque fleur a sa couleur ; en fanant, elle la perd et redevient
  // un simple trait de crayon gris. La couleur, c'est la vie.
  palette: [
    [255, 186, 92],   // ambre
    [255, 112, 150],  // rose
    [160, 132, 255],  // lavande
    [72, 214, 214],   // turquoise
    [255, 138, 84],   // corail
    [214, 112, 240],  // orchidée
    [132, 220, 120],  // vert tendre
    [98, 170, 255],   // bleu ciel
  ],
  // Le fanage : comment la tête tombe et se redresse
  fanage: {
    chuteGrande: 0.26,       // inclinaison maximale d'une grande fleur (radians, ~15°)
    chutePetite: 0.42,       // inclinaison maximale d'un petit bouton (~24°)
    resserrement: 0.06,      // la tête fanée se resserre un peu (6 %)
    raideur: 14,             // force de la tige qui se redresse
    amorti: 4.2,             // plus c'est bas, plus elle rebondit en se redressant
    reaction: 0.6,           // secondes pour que la couleur revienne
    souffle: 0.012,          // léger balancement d'une fleur vivante (radians)
  },
  // Les naissances : de nouvelles fleurs poussent quand le bouquet est nourri
  naissances: {
    max: 22,                 // nombre maximum de fleurs nées
    intervalle: [2.5, 5],    // secondes entre deux naissances
    seuil: 0.3,              // énergie moyenne du bouquet nécessaire
    dureeTige: 2.6,          // secondes pour que la nouvelle tige pousse
    dureeEclosion: 1.6,      // secondes pour que la tête s'ouvre
    longueurTige: [80, 200], // longueur de la nouvelle tige (pixels du dessin)
    tailleTete: [160, 330],  // taille du neurone une fois adulte (pixels du dessin)
    debordement: 200,        // de combien les fleurs nées peuvent dépasser le dessin sur les côtés
    partNeurones: 0.6,       // part des boutons qui deviennent des neurones (les autres, de grandes fleurs)
    tailleFleur: [1.6, 2.1], // agrandissement d'un bouton devenu grande fleur
    tailleBouton: [1.1, 1.5],// agrandissement du bouton à la naissance
    croissanceParImpulsion: 0.13, // ce qu'une impulsion fait grandir le bouton (0 à 1)
    croissanceLente: 0.008,  // croissance par seconde d'un bouton vivant, même sans impulsion
    douceur: 1.4,            // secondes pour que la croissance se voie (transition)
  },
  // Les étincelles : quand la lumière arrive sur une fleur
  etincelles: { nombre: [10, 18], vitesse: [30, 120], duree: [0.7, 1.5] },
  // Les rameaux : petites branches qui poussent sur les tiges nées
  rameaux: { nombre: [1, 3], longueur: [24, 55], bourgeon: [3, 5] },
  // La mémoire : la traînée colorée que la lumière laisse sur les tiges
  memoire: { duree: 3.2, intensite: 0.85, largeur: 3.4 },
  // Le halo d'ambiance derrière le bouquet (opacité maximale par thème)
  ambiance: { clair: 0.14, sombre: 0.2 },
  // Couleur du trait de crayon selon le thème
  trait: { sombre: [236, 229, 216], clair: [58, 54, 50] },
};

const reduireMouvement = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduireMouvement) {
  PARAMS.vitesseMin *= 0.5;
  PARAMS.vitesseMax *= 0.5;
  PARAMS.intervalleMoyen *= 1.6;
  PARAMS.fanage.amorti = 9;        // pas de rebond
  PARAMS.fanage.souffle = 0;
  PARAMS.naissances.dureeTige *= 1.6;
  PARAMS.naissances.dureeEclosion *= 1.6;
}

/* ---------- Hasard reproductible : une graine = un déroulé ---------- */
const url = new URL(window.location.href);
let graine = parseInt(url.searchParams.get("graine"), 10);
if (Number.isNaN(graine)) graine = Math.floor(Math.random() * 100000);

function generateur(a) {          // mulberry32
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hasard = generateur(graine);
const entre = (a, b) => a + (b - a) * hasard();
const lisser = (t) => t * t * (3 - 2 * t);
const borner = (t) => Math.max(0, Math.min(1, t));

/* ---------- Thème clair / sombre ---------- */
let theme = "clair";
try {
  const memo = localStorage.getItem("theme-oeuvre");
  if (memo === "clair" || memo === "sombre") theme = memo;
} catch (e) { /* stockage indisponible : on reste en clair */ }
document.documentElement.dataset.theme = theme;

// Sur fond clair, la couleur doit être plus soutenue pour rester visible
const couleurTheme = (c) => (theme === "sombre" ? c : c.map((v) => Math.round(v * 0.72)));

/* ---------- Mise en place ---------- */
const canvas = document.getElementById("oeuvre");
const ctx = canvas.getContext("2d");
const R = window.RESEAU;
const dessinBase = new Image();          // le bouquet sans les têtes (separer_fleurs.py)
dessinBase.src = "dessin_base.png";

let echelle = 1, decalX = 0, decalY = 0, dpr = 1;
let connecte = true;
let montrerReseau = false;
let derniereCoord = null;
let fondTeinte = null;

const chemins = [];             // tous les chemins, pour la mémoire lumineuse

function preparerChemin(points) {
  const longueurs = [0];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0];
    const dy = points[i][1] - points[i - 1][1];
    longueurs.push(longueurs[i - 1] + Math.hypot(dx, dy));
  }
  const c = {
    points, longueurs, total: longueurs[longueurs.length - 1],
    lueur: new Float32Array(points.length),   // la mémoire de la lumière, point par point
    derniere: -Infinity,                      // dernier passage d'une impulsion
  };
  chemins.push(c);
  return c;
}

const fleurs = R.fleurs.map((f, i) => {
  const t = window.TETES.find((x) => x.nom === f.nom);
  const tige = preparerChemin(f.tige);
  // distance, le long de la tige, à laquelle se trouve le pivot :
  // au-delà, l'impulsion est dans la tête et suit son inclinaison
  let k = 0, dmin = Infinity;
  f.tige.forEach(([x, y], j) => {
    const d = Math.hypot(x - t.pivot[0], y - t.pivot[1]);
    if (d < dmin) { dmin = d; k = j; }
  });
  tige.debutTete = tige.longueurs[k];
  const ramifs = f.ramifications.map((r) => Object.assign(preparerChemin(r), { debutTete: 0 }));
  const fleur = {
    nom: f.nom,
    nee: false,                                  // fleur d'origine du dessin
    centre: f.centre,
    rayon: f.rayon,
    pivot: t.pivot,
    tete: { x: t.x, y: t.y, img: new Image() },
    rot: 0, k: 1,                                // rotation et taille de la tête
    // elle tombe vers l'extérieur du bouquet
    sens: f.centre[0] >= R.base[0] ? 1 : -1,
    chuteMax: f.rayon >= 45 ? PARAMS.fanage.chuteGrande : PARAMS.fanage.chutePetite,
    tige,
    ramifs,
    couleur: PARAMS.palette[i % PARAMS.palette.length],
    energie: entre(0.15, 0.4),                   // le bouquet s'allume au début
    affichee: 0.2,                               // la couleur suit l'énergie en douceur
    angle: 0, vitesseAngle: 0,                   // l'inclinaison de la tête (ressort)
    phase: entre(0, Math.PI * 2),
    eclat: 0,                                    // flash bref à l'arrivée
    declin: Math.LN2 / entre(PARAMS.demiVieMin, PARAMS.demiVieMax),
  };
  fleur.tete.img.src = t.fichier;
  fleur.modele = fleur;                          // la tête dessinée qu'elle utilise
  // Les « stades » de la tête : un seul pour les fleurs du dessin ;
  // deux pour une fleur née (le bouton, puis le neurone qu'il deviendra)
  fleur.stades = [{ modele: fleur, k: 1, rot: 0, centre: f.centre, rayon: f.rayon }];
  fleur.maturite = 1;
  tige.fleur = fleur;
  ramifs.forEach((r) => (r.fleur = fleur));
  return fleur;
});

const fleursOrigine = fleurs.slice();          // les fleurs du dessin (servent de modèles)

/* ---------- Images teintées (refaites à chaque changement de thème) ---------- */
function teinter(img, couleur) {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = `rgb(${couleur.join(",")})`;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function creerHalo(taille, couleur) {
  const c = document.createElement("canvas");
  c.width = c.height = taille;
  const g = c.getContext("2d");
  const [r, v, b] = couleur;
  const d = g.createRadialGradient(taille / 2, taille / 2, 0, taille / 2, taille / 2, taille / 2);
  if (theme === "sombre") {                          // une lumière qui brille
    d.addColorStop(0, "rgba(255,250,240,1)");
    d.addColorStop(0.12, `rgba(${r},${v},${b},0.9)`);
    d.addColorStop(0.35, `rgba(${r},${v},${b},0.3)`);
  } else {                                           // une tache de couleur douce
    d.addColorStop(0, `rgba(${r},${v},${b},0.95)`);
    d.addColorStop(0.18, `rgba(${r},${v},${b},0.6)`);
    d.addColorStop(0.45, `rgba(${r},${v},${b},0.14)`);
  }
  d.addColorStop(1, `rgba(${r},${v},${b},0)`);
  g.fillStyle = d;
  g.fillRect(0, 0, taille, taille);
  return c;
}

let halosPalette = [];

function construireImages() {
  const trait = PARAMS.trait[theme];
  halosPalette = PARAMS.palette.map((c) => creerHalo(64, couleurTheme(c)));
  fondTeinte = teinter(dessinBase, trait);
  for (const f of fleurs) preparerImagesFleur(f, trait);
}

function preparerImagesFleur(f, trait = PARAMS.trait[theme]) {
  const c = couleurTheme(f.couleur);
  for (const st of f.stades) {
    st.trait = teinter(st.modele.tete.img, trait);
    st.couleur = teinter(st.modele.tete.img, c);
  }
  f.halo = creerHalo(128, c);
}

/* Pour une fleur née : quelle part de bouton et quelle part de neurone on voit.
   Le bouton s'agrandit puis s'efface pendant que le neurone se déploie depuis son cœur. */
function melangeStades(f) {
  if (f.stades.length === 1) return [{ st: f.stades[0], a: 1, s: 1 }];
  const m = f.maturite;
  return [
    { st: f.stades[0], a: 1 - lisser(borner((m - 0.1) / 0.6)), s: 1 + 0.35 * lisser(borner(m / 0.6)) },
    { st: f.stades[1], a: lisser(borner(m / 0.55)), s: 0.2 + 0.8 * lisser(m) },
  ];
}

/* ---------- Impulsions ---------- */
const impulsions = [];
const petales = [];
let prochaineEmission = 0.5;

function choisirFleur() {
  // Plus une fleur est faible, plus elle a de chances d'être choisie
  const poids = fleurs.map((f) => (eclosion(f) < 1 ? 0 : (1 - f.energie) ** 1.5 + 0.12));
  let tirage = hasard() * poids.reduce((a, b) => a + b, 0);
  for (let i = 0; i < fleurs.length; i++) {
    tirage -= poids[i];
    if (tirage <= 0) return fleurs[i];
  }
  return fleurs[fleurs.length - 1];
}

function emettre() {
  const f = choisirFleur();
  impulsions.push({
    chemin: f.tige, fleur: f,
    distance: 0, index: 0,
    vitesse: entre(PARAMS.vitesseMin, PARAMS.vitesseMax),
    intensite: entre(0.45, 1),
    taille: entre(0.8, 1.2),
    secondaire: false,
  });
}

function diffuser(f, intensite) {
  for (const r of f.ramifs) {
    if (hasard() < f.energie * 0.7) {
      impulsions.push({
        chemin: r, fleur: null,
        distance: 0, index: 0,
        vitesse: entre(PARAMS.vitesseMin, PARAMS.vitesseMax) * 0.8,
        intensite: intensite * entre(0.35, 0.7),
        taille: entre(0.5, 0.8),
        secondaire: true,
        retard: entre(0, 0.6),
      });
    }
  }
}

function positionSur(chemin, imp) {
  const L = chemin.longueurs;
  while (imp.index < L.length - 2 && L[imp.index + 1] < imp.distance) imp.index++;
  const i = imp.index;
  const t = Math.min(1, (imp.distance - L[i]) / (L[i + 1] - L[i] || 1));
  const a = chemin.points[i], b = chemin.points[i + 1] || a;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/* ---------- Pose de la tête : inclinaison autour du pivot ---------- */
function fanage(f) {
  return 1 - lisser(borner(f.affichee));            // 0 : vivante, 1 : fanée
}

// 0 tant que la tige pousse, puis 0 -> 1 pendant que la tête s'ouvre
function eclosion(f) {
  if (!f.nee) return 1;
  const N = PARAMS.naissances;
  return borner((f.age - N.dureeTige * 0.85) / N.dureeEclosion);
}

// La tête s'ouvre avec un léger dépassement, comme un bourgeon qui éclate
function tailleEclosion(f) {
  const t = eclosion(f);
  if (t >= 1) return 1;
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

function pose(f) {
  return { angle: f.angle, s: (1 - PARAMS.fanage.resserrement * fanage(f)) * tailleEclosion(f) };
}

function poserPoint(f, p, x, y) {
  const dx = (x - f.pivot[0]) * p.s, dy = (y - f.pivot[1]) * p.s;
  return [
    f.pivot[0] + dx * Math.cos(p.angle) - dy * Math.sin(p.angle),
    f.pivot[1] + dx * Math.sin(p.angle) + dy * Math.cos(p.angle),
  ];
}

/* ---------- Étincelles ---------- */
const etincelles = [];

function etinceler(f, intensite) {
  const E = PARAMS.etincelles;
  const [x, y] = poserPoint(f, pose(f), f.centre[0], f.centre[1]);
  const n = Math.round(entre(...E.nombre) * (0.5 + 0.5 * intensite));
  for (let i = 0; i < n; i++) {
    const a = entre(0, Math.PI * 2), v = entre(...E.vitesse);
    // la plupart prennent la couleur de la fleur, quelques-unes une autre couleur
    const halo = hasard() < 0.7 ? f.halo : halosPalette[Math.floor(hasard() * halosPalette.length)];
    etincelles.push({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
      vie: 1, duree: entre(...E.duree), taille: entre(5, 12), halo,
    });
  }
}

/* ---------- Naissances : une nouvelle fleur pousse sur une tige ---------- */
let prochaineNaissance = 8;
const neurones = fleursOrigine.filter((f) => f.rayon >= 45);
const boutons = fleursOrigine.filter((f) => f.rayon < 45);
// Tous les points des tiges et ramifications du dessin, pour trouver les espaces vides
const pointsReseau = fleursOrigine.flatMap((f) => [f.tige, ...f.ramifs].flatMap((c) => c.points.filter((_, i) => i % 3 === 0)));
let compteNaissances = 0;
// Tous les traits visibles, avec la fleur à laquelle ils appartiennent :
// une nouvelle tige ne doit partir que d'un endroit où sa tige hôte est seule
const traits = [];
for (const f of fleursOrigine) {
  for (const c of [f.tige, ...f.ramifs]) traits.push({ fleur: f, points: c.points.filter((_, i) => i % 2 === 0) });
}

// Vrai si le point p est à plus de d de tous les traits (sauf ceux de la fleur « sauf »)
function degage(p, d, sauf = null) {
  for (const t of traits) {
    if (t.fleur === sauf) continue;
    for (const q of t.points) {
      if (Math.abs(p[0] - q[0]) < d && Math.abs(p[1] - q[1]) < d && Math.hypot(p[0] - q[0], p[1] - q[1]) < d) return false;
    }
  }
  return true;
}

// Distance entre le point p et le point le plus proche d'une liste
function distanceMin(p, points) {
  let d = Infinity;
  for (const q of points) d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1]));
  return d;
}

function faireNaitre() {
  const N = PARAMS.naissances;
  for (let essai = 0; essai < 120; essai++) {
    // 1. Un point d'attache, sur la tige d'une fleur du dessin
    // l'hôte peut être une fleur du dessin, ou une fleur déjà née : le réseau se ramifie
    // le plus souvent sur une tige du dessin, pour garder la forme du bouquet
    const hotes = hasard() < 0.65 ? fleursOrigine : fleurs.filter((o) => eclosion(o) >= 1);
    const hote = hotes[Math.floor(hasard() * hotes.length)];
    const ch = hote.tige;
    const debut = hote.nee ? hote.debutPropre : 0;
    const d = hote.nee ? debut + entre(0.2, 0.7) * (ch.debutTete - debut) : entre(0.3, 0.85) * ch.debutTete;
    const a = positionSur(ch, { distance: d, index: 0 });
    // la tige hôte doit être seule à cet endroit : pas au milieu du faisceau
    if (!degage(a, 12, hote)) continue;
    const b = positionSur(ch, { distance: Math.min(ch.total, d + 10), index: 0 });
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const lt = Math.hypot(tx, ty) || 1;
    tx /= lt; ty /= lt;

    // 2. La direction de la nouvelle tige : vers l'extérieur du bouquet, et vers le haut
    let nx = -ty, ny = tx;
    const cote = Math.abs(a[0] - R.base[0]) < 30 ? (hasard() < 0.5 ? -1 : 1) : Math.sign(a[0] - R.base[0]);
    if (Math.sign(nx) !== cote) { nx = -nx; ny = -ny; }
    const m = entre(0.55, 0.85);
    let dx = nx * m + tx * (1 - m), dy = ny * m + ty * (1 - m);
    const ld = Math.hypot(dx, dy) || 1;
    dx /= ld; dy /= ld;

    // 3. Une tige qui part d'abord dans le sens de la tige hôte, puis s'en écarte
    //    en se courbant : on voit qu'elle naît de la tige, comme une vraie branche
    const L = entre(...N.longueurTige);
    const fin = [a[0] + dx * L, a[1] + dy * L];
    const ctrl = [a[0] + tx * L * 0.5, a[1] + ty * L * 0.5];
    const tigeNee = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, u = 1 - t;
      const tremble = i < 2 || i === 18 ? 0 : 0.7;          // la main tremble un peu
      tigeNee.push([
        u * u * a[0] + 2 * u * t * ctrl[0] + t * t * fin[0] + entre(-tremble, tremble),
        u * u * a[1] + 2 * u * t * ctrl[1] + t * t * fin[1] + entre(-tremble, tremble),
      ]);
    }
    // la tige ne doit croiser aucun autre trait (au-delà de son départ, collé à l'hôte)
    if (!tigeNee.slice(6).every((q) => degage(q, 9))) continue;
    if (!tigeNee.slice(10).every((q) => distanceMin(q, ch.points) > 12)) continue;

    // 4. Deux têtes du dessin, tournées dans le sens de la tige :
    //    le bouton qui éclot, et le neurone qu'il deviendra en grandissant
    const ex = fin[0] - ctrl[0], ey = fin[1] - ctrl[1];
    const placer = (modele, k) => {
      const rot = Math.atan2(ey, ex) - Math.atan2(modele.centre[1] - modele.pivot[1], modele.centre[0] - modele.pivot[0]);
      const vx = (modele.centre[0] - modele.pivot[0]) * k, vy = (modele.centre[1] - modele.pivot[1]) * k;
      const centre = [fin[0] + vx * Math.cos(rot) - vy * Math.sin(rot), fin[1] + vx * Math.sin(rot) + vy * Math.cos(rot)];
      return { modele, k, rot, centre, rayon: modele.rayon * k };
    };
    const bouton = placer(boutons[Math.floor(hasard() * boutons.length)], entre(...N.tailleBouton));
    // le plus souvent le bouton deviendra un neurone ; parfois une plus grande fleur
    const versNeurone = hasard() < N.partNeurones;
    const mFinal = versNeurone ? neurones[Math.floor(hasard() * neurones.length)] : boutons[Math.floor(hasard() * boutons.length)];
    const dim = Math.max(mFinal.tete.img.width, mFinal.tete.img.height);
    const reduction = 1 - 0.45 * (essai / 120);           // si ça ne rentre pas, on essaie plus petit
    const neurone = placer(mFinal, (versNeurone ? entre(...N.tailleTete) / dim : entre(...N.tailleFleur)) * reduction);
    // on réserve la place du neurone adulte
    const centre = neurone.centre;
    const etendue = dim * neurone.k * 0.55;

    // 5. On vérifie qu'elle reste dans le cadre et ne touche pas une autre fleur
    const marge = 15;
    const deb = N.debordement;                      // le bouquet peut s'élargir sur les côtés
    if (centre[0] - etendue < marge - deb || centre[0] + etendue > R.largeur - marge + deb) continue;
    if (centre[1] - etendue < marge || centre[1] + etendue > R.hauteur - marge) continue;
    const libre = fleurs.every((o) => {
      const eo = o.nee ? o.etendue : o.rayon * 1.3;
      return Math.hypot(centre[0] - o.centre[0], centre[1] - o.centre[1]) > (etendue + eo) * 0.8;
    });
    if (!libre) continue;
    // et qu'elle s'ouvre dans un espace vide, pas par-dessus le dessin
    if (distanceMin(centre, pointsReseau) < etendue * 0.65) continue;

    // 6. Elle naît : elle rejoint le réseau, et une impulsion part la nourrir
    let j = ch.longueurs.findIndex((l) => l > d);
    if (j < 1) j = 1;
    const chemin = preparerChemin(ch.points.slice(0, j).concat(tigeNee, [bouton.centre.slice()]));
    chemin.debutTete = chemin.longueurs[chemin.longueurs.length - 2];

    // 7. Des rameaux qui partent de la nouvelle tige, terminés par un bourgeon
    const RA = PARAMS.rameaux;
    const rameaux = [];
    const nb = Math.round(entre(RA.nombre[0] - 0.49, RA.nombre[1] + 0.49));
    for (let r = 0; r < nb; r++) {
      const t = entre(0.3, 0.8);
      const ia = Math.round(t * 18);
      const p0 = tigeNee[ia], p1 = tigeNee[Math.min(18, ia + 1)];
      const ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) + (r % 2 ? 1 : -1) * entre(0.6, 1.1);
      const lr = entre(...RA.longueur), cr = entre(-0.4, 0.4);
      const fx = p0[0] + Math.cos(ang) * lr, fy = p0[1] + Math.sin(ang) * lr;
      const cx = p0[0] + Math.cos(ang) * lr * 0.5 - Math.sin(ang) * lr * cr;
      const cy = p0[1] + Math.sin(ang) * lr * 0.5 + Math.cos(ang) * lr * cr;
      const pts = [];
      for (let i = 0; i <= 8; i++) {
        const u = i / 8, v = 1 - u;
        pts.push([v * v * p0[0] + 2 * v * u * cx + u * u * fx, v * v * p0[1] + 2 * v * u * cy + u * u * fy]);
      }
      const c = preparerChemin(pts);
      c.debutTete = Infinity;                        // un rameau ne bouge pas avec la tête
      rameaux.push({ chemin: c, t, bourgeon: entre(...RA.bourgeon) });
    }
    const f = {
      nom: `nee${++compteNaissances}`,
      nee: true,
      age: 0,
      stades: [bouton, neurone],
      maturite: 0, maturiteCible: 0,                // 0 : bouton, 1 : neurone adulte
      etendue,
      centre: bouton.centre.slice(), rayon: bouton.rayon,
      pivot: fin,
      tigeNee,
      rameaux,
      debutPropre: chemin.longueurs[j],
      sens: Math.sign(dx) || 1,
      chuteMax: 0.35,
      tige: chemin,
      ramifs: rameaux.map((r) => r.chemin),       // la lumière se diffuse aussi dans les rameaux
      couleur: PARAMS.palette[Math.floor(hasard() * PARAMS.palette.length)],
      energie: 1, affichee: 0.6,
      angle: 0, vitesseAngle: 0,
      phase: entre(0, Math.PI * 2),
      eclat: 0,
      declin: Math.LN2 / entre(PARAMS.demiVieMin, PARAMS.demiVieMax),
    };
    chemin.fleur = f;
    rameaux.forEach((r) => (r.chemin.fleur = f));
    preparerImagesFleur(f);
    fleurs.push(f);
    // les prochaines naissances éviteront cette tige, ses rameaux et sa tête
    for (const q of tigeNee.concat(...rameaux.map((r) => r.chemin.points))) pointsReseau.push(q);
    traits.push({ fleur: f, points: tigeNee.slice() });
    for (const r of rameaux) traits.push({ fleur: f, points: r.chemin.points });
    const anneau = [];
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2;
      anneau.push([centre[0] + Math.cos(ang) * etendue * 0.55, centre[1] + Math.sin(ang) * etendue * 0.55]);
    }
    traits.push({ fleur: f, points: anneau.concat([centre]) });
    impulsions.push({
      chemin, fleur: f, distance: 0, index: 0,
      vitesse: chemin.total / (N.dureeTige * 0.95),
      intensite: 1, taille: 1.1, secondaire: false,
    });
    return true;
  }
  return false;
}

/* ---------- Évolution ---------- */
function mettreAJour(dt, temps) {
  const F = PARAMS.fanage;
  for (const f of fleurs) {
    // Règle 1 : déclin de chaque fleur
    f.energie *= Math.exp(-f.declin * dt);
    f.eclat *= Math.exp(-3 * dt);
    f.affichee += (f.energie - f.affichee) * (1 - Math.exp(-dt / F.reaction));

    // Règle 6 : la tête tombe selon son énergie. Un ressort amorti la ramène :
    // elle descend lentement, et se redresse avec un petit rebond quand la
    // lumière arrive. Vivante, elle respire à peine.
    const fane = fanage(f);
    const vivante = 1 - fane;
    const cible = f.sens * f.chuteMax * fane
                + F.souffle * vivante * Math.sin(temps * 0.7 + f.phase);
    const raideur = F.raideur * (0.25 + 0.75 * vivante);   // fanée, elle a moins de force
    f.vitesseAngle += ((cible - f.angle) * raideur - f.vitesseAngle * F.amorti) * dt;
    f.angle += f.vitesseAngle * dt;

    // Une fleur très affaiblie perd des pétales
    if (!reduireMouvement && f.affichee < 0.3 && hasard() < dt * 0.25 * (f.rayon / 40)) {
      const p = pose(f);
      const a = entre(0, Math.PI * 2), r = entre(0.2, 0.9) * f.rayon;
      const [x, y] = poserPoint(f, p, f.centre[0] + Math.cos(a) * r, f.centre[1] + Math.sin(a) * r);
      petales.push({
        x, y, vx: entre(-10, 10), vy: entre(16, 30), rot: entre(0, Math.PI), vrot: entre(-1, 1),
        vie: 1, duree: entre(2.5, 4), taille: entre(5, 9) * Math.sqrt(f.rayon / 40), phase: entre(0, 6),
        couleur: f,
      });
    }
  }

  for (let i = petales.length - 1; i >= 0; i--) {
    const p = petales[i];
    p.vie -= dt / p.duree;
    p.phase += dt * 1.6;
    p.x += (p.vx + Math.sin(p.phase) * 12) * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    if (p.vie <= 0) petales.splice(i, 1);
  }

  // Les étincelles
  for (let i = etincelles.length - 1; i >= 0; i--) {
    const e = etincelles[i];
    e.vie -= dt / e.duree;
    e.vx *= Math.exp(-2.4 * dt);
    e.vy = e.vy * Math.exp(-2.4 * dt) - 10 * dt;     // elles flottent un peu vers le haut
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.vie <= 0) etincelles.splice(i, 1);
  }

  // Règle 7 : les naissances, puis la croissance du bouton vers le neurone
  const N = PARAMS.naissances;
  for (const f of fleurs) {
    if (!f.nee) continue;
    const avant = eclosion(f);
    f.age += dt;
    if (avant === 0 && eclosion(f) > 0 && !reduireMouvement) etinceler(f, 1);  // elle éclot
    if (eclosion(f) < 1) continue;

    const etaitAdulte = f.maturite >= 0.98;
    f.maturiteCible = Math.min(1, f.maturiteCible + N.croissanceLente * f.affichee * dt);
    f.maturite += (f.maturiteCible - f.maturite) * (1 - Math.exp(-dt / N.douceur));
    if (!etaitAdulte && f.maturite >= 0.98 && !reduireMouvement) etinceler(f, 1);  // le neurone est formé

    // le cœur, la taille et la raideur passent progressivement de ceux du bouton à ceux du neurone
    const w = lisser(f.maturite), [b, n] = f.stades;
    f.centre[0] = b.centre[0] + (n.centre[0] - b.centre[0]) * w;
    f.centre[1] = b.centre[1] + (n.centre[1] - b.centre[1]) * w;
    f.rayon = b.rayon + (n.rayon - b.rayon) * w;
    f.chuteMax = 0.35 + (PARAMS.fanage.chuteGrande - 0.35) * w;
    // le dernier point du chemin suit le cœur, pour que la lumière y arrive
    const pts = f.tige.points, L = f.tige.longueurs, z = pts.length - 1;
    pts[z][0] = f.centre[0];
    pts[z][1] = f.centre[1];
    L[z] = L[z - 1] + Math.hypot(pts[z][0] - pts[z - 1][0], pts[z][1] - pts[z - 1][1]);
    f.tige.total = L[z];
  }
  const moyenne = fleursOrigine.reduce((s, f) => s + f.energie, 0) / fleursOrigine.length;
  prochaineNaissance -= dt;
  if (prochaineNaissance <= 0) {
    if (connecte && moyenne > PARAMS.naissances.seuil && fleurs.length - fleursOrigine.length < PARAMS.naissances.max) {
      faireNaitre();
    }
    prochaineNaissance = entre(...PARAMS.naissances.intervalle);
  }

  // La mémoire s'efface lentement
  const oubli = Math.exp(-dt / PARAMS.memoire.duree);
  for (const c of chemins) {
    if (tempsTotal - c.derniere > PARAMS.memoire.duree * 6) continue;
    for (let j = 0; j < c.lueur.length; j++) c.lueur[j] *= oubli;
  }

  // Règle 2 : émissions irrégulières, avec une lente « respiration »
  if (connecte) {
    prochaineEmission -= dt;
    if (prochaineEmission <= 0) {
      emettre();
      const respiration = 1 + 0.5 * Math.sin(temps * 0.12);
      // plus le bouquet a de fleurs, plus il envoie d'impulsions : chacune reste nourrie
      const parFleur = fleursOrigine.length / fleurs.length;
      prochaineEmission = -Math.log(1 - hasard()) * PARAMS.intervalleMoyen * respiration * parFleur;
    }
  }

  // Déplacement des impulsions
  for (let k = impulsions.length - 1; k >= 0; k--) {
    const imp = impulsions[k];
    if (imp.retard > 0) { imp.retard -= dt; continue; }
    const i0 = imp.index;
    imp.distance += imp.vitesse * dt;
    if (imp.secondaire) imp.intensite *= Math.exp(-0.6 * dt);
    // Règle 8 : l'impulsion laisse une traînée sur les points qu'elle a parcourus
    const ch = imp.chemin, L = ch.longueurs;
    while (imp.index < L.length - 2 && L[imp.index + 1] < imp.distance) imp.index++;
    const depot = imp.intensite * PARAMS.memoire.intensite;
    for (let j = i0; j <= Math.min(imp.index + 1, L.length - 1); j++) ch.lueur[j] = Math.max(ch.lueur[j], depot);
    ch.derniere = tempsTotal;

    if (imp.distance >= imp.chemin.total) {
      if (imp.fleur) {
        // Règles 3 et 4 : la fleur est ravivée, puis l'élan se diffuse
        const f = imp.fleur;
        f.energie = Math.min(1, f.energie + imp.intensite * PARAMS.gainArrivee);
        // une fleur née grandit à chaque impulsion reçue
        if (f.nee && eclosion(f) >= 1) {
          f.maturiteCible = Math.min(1, f.maturiteCible + PARAMS.naissances.croissanceParImpulsion * imp.intensite);
        }
        if (!reduireMouvement) {
          f.eclat = Math.min(1, f.eclat + imp.intensite * 0.6);
          f.vitesseAngle -= f.sens * 0.6 * imp.intensite;   // un sursaut : elle se relève
          etinceler(f, imp.intensite);
        }
        diffuser(f, imp.intensite);
      }
      impulsions.splice(k, 1);
    }
  }
}

/* ---------- Rendu ---------- */
function ajuster() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
  const W = canvas.clientWidth, H = canvas.clientHeight;
  // on garde de la place sur les côtés pour les fleurs qui débordent du dessin
  echelle = Math.min((W * 0.92) / (R.largeur + 2 * PARAMS.naissances.debordement), (H * 0.86) / R.hauteur);
  decalX = (W - R.largeur * echelle) / 2;
  decalY = (H - R.hauteur * echelle) / 2;
}

const versEcranX = (x) => decalX + x * echelle;
const versEcranY = (y) => decalY + y * echelle;

/* Dessine la tête d'une fleur, inclinée autour de son pivot */
// quoi : "trait" (le crayon) ou "couleur" ; alpha : l'opacité de base
function dessinerTete(f, quoi, p, alpha) {
  if (p.s <= 0.001 || alpha <= 0.003) return;
  for (const { st, a, s } of melangeStades(f)) {
    if (a <= 0.003) continue;
    const m = st.modele;
    ctx.save();
    ctx.globalAlpha = alpha * a;
    ctx.translate(versEcranX(f.pivot[0]), versEcranY(f.pivot[1]));
    ctx.rotate(p.angle + st.rot);
    ctx.scale(p.s * st.k * s, p.s * st.k * s);
    ctx.drawImage(st[quoi], (m.tete.x - m.pivot[0]) * echelle, (m.tete.y - m.pivot[1]) * echelle,
      m.tete.img.width * echelle, m.tete.img.height * echelle);
    ctx.restore();
  }
}

/* La tige d'une fleur née, qui pousse depuis son point d'attache */
function dessinerTigeNee(f) {
  const pts = f.tigeNee;
  const pousse = borner(f.age / PARAMS.naissances.dureeTige);
  const n = pousse * (pts.length - 1);
  if (n <= 0) return;
  // la partie déjà poussée
  const k = Math.floor(n), r = n - k, vis = pts.slice(0, k + 1);
  if (r > 0 && k + 1 < pts.length) vis.push([pts[k][0] + (pts[k + 1][0] - pts[k][0]) * r, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * r]);
  if (vis.length < 2) return;
  // une seule forme pleine, effilée : épaisse là où elle sort de la tige hôte, fine vers la fleur
  const w = ctx.lineWidth / 2, gauche = [], droite = [];
  vis.forEach((q, i) => {
    const a = vis[Math.max(0, i - 1)], b = vis[Math.min(vis.length - 1, i + 1)];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const l = Math.hypot(nx, ny) || 1;
    nx /= l; ny /= l;
    const e = w * (1.4 - 0.75 * ((i / (vis.length - 1)) * pousse));
    const X = versEcranX(q[0]), Y = versEcranY(q[1]);
    gauche.push([X + nx * e, Y + ny * e]);
    droite.push([X - nx * e, Y - ny * e]);
  });
  ctx.fillStyle = ctx.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(gauche[0][0], gauche[0][1]);
  for (const q of gauche) ctx.lineTo(q[0], q[1]);
  for (let i = droite.length - 1; i >= 0; i--) ctx.lineTo(droite[i][0], droite[i][1]);
  ctx.closePath();
  // le nœud de départ et le bout arrondi font partie de la même forme
  const d = vis[0], fi = vis[vis.length - 1];
  ctx.moveTo(versEcranX(d[0]) + w * 1.5, versEcranY(d[1]));
  ctx.arc(versEcranX(d[0]), versEcranY(d[1]), w * 1.5, 0, Math.PI * 2);
  const ef = w * (1.4 - 0.75 * pousse);
  ctx.moveTo(versEcranX(fi[0]) + ef, versEcranY(fi[1]));
  ctx.arc(versEcranX(fi[0]), versEcranY(fi[1]), ef, 0, Math.PI * 2);
  ctx.fill("nonzero");
}

/* Les rameaux d'une fleur née : ils poussent quand la tige les atteint */
function dessinerRameaux(f, enCouleur = false) {
  const N = PARAMS.naissances;
  for (const r of f.rameaux) {
    const pousse = borner((f.age - r.t * N.dureeTige - 0.2) / 0.9);
    if (pousse <= 0) continue;
    const pts = r.chemin.points, n = pousse * (pts.length - 1), k = Math.floor(n);
    ctx.beginPath();
    ctx.moveTo(versEcranX(pts[0][0]), versEcranY(pts[0][1]));
    for (let i = 1; i <= k; i++) ctx.lineTo(versEcranX(pts[i][0]), versEcranY(pts[i][1]));
    if (k + 1 < pts.length) {
      const u = n - k;
      ctx.lineTo(versEcranX(pts[k][0] + (pts[k + 1][0] - pts[k][0]) * u), versEcranY(pts[k][1] + (pts[k + 1][1] - pts[k][1]) * u));
    }
    ctx.stroke();
    // le bourgeon, un petit cercle comme ceux du dessin
    const b = borner((pousse - 0.8) / 0.2);
    if (b > 0) {
      const [x, y] = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(versEcranX(x), versEcranY(y), r.bourgeon * b * echelle * (enCouleur ? 1 : 1), 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/* La mémoire : chaque chemin récemment emprunté garde une traînée de sa couleur */
function dessinerMemoire(lumiere) {
  const M = PARAMS.memoire;
  // en sombre, « screen » éclaire sans brûler le tronc, où beaucoup de chemins se superposent
  ctx.globalCompositeOperation = theme === "sombre" ? "screen" : lumiere;
  ctx.lineCap = "round";
  for (const c of chemins) {
    if (!c.fleur || tempsTotal - c.derniere > M.duree * 6) continue;
    const f = c.fleur, p = pose(f);
    ctx.strokeStyle = `rgb(${couleurTheme(f.couleur).join(",")})`;
    let prec = null;
    for (let j = 0; j < c.points.length; j++) {
      const [x0, y0] = c.points[j];
      const q = c.longueurs[j] >= c.debutTete ? poserPoint(f, p, x0, y0) : c.points[j];
      const l = c.lueur[j];
      if (prec && l > 0.02) {
        const a = Math.min(l, c.lueur[j - 1]);
        if (a > 0.02) {
          if (theme === "sombre") {                 // un halo large et doux, puis un trait fin
            ctx.globalAlpha = a * 0.12;
            ctx.lineWidth = M.largeur * 3 * echelle;
            ctx.beginPath(); ctx.moveTo(versEcranX(prec[0]), versEcranY(prec[1])); ctx.lineTo(versEcranX(q[0]), versEcranY(q[1])); ctx.stroke();
          }
          ctx.globalAlpha = a * (theme === "sombre" ? 0.55 : 0.8);
          ctx.lineWidth = M.largeur * echelle;
          ctx.beginPath(); ctx.moveTo(versEcranX(prec[0]), versEcranY(prec[1])); ctx.lineTo(versEcranX(q[0]), versEcranY(q[1])); ctx.stroke();
        }
      }
      prec = q;
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

/* Le halo d'ambiance */
function dessinerAmbiance(W, H) {
  let r = 0, v = 0, b = 0, poids = 0;
  for (const f of fleurs) {
    const w = f.affichee * f.affichee;
    const c = f.couleur;
    r += c[0] * w; v += c[1] * w; b += c[2] * w; poids += w;
  }
  if (poids < 0.01) return;
  r /= poids; v /= poids; b /= poids;
  const force = Math.min(1, poids / fleurs.length * 2) * PARAMS.ambiance[theme] * (1 + 0.15 * Math.sin(tempsTotal * 0.5));
  const cx = versEcranX(R.largeur / 2), cy = versEcranY(R.hauteur * 0.42);
  const rayon = Math.max(W, H) * 0.55;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rayon);
  g.addColorStop(0, `rgba(${r | 0},${v | 0},${b | 0},${force})`);
  g.addColorStop(0.5, `rgba(${r | 0},${v | 0},${b | 0},${force * 0.35})`);
  g.addColorStop(1, `rgba(${r | 0},${v | 0},${b | 0},0)`);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function dessinerImpulsion(imp) {
  const longueurTrainee = 120;
  const ch = imp.chemin;
  const f = ch.fleur;
  const p = pose(f);
  for (let d = 0; d <= longueurTrainee; d += 6) {
    const dist = imp.distance - d;
    if (dist < 0) break;
    let [x, y] = positionSur(ch, { distance: dist, index: Math.max(0, imp.index - 25) });
    if (dist >= ch.debutTete) [x, y] = poserPoint(f, p, x, y);   // dans la tête : elle suit son inclinaison
    const affaiblissement = 1 - d / longueurTrainee;
    const taille = (d === 0 ? 64 : 24) * imp.taille * echelle * (0.6 + 0.4 * affaiblissement);
    ctx.globalAlpha = Math.min(1, imp.intensite * affaiblissement * (d === 0 ? 1 : 0.3) * (theme === "clair" ? 1.4 : 1));
    ctx.drawImage(f.halo, versEcranX(x) - taille / 2, versEcranY(y) - taille / 2, taille, taille);
  }
}

function rendre() {
  const W = canvas.clientWidth, H = canvas.clientHeight;
  const opacite = PARAMS.opaciteDessin[theme];
  const lumiere = theme === "sombre" ? "lighter" : "source-over";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // 0. Le halo d'ambiance : la couleur moyenne des fleurs vivantes, qui respire
  dessinerAmbiance(W, H);

  // 1. La trace du crayon : le bouquet fixe, puis chaque tête, inclinée
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = opacite;
  ctx.drawImage(fondTeinte, decalX, decalY, R.largeur * echelle, R.hauteur * echelle);
  ctx.strokeStyle = `rgb(${PARAMS.trait[theme].join(",")})`;
  ctx.lineWidth = Math.max(1.2, 4.6 * echelle);   // l'épaisseur d'un trait de crayon
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const f of fleurs) if (f.nee) { dessinerTigeNee(f); dessinerRameaux(f); }
  for (const f of fleurs) dessinerTete(f, "trait", pose(f), opacite);

  // 1 bis. La mémoire de la lumière sur les tiges
  dessinerMemoire(lumiere);

  // 2. Les pétales qui tombent
  ctx.lineWidth = Math.max(1, 2 * echelle);
  ctx.strokeStyle = `rgb(${PARAMS.trait[theme].join(",")})`;
  for (const p of petales) {
    ctx.save();
    ctx.globalAlpha = 0.6 * Math.min(1, p.vie * 2);
    ctx.translate(versEcranX(p.x), versEcranY(p.y));
    ctx.rotate(p.rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.taille * echelle, p.taille * 0.6 * echelle, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  // 3. La vie : la couleur revient selon l'énergie de chaque fleur
  ctx.globalCompositeOperation = lumiere;
  for (const f of fleurs) {
    const vie = Math.min(1, f.affichee + f.eclat * 0.4);
    const p = pose(f);
    if (f.nee && vie > 0.02) {                       // la tige née et ses rameaux se colorent aussi
      ctx.strokeStyle = `rgb(${couleurTheme(f.couleur).join(",")})`;
      ctx.lineWidth = Math.max(1, 3 * echelle);
      ctx.globalAlpha = 0.45 * vie;
      dessinerTigeNee(f);
      dessinerRameaux(f, true);
    }
    dessinerTete(f, "couleur", p, theme === "sombre" ? 0.9 * vie ** 1.4 : vie);

    if (p.s <= 0.001) continue;
    const [hx, hy] = poserPoint(f, p, f.centre[0], f.centre[1]);
    const tailleHalo = f.rayon * (2.2 + 1.2 * vie + f.eclat) * echelle * tailleEclosion(f);
    ctx.globalAlpha = (theme === "sombre" ? 0.22 : 0.16) * vie * vie + 0.25 * f.eclat;
    ctx.drawImage(f.halo, versEcranX(hx) - tailleHalo / 2, versEcranY(hy) - tailleHalo / 2, tailleHalo, tailleHalo);
  }

  // 4. Les impulsions
  for (const imp of impulsions) {
    if (imp.retard > 0) continue;
    dessinerImpulsion(imp);
  }

  // 5. Les étincelles
  for (const e of etincelles) {
    const t = e.taille * echelle * 2 * (0.5 + 0.5 * e.vie);
    ctx.globalAlpha = Math.min(1, e.vie ** 1.5 * (theme === "clair" ? 1.2 : 1));
    ctx.drawImage(e.halo, versEcranX(e.x) - t / 2, versEcranY(e.y) - t / 2, t, t);
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  if (montrerReseau) dessinerReseau();
}

function dessinerReseau() {
  ctx.lineWidth = 1;
  const tracer = (chemin, couleur) => {
    ctx.strokeStyle = couleur;
    ctx.beginPath();
    chemin.points.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, versEcranX(x), versEcranY(y)));
    ctx.stroke();
  };
  const encre = theme === "sombre" ? "rgba(120,220,255,.9)" : "rgba(0,90,140,.9)";
  ctx.font = "11px Helvetica, Arial, sans-serif";
  for (const f of fleurs) {
    tracer(f.tige, "rgba(220,150,20,.8)");
    f.ramifs.forEach((r) => tracer(r, "rgba(220,70,60,.8)"));
    ctx.strokeStyle = encre;
    ctx.beginPath();
    ctx.arc(versEcranX(f.pivot[0]), versEcranY(f.pivot[1]), 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = encre;
    ctx.fillText(`${f.nom} ${Math.round(f.energie * 100)} %`, versEcranX(f.centre[0]) + 8, versEcranY(f.centre[1]) - 8);
  }
  if (derniereCoord) {
    ctx.fillStyle = encre;
    ctx.fillText(`(${derniereCoord[0]}, ${derniereCoord[1]})`, 20, 24);
  }
}

/* ---------- Compteur ---------- */
const compteur = document.getElementById("compteur");
const compteurTexte = document.getElementById("compteur-texte");
let texteCompteur = "";

function majCompteur() {
  const presentes = fleurs.filter((f) => eclosion(f) >= 1);
  const vivantes = presentes.filter((f) => f.affichee > 0.45).length;
  const total = presentes.length;
  const t = vivantes === 0 ? `Aucune fleur sur ${total} n'est en vie`
    : vivantes === 1 ? `1 fleur sur ${total} est en vie`
    : `${vivantes} fleurs sur ${total} sont en vie`;
  if (t !== texteCompteur) compteurTexte.textContent = texteCompteur = t;
}

function montrerCompteur(visible) {
  compteur.hidden = !visible;
  try { localStorage.setItem("compteur-oeuvre", visible ? "oui" : "non"); } catch (e) { /* tant pis */ }
}

try { if (localStorage.getItem("compteur-oeuvre") === "non") compteur.hidden = true; } catch (e) { /* visible */ }
document.getElementById("compteur-fermer").addEventListener("click", () => montrerCompteur(false));

/* ---------- Boucle ---------- */
let tempsPrecedent = null;
let tempsTotal = 0;
function boucle(t) {
  if (tempsPrecedent === null) tempsPrecedent = t;
  const dt = Math.min(0.05, (t - tempsPrecedent) / 1000);
  tempsPrecedent = t;
  tempsTotal += dt;
  mettreAJour(dt, tempsTotal);
  rendre();
  majCompteur();
  requestAnimationFrame(boucle);
}

/* ---------- Interactions ---------- */
const etat = document.getElementById("etat");
const aide = document.getElementById("aide");
const boutonTheme = document.getElementById("bouton-theme");
document.getElementById("graine").textContent = `Graine : ${graine}`;

function majBoutonTheme() {
  const versSombre = theme === "clair";
  boutonTheme.setAttribute("aria-label", versSombre ? "Passer au thème sombre" : "Passer au thème clair");
  boutonTheme.title = versSombre ? "Thème sombre" : "Thème clair";
}

function changerTheme() {
  theme = theme === "clair" ? "sombre" : "clair";
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme-oeuvre", theme); } catch (e) { /* tant pis */ }
  majBoutonTheme();
  construireImages();
}

boutonTheme.addEventListener("click", (e) => {
  changerTheme();
  // Clic à la souris : on rend le focus à la page, pour qu'Espace coupe
  // toujours les connexions. Au clavier, le focus reste sur le bouton.
  if (e.detail > 0) boutonTheme.blur();
});
majBoutonTheme();

window.addEventListener("keydown", (e) => {
  if (e.target.closest && e.target.closest("button") && (e.code === "Space" || e.key === "Enter")) return;
  if (e.code === "Space") {
    e.preventDefault();
    connecte = !connecte;
    etat.textContent = connecte ? "" : "Connexions coupées";
  } else if (e.key === "r" || e.key === "R") {
    url.searchParams.set("graine", Math.floor(Math.random() * 100000));
    window.location.href = url.toString();
  } else if (e.key === "t" || e.key === "T") {
    montrerReseau = !montrerReseau;
  } else if (e.key === "c" || e.key === "C") {
    montrerCompteur(compteur.hidden);
  } else if (e.key === "h" || e.key === "H" || e.key === "?") {
    aide.hidden = !aide.hidden;
  }
});

canvas.addEventListener("click", (e) => {
  if (!montrerReseau) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.round((e.clientX - rect.left - decalX) / echelle);
  const y = Math.round((e.clientY - rect.top - decalY) / echelle);
  derniereCoord = [x, y];
  navigator.clipboard?.writeText(`(${x}, ${y})`).catch(() => {});
});

window.addEventListener("resize", ajuster);

Promise.all([dessinBase, ...fleurs.map((f) => f.tete.img)].map((img) => img.decode())).then(() => {
  construireImages();
  ajuster();
  requestAnimationFrame(boucle);
});
