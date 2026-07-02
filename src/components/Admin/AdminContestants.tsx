import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import type { Contestant, Season, Show } from "../../utils/Constants";
import {
  addContestant,
  deleteContestant,
  getContestantsBySeason,
  getContestantsByShow,
  getSeasons,
} from "../../utils/util";
import * as AdminUI from "../../utils/AdminComponents";
import ShowSelect from "../ShowSelect/ShowSelect";
import AvatarEditor from "react-avatar-editor";
import { useAppSelector } from "../../redux/hooks";

const AdminContestants = () => {
  const qc = useQueryClient();
  const [contestant, setContestant] = useState<Partial<Contestant>>({});
  const [photoLabel, setPhotoLabel] = useState("Click to upload headshot");
  const currShow = useAppSelector(state => state.shows?.currShow);
  const [currSeason, setCurrSeason] = useState<Season>();
  const [image, setImage] = useState<File | null>(null);
  const [scale, setScale] = useState(1.2);
  const editorRef = useRef(null);


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
      setContestant({});
      setPhotoLabel("Click to upload headshot");
    },
  });
  const remove = useMutation({
    mutationFn: deleteContestant,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contestants"] }),
  });

  const uploadAction = async (image: File, showName: string, seasonNumber: number) => {
    const fd = new FormData();
    // Field order matters: multer's destination() callback reads these from
    // req.body, which is only populated for fields parsed before the file.
    fd.append("showName", showName);
    fd.append("seasonNumber", String(seasonNumber));
    fd.append("category", "contestants");
    fd.append("image", image);

    const res = await fetch("/api/images/upload", { method: "POST", body: fd });
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
              <label
                style={{
                  border: "1.5px dashed var(--color-border-secondary,#ccc)",
                  borderRadius: 8,
                  padding: "1.25rem",
                  textAlign: "center",
                  cursor: "pointer",
                  display: "block",
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
                </p>
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setImage(f);
                    }
                  }}
                /></> : <div>
                    <AvatarEditor
                        ref={editorRef}
                        image={image}
                        width={200} height={200}
                        border={50} borderRadius={125} // Circular mask
                        scale={scale}
                      />
                      <input type="range" min="1" max="3" step="0.01" 
        value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-100"/>
                  </div>}
              </label>
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
        <AdminUI.Card title="All contestants">
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
                    <AdminUI.DangerButton onClick={() => remove.mutate(c.id)} />
                  </>
                }
              />
            );
          })}
        </AdminUI.Card>
      </AdminUI.TwoCol>}
    </div>
  );
};

export default AdminContestants;
