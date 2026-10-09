"use client";
import { useState, useEffect, useRef } from "react";
import type { Appearance } from "@/lib/exam-appearance";
import { NativeFileLibrary } from "@/components/files/NativeFileLibrary";
const inputClass =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
export function AppearanceFields({
  value: v,
  onChange,
  disabled = false,
}: {
  value: Appearance;
  onChange: (v: Appearance) => void;
  disabled?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [picker, setPicker] = useState<"logo" | "artwork" | null>(null);
  useEffect(() => {
    if (!picker) return;
    const previous = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPicker(null);
      }
      if (event.key !== "Tab") return;
      const items = dialogRef.current?.querySelectorAll<HTMLElement>(
        "button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]",
      );
      if (!items?.length) return;
      const first = items[0],
        last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [picker]);
  const text = (
    label: string,
    value: string,
    change: (value: string) => void,
  ) => (
    <label className="block text-sm font-medium">
      {label}
      <input
        className={inputClass}
        value={value}
        maxLength={
          label === "Brand name"
            ? 100
            : label === "Badge text"
              ? 80
              : label === "Header label"
                ? 120
                : label === "Footer text"
                  ? 500
                  : 200
        }
        onChange={(e) => change(e.target.value)}
      />
    </label>
  );
  const toggle = (
    label: string,
    value: boolean,
    change: (value: boolean) => void,
  ) => (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => change(e.target.checked)}
      />
      {label}
    </label>
  );
  return (
    <fieldset disabled={disabled} className="space-y-6 disabled:opacity-70">
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Branding</h3>
        {toggle("Show branding", v.brand.visible, (visible) =>
          onChange({ ...v, brand: { ...v.brand, visible } }),
        )}
        {text("Brand name", v.brand.name, (name) =>
          onChange({ ...v, brand: { ...v.brand, name } }),
        )}
        {text("Header label", v.headerLabel, (headerLabel) =>
          onChange({ ...v, headerLabel }),
        )}
        {toggle("Show logo", v.brand.logoVisible, (logoVisible) =>
          onChange({ ...v, brand: { ...v.brand, logoVisible } }),
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPicker("logo")}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Choose logo
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ ...v, brand: { ...v.brand, logo: null } })
            }
            className="text-sm"
          >
            Clear logo
          </button>
        </div>
        {text("Logo description", v.brand.logoAlt, (logoAlt) =>
          onChange({ ...v, brand: { ...v.brand, logoAlt } }),
        )}
        {toggle("Show badge", v.brand.badgeVisible, (badgeVisible) =>
          onChange({ ...v, brand: { ...v.brand, badgeVisible } }),
        )}
        {text("Badge text", v.brand.badge, (badge) =>
          onChange({ ...v, brand: { ...v.brand, badge } }),
        )}
      </section>
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Artwork</h3>
        {toggle("Show artwork", v.artwork.visible, (visible) =>
          onChange({ ...v, artwork: { ...v.artwork, visible } }),
        )}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPicker("artwork")}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Choose artwork
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({ ...v, artwork: { ...v.artwork, asset: null } })
            }
            className="text-sm"
          >
            Clear artwork
          </button>
        </div>
        {text("Artwork description", v.artwork.alt, (alt) =>
          onChange({ ...v, artwork: { ...v.artwork, alt } }),
        )}
        {text("Caption", v.artwork.caption, (caption) =>
          onChange({ ...v, artwork: { ...v.artwork, caption } }),
        )}
      </section>
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Colors and presentation</h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(v.colors).map(([key, color]) => (
            <label
              key={key}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </span>
              <input
                aria-label={`${key} color`}
                type="color"
                value={color}
                onChange={(e) =>
                  onChange({
                    ...v,
                    colors: { ...v.colors, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
        </div>
        {toggle("Use gradient background", v.gradient, (gradient) =>
          onChange({ ...v, gradient }),
        )}
        <label className="block text-sm">
          Font
          <select
            className={inputClass}
            value={v.font}
            onChange={(e) =>
              onChange({ ...v, font: e.target.value as Appearance["font"] })
            }
          >
            <option value="sans">Sans serif</option>
            <option value="serif">Serif</option>
            <option value="mono">Monospace</option>
          </select>
        </label>
        <label className="block text-sm">
          Card corners
          <select
            className={inputClass}
            value={v.rounding}
            onChange={(e) =>
              onChange({
                ...v,
                rounding: e.target.value as Appearance["rounding"],
              })
            }
          >
            <option value="rounded">Rounded</option>
            <option value="soft">Soft</option>
            <option value="square">Square</option>
          </select>
        </label>
      </section>
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Decorations</h3>
        <label className="block text-sm">
          Style
          <select
            className={inputClass}
            value={v.renderer}
            onChange={(e) =>
              onChange({
                ...v,
                renderer: e.target.value as Appearance["renderer"],
              })
            }
          >
            <option value="autumn">Autumn</option>
            <option value="plain">Plain</option>
          </select>
        </label>
        {(
          Object.keys(v.decorations) as (keyof Appearance["decorations"])[]
        ).map((key) => (
          <div key={key}>
            {toggle(
              {
                leaves: "Floating leaves",
                backgroundBranches: "Background branches",
                headerBranches: "Header branches",
                animated: "Animate decorations",
                completion: "Completion celebration",
              }[key],
              v.decorations[key],
              (checked) =>
                onChange({
                  ...v,
                  decorations: { ...v.decorations, [key]: checked },
                }),
            )}
          </div>
        ))}
      </section>
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Footer and sound</h3>
        {toggle("Show footer", v.footer.visible, (visible) =>
          onChange({ ...v, footer: { ...v.footer, visible } }),
        )}
        {text("Footer text", v.footer.text, (text) =>
          onChange({ ...v, footer: { ...v.footer, text } }),
        )}
        {toggle("Offer exam sounds", v.sound.available, (available) =>
          onChange({ ...v, sound: { ...v.sound, available } }),
        )}
        {toggle(
          "Sound on by default",
          v.sound.defaultEnabled,
          (defaultEnabled) =>
            onChange({ ...v, sound: { ...v.sound, defaultEnabled } }),
        )}
      </section>
      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Choose exam image"
        >
          <div
            ref={dialogRef}
            className="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6"
          >
            <button
              type="button"
              autoFocus
              className="mb-4 rounded-lg border px-3 py-2 text-sm"
              onClick={() => setPicker(null)}
            >
              Close image picker
            </button>
            <NativeFileLibrary
              onSelect={(asset) => {
                onChange(
                  picker === "logo"
                    ? {
                        ...v,
                        brand: { ...v.brand, logo: asset, logoVisible: true },
                      }
                    : { ...v, artwork: { ...v.artwork, asset, visible: true } },
                );
                setPicker(null);
              }}
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
