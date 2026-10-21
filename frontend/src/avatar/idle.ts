/** Parpadeo cada 2 a 6 s; devuelve el cierre del párpado (0 abierto, 1 cerrado). */
export function createBlinker(): (now: number) => number {
  let next = performance.now() + 2000 + Math.random() * 4000;
  let start = -1;
  const DUR = 150;
  return (now) => {
    if (start < 0 && now >= next) start = now;
    if (start < 0) return 0;
    const p = (now - start) / DUR;
    if (p >= 1) {
      start = -1;
      next = now + 2000 + Math.random() * 4000;
      return 0;
    }
    return Math.sin(p * Math.PI);
  };
}
