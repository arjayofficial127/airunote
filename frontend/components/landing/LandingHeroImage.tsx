const terrain = '/airunote/knowledge-terrain-v1';
const widths = [480, 720, 960, 1440, 1920];

// Match the hero grid's gutters, desktop column and maximum content width.
const sizes = '(min-width: 1536px) 771px, (min-width: 1024px) calc(56vw - 90px), (min-width: 960px) 896px, (min-width: 640px) calc(100vw - 64px), calc(100vw - 40px)';
const avifSrcSet = widths.map((width) => `${terrain}-${width}.avif ${width}w`).join(', ');
const webpSrcSet = widths.map((width) => `${terrain}-${width}.webp ${width}w`).join(', ');

export function LandingHeroImage() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet={avifSrcSet}
        imageSizes={sizes}
        fetchPriority="high"
      />
      <picture>
        <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
        {/* Pre-encoded variants let the browser select a format and size without server-side image processing. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${terrain}-960.webp`}
          srcSet={webpSrcSet}
          sizes={sizes}
          alt="Airunote knowledge terrain"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
        />
      </picture>
    </>
  );
}
