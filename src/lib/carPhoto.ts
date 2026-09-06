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
  if (text.includes('tracker')) return 'tracker';
  if (text.includes('gol') || text.includes('volkswagen')) return 'gol';
  if (text.includes('fiesta') || text.includes('ford')) return 'mustang';
  if (text.includes('toyota')) return 'corolla';
  if (text.includes('nissan') && text.includes('versa')) return 'versa';
  if (text.includes('mazda') && text.includes('cx-30')) return 'mazdaCx30';
  return '';
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
  corolla: withBasePath('/cars/toyota-corolla-reference.png'),
  versa: withBasePath('/cars/nissan-versa-reference.png'),
  mustang: withBasePath('/cars/ford-mustang.jpg'),
  huracan: withBasePath('/cars/lamborghini-huracan.jpg'),
  corvette: withBasePath('/cars/chevrolet-corvette.jpg'),
  tracker: withBasePath('/cars/chevrolet-tracker.jpg'),
  mazdaCx30: withBasePath('/cars/mazda-cx30-reference.png'),
};

export function getCarPhotoByModel(model?: string, plate?: string): string {
  const key = modelKey(model, plate);
  return MODEL_MAIN_PHOTO[key] || '';
}
