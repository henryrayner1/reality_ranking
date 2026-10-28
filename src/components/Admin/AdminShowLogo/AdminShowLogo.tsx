import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import AvatarEditor, { type AvatarEditorRef } from "react-avatar-editor";
import type { Show } from "../../../utils/Constants";
import { updateShowLogo, uploadShowLogo } from "../../../utils/util";
import { backendUrl } from "../../../utils/apiBase";
import { canvasToSquarePng } from "../../../utils/imageCrop";
import * as AdminUI from "../../../utils/AdminComponents";
import { showsQueryKey } from "../../../hooks/queries";

interface AdminShowLogoProps {
  show: Show;
}

const EDITOR_SIZE = 360;
const DEFAULT_SCALE = 1;

// Thumbnail + "Logo" button in the show picker bar, opening a modal to
// upload, crop, replace or remove the logo shown on the homepage show card.
const AdminShowLogo = ({ show }: AdminShowLogoProps) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<AvatarEditorRef>(null);

  const currentLogo = show.logoUrl ? backendUrl(show.logoUrl) : undefined;

  const handleFile = (f: File | null | undefined) => {
    if (f && f.type.startsWith("image/")) {
      setFile(f);
      setScale(DEFAULT_SCALE);
    }
  };

  // Paste an image from anywhere on the page while the modal is open.
  // Registered in the capture phase and stopped there, because
  // AdminContestants (rendered behind this modal) has its own window-level
  // paste listener that would otherwise load the same image into the
  // contestant photo editor too.
  useEffect(() => {
    if (!open) return;
    const onWindowPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      handleFile(item.getAsFile());
    };
    window.addEventListener("paste", onWindowPaste, { capture: true });
    return () => window.removeEventListener("paste", onWindowPaste, { capture: true });
  }, [open]);

  const clearFile = () => {
    setFile(null);
    setScale(DEFAULT_SCALE);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const close = () => {
    setOpen(false);
    clearFile();
    save.reset();
  };

  const save = useMutation({
    mutationFn: async (removing: boolean) => {
      let logoUrl: string | null = null;
      if (!removing) {
        const cropped = editorRef.current?.getImage();
        if (!cropped) throw new Error("No image to save");
        logoUrl = await uploadShowLogo(await canvasToSquarePng(cropped, "logo.png"), show.name);
      }
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

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (!isDragging) setIsDragging(true); },
    onDragLeave: (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); },
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files?.[0]); },
  };

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
        <AdminUI.Modal title={`${show.name} logo`} onClose={close} size="lg">
          <div className="flex flex-col gap-3">
            {file ? (
              // Dropping another image onto the editor swaps it in.
              <div className="flex flex-col items-center gap-2" {...dropHandlers}>
                <AvatarEditor
                  ref={editorRef}
                  image={file}
                  width={EDITOR_SIZE}
                  height={EDITOR_SIZE}
                  border={20}
                  borderRadius={16}
                  scale={scale}
                  style={{ width: "100%", maxWidth: EDITOR_SIZE + 40, height: "auto", aspectRatio: "1 / 1", borderRadius: 12 }}
                />
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.01"
                  value={scale}
                  onChange={(e) => setScale(parseFloat(e.target.value))}
                  aria-label="Zoom"
                  className="w-full max-w-[400px] accent-[#7F77DD]"
                />
                <p className="m-0 text-xs text-[#888]">Drag the image to reposition it, and use the slider to zoom.</p>
              </div>
            ) : (
              <div
                tabIndex={0}
                role="button"
                aria-label="Upload logo: click to browse, drag and drop, or paste an image"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                {...dropHandlers}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-[1.5px] border-dashed p-4 text-center ${isDragging ? "border-[#4f8cff] bg-[rgba(79,140,255,0.08)]" : "border-[#ccc]"}`}
              >
                {currentLogo ? (
                  <img src={currentLogo} alt={`${show.name} logo`} className="aspect-square w-full max-w-[360px] rounded-xl object-cover" />
                ) : (
                  <div className="text-xl">↑</div>
                )}
                <p className="m-0 text-[13px] text-[#888]">
                  {currentLogo ? "Click, drag & drop, or paste to replace" : "Click, drag & drop, or paste to upload"}
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              data-testid="logo-file-input"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <p className="m-0 text-xs text-[#888]">Shown on the homepage show card as a square.</p>
            <div className="flex flex-wrap items-center gap-2">
              <AdminUI.PrimaryButton onClick={() => save.mutate(false)} disabled={!file || save.isPending}>
                {save.isPending ? "Saving..." : "Save logo"}
              </AdminUI.PrimaryButton>
              {file && (
                <>
                  <AdminUI.SecondaryButton onClick={() => fileInputRef.current?.click()} disabled={save.isPending}>Choose another image</AdminUI.SecondaryButton>
                  <AdminUI.SecondaryButton onClick={clearFile} disabled={save.isPending}>Discard</AdminUI.SecondaryButton>
                </>
              )}
              {currentLogo && !file && (
                <AdminUI.SecondaryButton
                  onClick={() => { if (window.confirm(`Remove the ${show.name} logo?`)) save.mutate(true); }}
                  disabled={save.isPending}
                >
                  Remove
                </AdminUI.SecondaryButton>
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
