"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  legacyAppearance,
  builtinAssets,
  type Appearance,
  type AssetReference,
} from "@/lib/exam-appearance";
import { fileLibrary as nativeFilesApi } from "@/services/fileLibrary";
import { assetFileIds } from "@/lib/exam-appearance";
import { themeColors } from "./themeColors";
const Context = createContext<Appearance>(legacyAppearance);
const PreviewMode = createContext(false);
export const useExamPreview = () => useContext(PreviewMode);
const PreviewUrls = createContext<Record<string, string>>({});
export function useExamAssetUrl(asset: AssetReference | null) {
  const urls = useContext(PreviewUrls);
  return asset?.source === "org-file" && urls[asset.fileId]
    ? urls[asset.fileId]
    : assetUrl(asset);
}
export const useExamAppearance = () => useContext(Context);
export function assetUrl(asset: AssetReference | null): string | undefined {
  if (!asset) return undefined;
  if (asset.source === "builtin")
    return builtinAssets.find((a) => a.id === asset.assetId)?.path;
  return `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api"}/public/exam-assets/${asset.fileId}`;
}
export function ExamAppearanceProvider({
  config,
  children,
  preview = false,
  previewOrgId,
}: {
  config: Appearance;
  children: ReactNode;
  preview?: boolean;
  previewOrgId?: string;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const ids = assetFileIds(config).join(",");
  useEffect(() => {
    let active = true;
    const allocated: string[] = [];
    setUrls({});
    if (!previewOrgId || !ids) return;
    void Promise.all(
      ids.split(",").map(async (id) => {
        try {
          const blob = await nativeFilesApi.preview(previewOrgId, id);
          if (!active) return null;
          const url = URL.createObjectURL(blob);
          allocated.push(url);
          return [id, url] as const;
        } catch {
          return null;
        }
      }),
    ).then((entries) => {
      if (active)
        setUrls(
          Object.fromEntries(
            entries.filter((e): e is readonly [string, string] => e !== null),
          ),
        );
    });
    return () => {
      active = false;
      allocated.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [ids, previewOrgId]);
  const variables: Record<string, string> = {};
  for (const [hex, role] of Object.entries(themeColors)) {
    variables[`--exam-color-${hex}`] =
      config.colors[role] === legacyAppearance.colors[role]
        ? `#${hex}`
        : config.colors[role];
  }
  for (const [name, hex] of Object.entries({ ...variables })) {
    for (const alpha of [5, 10, 15, 20, 25, 70, 95]) {
      variables[`${name}-${alpha}`] =
        `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha / 100})`;
    }
  }
  const c = config.colors;
  const rgba = (hex: string, alpha: number) =>
    `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha})`;
  variables["--exam-background"] = config.gradient
    ? `radial-gradient(circle at 12% 15%,${rgba(c.glow, 0.13)},transparent 26%),radial-gradient(circle at 90% 8%,${rgba(c.glowSecondary, 0.1)},transparent 22%),linear-gradient(180deg,${c.background} 0%,${c.backgroundEnd} 100%)`
    : c.background;
  variables["--exam-header-text"] = c.headerText;
  variables["--exam-primary-text"] = c.primaryText;
  return (
    <Context.Provider value={config}>
      <PreviewMode.Provider value={preview}>
        <PreviewUrls.Provider value={urls}>
          <div
            className={`exam-theme ${preview ? "exam-preview" : ""}`}
            data-rounding={config.rounding}
            data-animated={config.decorations.animated}
            data-renderer={config.renderer}
            style={
              {
                ...variables,
                fontFamily:
                  config.font === "serif"
                    ? "Georgia, serif"
                    : config.font === "mono"
                      ? "ui-monospace, monospace"
                      : undefined,
              } as CSSProperties
            }
          >
            {children}
          </div>
        </PreviewUrls.Provider>
      </PreviewMode.Provider>
    </Context.Provider>
  );
}
