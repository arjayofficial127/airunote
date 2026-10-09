"use client";
import Image from "next/image";
import { useState } from "react";
import { useExamAppearance, useExamAssetUrl } from "./ExamAppearanceProvider";
export function ExamSponsorBrand({ compact = false }: { compact?: boolean }) {
  const { brand, colors } = useExamAppearance();
  const selectedUrl = useExamAssetUrl(brand.logo);
  const [failedUrl, setFailedUrl] = useState<string>();
  const url =
    brand.logoVisible && selectedUrl !== failedUrl ? selectedUrl : undefined;
  if (!brand.visible) return null;
  const mask =
    brand.logo?.source === "builtin" && brand.logo.assetId === "starbucks-logo";
  return (
    <div
      className={`flex min-w-0 max-w-full flex-wrap items-center gap-y-2 ${compact ? "gap-3" : "gap-4"}`}
      aria-label={`airunote exams, ${brand.name} ${brand.badgeVisible ? brand.badge : ""}`}
    >
      <div className="min-w-0 max-w-full">
        <div className="text-[9px] font-bold uppercase tracking-[0.24em] text-[var(--exam-color-9a6b45)]">
          airunote exams
        </div>
        <div className="mt-1 flex items-center gap-2">
          {url &&
            (mask ? (
              <span
                role="img"
                aria-label={brand.logoAlt}
                className={compact ? "h-8 w-8 shrink-0" : "h-11 w-11 shrink-0"}
                style={{
                  backgroundColor: colors.logo,
                  WebkitMask: `url(${url}) center / contain no-repeat`,
                  mask: `url(${url}) center / contain no-repeat`,
                }}
              />
            ) : (
              <Image
                src={url}
                alt={brand.logoAlt}
                width={compact ? 32 : 44}
                height={compact ? 32 : 44}
                unoptimized
                onError={() => setFailedUrl(url)}
                className="shrink-0 object-contain"
              />
            ))}
          {brand.name && (
            <span
              className={`${compact ? "text-sm" : "text-lg"} min-w-0 [overflow-wrap:anywhere] font-black tracking-[0.12em] text-[var(--exam-color-1e3932)]`}
            >
              {brand.name}
            </span>
          )}
        </div>
      </div>
      {brand.badgeVisible && brand.badge && (
        <>
          <span
            className={`h-9 w-px bg-[var(--exam-color-d8c4ac)] hidden sm:block`}
            aria-hidden="true"
          />
          <div className="max-w-full [overflow-wrap:anywhere] rounded-full border border-[var(--exam-color-d39a50)] bg-[var(--exam-color-fff8e7)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--exam-color-7b4a25)]">
            {brand.badge}
          </div>
        </>
      )}
    </div>
  );
}
export function StoreNineCats({ compact = false }: { compact?: boolean }) {
  const { artwork } = useExamAppearance();
  const url = useExamAssetUrl(artwork.asset);
  const [failedUrl, setFailedUrl] = useState<string>();
  if (!artwork.visible || !url || url === failedUrl) return null;
  return (
    <figure
      className={compact ? "w-24 shrink-0" : "w-full max-w-[220px] shrink-0"}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-[1.4rem] border border-[var(--exam-color-d99a49)] bg-[var(--exam-color-f7ead4)] shadow-[0_18px_45px_rgba(79,45,20,0.2)]">
        <Image
          src={url}
          alt={artwork.alt}
          fill
          onError={() => setFailedUrl(url)}
          unoptimized={artwork.asset?.source === "org-file"}
          priority={!compact}
          sizes={compact ? "96px" : "(max-width: 768px) 180px, 220px"}
          className="object-contain"
        />
      </div>
      {!compact && artwork.caption && (
        <figcaption className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--exam-color-7d5132)]">
          {artwork.caption}
        </figcaption>
      )}
    </figure>
  );
}
