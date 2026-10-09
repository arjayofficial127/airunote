"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useOrgSession } from "@/providers/OrgSessionProvider";
import { useMetadataIndex } from "@/providers/MetadataIndexProvider";
import { useFilesLibrary } from "@/hooks/useFilesLibrary";
import type { OrgFile } from "@/lib/api/files";
import { fileLibrary as nativeFilesApi } from "@/services/fileLibrary";
import { apiError } from "@/lib/api/appearance";
import { builtinAssets, type AssetReference } from "@/lib/exam-appearance";

export function FileThumbnail({
  orgId,
  file,
}: {
  orgId: string;
  file: Pick<OrgFile, "id" | "fileName" | "mimeType">;
}) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setUrl(undefined);
    setFailed(false);
    if (!file.mimeType.startsWith("image/")) return;
    nativeFilesApi
      .preview(orgId, file.id)
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orgId, file.id, file.mimeType]);
  return (
    <div className="flex h-28 items-center justify-center rounded-xl bg-slate-100">
      {url ? (
        <Image
          src={url}
          alt={file.fileName}
          width={150}
          height={100}
          unoptimized
          className="h-24 w-full object-contain"
        />
      ) : (
        <span className="text-xs text-slate-500">
          {failed
            ? "Preview unavailable"
            : file.mimeType === "application/pdf"
              ? "PDF document"
              : "Loading preview…"}
        </span>
      )}
    </div>
  );
}
export function NativeFileLibrary({
  onSelect,
}: {
  onSelect?: (asset: AssetReference) => void;
}) {
  const session = useOrgSession();
  const org = session.activeOrgId;
  const isAdmin = session.roles.some((r) =>
    ["admin", "superadmin"].includes(r.toLowerCase()),
  );
  const metadata = useMetadataIndex();
  const library = useFilesLibrary({ orgId: org || "", autoLoad: true });
  const [source, setSource] = useState<"builtin" | "org">("builtin");
  const [search, setSearch] = useState("");
  const [list, setList] = useState(false);
  const [capable, setCapable] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [publicUpload, setPublicUpload] = useState(Boolean(onSelect));
  const [pending, setPending] = useState<File | null>(null);
  const [detail, setDetail] = useState<
    | (OrgFile & {
        uses: { ownerKind: string; ownerId: string; label: string }[];
      })
    | null
  >(null);
  const [cleanup, setCleanup] = useState<OrgFile[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    setDetail(null);
    setMessage("");
    setPending(null);
    setCapable(false);
    setCleanup([]);
    if (!org) return;
    let active = true;
    nativeFilesApi
      .capabilities(org)
      .then((c) => {
        if (active) setCapable(c.uploadsAvailable);
      })
      .catch((e) => {
        if (active) setMessage(apiError(e));
      });
    if (isAdmin)
      nativeFilesApi
        .cleanup(org)
        .then((rows) => {
          if (active) setCleanup(rows);
        })
        .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [org, isAdmin]);
  const refresh = async () => {
    await metadata.refreshKey("files");
    if (org && isAdmin) setCleanup(await nativeFilesApi.cleanup(org));
  };
  const upload = async (file: File) => {
    if (!org) return;
    setBusy(true);
    setMessage("");
    setPending(file);
    setProgress(0);
    try {
      const result = await nativeFilesApi.upload(
        org,
        file,
        publicUpload ? "public" : "private",
        setProgress,
      );
      await refresh();
      setPending(null);
      setMessage("Uploaded.");
      if (
        onSelect &&
        result.mimeType.startsWith("image/") &&
        result.visibility === "public"
      )
        onSelect({ source: "org-file", fileId: result.id });
    } catch (e) {
      setMessage(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (file: OrgFile) => {
    if (!org) return;
    setBusy(true);
    try {
      await nativeFilesApi.delete(org, file.id);
      setDetail(null);
      setConfirmDelete(false);
      await refresh();
      setMessage(
        "Removed from the library. Any pending storage cleanup is listed below.",
      );
    } catch (e) {
      setMessage(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const rows = library.files.filter(
    (f) =>
      f.fileName.toLowerCase().includes(search.toLowerCase()) &&
      (!onSelect || f.mimeType.startsWith("image/")),
  );
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">
            {onSelect ? "Choose an image" : "Files"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Built-in assets and your organization’s library.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSource("builtin")}
            className={`rounded-lg border px-3 py-2 text-sm ${source === "builtin" ? "bg-slate-900 text-white" : "bg-white"}`}
          >
            Built-in
          </button>
          <button
            type="button"
            onClick={() => setSource("org")}
            className={`rounded-lg border px-3 py-2 text-sm ${source === "org" ? "bg-slate-900 text-white" : "bg-white"}`}
          >
            Org library
          </button>
        </div>
      </div>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900"
        >
          {message}
        </p>
      )}
      {source === "builtin" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {builtinAssets.map((a) => (
            <article key={a.id} className="rounded-2xl border bg-white p-4">
              <div className="flex h-36 items-center justify-center rounded-xl bg-amber-50">
                <Image
                  src={a.path}
                  alt={a.name}
                  width={140}
                  height={120}
                  className="h-28 object-contain"
                />
              </div>
              <p className="my-3 text-sm font-medium">{a.name}</p>
              {onSelect ? (
                <button
                  type="button"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                  onClick={() => onSelect({ source: "builtin", assetId: a.id })}
                >
                  Use image
                </button>
              ) : (
                <p className="text-xs text-slate-500">
                  Included with Airunote · available in exam appearance
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <>
          {!isAdmin ? (
            <p className="rounded-xl bg-slate-100 p-4 text-sm">
              An organization admin manages uploaded branding files.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  aria-label="Search files"
                  placeholder="Search files"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border p-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setList(!list)}
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  {list ? "Grid" : "List"} view
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void refresh().catch((e) => setMessage(apiError(e)))
                  }
                  className="rounded-lg border px-3 py-2 text-sm"
                >
                  Refresh
                </button>
              </div>
              <div className="rounded-xl border border-dashed bg-white p-4">
                <label className="mb-3 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={publicUpload}
                    onChange={(e) => setPublicUpload(e.target.checked)}
                  />
                  Make uploaded files public for exam branding
                </label>
                <p className="mb-3 text-xs text-slate-500">
                  Public images can be displayed to exam respondents. PNG, JPEG,
                  WebP, or PDF · up to 10 MB.
                </p>
                <input
                  aria-label="Upload file"
                  type="file"
                  accept={
                    onSelect
                      ? "image/png,image/jpeg,image/webp"
                      : "image/png,image/jpeg,image/webp,application/pdf"
                  }
                  disabled={!capable || busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void upload(file);
                  }}
                />
                {!capable && (
                  <p className="mt-3 text-sm text-amber-800">
                    Upload storage needs configuration. Built-in images are
                    available now.
                  </p>
                )}
                {busy && (
                  <p className="mt-2 text-sm">
                    Uploading or saving… {progress}%
                  </p>
                )}
                {pending && !busy && (
                  <button
                    type="button"
                    className="mt-3 rounded-lg border px-3 py-2 text-sm"
                    onClick={() => void upload(pending)}
                  >
                    Retry upload: {pending.name}
                  </button>
                )}
              </div>
              {library.error && (
                <p role="alert" className="text-sm text-red-700">
                  {library.error}
                </p>
              )}
              <div
                className={
                  list
                    ? "space-y-3"
                    : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                }
              >
                {org &&
                  rows.map((f) => (
                    <article
                      key={f.id}
                      className="rounded-xl border bg-white p-3"
                    >
                      <FileThumbnail orgId={org} file={f} />
                      <p className="mt-3 break-all text-sm font-medium">
                        {f.fileName}
                      </p>
                      <p className="my-2 text-xs text-slate-500">
                        {f.visibility} · {Math.ceil(f.sizeBytes / 1024)} KB
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-lg border px-3 py-2 text-xs"
                          onClick={() => {
                            setConfirmDelete(false);
                            void nativeFilesApi
                              .details(org, f.id)
                              .then(setDetail)
                              .catch((e) => setMessage(apiError(e)));
                          }}
                        >
                          Details
                        </button>
                        {onSelect && (
                          <button
                            type="button"
                            disabled={f.visibility !== "public"}
                            title="Only public images can be used on public exams"
                            onClick={() =>
                              onSelect({ source: "org-file", fileId: f.id })
                            }
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs text-white disabled:opacity-40"
                          >
                            Use image
                          </button>
                        )}
                      </div>
                    </article>
                  ))}
              </div>
              {!library.loading && !rows.length && (
                <p className="py-6 text-center text-sm text-slate-500">
                  No matching files. Upload one to get started.
                </p>
              )}
              {detail && (
                <div className="rounded-2xl border bg-white p-5">
                  <div className="flex justify-between gap-3">
                    <h3 className="break-all font-semibold">
                      {detail.fileName}
                    </h3>
                    <button type="button" onClick={() => setDetail(null)}>
                      Close
                    </button>
                  </div>
                  <FileDetailPreview orgId={org!} file={detail} />
                  <p className="my-3 text-sm">
                    Visibility: {detail.visibility}
                  </p>
                  <label className="text-sm">
                    Change visibility{" "}
                    <select
                      value={detail.visibility}
                      disabled={busy}
                      className="ml-2 rounded border p-2"
                      onChange={async (e) => {
                        if (!org) return;
                        setBusy(true);
                        try {
                          const updated = await nativeFilesApi.updateVisibility(
                            org,
                            detail.id,
                            {
                              visibility: e.target.value as
                                | "private"
                                | "org"
                                | "public",
                            },
                          );
                          setDetail({ ...updated, uses: detail.uses });
                          await refresh();
                        } catch (error) {
                          setMessage(apiError(error));
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <option value="private">Private</option>
                      <option value="org">Organization</option>
                      <option value="public">
                        Public — visible to respondents
                      </option>
                    </select>
                  </label>
                  <p className="mt-4 text-sm font-medium">
                    Used by {detail.uses.length} saved items
                  </p>
                  {detail.uses.map((u) => (
                    <p
                      key={u.ownerKind + u.ownerId}
                      className="break-all text-xs text-slate-500"
                    >
                      {u.ownerKind === "attempt"
                        ? "Saved attempt"
                        : u.ownerKind}
                      : {u.label}
                    </p>
                  ))}
                  {!detail.uses.length && (
                    <div className="mt-4">
                      {confirmDelete ? (
                        <>
                          <p className="mb-2 text-sm">
                            Remove this unused file and its stored content?
                          </p>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void remove(detail)}
                            className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white"
                          >
                            Remove file
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(false)}
                            className="ml-3 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(true)}
                          className="text-sm text-red-700"
                        >
                          Remove unused file
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {cleanup.length > 0 && (
                <div className="rounded-xl bg-amber-50 p-4">
                  <h3 className="font-medium">Storage cleanup pending</h3>
                  {cleanup.map((f) => (
                    <div
                      key={f.id}
                      className="mt-2 flex justify-between gap-3 text-sm"
                    >
                      <span>{f.fileName}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void remove(f)}
                      >
                        Retry cleanup
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

function FileDetailPreview({ orgId, file }: { orgId: string; file: OrgFile }) {
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;
    setUrl(undefined);
    setError("");
    nativeFilesApi
      .preview(orgId, file.id)
      .then((blob) => {
        if (active) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(() => {
        if (active) setError("Preview unavailable.");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orgId, file.id]);
  if (error) return <p className="mt-3 text-sm text-amber-700">{error}</p>;
  if (!url) return <p className="mt-3 text-sm">Loading preview…</p>;
  return (
    <div className="mt-4">
      {file.mimeType === "application/pdf" ? (
        <iframe
          title={`Preview ${file.fileName}`}
          src={url}
          sandbox=""
          className="h-96 w-full rounded-lg border"
        />
      ) : (
        <Image
          src={url}
          alt={file.fileName}
          width={700}
          height={400}
          unoptimized
          className="max-h-96 w-full rounded-lg object-contain"
        />
      )}
      <a
        href={url}
        download={file.fileName}
        className="mt-3 inline-block text-sm text-blue-700"
      >
        Download file
      </a>
    </div>
  );
}
