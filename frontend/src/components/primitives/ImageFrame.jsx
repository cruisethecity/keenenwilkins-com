/**
 * Responsive image frame.
 *
 * Four things every image on this page needs, and the reason each is here.
 *
 * 1. An aspect ratio box. The wrapper reserves the exact space before the
 *    bytes arrive, so nothing below it jumps as images load. That jump is
 *    Cumulative Layout Shift, and it is the single easiest Core Web Vital to
 *    fail by accident.
 *
 * 2. A srcset, so a phone downloads the 800 pixel file and a retina desktop
 *    downloads the 1600. Serving one large file to everyone is the most
 *    common reason a beautiful page feels slow on cellular.
 *
 * 3. WebP first with a PNG fallback, through a picture element. Every current
 *    browser takes the WebP and saves roughly seventy percent of the bytes.
 *
 * 4. Lazy loading below the fold, eager above it. Passing priority on the one
 *    image in the first screen keeps it out of the lazy queue, because a
 *    lazily loaded hero image is a slower Largest Contentful Paint.
 *
 * The media object lives in resumeData.json, so adding an image is a data
 * change rather than a code change.
 */

// Preview builds are assembled into a single HTML file with every asset
// inlined as a data URI. A data URI contains a comma, and srcset is comma
// separated, so the two cannot coexist. When this flag is set the component
// emits one plain img and lets the assembler swap in the inlined bytes.
// Production builds never set it and always get the full picture element.
const INLINE_MEDIA = import.meta.env.VITE_INLINE_MEDIA === "1";

export default function ImageFrame({
  media,
  ratio,
  sizes = "100vw",
  priority = false,
  className = "",
  imgClassName = "object-cover object-top",
}) {
  if (!media) return null;

  const { stem, widths, fallbackWidth, intrinsic, alt } = media;
  const largest = Math.max(...widths);

  const srcSet = widths
    .map((width) => `/media/${stem}-${width}.webp ${width}w`)
    .join(", ");

  const fallbackSrc = INLINE_MEDIA
    ? `/media/${stem}-${largest}.webp`
    : `/media/${stem}-${fallbackWidth}.png`;

  const image = (
    <img
      src={fallbackSrc}
      alt={alt}
      width={intrinsic.width}
      height={intrinsic.height}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={`h-full w-full ${imgClassName}`}
    />
  );

  return (
    <div
      className={`overflow-hidden ${className}`}
      style={{
        aspectRatio: ratio ?? `${intrinsic.width} / ${intrinsic.height}`,
      }}
    >
      {INLINE_MEDIA ? (
        image
      ) : (
        <picture>
          <source type="image/webp" srcSet={srcSet} sizes={sizes} />
          {image}
        </picture>
      )}
    </div>
  );
}
