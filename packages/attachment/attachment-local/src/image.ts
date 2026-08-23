/** Raster inspection: full decode at admission, header-only probe on verified reads. */

import sharp, { type Sharp } from 'sharp'
import { AttachmentError } from '@deepseek-ai/dsh-attachment'
import type { ImageMediaType } from '@deepseek-ai/dsh-attachment'

/** Decoded metadata from a supported image. */
export interface DetectedImage {
  mediaType: ImageMediaType
  /** Intrinsic width with EXIF orientation applied — the width a viewer perceives. */
  width: number
  /** Intrinsic height with EXIF orientation applied — the height a viewer perceives. */
  height: number
  /** Whether the container carries more than one frame. */
  animated: boolean
  /** Whether the bytes carry descriptive metadata, a color profile, or orientation. */
  carriesMetadata: boolean
  /** Sharp sample depth reported for the decoded channels. */
  depth: string
  /** Sharp colour space reported for the decoded pixels. */
  space: string
  /** Whether decoded pixels carry an alpha channel. */
  hasAlpha: boolean
}

/**
 * Check alpha metadata for bytes produced by this package's encoders.
 * Sharp/libvips may omit an all-opaque alpha plane from WebP output; every
 * other addition or removal indicates that the encoded result is incompatible
 * with its source facts.
 * @param sourceHasAlpha - whether the source bytes declare an alpha plane, or undefined when the source frame is unspecified.
 * @param output - decoded media type and alpha metadata from the encoded result.
 * @returns whether the output alpha metadata is compatible with the source.
 */
export function encodedAlphaIsCompatible(
  sourceHasAlpha: boolean | undefined,
  output: Pick<DetectedImage, 'mediaType' | 'hasAlpha'>,
): boolean {
  return sourceHasAlpha === undefined
    || output.hasAlpha === sourceHasAlpha
    || (sourceHasAlpha && !output.hasAlpha && output.mediaType === 'image/webp')
}

const MEDIA_TYPES: Readonly<Record<string, ImageMediaType>> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

function carriesRetainedMetadata(metadata: Awaited<ReturnType<Sharp['metadata']>>): boolean {
  return metadata.exif !== undefined
    || metadata.xmp !== undefined
    || metadata.iptc !== undefined
    || metadata.icc !== undefined
    || metadata.hasProfile
    || metadata.tifftagPhotoshop !== undefined
    || metadata.comments !== undefined
    || metadata.orientation !== undefined
}

async function imageMetadata(image: Sharp): Promise<DetectedImage> {
  const metadata = await image.metadata()
  const mediaType = MEDIA_TYPES[metadata.format as string]
  if (mediaType === undefined) {
    throw new AttachmentError('Unsupported or malformed image data.', 'INVALID_IMAGE')
  }
  // EXIF orientations 5-8 transpose the stored raster; report the perceived
  // axes so limits, source facts, and coordinate advice all share them.
  const transposed = metadata.orientation !== undefined && metadata.orientation >= 5
  return {
    mediaType,
    width: transposed ? metadata.height : metadata.width,
    height: transposed ? metadata.width : metadata.height,
    animated: (metadata.pages ?? 1) > 1,
    carriesMetadata: carriesRetainedMetadata(metadata),
    depth: metadata.depth,
    space: metadata.space,
    hasAlpha: metadata.hasAlpha,
  }
}

/**
 * Parse a supported raster's header and return its intrinsic metadata without
 * decoding pixels. Digest-verified reads use this: admission already proved
 * that these exact bytes decode completely, so the read path only re-derives
 * the reference fields instead of paying the full-raster decode again.
 * @param data - complete encoded image bytes.
 * @returns verified format and dimensions.
 */
export async function probeImage(data: Uint8Array): Promise<DetectedImage> {
  try {
    return await imageMetadata(sharp(data, { failOn: 'error', limitInputPixels: false }))
  } catch (error) {
    if (error instanceof AttachmentError) throw error
    throw new AttachmentError('Unsupported or malformed image data.', 'INVALID_IMAGE', { cause: error })
  }
}

