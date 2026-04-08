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

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

function withBasePath(path: string): string {
  if (!BASE_PATH) return path;
  if (!path.startsWith('/')) return `${BASE_PATH}/${path}`;
  return `${BASE_PATH}${path}`;
}

const MODEL_MAIN_PHOTO: Record<string, string> = {
  gol: withBasePath('/cars/volkswagen-gol.jpg'),
  swift: withBasePath('/cars/suzuki-swift.jpg'),
  corolla: withBasePath('/cars/toyota-corolla.jpg'),
  mustang: withBasePath('/cars/ford-mustang.jpg'),
  huracan: withBasePath('/cars/lamborghini-huracan.jpg'),
  corvette: withBasePath('/cars/chevrolet-corvette.jpg'),
  tracker: withBasePath('/cars/chevrolet-tracker.jpg'),
};

const EVIDENCE_POOL = [
  withBasePath('/cars/car2-hero-hd.jpg'),
  withBasePath('/cars/car2-hero-hd-flip.jpg'),
  withBasePath('/cars/car2-hero.jpg'),
  withBasePath('/cars/car2-original.jpg'),
  withBasePath('/cars/porsche-sunset.jpeg'),
  withBasePath('/cars/llanta-loader.jpg'),
  withBasePath('/cars/suzuki-swift.jpg'),
  withBasePath('/cars/toyota-corolla.jpg'),
  withBasePath('/cars/ford-mustang.jpg'),
  withBasePath('/cars/lamborghini-huracan.jpg'),
  withBasePath('/cars/chevrolet-corvette.jpg'),
  withBasePath('/cars/chevrolet-tracker.jpg'),
  withBasePath('/cars/volkswagen-gol.jpg'),
] as const;

export function getCarPhotoByModel(model?: string, plate?: string): string {
  const key = modelKey(model, plate);
  return MODEL_MAIN_PHOTO[key] || withBasePath('/cars/chevrolet-tracker.jpg');
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
