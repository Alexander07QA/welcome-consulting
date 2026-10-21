import * as THREE from 'three';

// Texturas generadas en canvas: la escena carga sin imágenes externas (presupuesto < 5 MB).

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  return [c, ctx];
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function tex(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function woodFloor(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 1024);
  const r = rng(7);
  const rows = 8;
  const h = 1024 / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * 400;
    while (x < 1024) {
      const len = 380 + r() * 420;
      const l = 52 + r() * 10;
      g.fillStyle = `hsl(${28 + r() * 6}, ${38 + r() * 10}%, ${l}%)`;
      g.fillRect(x, i * h, len, h);
      // Veta
      g.globalAlpha = 0.14;
      for (let k = 0; k < 14; k++) {
        g.strokeStyle = r() > 0.5 ? '#5b3a20' : '#e8c9a0';
        g.lineWidth = 0.6 + r() * 1.6;
        g.beginPath();
        const y0 = i * h + r() * h;
        g.moveTo(x, y0);
        for (let s = 0; s <= 8; s++) g.lineTo(x + (len * s) / 8, y0 + Math.sin(s * 0.9 + r() * 2) * 3);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(60,35,18,0.55)';
      g.fillRect(x, i * h, 2, h);
      x += len;
    }
    g.fillStyle = 'rgba(50,30,15,0.5)';
    g.fillRect(0, i * h, 1024, 2);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3.2, 3.2);
  return t;
}

export function plaster(base: string, seed = 3): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2400; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(80,50,30,0.03)';
    const s = 2 + r() * 10;
    g.fillRect(r() * 512, r() * 512, s, s);
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 2);
  return t;
}

export function roundRug(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 1024);
  const rings: [number, string][] = [
    [512, '#d8c6ad'],
    [480, '#b9765a'],
    [462, '#e9dcc7'],
    [380, '#9fb197'],
    [356, '#e9dcc7'],
    [250, '#c99a6b'],
    [232, '#efe4d2'],
    [120, '#b9765a'],
    [104, '#efe4d2'],
  ];
  for (const [rad, col] of rings) {
    g.fillStyle = col;
    g.beginPath();
    g.arc(512, 512, rad, 0, Math.PI * 2);
    g.fill();
  }
  // Motivo de hojas en el anillo verde
  g.fillStyle = '#e9dcc7';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    g.save();
    g.translate(512 + Math.cos(a) * 304, 512 + Math.sin(a) * 304);
    g.rotate(a);
    g.beginPath();
    g.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  // Textura de tejido
  const r = rng(11);
  for (let i = 0; i < 26000; i++) {
    g.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    g.fillRect(r() * 1024, r() * 1024, 2, 2);
  }
  return tex(c);
}

export function stripeRug(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#ece3d4';
  g.fillRect(0, 0, 512, 512);
  const cols = ['#c9a77f', '#9fb197', '#ece3d4', '#b9765a'];
  for (let i = 0; i < 16; i++) {
    g.fillStyle = cols[i % cols.length];
    g.fillRect(0, i * 32 + 10, 512, 6 + (i % 3) * 3);
  }
  return tex(c);
}

