export async function prepareTrainerPhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Choose a JPG, PNG, or WebP photo.');
  }
  if (file.size > 5 * 1024 * 1024)
    throw new Error('Choose a photo smaller than 5 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(
      1,
      1200 / Math.max(image.naturalWidth, image.naturalHeight)
    );
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const photo = canvas.toDataURL('image/webp', quality);
      if (photo.length <= 750000) return photo;
    }
    throw new Error('This photo is too large. Choose a smaller image.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
