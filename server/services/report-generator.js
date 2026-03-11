/**
 * Report Generator — PPTX export
 * Generates 18-slide PowerPoint audit report using pptxgenjs
 */

import pptxgen from 'pptxgenjs';
import {
  generateLocationMap,
  generateSatelliteMap,
  generateMarkersMap,
  generateConcurrenceMap,
} from './map-generator.js';
import { generateCityImage } from './image-generator.js';

// ── Color palette (no # prefix for pptxgenjs) ─────────────────
const C = {
  ORANGE:     'F19015',
  ORANGE_DIM: 'E2740B',
  DARK:       '0F1B2D',
  DARK2:      '1E2A3A',
  GRAY:       '334155',
  LIGHT:      'F8FAFC',
  WHITE:      'FFFFFF',
  MID:        '94A3B8',
  BORDER:     'E2E8F0',
  BLUE:       '0984E3',
  GREEN:      '00B894',
  RED:        'D63031',
};

// ── Slide dimensions: LAYOUT_WIDE = 13.33" × 7.5" ─────────────
const W = 13.33;
const H = 7.5;

// ── Generic helpers ────────────────────────────────────────────

function rect(slide, x, y, w, h, color) {
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color },
    line: { color, width: 0 },
  });
}

function txt(slide, text, opts) {
  slide.addText(String(text ?? ''), opts);
}

function addImage(slide, dataUri, x, y, w, h) {
  if (!dataUri) return;
  slide.addImage({ data: dataUri, x, y, w, h });
}

/** Orange header bar with white label */
function header(slide, label) {
  rect(slide, 0, 0, W, 0.52, C.ORANGE);
  txt(slide, label, {
    x: 0.35, y: 0, w: W - 0.7, h: 0.52,
    fontSize: 11, bold: true, color: C.WHITE,
    valign: 'middle', fontFace: 'Calibri',
  });
}

/** Dark footer bar */
function footer(slide, address) {
  rect(slide, 0, H - 0.32, W, 0.32, C.DARK);
  txt(slide, address || '', {
    x: 0.3, y: H - 0.32, w: W - 2, h: 0.32,
    fontSize: 7.5, color: C.MID, valign: 'middle', fontFace: 'Calibri',
  });
  txt(slide, 'VALERIE', {
    x: W - 1.9, y: H - 0.32, w: 1.6, h: 0.32,
    fontSize: 7.5, bold: true, color: C.ORANGE,
    valign: 'middle', align: 'right', fontFace: 'Calibri',
  });
}

/** Section divider slide (01, 02…) */
function sectionDivider(prs, num, title, subtitle, address) {
  const slide = prs.addSlide();
  slide.background = { color: C.DARK };

  // Big watermark number
  txt(slide, num, {
    x: -0.5, y: -0.8, w: 8, h: 7,
    fontSize: 220, bold: true, color: C.DARK2,
    align: 'left', valign: 'top', fontFace: 'Calibri',
  });

  // Orange side strip
  rect(slide, 0, 0, 0.12, H, C.ORANGE);

  // Section title
  txt(slide, title, {
    x: 1, y: 2.5, w: 10, h: 1.2,
    fontSize: 40, bold: true, color: C.WHITE, fontFace: 'Calibri',
  });

  if (subtitle) {
    txt(slide, subtitle, {
      x: 1, y: 3.8, w: 10, h: 0.6,
      fontSize: 14, color: C.MID, fontFace: 'Calibri',
    });
  }

  footer(slide, address);
  return slide;
}

/** Table helper: build row array from data array */
function makeTableRow(cells, isHeader = false) {
  return cells.map(cell => ({
    text: String(cell ?? '—'),
    options: isHeader
      ? { bold: true, color: C.WHITE, fill: { color: C.ORANGE }, fontSize: 9, align: 'center', valign: 'middle', fontFace: 'Calibri' }
      : { color: C.GRAY, fontSize: 8.5, valign: 'middle', fontFace: 'Calibri' },
  }));
}

