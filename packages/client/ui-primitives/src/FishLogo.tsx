/** Starlight star logo — 5-pointed star. Rendered 24x24 by default. */

import type { IconProps } from './icons/props.ts'

/**
 * Render the star logo.
 * @param props.size - width in px (default 24; height equals width for a square viewBox).
 * @param props.className - extra class for layout placement.
 * @returns the logo svg (aria-hidden; pair with the wordmark for accessibility).
 */
export function FishLogo({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 1.5l2.76 5.6 6.18.9-4.47 4.36 1.06 6.14L12 15.6l-5.53 2.9 1.06-6.14L3.06 8l6.18-.9L12 1.5z"
        fill="currentColor"
      />
    </svg>
  )
}