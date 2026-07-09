import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import type { Contestant, Season, Show } from "../../utils/Constants";
import {
  addContestant,
  deleteContestant,
  getContestantsBySeason,
  getContestantsByShow,
  getSeasons,
  updateContestantPhoto,
} from "../../utils/util";
import { backendUrl } from "../../utils/apiBase";
import * as AdminUI from "../../utils/AdminComponents";
import ShowSelect from "../ShowSelect/ShowSelect";
import AvatarEditor from "react-avatar-editor";
import { useAppSelector } from "../../redux/hooks";
import { selectCurrShow } from "../../redux/selectors";

const AdminContestants = () => {
  const qc = useQueryClient();
  const [contestant, setContestant] = useState<Partial<Contestant>>({});
  const [photoLabel, setPhotoLabel] = useState("Click, drag & drop, or paste to upload headshot");
  const currShow = useAppSelector(selectCurrShow);
  const [currSeason, setCurrSeason] = useState<Season>();
  const [image, setImage] = useState<File | null>(null);
  const [scale, setScale] = useState(1.2);
  const [isDragging, setIsDragging] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingContestant, setEditingContestant] = useState<Contestant | null>(null);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editScale, setEditScale] = useState(1.2);
  const editEditorRef = useRef(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  const { data: seasons = [] } = useQuery({
    queryKey: ["seasons", currShow?.id],
    queryFn: () => getSeasons(currShow.id),
    enabled: !!currShow?.id,
  });
  const { data: contestants = [], isLoading } = useQuery({
    queryKey: ["contestants", currShow?.id],
    queryFn: () => getContestantsByShow(currShow.id),
    enabled: !!currShow?.id,
  });
  const create = useMutation({
    mutationFn: addContestant,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contestants"] });
      setContestant((c) => ({ seasonId: c.seasonId }));
      setPhotoLabel("Click, drag & drop, or paste to upload headshot");
    },
  });
  const remove = useMutation({
    mutationFn: deleteContestant,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contestants"] }),
  });
  const updatePhoto = useMutation({
    mutationFn: ({ id, photoUrl }: { id: string; photoUrl: string }) =>
      updateContestantPhoto(id, photoUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contestants"] });
      closeEditPhoto();
    },
  });

  const closeEditPhoto = () => {
    setEditingContestant(null);
    setEditImage(null);
    setEditScale(1.2);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
  };

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
    return data.file as string;
  };

  const handleSubmit = async () => {
    if (contestant.name?.trim() && contestant.seasonId) {
      let photoUrl: string | null = null;
      if (editorRef.current) {
        const canvas = editorRef.current.getImageScaledToCanvas().toDataURL();
        // Convert base64 to blob
        const res = await fetch(canvas);
        const blob = await res.blob();
        const fileName = `${contestant.name.replace(/\s+/g, "_").toLowerCase()}.png`;
        const file = new File([blob], fileName, { type: "image/png" });
        photoUrl = await uploadAction(file, currShow?.name ?? "", currSeason?.seasonNumber ?? 0);
      }
      create.mutate({ ...contestant, photoUrl });
      setImage(null);
    }
  }

  const handleEditPhotoSave = async () => {
    if (!editingContestant || !editEditorRef.current) return;
    const canvas = editEditorRef.current.getImageScaledToCanvas().toDataURL();
    const res = await fetch(canvas);
    const blob = await res.blob();
    const fileName = `${editingContestant.name.replace(/\s+/g, "_").toLowerCase()}.png`;
    const file = new File([blob], fileName, { type: "image/png" });
    const season = seasons.find((s) => s.id === editingContestant.seasonId);
    const photoUrl = await uploadAction(file, currShow?.name ?? "", season?.seasonNumber ?? 0);
    updatePhoto.mutate({ id: editingContestant.id, photoUrl });
  };

  return (
    <div>
      <AdminUI.PageHeader
        title="Contestants"
        subtitle="Add contestants and photos to a season"
      />
      <ShowSelect 
        currShow={currShow} 
        currSeason={currShow?.currSeason} 
      />
     {currShow && <AdminUI.TwoCol>
        <AdminUI.Card title="Add contestant">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <AdminUI.FormGroup label="Season">
              <AdminUI.Select
                value={contestant.seasonId || ""}
                onChange={(e) =>{
                  setContestant((c) => ({ ...c, seasonId: e.target.value }));
                  setCurrSeason(seasons.find(s => s.id === e.target.value));
                }
                }
              >
                <option value="">Select a season...</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.id}>
                    Season {s.seasonNumber}
                  </option>
                ))}s
              </AdminUI.Select>
            </AdminUI.FormGroup>
            <AdminUI.FormGroup label="Full name">
              <AdminUI.Input
                placeholder="e.g. Tiyana Kaloko"
                value={contestant.name || ""}
                onChange={(e) =>
                  setContestant((c) => ({ ...c, name: e.target.value }))
                }
              />
            </AdminUI.FormGroup>
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
                {(image == null) ? <><div style={{ fontSize: 20, marginBottom: 6 }}>↑</div>
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
                      <input type="range" min="1" max="3" step="0.01"
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
              disabled={create.isPending}
            >
              {create.isPending ? "Adding..." : "Add contestant"}
            </AdminUI.PrimaryButton>
            {create.isError && <AdminUI.ErrorMsg />}
          </div>
        </AdminUI.Card>
        <AdminUI.Card title="All Contestants">
          <div style={{ maxHeight: 480, overflowY: "auto" }}>
            {isLoading && <AdminUI.EmptyState message="Loading..." />}
            {!isLoading && contestants.length === 0 && (
              <AdminUI.EmptyState message="No contestants yet. Add one!" />
            )}
            {contestants.map((c) => {
              const season = seasons.find((s) => s.id === c.seasonId);
              return (
                <AdminUI.ListItem
                  key={c.id}
                  left={
                    <>
                      <AdminUI.Avatar name={c.name} photoUrl={c.photoUrl} />
                      <AdminUI.ItemInfo
                        name={c.name}
                        meta={`Season ${season?.seasonNumber || "?"}${c.age ? ` · Age ${c.age}` : ""}`}
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
                      <AdminUI.SecondaryButton
                        onClick={() => {
                          setEditingContestant(c);
                          editFileInputRef.current?.click();
                        }}
                      >
                        Edit photo
                      </AdminUI.SecondaryButton>
                      <AdminUI.DangerButton onClick={() => remove.mutate(c.id)} />
                    </>
                  }
                />
              );
            })}
          </div>
          <input
            ref={editFileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.type.startsWith("image/")) setEditImage(f);
            }}
          />
        </AdminUI.Card>
      </AdminUI.TwoCol>}
      {editingContestant && editImage && (
        <AdminUI.Modal title={`Edit photo — ${editingContestant.name}`} onClose={closeEditPhoto}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <AvatarEditor
              ref={editEditorRef}
              image={editImage}
              width={200} height={200}
              border={50} borderRadius={125}
              scale={editScale}
            />
            <input
              type="range" min="1" max="3" step="0.01"
              value={editScale}
              onChange={(e) => setEditScale(parseFloat(e.target.value))}
              className="w-100"
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <AdminUI.SecondaryButton onClick={closeEditPhoto} disabled={updatePhoto.isPending}>
              Cancel
            </AdminUI.SecondaryButton>
            <AdminUI.PrimaryButton onClick={handleEditPhotoSave} disabled={updatePhoto.isPending}>
              {updatePhoto.isPending ? "Saving..." : "Save photo"}
            </AdminUI.PrimaryButton>
          </div>
          {updatePhoto.isError && <AdminUI.ErrorMsg />}
        </AdminUI.Modal>
      )}
    </div>
  );
};

export default AdminContestants;