/** Admission limits applied to a decoded raster's intrinsic dimensions. */
export interface DecodedImageLimits {
  /** Decoded-pixel (width times height) admission limit. */
  maxPixels?: number
  /** Per-side admission limit applied to width and height independently. */
  maxDimension?: number
}

/**
 * Fully decode a supported raster and return its intrinsic metadata.
 * @param data - complete encoded image bytes.
 * @param limits - intrinsic-dimension admission limits.
 * @returns verified format and dimensions.
 */
export async function detectImage(data: Uint8Array, limits?: DecodedImageLimits): Promise<DetectedImage> {
  try {
    const image = sharp(data, { failOn: 'error', limitInputPixels: false })
    const detected = await imageMetadata(image)
    if (limits?.maxPixels !== undefined && detected.width * detected.height > limits.maxPixels) {
      throw new AttachmentError('Image exceeds the configured decoded-pixel limit.', 'IMAGE_TOO_MANY_PIXELS')
    }
    if (limits?.maxDimension !== undefined && Math.max(detected.width, detected.height) > limits.maxDimension) {
      throw new AttachmentError('Image exceeds the configured per-side pixel limit.', 'IMAGE_DIMENSION_TOO_LARGE')
    }
    await image.raw().toBuffer()
    return detected
  } catch (error) {
    if (error instanceof AttachmentError) throw error
    throw new AttachmentError('Unsupported or malformed image data.', 'INVALID_IMAGE', { cause: error })
  }
}

/** A raster ready for durable storage after admission normalization. */
export interface NormalizedImage {
  /** Encoded bytes to store; unchanged when no downscale was needed. */
  data: Uint8Array
  mediaType: ImageMediaType
  width: number
  height: number
}

/**
 * Fully decode one raster and, when a side exceeds `maxDimension` or decoded
 * pixels exceed `maxPixels`, return proportionally downscaled re-encoded bytes
 * that satisfy both limits. Oversized GIF remains refused because sharp cannot
 * scale it while preserving animation. Within-limit input returns unchanged.
 * @param data - complete encoded image bytes.
 * @param limits - intrinsic-dimension admission limits.
 * @returns normalized bytes and their decoded metadata.
 */
export async function decodeAndNormalizeImage(data: Uint8Array, limits: DecodedImageLimits): Promise<NormalizedImage> {
  try {
    const image = sharp(data, { failOn: 'error', limitInputPixels: false })
    const detected = await imageMetadata(image)
    const maxSide = Math.max(detected.width, detected.height)
    let scale = 1
    if (limits.maxDimension !== undefined) scale = Math.min(scale, limits.maxDimension / maxSide)
    if (limits.maxPixels !== undefined && detected.width * detected.height > limits.maxPixels) {
      scale = Math.min(scale, Math.sqrt(limits.maxPixels / (detected.width * detected.height)))
    }
    if (scale >= 1) return { data, ...detected }
    if (detected.mediaType === 'image/gif') {
      if (limits.maxDimension !== undefined && maxSide > limits.maxDimension) {
        throw new AttachmentError('Image exceeds the configured per-side pixel limit.', 'IMAGE_DIMENSION_TOO_LARGE')
      }
      throw new AttachmentError('Image exceeds the configured decoded-pixel limit.', 'IMAGE_TOO_MANY_PIXELS')
    }
    let width = Math.max(1, Math.round(detected.width * scale))
    let height = Math.max(1, Math.round(detected.height * scale))
    while (limits.maxPixels !== undefined && width * height > limits.maxPixels) {
      if (width >= height) width -= 1
      else height -= 1
    }
    const format = detected.mediaType.slice('image/'.length) as 'png' | 'jpeg' | 'webp'
    const normalized = new Uint8Array(await image.resize(width, height, { fit: 'fill' }).toFormat(format).toBuffer())
    const metadata = await imageMetadata(sharp(normalized, { failOn: 'error', limitInputPixels: false }))
    return { data: normalized, ...metadata }
  } catch (error) {
    if (error instanceof AttachmentError) throw error
    throw new AttachmentError('Unsupported or malformed image data.', 'INVALID_IMAGE', { cause: error })
  }
}
