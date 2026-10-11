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
  const [picker, setPicker] = useState<"logo" | "artwork" | "intro" | null>(null);
  const giftOpening = v.giftOpening ?? { labelMode: 'unwrap' as const, customLabel: '', showReplay: false };
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
      {v.renderer === 'creator' && <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Gift opening</h3>
        <label className="block text-sm font-medium">
          Opening button
          <select className={inputClass} value={giftOpening.labelMode} onChange={e => onChange({ ...v, giftOpening: { ...giftOpening, labelMode: e.target.value as 'unwrap' | 'instructions' | 'custom' } })}>
            <option value="unwrap">Unwrap &amp; Begin</option>
            <option value="instructions">Read Instructions</option>
            <option value="custom">Free text</option>
          </select>
        </label>
        {giftOpening.labelMode === 'custom' && text('Button text', giftOpening.customLabel, customLabel => onChange({ ...v, giftOpening: { ...giftOpening, customLabel } }))}
        <label className="block text-sm font-medium">
          Text below the button
          <textarea
            className={inputClass}
            rows={3}
            maxLength={300}
            value={v.giftOpening?.helperText ?? 'Your timer hasn’t started.'}
            onChange={e => onChange({ ...v, giftOpening: { ...giftOpening, helperText: e.target.value } })}
            aria-describedby="gift-helper-hint"
          />
        </label>
        <p id="gift-helper-hint" className="text-xs text-slate-500">Leave blank to hide this text.</p>
        {toggle('Show Replay Gift Opening', giftOpening.showReplay, showReplay => onChange({ ...v, giftOpening: { ...giftOpening, showReplay } }))}
      </section>}
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Instructions</h3>
        <label className="block text-sm">Opening text format
          <select className={inputClass} value={v.instructions?.introMode ?? 'text'} onChange={e => onChange({ ...v, instructions: { ...v.instructions, introMode: e.target.value as 'text' | 'image' } })}>
            <option value="text">Text</option><option value="image">Image lettering</option>
          </select>
        </label>
        {v.instructions?.introMode === 'image' && <div className="space-y-3">
          <button type="button" className="w-full rounded-xl border bg-[#fffdf8] p-3 text-left" onClick={() => onChange({ ...v, instructions: { ...v.instructions, introMode: 'image', introImage: { source: 'builtin', assetId: 'wrapped-in-joy-ribbon-text' }, introImageAlt: 'Wrapped in Joy' } })}>
            <img src="/exam-assets/creator/wrapped-in-joy-crafted.png" alt="Wrapped in Joy with a gold ribbon W" className="h-auto w-full" />
            <span className="mt-2 block text-xs font-semibold">Use Wrapped in Joy — ribbon W</span>
          </button>
          <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setPicker('intro')}>Choose another image</button>
          <label className="block text-sm">Image size
            <select className={inputClass} value={v.instructions?.introImageSize ?? (v.instructions?.introImage?.source === 'builtin' && v.instructions.introImage.assetId === 'wrapped-in-joy-ribbon-text' ? 'medium' : 'large')} onChange={e => onChange({ ...v, instructions: { ...v.instructions, introImageSize: e.target.value as NonNullable<Appearance['instructions']>['introImageSize'] } })}>
              <option value="xs">XS</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="custom">Custom</option>
            </select>
          </label>
          {v.instructions?.introImageSize === 'custom' && <label className="block text-sm">Custom width — {v.instructions.introImageWidth ?? 72}%
            <input type="range" min={20} max={100} step={1} className="mt-2 w-full" value={v.instructions.introImageWidth ?? 72} onChange={e => onChange({ ...v, instructions: { ...v.instructions, introImageWidth: Number(e.target.value) } })} />
            <input aria-label="Custom image width percentage" type="number" min={20} max={100} className={inputClass} value={v.instructions.introImageWidth ?? 72} onChange={e => { if (e.target.value !== '') onChange({ ...v, instructions: { ...v.instructions, introImageWidth: Math.max(20, Math.min(100, Number(e.target.value))) } }); }} />
          </label>}
          {text('Image text (accessibility)', v.instructions?.introImageAlt ?? '', introImageAlt => onChange({ ...v, instructions: { ...v.instructions, introImageAlt } }))}
        </div>}
        {v.instructions?.introMode !== 'image' && <>
        {text('Opening text (optional)', v.instructions?.intro ?? '', intro => onChange({ ...v, instructions: { ...v.instructions, intro } }))}
        <label className="block text-sm">Opening text font
          <select className={inputClass} value={v.instructions?.introFont ?? 'inherit'} onChange={e => onChange({ ...v, instructions: { ...v.instructions, introFont: e.target.value as NonNullable<Appearance['instructions']>['introFont'] } })}>
            <option value="inherit">Match exam</option><option value="sans">Sans serif</option><option value="serif">Serif</option><option value="mono">Monospace</option><option value="script">Script</option><option value="flourish">Flourish — first letter only</option>
          </select>
        </label>
        </>}
        {text('Instructions heading (optional)', v.instructions?.title ?? '', title => onChange({ ...v, instructions: { ...v.instructions, title } }))}
        <p className="text-xs text-slate-500">The main instructions use the exam’s Instructions field. If it already includes these headings, move them here to avoid repeats.</p>
        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer text-sm font-medium">Second instruction block (optional)</summary>
          <div className="mt-3 space-y-3">
            {text('Second heading (optional)', v.instructions?.secondaryTitle ?? '', secondaryTitle => onChange({ ...v, instructions: { ...v.instructions, secondaryTitle } }))}
            <label className="block text-sm">Additional instructions
              <textarea rows={4} maxLength={3000} className={inputClass} value={v.instructions?.secondaryBody ?? ''} onChange={e => onChange({ ...v, instructions: { ...v.instructions, secondaryBody: e.target.value } })} />
            </label>
          </div>
        </details>
      </section>
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
        <div className="grid grid-cols-1 gap-3">
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
            <option value="holiday">Holiday · Wrapped in Joy</option>
            <option value="creator">Creator · Holiday atelier</option>
          </select>
        </label>
        {v.renderer === "creator" && <p className="my-3 text-xs leading-5 text-slate-500">The entry gift opens to reveal your instructions and form, with your selected logo on the cream box. Hide artwork to show the form directly. Floating ornaments add sparkles and falling gold; turn off Animate decorations for an immediate reveal.</p>}
        {(
          Object.keys(v.decorations) as (keyof Appearance["decorations"])[]
        ).map((key) => (
          <div key={key}>
            {toggle(
              {
                leaves:
                  ["holiday", "creator"].includes(v.renderer)
                    ? "Floating ornaments"
                    : "Floating leaves",
                backgroundBranches:
                  ["holiday", "creator"].includes(v.renderer)
                    ? "Background gifts and ribbons"
                    : "Background branches",
                headerBranches:
                  ["holiday", "creator"].includes(v.renderer)
                    ? "Header ribbon and ornaments"
                    : "Header branches",
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
        <h3 className="font-semibold">Completion</h3>
        <label className="block text-sm">
          Celebration text
          <input className={inputClass} maxLength={120} value={v.completionEyebrow ?? 'A little moment to celebrate'} onChange={e => onChange({ ...v, completionEyebrow: e.target.value })} />
        </label>
        <label className="block text-sm">
          Completion headline
          <input className={inputClass} maxLength={200} value={v.completionTitle ?? 'Beautifully done.'} onChange={e => onChange({ ...v, completionTitle: e.target.value })} />
        </label>
        <label className="block text-sm">
          Completion message
          <textarea
            className={inputClass}
            maxLength={1000}
            value={v.completionMessage || ""}
            placeholder="Default completion message"
            onChange={(e) =>
              onChange({ ...v, completionMessage: e.target.value })
            }
          />
        </label>
      </section>
      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <h3 className="font-semibold">Footer and sound</h3>
        {toggle("Show footer", v.footer.visible, (visible) =>
          onChange({ ...v, footer: { ...v.footer, visible } }),
        )}
        {text("Footer text", v.footer.text, (text) =>
          onChange({ ...v, footer: { ...v.footer, text } }),
        )}
        {toggle("Enable exam sounds", v.sound.available, (available) =>
          onChange({ ...v, sound: { ...v.sound, available } }),
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
                  picker === "intro" ? { ...v, instructions: { ...v.instructions, introMode: 'image', introImage: asset, introImageAlt: v.instructions?.introImageAlt || v.instructions?.intro || 'Opening text' } } : picker === "logo"
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
