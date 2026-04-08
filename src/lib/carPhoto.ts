function normalize(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function modelKey(model?: string, plate?: string): string {
  const text = `${normalize(model)} ${normalize(plate)}`;
  if (text.includes('swift')) return 'swift';
  if (text.includes('corolla')) return 'corolla';
  if (text.includes('mustang')) return 'mustang';
  if (text.includes('huracan') || text.includes('lamborghini')) return 'huracan';
  if (text.includes('corvette')) return 'corvette';
  if (text.includes('tracker') || text.includes('suv')) return 'tracker';
  if (text.includes('gol') || text.includes('volkswagen')) return 'gol';
  if (text.includes('fiesta') || text.includes('ford')) return 'mustang';
  return 'tracker';
}

const MODEL_MAIN_PHOTO: Record<string, string> = {
  gol: '/cars/volkswagen-gol.jpg',
  swift: '/cars/suzuki-swift.jpg',
  corolla: '/cars/toyota-corolla.jpg',
  mustang: '/cars/ford-mustang.jpg',
  huracan: '/cars/lamborghini-huracan.jpg',
  corvette: '/cars/chevrolet-corvette.jpg',
  tracker: '/cars/chevrolet-tracker.jpg',
};

const EVIDENCE_POOL = [
  '/cars/car2-hero-hd.jpg',
  '/cars/car2-hero-hd-flip.jpg',
  '/cars/car2-hero.jpg',
  '/cars/car2-original.jpg',
  '/cars/porsche-sunset.jpeg',
  '/cars/llanta-loader.jpg',
  '/cars/suzuki-swift.jpg',
  '/cars/toyota-corolla.jpg',
  '/cars/ford-mustang.jpg',
  '/cars/lamborghini-huracan.jpg',
  '/cars/chevrolet-corvette.jpg',
  '/cars/chevrolet-tracker.jpg',
  '/cars/volkswagen-gol.jpg',
] as const;

export function getCarPhotoByModel(model?: string, plate?: string): string {
  const key = modelKey(model, plate);
  return MODEL_MAIN_PHOTO[key] || '/cars/chevrolet-tracker.jpg';
}

type EvidenceZone = 'superior' | 'inferior' | 'lateralDerecho' | 'lateralIzquierdo' | 'frontal' | 'trasero';

const ZONE_INDEX: Record<EvidenceZone, number> = {
  frontal: 0,
  lateralDerecho: 1,
  lateralIzquierdo: 2,
  trasero: 3,
  superior: 4,
  inferior: 5,
};

function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function rotatePool(seed: number): string[] {
  const n = EVIDENCE_POOL.length;
  const offset = n ? seed % n : 0;
  return [...EVIDENCE_POOL.slice(offset), ...EVIDENCE_POOL.slice(0, offset)];
}

export function getVehicleEvidencePhoto(
  model?: string,
  plate?: string,
  color?: string,
  zone: EvidenceZone = 'frontal'
): string {
  const main = getCarPhotoByModel(model, plate);
  const seed = hashCode(`${modelKey(model, plate)}|${normalize(color)}|${normalize(plate)}`);
  const rotated = rotatePool(seed).filter((item) => item !== main);
  const unique = [main, ...rotated];
  return unique[ZONE_INDEX[zone] % unique.length];
}