// ── SLIDE 1 — COVER ───────────────────────────────────────────
function slide01_cover(prs, audit) {
  const slide = prs.addSlide();
  slide.background = { color: C.DARK };

  rect(slide, 0, 0, 0.15, H, C.ORANGE);
  rect(slide, 0, H / 2 - 0.02, W, 0.04, C.ORANGE);

  txt(slide, 'VALERIE', {
    x: 0.55, y: 0.55, w: 5, h: 0.8,
    fontSize: 32, bold: true, color: C.ORANGE, fontFace: 'Calibri',
  });
  txt(slide, 'AUDIT IMMOBILIER', {
    x: 0.55, y: 1.42, w: 8, h: 0.45,
    fontSize: 13, color: C.MID, charSpacing: 3, fontFace: 'Calibri',
  });

  const addr = audit.address || '';
  const cityLine = [audit.postal_code, audit.city].filter(Boolean).join(' ');

  txt(slide, addr, {
    x: 0.55, y: 2.6, w: 12, h: 0.9,
    fontSize: 28, bold: true, color: C.WHITE, fontFace: 'Calibri',
  });
  if (cityLine) {
    txt(slide, cityLine, {
      x: 0.55, y: 3.55, w: 8, h: 0.45,
      fontSize: 16, color: C.MID, fontFace: 'Calibri',
    });
  }

  const date = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
  txt(slide, `Rapport généré le ${date}`, {
    x: 0.55, y: H - 1.2, w: 6, h: 0.35,
    fontSize: 10, color: C.MID, fontFace: 'Calibri',
  });
}

