/** Starlight brand wordmark: star logo + "STARLIGHT" lettering. */

import type { IconProps } from './icons/props.ts'

/** Display options for the brand wordmark. */
export interface BrandWordmarkProps extends IconProps {
  /** Whether to include the leading star mark; defaults to true. */
  includeMark?: boolean | undefined
}

/**
 * Render the brand wordmark.
 * @param props.size - height in px (default 24; width follows the selected artwork).
 * @param props.className - extra class for layout placement.
 * @param props.includeMark - whether to include the leading star mark.
 * @returns the wordmark svg (aria-hidden decorative brand art).
 */
export function BrandWordmark({ size = 24, className, includeMark = true }: BrandWordmarkProps) {
  const width = includeMark ? 146 : 120
  return (
    <svg
      width={(size * width) / 24}
      height={size}
      className={className}
      viewBox={includeMark ? '0 0 146 24' : '0 0 120 24'}
      fill="none"
      aria-hidden="true"
    >
      {includeMark && (
        <path
          d="M12 2.5l2.2 4.46 4.92.72-3.56 3.47.84 4.89L12 13.6l-4.4 2.31.84-4.89L4.88 7.68l4.92-.72L12 2.5z"
          fill="currentColor"
        />
      )}
      <text
        x={includeMark ? 28 : 0}
        y="17.5"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="14"
        fontWeight="700"
        fill="currentColor"
        letterSpacing="0.12em"
      >
        STARLIGHT
      </text>
    </svg>
  )
}