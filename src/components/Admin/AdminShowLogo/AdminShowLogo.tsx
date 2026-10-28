import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Show } from "../../../utils/Constants";
import { updateShowLogo, uploadShowLogo } from "../../../utils/util";
import { backendUrl } from "../../../utils/apiBase";
import * as AdminUI from "../../../utils/AdminComponents";
import { showsQueryKey } from "../../../hooks/queries";

interface AdminShowLogoProps {
  show: Show;
}

// Thumbnail + "Logo" button in the show picker bar, opening a modal to
// upload, replace or remove the logo shown on the homepage show card.
const AdminShowLogo = ({ show }: AdminShowLogoProps) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLogo = show.logoUrl ? backendUrl(show.logoUrl) : undefined;
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleFile = (f: File | null | undefined) => {
    if (f && f.type.startsWith("image/")) setFile(f);
  };

  // Paste an image from anywhere on the page while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onWindowPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      e.preventDefault();
      handleFile(item.getAsFile());
    };
    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  }, [open]);

  const close = () => {
    setOpen(false);
    setFile(null);
    save.reset();
  };

  const save = useMutation({
    mutationFn: async (logo: File | null) => {
      const logoUrl = logo ? await uploadShowLogo(logo, show.name) : null;
      await updateShowLogo(show.id, logoUrl);
      return logoUrl;
    },
    onSuccess: (logoUrl) => {
      // Same reason as the ranking-mode save in AdminShows: the full
      // GET /api/shows refetch is slow, so show the new logo right away.
      qc.setQueryData<Show[]>(showsQueryKey(), (old) => old?.map((s) => (s.id === show.id ? { ...s, logoUrl } : s)));
      qc.invalidateQueries({ queryKey: showsQueryKey() });
      close();
    },
  });

  const shownLogo = previewUrl ?? currentLogo;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#ccc] bg-white py-1 pl-1 pr-2.5 text-[13px] text-[#333]"
        title="Show logo"
      >
        {currentLogo ? (
          <img src={currentLogo} alt="" className="h-6 w-6 rounded object-cover" />
        ) : (
          <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded bg-[#eeedfe] text-xs text-[#7F77DD]">+</span>
        )}
        Logo
      </button>
      {open && (
        <AdminUI.Modal title={`${show.name} logo`} onClose={close}>
          <div className="flex flex-col gap-3">
            <div
              tabIndex={0}
              role="button"
              aria-label="Upload logo: click to browse, drag and drop, or paste an image"
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
              onDragOver={(e) => { e.preventDefault(); if (!isDragging) setIsDragging(true); }}
              onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed p-4 text-center ${isDragging ? "border-[#4f8cff] bg-[rgba(79,140,255,0.08)]" : "border-[#ccc]"}`}
            >
              {shownLogo ? (
                <img src={shownLogo} alt={`${show.name} logo preview`} className="h-32 w-32 rounded-xl object-cover" />
              ) : (
                <div className="text-xl">↑</div>
              )}
              <p className="m-0 text-[13px] text-[#888]">
                {currentLogo || file ? "Click, drag & drop, or paste to replace" : "Click, drag & drop, or paste to upload"}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              data-testid="logo-file-input"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <p className="m-0 text-xs text-[#888]">
              Shown on the homepage show card, cropped to a square.
            </p>
            <div className="flex items-center gap-2">
              <AdminUI.PrimaryButton onClick={() => file && save.mutate(file)} disabled={!file || save.isPending}>
                {save.isPending ? "Saving..." : "Save logo"}
              </AdminUI.PrimaryButton>
              {currentLogo && !file && (
                <AdminUI.SecondaryButton
                  onClick={() => { if (window.confirm(`Remove the ${show.name} logo?`)) save.mutate(null); }}
                  disabled={save.isPending}
                >
                  Remove
                </AdminUI.SecondaryButton>
              )}
              {file && (
                <AdminUI.SecondaryButton onClick={() => setFile(null)} disabled={save.isPending}>Discard</AdminUI.SecondaryButton>
              )}
            </div>
            {save.isError && <AdminUI.ErrorMsg />}
          </div>
        </AdminUI.Modal>
      )}
    </>
  );
};

export default AdminShowLogo;