export function skyTexture(night: boolean): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 768);
  const grad = g.createLinearGradient(0, 0, 0, 768);
  if (night) {
    grad.addColorStop(0, '#070d24');
    grad.addColorStop(0.6, '#16244a');
    grad.addColorStop(1, '#2b3a63');
  } else {
    grad.addColorStop(0, '#8fb8dc');
    grad.addColorStop(0.55, '#f6d2a2');
    grad.addColorStop(1, '#f7b77c');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 1024, 768);
  const r = rng(night ? 5 : 9);
  if (night) {
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.7})`;
      g.fillRect(r() * 1024, r() * 460, 1.5, 1.5);
    }
    const mg = g.createRadialGradient(700, 170, 10, 700, 170, 140);
    mg.addColorStop(0, 'rgba(230,236,255,0.5)');
    mg.addColorStop(1, 'rgba(230,236,255,0)');
    g.fillStyle = mg;
    g.fillRect(500, 0, 400, 360);
    g.fillStyle = '#f2f0e4';
    g.beginPath();
    g.arc(700, 170, 46, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(190,190,170,0.35)';
    g.beginPath();
    g.arc(686, 160, 10, 0, Math.PI * 2);
    g.arc(716, 186, 7, 0, Math.PI * 2);
    g.fill();
  } else {
    const sg = g.createRadialGradient(330, 470, 20, 330, 470, 360);
    sg.addColorStop(0, 'rgba(255,244,214,1)');
    sg.addColorStop(0.15, 'rgba(255,224,170,0.8)');
    sg.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = sg;
    g.fillRect(0, 0, 1024, 768);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) {
      const cx = r() * 1024;
      const cy = 80 + r() * 220;
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.ellipse(cx + k * 30 - 80, cy + Math.sin(k) * 8, 60, 18, 0, 0, Math.PI * 2);
        g.fill();
      }
    }
  }
  // Montañas y árboles a lo lejos (paisaje andino)
  const hill = (y: number, amp: number, col: string, seed: number): void => {
    const rr = rng(seed);
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, 768);
    for (let x = 0; x <= 1024; x += 16) g.lineTo(x, y - Math.sin(x / 170 + seed) * amp - rr() * 10);
    g.lineTo(1024, 768);
    g.fill();
  };
  hill(520, 60, night ? '#1d2848' : '#9fae9a', 1);
  hill(590, 40, night ? '#141c36' : '#6f8a6a', 2);
  hill(660, 25, night ? '#0d1328' : '#4f6b4c', 3);
  for (let i = 0; i < 40; i++) {
    const x = r() * 1024;
    const y = 650 + r() * 80;
    g.fillStyle = night ? '#0a0f20' : `hsl(${100 + r() * 30}, 30%, ${22 + r() * 10}%)`;
    g.beginPath();
    g.ellipse(x, y, 18 + r() * 20, 30 + r() * 30, 0, 0, Math.PI * 2);
    g.fill();
  }
  return tex(c);
}

export function painting(): THREE.CanvasTexture {
  const [c, g] = canvas(768, 512);
  g.fillStyle = '#f1e6d4';
  g.fillRect(0, 0, 768, 512);
  g.fillStyle = '#e7b48a';
  g.beginPath();
  g.arc(520, 230, 120, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#c9805e';
  g.beginPath();
  g.moveTo(0, 512);
  g.bezierCurveTo(160, 260, 330, 300, 470, 380);
  g.bezierCurveTo(600, 450, 700, 360, 768, 330);
  g.lineTo(768, 512);
  g.fill();
  g.fillStyle = '#8fa48a';
  g.beginPath();
  g.moveTo(0, 512);
  g.bezierCurveTo(200, 380, 380, 420, 520, 470);
  g.bezierCurveTo(640, 510, 720, 440, 768, 430);
  g.lineTo(768, 512);
  g.fill();
  g.strokeStyle = 'rgba(60,40,30,0.35)';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(110, 120);
  g.bezierCurveTo(170, 80, 230, 160, 300, 110);
  g.stroke();
  return tex(c);
}

export function clockFace(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#f7f1e6';
  g.beginPath();
  g.arc(256, 256, 250, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#3a3a34';
  g.font = '600 54px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    if (i % 3 === 0) g.fillText(String(i), 256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190);
    else {
      g.beginPath();
      g.arc(256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200, 6, 0, Math.PI * 2);
      g.fill();
    }
  }
  return tex(c);
}

export function ribbed(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  for (let x = 0; x < 128; x++) {
    const v = 128 + Math.sin((x / 128) * Math.PI * 2 * 16) * 90;
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(x, 0, 1, 128);
  }
  const t = tex(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

export function softDot(): THREE.CanvasTexture {
  const [c, g] = canvas(64, 64);
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return tex(c);
}

export function iris(): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, '#2a1a0e');
  grad.addColorStop(0.28, '#5a3d22');
  grad.addColorStop(0.6, '#7a5a34');
  grad.addColorStop(0.85, '#5d4226');
  grad.addColorStop(1, '#2b1d12');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(64, 64, 64, 0, Math.PI * 2);
  g.fill();
  const r = rng(21);
  g.strokeStyle = 'rgba(160,130,70,0.35)';
  for (let i = 0; i < 60; i++) {
    const a = r() * Math.PI * 2;
    g.beginPath();
    g.moveTo(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22);
    g.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56);
    g.stroke();
  }
  g.fillStyle = '#0c0805';
  g.beginPath();
  g.arc(64, 64, 22, 0, Math.PI * 2);
  g.fill();
  return tex(c);
}
