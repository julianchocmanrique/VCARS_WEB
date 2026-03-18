function normalize(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function getCarPhotoByModel(model?: string, plate?: string): string {
  const text = `${normalize(model)} ${normalize(plate)}`;

  if (text.includes('swift')) return '/cars/suzuki-swift.jpg';
  if (text.includes('corolla')) return '/cars/toyota-corolla.jpg';
  if (text.includes('mustang')) return '/cars/ford-mustang.jpg';
  if (text.includes('huracan') || text.includes('lamborghini')) return '/cars/lamborghini-huracan.jpg';
  if (text.includes('corvette')) return '/cars/chevrolet-corvette.jpg';
  if (text.includes('tracker') || text.includes('suv')) return '/cars/chevrolet-tracker.jpg';
  if (text.includes('gol') || text.includes('volkswagen')) return '/cars/volkswagen-gol.jpg';
  if (text.includes('fiesta') || text.includes('ford')) return '/cars/ford-mustang.jpg';

  return '/cars/chevrolet-tracker.jpg';
}
