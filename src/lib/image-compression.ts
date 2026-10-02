/**
 * Client-side WebP compression using HTML5 Canvas.
 * PRD requirement: max 1600 px, target < 400 KB, no heavy external libraries.
 */
export async function compressImageToWebP(
  file: File,
  maxDimension = 1600,
  quality = 0.82
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas 2D context unavailable'));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Gagal mengonversi gambar ke WebP'));
            }
            resolve({ blob, width, height });
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Format file gambar tidak didukung'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}
