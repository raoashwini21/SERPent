import sharp from 'sharp';

export async function compressImage(imageUrl: string): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  sizeKB: number;
} | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SalesRobotBlogBot/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const tryCompress = async (quality: number): Promise<Buffer> =>
      sharp(inputBuffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

    let output = await tryCompress(80);
    if (output.byteLength > 100 * 1024) output = await tryCompress(60);
    if (output.byteLength > 100 * 1024) output = await tryCompress(40);

    const meta = await sharp(output).metadata();
    return {
      buffer: output,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      format: 'webp',
      sizeKB: Math.round(output.byteLength / 1024),
    };
  } catch {
    return null;
  }
}

export async function generateResponsiveSizes(
  imageBuffer: Buffer
): Promise<{ width: number; buffer: Buffer }[]> {
  const sizes = [400, 800, 1200];
  const results: { width: number; buffer: Buffer }[] = [];

  for (const width of sizes) {
    try {
      const buf = await sharp(imageBuffer)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
      results.push({ width, buffer: buf });
    } catch {
      // skip failed sizes
    }
  }

  return results;
}
