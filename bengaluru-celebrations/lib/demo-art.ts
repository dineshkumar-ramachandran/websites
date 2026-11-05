// Generates clearly-labelled placeholder "photos" (SVG) for demo halls.
// Replace them with real photography in Admin → Halls → Photos.

const PALETTES = [
  { bg1: "#4a1838", bg2: "#7a2e57", accent: "#d9b56c", soft: "#f6efe3" },
  { bg1: "#3b1530", bg2: "#8c3b4e", accent: "#e0c07a", soft: "#fbf4e8" },
  { bg1: "#2f1b3a", bg2: "#5b2e6b", accent: "#d4ad5f", soft: "#f3ebdd" },
  { bg1: "#55203a", bg2: "#a24a54", accent: "#e6c787", soft: "#fff8ec" },
];

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function demoHallSvg(hallName: string, scene: "stage" | "dining" | "lights", variant: number): string {
  const p = PALETTES[variant % PALETTES.length];
  const W = 1200, H = 800;
  let art = "";
  if (scene === "stage") {
    art = `
      <rect x="300" y="250" width="600" height="300" rx="12" fill="${p.bg1}" opacity="0.55"/>
      <path d="M300 250 Q600 120 900 250" fill="none" stroke="${p.accent}" stroke-width="10"/>
      ${Array.from({ length: 9 }, (_, i) => `<circle cx="${340 + i * 65}" cy="${230 - Math.sin((i / 8) * Math.PI) * 90}" r="9" fill="${p.accent}"/>`).join("")}
      <rect x="250" y="550" width="700" height="40" rx="6" fill="${p.accent}" opacity="0.8"/>
      <circle cx="420" cy="420" r="55" fill="${p.soft}" opacity="0.25"/><circle cx="780" cy="420" r="55" fill="${p.soft}" opacity="0.25"/>`;
  } else if (scene === "dining") {
    art = Array.from({ length: 6 }, (_, i) => {
      const cx = 220 + (i % 3) * 380, cy = 330 + Math.floor(i / 3) * 230;
      return `<ellipse cx="${cx}" cy="${cy}" rx="120" ry="45" fill="${p.soft}" opacity="0.9"/>
        ${Array.from({ length: 6 }, (_, j) => `<circle cx="${cx + Math.cos((j / 6) * Math.PI * 2) * 150}" cy="${cy + Math.sin((j / 6) * Math.PI * 2) * 62}" r="16" fill="${p.accent}"/>`).join("")}
        <rect x="${cx - 4}" y="${cy - 60}" width="8" height="40" fill="${p.accent}"/>`;
    }).join("");
  } else {
    art = Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: 14 }, (_, col) => `<circle cx="${60 + col * 85 + (row % 2) * 40}" cy="${90 + row * 70 + Math.sin(col) * 12}" r="${5 + ((row + col) % 3) * 2}" fill="${p.accent}" opacity="${0.35 + ((row * col) % 5) / 8}"/>`).join("")
    ).join("") + `<path d="M0 640 Q300 560 600 640 T1200 640 V800 H0 Z" fill="${p.bg1}" opacity="0.7"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Demo placeholder image for ${esc(hallName)}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.bg1}"/><stop offset="1" stop-color="${p.bg2}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${art}
  <rect x="0" y="${H - 96}" width="${W}" height="96" fill="#000" opacity="0.35"/>
  <text x="40" y="${H - 52}" font-family="Georgia, serif" font-size="34" fill="${p.soft}">${esc(hallName)}</text>
  <text x="40" y="${H - 18}" font-family="Arial, sans-serif" font-size="22" fill="${p.accent}" letter-spacing="2">DEMO PHOTO — REPLACE WITH REAL HALL PHOTOGRAPHY</text>
</svg>`;
}
