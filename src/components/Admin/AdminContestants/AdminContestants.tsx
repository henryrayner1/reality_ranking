import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Contestant } from "../../../utils/Constants";
import {
  addContestant,
  deleteContestant,
  updateContestant,
  getIconLabel,
} from "../../../utils/util";
import { backendUrl } from "../../../utils/apiBase";
import * as AdminUI from "../../../utils/AdminComponents";
import AvatarEditor from "react-avatar-editor";
import { showsQueryKey, useSeasons, useShows } from "../../../hooks/queries";

interface AdminContestantsProps {
  showId: string;
  seasonId: string;
}

const AdminContestants = ({ showId, seasonId }: AdminContestantsProps) => {
  const qc = useQueryClient();
  const [contestant, setContestant] = useState<Partial<Contestant>>({});
  const { data: shows = [] } = useShows();
  const currShow = shows.find(s => s.id === showId);
  const [image, setImage] = useState<File | null>(null);
  const [scale, setScale] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

  // The same card doubles as "Add contestant" and "Edit contestant" — when
  // editingId is set, its dropzone/paste/drag-and-drop replace that
  // contestant's photo instead of supplying a new contestant's.
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleFile = (f: File | null | undefined) => {
    if (f && f.type.startsWith("image/")) {
      setImage(f);
    }
  };

  // Global listener so a headshot can be pasted from anywhere on the page,
  // not just while the dropzone itself is focused.
  useEffect(() => {
    if (!currShow) return;
    const onWindowPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      );
      if (!item) return;
      e.preventDefault();
      handleFile(item.getAsFile());
    };
    window.addEventListener("paste", onWindowPaste);
    return () => window.removeEventListener("paste", onWindowPaste);
  }, [currShow]);

  const { data: seasons = [], isLoading } = useSeasons(showId);
  const currSeason = seasons.find((s) => s.id === seasonId);
  // Contestants live nested on each season (getSeasons already returns them)
  // rather than in a separate cache — this is the single source of truth
  // that Ranking/Insights also read via useShowTree, so a create/edit/delete
  // here is immediately visible there without a page reload.
  const contestants = useMemo(
    () => [...(currSeason?.contestants ?? [])].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [currSeason]
  );
  const editingContestant = contestants.find((c) => c.id === editingId);

  const resetForm = () => {
    setEditingId(null);
    setContestant({});
    setImage(null);
    setScale(1.2);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const create = useMutation({
    mutationFn: addContestant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showsQueryKey() });
      resetForm();
    },
  });
  const remove = useMutation({
    mutationFn: deleteContestant,
    onSuccess: (_data, removedId) => {
      qc.invalidateQueries({ queryKey: showsQueryKey() });
      // Removing the contestant currently being edited drops the card back
      // to Add mode.
      if (removedId === editingId) resetForm();
    },
  });
  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: { name?: string; photoUrl?: string; firstNameHasSpace?: boolean } }) =>
      updateContestant(id, changes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showsQueryKey() });
      resetForm();
    },
  });

  const uploadAction = async (image: File, showName: string, seasonNumber: number) => {
    const fd = new FormData();
    // Field order matters: multer's destination() callback reads these from
    // req.body, which is only populated for fields parsed before the file.
    fd.append("showName", showName);
    fd.append("seasonNumber", String(seasonNumber));
    fd.append("category", "contestants");
    fd.append("image", image);

    const res = await fetch(backendUrl("/api/images/upload"), { method: "POST", body: fd });
    if (!res.ok) {
      throw new Error("Failed to upload image");
    }
    const data = await res.json();
    // The upload's filename is derived from the contestant's name, so a
    // replacement photo lands at the exact same path as the old one — the
    // ?v= suffix gives it a new URL so <img> tags don't keep showing the
    // browser-cached old image. express.static ignores the query string.
    return `${data.file as string}?v=${Date.now()}`;
  };

  // Crops the current AvatarEditor image (if one was dropped/pasted/picked)
  // and uploads it, returning its photoUrl.
  const uploadCroppedImage = async (name: string): Promise<string | null> => {
    if (!image || !editorRef.current) return null;
    const canvas = editorRef.current.getImageScaledToCanvas().toDataURL();
    // Convert base64 to blob
    const res = await fetch(canvas);
    const blob = await res.blob();
    const fileName = `${name.replace(/\s+/g, "_").toLowerCase()}.png`;
    const file = new File([blob], fileName, { type: "image/png" });
    return uploadAction(file, currShow?.name ?? "", currSeason?.seasonNumber ?? 0);
  };

  const handleSubmit = async () => {
    const name = contestant.name?.trim();
    if (!name) return;

    if (editingContestant) {
      const photoUrl = await uploadCroppedImage(name);
      const changes: { name?: string; photoUrl?: string; firstNameHasSpace?: boolean } = {};
      if (name !== editingContestant.name) changes.name = name;
      const firstNameHasSpace = !!contestant.firstNameHasSpace;
      if (firstNameHasSpace !== !!editingContestant.firstNameHasSpace) changes.firstNameHasSpace = firstNameHasSpace;
      if (photoUrl) changes.photoUrl = photoUrl;
      if (Object.keys(changes).length === 0) {
        resetForm();
        return;
      }
      update.mutate({ id: editingContestant.id, changes });
      return;
    }

    const photoUrl = await uploadCroppedImage(name);
    create.mutate({ ...contestant, seasonId, photoUrl });
  };

  const startEditing = (c: Contestant) => {
    setEditingId(c.id);
    setContestant({ name: c.name, firstNameHasSpace: !!c.firstNameHasSpace });
    setImage(null);
    setScale(1.2);
    if (fileInputRef.current) fileInputRef.current.value = "";
    formCardRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  };

  const isEditing = !!editingContestant;
  const isPending = create.isPending || update.isPending;
  const photoLabel = isEditing
    ? "Click, drag & drop, or paste to replace photo"
    : "Click, drag & drop, or paste to upload headshot";

  return (
    <div>
      <AdminUI.TwoCol>
        <div ref={formCardRef}>
        <AdminUI.Card title={isEditing ? "Edit contestant" : "Add contestant"}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <AdminUI.FormGroup label="Full name">
              <AdminUI.Input
                placeholder="e.g. Tiyana Kaloko"
                value={contestant.name || ""}
                onChange={(e) =>
                  setContestant((c) => ({ ...c, name: e.target.value }))
                }
              />
            </AdminUI.FormGroup>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AdminUI.Toggle
                checked={!!contestant.firstNameHasSpace}
                onChange={(checked) => setContestant((c) => ({ ...c, firstNameHasSpace: checked }))}
                title="First name has a space"
              />
              <div style={{ fontSize: 13 }}>
                <div>First name has a space</div>
                <div style={{ color: "var(--color-text-secondary,#888)" }}>
                  Icon label: {contestant.name?.trim() ? getIconLabel(contestant.name, contestant.firstNameHasSpace) : "—"}
                </div>
              </div>
            </div>
            <AdminUI.FormGroup label="Photo">
              <div
                tabIndex={0}
                role="button"
                aria-label="Upload headshot: click to browse, drag and drop, or paste an image"
                onClick={() => {
                  if (image == null) fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isDragging) setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setIsDragging(false);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
                style={{
                  border: `1.5px dashed ${isDragging ? "#4f8cff" : "var(--color-border-secondary,#ccc)"}`,
                  borderRadius: 8,
                  padding: "1.25rem",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "block",
                  backgroundColor: isDragging ? "rgba(79,140,255,0.08)" : undefined,
                }}
              >
                {(image == null) ? <>
                  {isEditing ? (
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                      <AdminUI.Avatar name={editingContestant.name} photoUrl={editingContestant.photoUrl} size={48} />
                    </div>
                  ) : (
                    <div style={{ fontSize: 20, marginBottom: 6 }}>↑</div>
                  )}
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--color-text-secondary,#888)",
                  }}
                >
                  {photoLabel}
                </p></> : <div>
                    <AvatarEditor
                        ref={editorRef}
                        image={image}
                        width={200} height={200}
                        border={50} borderRadius={125} // Circular mask
                        scale={scale}
                      />
                      <input type="range" min="1" max="6" step="0.01"
        value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-100"/>
                      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
                        <AdminUI.SecondaryButton
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                        >
                          Replace photo
                        </AdminUI.SecondaryButton>
                        <AdminUI.SecondaryButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setImage(null);
                            setScale(1.2);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          Remove
                        </AdminUI.SecondaryButton>
                      </div>
                  </div>}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
            </AdminUI.FormGroup>
            <AdminUI.PrimaryButton
              onClick={() =>
                handleSubmit()
              }
              disabled={isPending}
            >
              {isEditing
                ? (update.isPending ? "Saving..." : "Save changes")
                : (create.isPending ? "Adding..." : "Add contestant")}
            </AdminUI.PrimaryButton>
            {isEditing && (
              <AdminUI.SecondaryButton onClick={resetForm} disabled={isPending}>
                Cancel
              </AdminUI.SecondaryButton>
            )}
            {(create.isError || update.isError) && <AdminUI.ErrorMsg />}
          </div>
        </AdminUI.Card>
        </div>
        <AdminUI.Card title="All Contestants">
          <div className="admin-scroll-list" data-testid="contestant-list">
            {isLoading && <AdminUI.EmptyState message="Loading..." />}
            {!isLoading && contestants.length === 0 && (
              <AdminUI.EmptyState message="No contestants yet. Add one!" />
            )}
            {contestants.map((c) => {
              return (
                <AdminUI.ListItem
                  key={c.id}
                  left={
                    <>
                      <AdminUI.Avatar name={c.name} photoUrl={c.photoUrl} />
                      <AdminUI.ItemInfo
                        name={c.name}
                        meta={`Season ${currSeason?.seasonNumber ?? "?"}${c.age ? ` · Age ${c.age}` : ""}`}
                      />
                    </>
                  }
                  right={
                    <>
                      <AdminUI.Badge
                        label={
                          c.status === "ELIMINATED" ? "Eliminated" : "Active"
                        }
                        variant={c.status === "ELIMINATED" ? "red" : "green"}
                      />
                      <AdminUI.SecondaryButton onClick={() => startEditing(c)}>
                        Edit
                      </AdminUI.SecondaryButton>
                      <AdminUI.DangerButton onClick={() => remove.mutate(c.id)} />
                    </>
                  }
                />
              );
            })}
          </div>
        </AdminUI.Card>
      </AdminUI.TwoCol>
    </div>
  );
};

export default AdminContestants;