// ── SLIDE 2 — SOMMAIRE ────────────────────────────────────────
function slide02_sommaire(prs, audit) {
  const slide = prs.addSlide();
  slide.background = { color: C.LIGHT };
  header(slide, 'SOMMAIRE');
  footer(slide, audit.address);

  const items = [
    ['01', 'Localisation', 'Situation géographique, quartier, transports'],
    ['02', 'Enseignement Supérieur', 'Universités, grandes écoles, lycées'],
    ['03', 'Concurrence', 'CROUS, résidences conventionnées et privées'],
    ['04', 'Court Séjour', 'Employeurs saisonniers, tourisme estival'],
    ['05', 'Fiche Info', 'Caractéristiques de la résidence'],
  ];

  items.forEach(([num, title, desc], i) => {
    const y = 0.9 + i * 1.12;
    rect(slide, 0.3, y, 0.7, 0.7, C.ORANGE);
    txt(slide, num, {
      x: 0.3, y, w: 0.7, h: 0.7,
      fontSize: 18, bold: true, color: C.WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
    txt(slide, title, {
      x: 1.25, y: y + 0.05, w: 10, h: 0.35,
      fontSize: 14, bold: true, color: C.DARK, fontFace: 'Calibri',
    });
    txt(slide, desc, {
      x: 1.25, y: y + 0.38, w: 10, h: 0.28,
      fontSize: 10, color: C.MID, fontFace: 'Calibri',
    });
  });
}

// ── SLIDE 3 — LOCALISATION SECTION DIVIDER ────────────────────
// → called by sectionDivider(prs, '01', 'LOCALISATION', ..., address)

// ── SLIDE 4 — LOCALISATION: CARTE DE SITUATION ───────────────
function slide04_carteLocalisation(prs, audit, locationMap) {
  const slide = prs.addSlide();
  slide.background = { color: C.DARK };
  header(slide, 'LOCALISATION — Carte de situation');
  footer(slide, audit.address);

  if (locationMap) {
    addImage(slide, locationMap, 0, 0.52, W, H - 0.84);
  } else {
    rect(slide, 0, 0.52, W, H - 0.84, C.DARK2);
    txt(slide, 'Carte non disponible', {
      x: 3, y: 3, w: 7, h: 1,
      fontSize: 16, color: C.MID, align: 'center', fontFace: 'Calibri',
    });
  }
}

// ── SLIDE 5 — LOCALISATION: VUE SATELLITE + TRANSPORTS ───────
function slide05_satelliteTransport(prs, audit, satelliteMap, loc) {
  const slide = prs.addSlide();
  slide.background = { color: C.LIGHT };
  header(slide, 'LOCALISATION — Vue satellite & Transports');
  footer(slide, audit.address);

  // Left: satellite map
  if (satelliteMap) {
    addImage(slide, satelliteMap, 0, 0.52, 7.5, H - 0.84);
  } else {
    rect(slide, 0, 0.52, 7.5, H - 0.84, C.DARK2);
  }

  // Right: transport info
  const transports = loc?.transports;
  txt(slide, 'TRANSPORTS', {
    x: 7.8, y: 0.65, w: 5.2, h: 0.4,
    fontSize: 12, bold: true, color: C.ORANGE, fontFace: 'Calibri',
  });

  if (transports?.description) {
    txt(slide, transports.description, {
      x: 7.8, y: 1.1, w: 5.2, h: 1.1,
      fontSize: 9, color: C.GRAY, fontFace: 'Calibri',
    });
  }

  const arrets = transports?.arrets || [];
  let ty = 2.3;
  arrets.slice(0, 5).forEach(arret => {
    if (ty > H - 1.2) return;
    rect(slide, 7.8, ty, 5.2, 0.04, C.BORDER);
    ty += 0.08;
    txt(slide, arret.nom || '', {
      x: 7.8, y: ty, w: 3.5, h: 0.3,
      fontSize: 9, bold: true, color: C.DARK, fontFace: 'Calibri',
    });
    txt(slide, arret.distance || '', {
      x: 11.3, y: ty, w: 1.7, h: 0.3,
      fontSize: 8.5, color: C.MID, align: 'right', fontFace: 'Calibri',
    });
    const lignes = (arret.lignes || []).map(l => `${l.type} ${l.numero}`).join(' · ');
    if (lignes) {
      ty += 0.32;
      txt(slide, lignes, {
        x: 7.8, y: ty, w: 5.2, h: 0.25,
        fontSize: 8, color: C.MID, fontFace: 'Calibri',
      });
    }
    ty += 0.38;
  });

  // Points repères
  const pts = loc?.pointsReperes || [];
  if (pts.length > 0 && ty < H - 1.2) {
    ty += 0.1;
    txt(slide, 'POINTS REPÈRES', {
      x: 7.8, y: ty, w: 5.2, h: 0.35,
      fontSize: 10, bold: true, color: C.ORANGE, fontFace: 'Calibri',
    });
    ty += 0.4;
    pts.slice(0, 4).forEach(pt => {
      if (ty > H - 1.1) return;
      txt(slide, `• ${pt.nom} — ${pt.distance}`, {
        x: 7.8, y: ty, w: 5.2, h: 0.28,
        fontSize: 8.5, color: C.GRAY, fontFace: 'Calibri',
      });
      ty += 0.3;
    });
  }
}

// ── SLIDE 6 & 7 — TRANSPORT PHOTOS (AI placeholder) ──────────
function slideTransportPhoto(prs, audit, img, caption) {
  const slide = prs.addSlide();
  slide.background = { color: C.DARK };

  if (img) {
    addImage(slide, img, 0, 0, W, H);
    // Semi-transparent overlay for text
    rect(slide, 0, H - 1, W, 1, C.DARK);
  } else {
    rect(slide, 0, 0, W, H, C.DARK2);
    txt(slide, '📷 Photo de territoire — placeholder IA', {
      x: 2, y: 3, w: 9, h: 1,
      fontSize: 18, color: C.MID, align: 'center', fontFace: 'Calibri',
    });
  }

  txt(slide, caption || audit.city || audit.address, {
    x: 0.4, y: H - 0.85, w: W - 0.8, h: 0.55,
    fontSize: 11, color: C.WHITE, fontFace: 'Calibri',
  });

  // Small orange tag
  rect(slide, W - 2.3, H - 0.85, 2, 0.45, C.ORANGE);
  txt(slide, 'TERRITOIRE', {
    x: W - 2.3, y: H - 0.85, w: 2, h: 0.45,
    fontSize: 9, bold: true, color: C.WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
  });
}

// ── SLIDE 9 — ENSEIGNEMENT: CARTE ────────────────────────────
function slide09_enseignementCarte(prs, audit, schoolsMap, ens) {
  const slide = prs.addSlide();
  slide.background = { color: C.DARK };
  header(slide, 'ENSEIGNEMENT SUPÉRIEUR — Carte des établissements');
  footer(slide, audit.address);

  if (schoolsMap) {
    addImage(slide, schoolsMap, 0, 0.52, 8.5, H - 0.84);
  } else {
    rect(slide, 0, 0.52, 8.5, H - 0.84, C.DARK2);
  }

  // Legend on right
  txt(slide, 'ÉTABLISSEMENTS', {
    x: 8.8, y: 0.65, w: 4.2, h: 0.4,
    fontSize: 11, bold: true, color: C.ORANGE, fontFace: 'Calibri',
  });

  const all = [
    ...(ens?.universites || []).map(u => ({ label: u.nom, dist: u.distanceKm, type: 'Université' })),
    ...(ens?.ecolesSuperieures || []).map(e => ({ label: e.nom, dist: e.distanceKm, type: e.type })),
  ].slice(0, 8);

  let ty = 1.2;
  all.forEach((item, i) => {
    if (ty > H - 1.2) return;
    rect(slide, 8.8, ty, 0.38, 0.35, C.ORANGE);
    txt(slide, String(i + 1), {
      x: 8.8, y: ty, w: 0.38, h: 0.35,
      fontSize: 10, bold: true, color: C.WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
    txt(slide, item.label, {
      x: 9.25, y: ty, w: 3.5, h: 0.22,
      fontSize: 8.5, bold: true, color: C.WHITE, fontFace: 'Calibri',
    });
    txt(slide, `${item.type}${item.dist ? ` · ${item.dist} km` : ''}`, {
      x: 9.25, y: ty + 0.2, w: 3.5, h: 0.2,
      fontSize: 7.5, color: C.MID, fontFace: 'Calibri',
    });
    ty += 0.6;
  });

  if (ens?.totalEtudiantsZone) {
    txt(slide, `Total étudiants zone : ${ens.totalEtudiantsZone.toLocaleString('fr-FR')}`, {
      x: 8.8, y: H - 0.7, w: 4.2, h: 0.3,
      fontSize: 9, bold: true, color: C.ORANGE, fontFace: 'Calibri',
    });
  }
}

// ── SLIDE 10 — ENSEIGNEMENT: TABLEAU ─────────────────────────
function slide10_enseignementTable(prs, audit, ens) {
  const slide = prs.addSlide();
  slide.background = { color: C.LIGHT };
  header(slide, 'ENSEIGNEMENT SUPÉRIEUR — Établissements');
  footer(slide, audit.address);

  const unis = (ens?.universites || []).slice(0, 5);
  const ecoles = (ens?.ecolesSuperieures || []).slice(0, 5);

  // Universities table
  if (unis.length > 0) {
    txt(slide, 'Universités', {
      x: 0.3, y: 0.65, w: 6, h: 0.35,
      fontSize: 11, bold: true, color: C.ORANGE, fontFace: 'Calibri',
    });
    const rows = [
      makeTableRow(['Établissement', 'Adresse', 'Distance', 'Étudiants'], true),
      ...unis.map(u => makeTableRow([u.nom, u.adresse, u.distanceKm ? `${u.distanceKm} km` : '—', u.nombreEtudiants?.toLocaleString('fr-FR') || '—'])),
    ];
    slide.addTable(rows, {
      x: 0.3, y: 1.05, w: 6.2,
      colW: [2.2, 2.1, 1, 0.9],
      border: { pt: 0.5, color: C.BORDER },
      rowH: 0.38,
    });
  }

  // Grandes écoles table
  if (ecoles.length > 0) {
    txt(slide, 'Grandes Écoles & Écoles Supérieures', {
      x: 6.85, y: 0.65, w: 6.2, h: 0.35,
      fontSize: 11, bold: true, color: C.ORANGE, fontFace: 'Calibri',
    });
    const rows2 = [
      makeTableRow(['Établissement', 'Type', 'Adresse', 'Distance'], true),
      ...ecoles.map(e => makeTableRow([e.nom, e.type, e.adresse, e.distanceKm ? `${e.distanceKm} km` : '—'])),
    ];
    slide.addTable(rows2, {
      x: 6.85, y: 1.05, w: 6.2,
      colW: [2.2, 1.5, 1.8, 0.7],
      border: { pt: 0.5, color: C.BORDER },
      rowH: 0.38,
    });
  }

  if (ens?.resume) {
    txt(slide, ens.resume, {
      x: 0.3, y: H - 1.1, w: W - 0.6, h: 0.65,
      fontSize: 9, color: C.GRAY, fontFace: 'Calibri',
    });
  }
}

// ── SLIDE 12 — CONCURRENCE: CARTE ────────────────────────────
function slide12_concurrenceCarte(prs, audit, concurrenceMap, conc) {
  const slide = prs.addSlide();
  slide.background = { color: C.DARK };
  header(slide, 'CONCURRENCE — Carte des résidences');
  footer(slide, audit.address);

  if (concurrenceMap) {
    addImage(slide, concurrenceMap, 0, 0.52, 9.5, H - 0.84);
  } else {
    rect(slide, 0, 0.52, 9.5, H - 0.84, C.DARK2);
  }

  // Legend
  txt(slide, 'LÉGENDE', {
    x: 9.8, y: 0.65, w: 3.2, h: 0.38,
    fontSize: 11, bold: true, color: C.WHITE, fontFace: 'Calibri',
  });
  const legends = [
    { color: C.RED,    label: 'Résidence auditée' },
    { color: C.BLUE,   label: 'CROUS' },
    { color: C.GREEN,  label: 'Conventionnées' },
    { color: C.ORANGE, label: 'Résidences privées' },
  ];
  legends.forEach((leg, i) => {
    const ly = 1.15 + i * 0.55;
    rect(slide, 9.8, ly, 0.35, 0.35, leg.color);
    txt(slide, leg.label, {
      x: 10.3, y: ly, w: 2.8, h: 0.35,
      fontSize: 10, color: C.WHITE, valign: 'middle', fontFace: 'Calibri',
    });
  });

  // Analyse niveau
  const niveau = conc?.analyseConcurrentielle?.niveauConcurrence;
  if (niveau) {
    const color = { faible: C.GREEN, modéré: C.ORANGE, élevé: C.RED }[niveau] || C.MID;
    txt(slide, 'NIVEAU CONCURRENCE', {
      x: 9.8, y: 3.8, w: 3.2, h: 0.3,
      fontSize: 8.5, color: C.MID, fontFace: 'Calibri',
    });
    rect(slide, 9.8, 4.15, 3.2, 0.5, color);
    txt(slide, niveau.toUpperCase(), {
      x: 9.8, y: 4.15, w: 3.2, h: 0.5,
      fontSize: 14, bold: true, color: C.WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
  }
}

// ── SLIDE 13 — CONCURRENCE CROUS + CONVENTIONNÉES ────────────
function slide13_concurrenceCrousConv(prs, audit, conc) {
  const slide = prs.addSlide();
  slide.background = { color: C.LIGHT };
  header(slide, 'CONCURRENCE — CROUS & Résidences conventionnées');
  footer(slide, audit.address);

  const crous = (conc?.crous?.residences || []).slice(0, 5);
  const conv = (conc?.conventionnees?.residences || []).slice(0, 5);

  if (crous.length > 0) {
    rect(slide, 0.3, 0.62, 0.12, 0.32, C.BLUE);
    txt(slide, 'CROUS', {
      x: 0.55, y: 0.62, w: 4, h: 0.32,
      fontSize: 11, bold: true, color: C.BLUE, fontFace: 'Calibri',
    });
    const rows = [
      makeTableRow(['Résidence', 'Adresse', 'Distance', 'Logements'], true),
      ...crous.map(r => makeTableRow([r.nom, r.adresse, r.distanceKm ? `${r.distanceKm} km` : '—', r.nbLogements || '—'])),
    ];
    slide.addTable(rows, {
      x: 0.3, y: 1.0, w: 12.7,
      colW: [3.8, 5, 1.7, 2.2],
      border: { pt: 0.5, color: C.BORDER },
      rowH: 0.4,
    });
  }

  const yConv = 0.62 + (crous.length > 0 ? 1.0 + crous.length * 0.4 + 0.35 : 0);

  if (conv.length > 0 && yConv < H - 1.5) {
    rect(slide, 0.3, yConv, 0.12, 0.32, C.GREEN);
    txt(slide, 'Résidences conventionnées', {
      x: 0.55, y: yConv, w: 6, h: 0.32,
      fontSize: 11, bold: true, color: C.GREEN, fontFace: 'Calibri',
    });
    const rows2 = [
      makeTableRow(['Résidence', 'Opérateur', 'Loyer', 'Distance', 'Logements'], true),
      ...conv.map(r => makeTableRow([r.nom, r.operateur, r.loyer, r.distanceKm ? `${r.distanceKm} km` : '—', r.nbLogements || '—'])),
    ];
    slide.addTable(rows2, {
      x: 0.3, y: yConv + 0.38, w: 12.7,
      colW: [3.5, 2.5, 2, 1.7, 3],
      border: { pt: 0.5, color: C.BORDER },
      rowH: 0.4,
    });
  }
}

// ── SLIDE 14 — CONCURRENCE PRIVÉES ───────────────────────────
function slide14_concurrencePrivees(prs, audit, conc) {
  const slide = prs.addSlide();
  slide.background = { color: C.LIGHT };
  header(slide, 'CONCURRENCE — Résidences privées');
  footer(slide, audit.address);

  rect(slide, 0.3, 0.62, 0.12, 0.32, C.ORANGE);
  txt(slide, 'Résidences étudiantes privées', {
    x: 0.55, y: 0.62, w: 8, h: 0.32,
    fontSize: 11, bold: true, color: C.ORANGE, fontFace: 'Calibri',
  });

  const privees = (conc?.privees?.residences || []).slice(0, 8);
  if (privees.length > 0) {
    const rows = [
      makeTableRow(['Résidence', 'Opérateur', 'Loyer', 'Distance', 'Logements'], true),
      ...privees.map(r => makeTableRow([r.nom, r.operateur, r.loyer, r.distanceKm ? `${r.distanceKm} km` : '—', r.nbLogements || '—'])),
    ];
    slide.addTable(rows, {
      x: 0.3, y: 1.05, w: 12.7,
      colW: [3.5, 2.5, 2, 1.7, 3],
      border: { pt: 0.5, color: C.BORDER },
      rowH: 0.4,
    });
  }

  const analyse = conc?.analyseConcurrentielle;
  if (analyse?.resume) {
    txt(slide, analyse.resume, {
      x: 0.3, y: H - 1.1, w: W - 0.6, h: 0.65,
      fontSize: 9, color: C.GRAY, fontFace: 'Calibri',
    });
  }
}

// ── SLIDE 16 — COURT SÉJOUR: CONTEXTE ────────────────────────
function slide16_courtSejourContexte(prs, audit, court) {
  const slide = prs.addSlide();
  slide.background = { color: C.LIGHT };
  header(slide, 'COURT SÉJOUR ESTIVAL — Contexte & Activités');
  footer(slide, audit.address);

  // Potentiel badge
  const potentiel = court?.potentielEstival;
  if (potentiel) {
    const badgeColor = { faible: C.MID, modéré: C.ORANGE, élevé: C.GREEN }[potentiel] || C.MID;
    rect(slide, 0.3, 0.65, 3, 0.45, badgeColor);
    txt(slide, `Potentiel estival : ${potentiel.toUpperCase()}`, {
      x: 0.3, y: 0.65, w: 3, h: 0.45,
      fontSize: 10, bold: true, color: C.WHITE, align: 'center', valign: 'middle', fontFace: 'Calibri',
    });
  }

  // Context description
  if (court?.contexte) {
    txt(slide, court.contexte, {
      x: 0.3, y: 1.25, w: W - 0.6, h: 1.1,
      fontSize: 10, color: C.GRAY, fontFace: 'Calibri',
    });
  }

  // Activités touristiques
  const activites = (court?.activitesTouristiques || []).slice(0, 6);
  if (activites.length > 0) {
    txt(slide, 'ACTIVITÉS TOURISTIQUES', {
      x: 0.3, y: 2.55, w: 8, h: 0.38,
      fontSize: 11, bold: true, color: C.ORANGE, fontFace: 'Calibri',
    });

    const colW = 4;
    activites.forEach((act, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 0.3 + col * (colW + 0.1);
      const y = 3.0 + row * 1.3;

      rect(slide, x, y, colW, 1.1, C.WHITE);
      rect(slide, x, y, colW, 0.06, C.ORANGE);
      txt(slide, act.nom, {
        x: x + 0.1, y: y + 0.12, w: colW - 0.2, h: 0.3,
        fontSize: 9, bold: true, color: C.DARK, fontFace: 'Calibri',
      });
      txt(slide, act.type, {
        x: x + 0.1, y: y + 0.42, w: colW - 0.2, h: 0.2,
        fontSize: 8, color: C.ORANGE, fontFace: 'Calibri',
      });
      txt(slide, act.description || '', {
        x: x + 0.1, y: y + 0.62, w: colW - 0.2, h: 0.38,
        fontSize: 7.5, color: C.MID, fontFace: 'Calibri',
      });
    });
  }
}

// ── SLIDE 17 — COURT SÉJOUR: EMPLOYEURS ──────────────────────
function slide17_courtSejourEmployeurs(prs, audit, court) {
  const slide = prs.addSlide();
  slide.background = { color: C.LIGHT };
  header(slide, 'COURT SÉJOUR ESTIVAL — Employeurs saisonniers');
  footer(slide, audit.address);

  const employeurs = (court?.employeurs || []).slice(0, 12);
  if (employeurs.length > 0) {
    const rows = [
      makeTableRow(['Employeur', 'Activité', 'Distance', 'Période', 'Profils'], true),
      ...employeurs.map(e => makeTableRow([
        e.nom,
        e.activite,
        e.distanceKm ? `${e.distanceKm} km` : '—',
        e.periodeRecrutement || '—',
        e.profils || '—',
      ])),
    ];
    slide.addTable(rows, {
      x: 0.3, y: 0.65, w: 12.7,
      colW: [3, 2.5, 1.3, 2.2, 3.7],
      border: { pt: 0.5, color: C.BORDER },
      rowH: 0.37,
    });
  }

  if (court?.resume) {
    txt(slide, court.resume, {
      x: 0.3, y: H - 1.1, w: W - 0.6, h: 0.65,
      fontSize: 9, color: C.GRAY, fontFace: 'Calibri',
    });
  }
}

// ── SLIDE 18 — FICHE INFO ────────────────────────────────────
function slide18_ficheInfo(prs, audit, fiche) {
  const slide = prs.addSlide();
  slide.background = { color: C.DARK };
  rect(slide, 0, 0, 0.12, H, C.ORANGE);

  txt(slide, 'FICHE INFO', {
    x: 0.4, y: 0.35, w: 6, h: 0.6,
    fontSize: 22, bold: true, color: C.WHITE, fontFace: 'Calibri',
  });
  txt(slide, fiche?.nomResidence || audit.address, {
    x: 0.4, y: 1.0, w: 12, h: 0.55,
    fontSize: 16, bold: true, color: C.ORANGE, fontFace: 'Calibri',
  });

  // Left column: characteristics
  const leftItems = [
    ['Exploitant', fiche?.exploitant],
    ['Nb. logements', fiche?.nbLogements],
    ['Types logements', (fiche?.typesLogements || []).join(', ')],
    ['Année construction', fiche?.anneeConstruction],
    ['Classement', fiche?.classementEtoiles ? `${fiche.classementEtoiles} étoiles` : null],
    ['Label qualité', fiche?.labelQualite],
    ['Accessibilité', fiche?.accessibilite],
    ['ULS', fiche?.uls],
  ].filter(([, val]) => val);

  leftItems.forEach(([label, val], i) => {
    const y = 1.75 + i * 0.48;
    if (y > H - 0.6) return;
    txt(slide, label, {
      x: 0.4, y, w: 2.8, h: 0.28,
      fontSize: 8.5, color: C.MID, fontFace: 'Calibri',
    });
    txt(slide, String(val), {
      x: 0.4, y: y + 0.22, w: 2.8, h: 0.28,
      fontSize: 10, bold: true, color: C.WHITE, fontFace: 'Calibri',
    });
  });

  // Center column: loyers
  if (fiche?.loyersMoyens) {
    txt(slide, 'LOYERS MOYENS', {
      x: 3.8, y: 1.75, w: 3.5, h: 0.35,
      fontSize: 10, bold: true, color: C.ORANGE, fontFace: 'Calibri',
    });
    const loyers = Object.entries(fiche.loyersMoyens);
    loyers.forEach(([type, montant], i) => {
      const y = 2.2 + i * 0.55;
      txt(slide, type.toUpperCase(), {
        x: 3.8, y, w: 1.5, h: 0.28,
        fontSize: 8.5, color: C.MID, fontFace: 'Calibri',
      });
      txt(slide, String(montant), {
        x: 3.8, y: y + 0.22, w: 3.5, h: 0.3,
        fontSize: 11, bold: true, color: C.WHITE, fontFace: 'Calibri',
      });
    });
  }

  // Right column: services
  const services = fiche?.services || [];
  if (services.length > 0) {
    txt(slide, 'SERVICES & ÉQUIPEMENTS', {
      x: 7.8, y: 1.75, w: 5, h: 0.35,
      fontSize: 10, bold: true, color: C.ORANGE, fontFace: 'Calibri',
    });
    services.slice(0, 10).forEach((svc, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      txt(slide, `✓ ${svc}`, {
        x: 7.8 + col * 2.5, y: 2.2 + row * 0.38, w: 2.4, h: 0.3,
        fontSize: 9, color: C.WHITE, fontFace: 'Calibri',
      });
    });
  }

  // Description at bottom
  if (fiche?.description) {
    rect(slide, 0.3, H - 1.4, W - 0.6, 0.95, C.DARK2);
    txt(slide, fiche.description, {
      x: 0.5, y: H - 1.35, w: W - 1, h: 0.85,
      fontSize: 8.5, color: C.MID, fontFace: 'Calibri',
    });
  }

  footer(slide, audit.address);
}

// ═════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═════════════════════════════════════════════════════════════

/**
 * Generate a full 18-slide PPTX report
 * @param {Object} audit - Audit row from DB
 * @param {Array}  sections - Array of { section_type, content, status }
 * @returns {Promise<Buffer>} PPTX file as Node Buffer
 */
export async function generateReport(audit, sections) {
  // Build section map
  const sectionMap = {};
  for (const s of sections) {
    if (s.status === 'done' && s.content) {
      sectionMap[s.section_type] = s.content;
    }
  }

  const loc   = sectionMap.localisation   || {};
  const ens   = sectionMap.enseignement   || {};
  const conc  = sectionMap.concurrence    || {};
  const court = sectionMap.court_sejour   || {};
  const fiche = sectionMap.fiche_info     || {};

  const lat = audit.lat;
  const lng = audit.lng;
  const city = audit.city || loc?.ville?.nom || '';

  console.log('[Report] Generating maps & images in parallel...');

  // All external assets in parallel
  const [locationMap, satelliteMap, schoolsMap, concurrenceMap, cityImg1, cityImg2] = await Promise.allSettled([
    lat && lng ? generateLocationMap(lat, lng)        : Promise.resolve(null),
    lat && lng ? generateSatelliteMap(lat, lng)       : Promise.resolve(null),
    lat && lng ? generateMarkersMap(lat, lng, [
      ...(ens?.universites || []),
      ...(ens?.ecolesSuperieures || []),
    ]) : Promise.resolve(null),
    lat && lng ? generateConcurrenceMap(lat, lng, conc) : Promise.resolve(null),
    city ? generateCityImage(city, 'quartier résidentiel, architecture, vue de rue') : Promise.resolve(null),
    city ? generateCityImage(city, 'gare, arrêts de bus ou tramway, mobilité urbaine') : Promise.resolve(null),
  ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

  console.log('[Report] Assets ready. Building slides...');

  const prs = new pptxgen();
  prs.layout = 'LAYOUT_WIDE';
  prs.author  = 'Valerie — Audit Immobilier';
  prs.company = 'Valerie';

  const addr = audit.address || '';

  // Slide 1 — Cover
  slide01_cover(prs, audit);

  // Slide 2 — Sommaire
  slide02_sommaire(prs, audit);

  // Slide 3 — Section: Localisation
  sectionDivider(prs, '01', 'LOCALISATION',
    `Situation géographique de ${city || addr}`, addr);

  // Slide 4 — Carte de situation
  slide04_carteLocalisation(prs, audit, locationMap);

  // Slide 5 — Satellite + transports
  slide05_satelliteTransport(prs, audit, satelliteMap, loc);

  // Slide 6 — Transport photo 1
  slideTransportPhoto(prs, audit, cityImg1,
    `${city || addr} — Vue du quartier`);

  // Slide 7 — Transport photo 2
  slideTransportPhoto(prs, audit, cityImg2,
    `${city || addr} — Desserte & mobilité`);

  // Slide 8 — Section: Enseignement
  sectionDivider(prs, '02', 'ENSEIGNEMENT SUPÉRIEUR',
    'Universités, grandes écoles et lycées à proximité', addr);

  // Slide 9 — Carte établissements
  slide09_enseignementCarte(prs, audit, schoolsMap, ens);

  // Slide 10 — Tableau établissements
  slide10_enseignementTable(prs, audit, ens);

  // Slide 11 — Section: Concurrence
  sectionDivider(prs, '03', 'CONCURRENCE',
    'Offre locative étudiante dans le secteur', addr);

  // Slide 12 — Carte concurrence
  slide12_concurrenceCarte(prs, audit, concurrenceMap, conc);

  // Slide 13 — CROUS + conventionnées
  slide13_concurrenceCrousConv(prs, audit, conc);

  // Slide 14 — Privées
  slide14_concurrencePrivees(prs, audit, conc);

  // Slide 15 — Section: Court séjour
  sectionDivider(prs, '04', 'COURT SÉJOUR',
    'Potentiel saisonnier et employeurs locaux', addr);

  // Slide 16 — Contexte estival
  slide16_courtSejourContexte(prs, audit, court);

  // Slide 17 — Employeurs
  slide17_courtSejourEmployeurs(prs, audit, court);

  // Slide 18 — Fiche info
  slide18_ficheInfo(prs, audit, fiche);

  console.log('[Report] 18 slides built. Writing buffer...');
  const buffer = await prs.write({ outputType: 'nodebuffer' });
  console.log('[Report] PPTX ready:', Math.round(buffer.length / 1024), 'KB');
  return buffer;
}
