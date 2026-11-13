const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/heic', 'image/heif'];

export async function readDailyPhoto(file: File, available: number): Promise<string> {
  if (!imageTypes.includes(file.type)) throw new Error('Choose a supported image file.');
  if (available < 256) throw new Error('There is no room for an image here. Insert an image link instead.');
  if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) && file.size * 4 / 3 + 32 <= available) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Could not read the photo. Choose it again.'));
      reader.readAsDataURL(file);
    });
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('This photo could not be opened. Try a JPG, PNG or WebP.');
  });
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo.');
    for (const maxEdge of [1600, 1200, 800, 540, 320, 180]) {
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/webp', .76);
      if (url.length <= available) return url;
    }
    throw new Error('This photo is too large for this note. Insert an image link instead.');
  } finally {
    bitmap.close();
  }
}
