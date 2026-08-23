import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { decodeAndNormalizeImage, detectImage, probeImage } from '../src/image.ts'

async function raster(format: 'png' | 'jpeg' | 'webp' | 'gif'): Promise<Uint8Array> {
  const image = sharp({
    create: { width: 3, height: 2, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } },
  })
  return new Uint8Array(await image.toFormat(format).toBuffer())
}

describe('raster decoding', () => {
  it('decodes every supported format and its intrinsic dimensions', async () => {
    for (const [format, mediaType] of [
      ['png', 'image/png'],
      ['jpeg', 'image/jpeg'],
      ['webp', 'image/webp'],
      ['gif', 'image/gif'],
    ] as const) {
      await expect(detectImage(await raster(format)))
        .resolves.toEqual({ mediaType, width: 3, height: 2 })
    }
  })

  it('rejects excess decoded pixels before decoding', async () => {
    await expect(detectImage(await raster('png'), { maxPixels: 5 }))
      .rejects.toMatchObject({ code: 'IMAGE_TOO_MANY_PIXELS' })
  })

  it('rejects a side above the per-side limit and accepts a side exactly at it', async () => {
    await expect(detectImage(await raster('png'), { maxDimension: 2 }))
      .rejects.toMatchObject({ code: 'IMAGE_DIMENSION_TOO_LARGE' })
    await expect(detectImage(await raster('png'), { maxDimension: 3 }))
      .resolves.toEqual({ mediaType: 'image/png', width: 3, height: 2 })
  })

  it('rejects malformed bytes and truncated payloads with readable headers', async () => {
    await expect(detectImage(Uint8Array.of(1, 2, 3)))
      .rejects.toMatchObject({ code: 'INVALID_IMAGE' })
    const unsupported = await sharp({
      create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    }).tiff().toBuffer()
    await expect(detectImage(unsupported)).rejects.toMatchObject({ code: 'INVALID_IMAGE' })
    const complete = await raster('png')
    const truncated = complete.subarray(0, 62)
    await expect(sharp(truncated).metadata()).resolves.toMatchObject({ width: 3, height: 2 })
    await expect(detectImage(truncated)).rejects.toMatchObject({ code: 'INVALID_IMAGE' })
  })

  it('probes malformed bytes and unsupported formats into the same stable error', async () => {
    await expect(probeImage(Uint8Array.of(1, 2, 3)))
      .rejects.toMatchObject({ code: 'INVALID_IMAGE' })
    const unsupported = await sharp({
      create: { width: 1, height: 1, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    }).tiff().toBuffer()
    await expect(probeImage(unsupported)).rejects.toMatchObject({ code: 'INVALID_IMAGE' })
  })
})

describe('normalized admission', () => {
  async function oversized(width: number, height: number, format: 'png' | 'jpeg' | 'webp' | 'gif'): Promise<Uint8Array> {
    return new Uint8Array(await sharp({
      create: { width, height, channels: 4, background: { r: 1, g: 2, b: 3, alpha: 1 } },
    }).toFormat(format).toBuffer())
  }

  it('returns within-limit bytes unchanged with their decoded metadata', async () => {
    const png = await oversized(3, 2, 'png')
    await expect(decodeAndNormalizeImage(png, { maxDimension: 2000, maxPixels: 40_000_000 }))
      .resolves.toEqual({ data: png, mediaType: 'image/png', width: 3, height: 2 })
  })

  it('downscales an oversized side proportionally and re-encodes the original format', async () => {
    const png = await oversized(600, 400, 'png')
    const normalized = await decodeAndNormalizeImage(png, { maxDimension: 300, maxPixels: 40_000_000 })
    expect(normalized.mediaType).toBe('image/png')
    expect(normalized.width).toBeLessThanOrEqual(300)
    expect(normalized.height).toBeLessThanOrEqual(300)
    expect(normalized.width / normalized.height).toBeCloseTo(600 / 400, 1)
    expect(normalized.data.byteLength).toBeGreaterThan(0)
    expect(normalized.data).not.toEqual(png)
    await expect(detectImage(normalized.data, { maxDimension: 300, maxPixels: 40_000_000 }))
      .resolves.toEqual({ mediaType: 'image/png', width: normalized.width, height: normalized.height })
  })

  it('satisfies both the per-side and pixel caps when the pixel cap is tighter', async () => {
    const webp = await oversized(100, 100, 'webp')
    const normalized = await decodeAndNormalizeImage(webp, { maxDimension: 2000, maxPixels: 2_500 })
    expect(normalized.mediaType).toBe('image/webp')
    expect(normalized.width).toBeLessThanOrEqual(50)
    expect(normalized.height).toBeLessThanOrEqual(50)
    expect(normalized.width * normalized.height).toBeLessThanOrEqual(2_500)
  })

  it('keeps JPEG oversize normalized into the same media type', async () => {
    const jpeg = await oversized(500, 500, 'jpeg')
    const normalized = await decodeAndNormalizeImage(jpeg, { maxDimension: 250, maxPixels: 40_000_000 })
    expect(normalized.mediaType).toBe('image/jpeg')
    expect(normalized.width).toBe(250)
    expect(normalized.height).toBe(250)
  })

  it('refuses an oversized GIF instead of dropping its animation', async () => {
    const gif = await oversized(500, 500, 'gif')
    await expect(decodeAndNormalizeImage(gif, { maxDimension: 250, maxPixels: 40_000_000 }))
      .rejects.toMatchObject({ code: 'IMAGE_DIMENSION_TOO_LARGE' })
  })

  it('refuses an oversized-pixel GIF with the pixel rejection', async () => {
    const gif = await oversized(500, 500, 'gif')
    await expect(decodeAndNormalizeImage(gif, { maxDimension: 2000, maxPixels: 10_000 }))
      .rejects.toMatchObject({ code: 'IMAGE_TOO_MANY_PIXELS' })
  })

  it('rejects malformed bytes through the same stable error', async () => {
    await expect(decodeAndNormalizeImage(Uint8Array.of(1, 2, 3), { maxDimension: 2000, maxPixels: 40_000_000 }))
      .rejects.toMatchObject({ code: 'INVALID_IMAGE' })
  })
})
