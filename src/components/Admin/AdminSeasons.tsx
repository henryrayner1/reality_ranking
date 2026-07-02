import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addSeason, deleteSeason, getSeasons, getShows } from "../../utils/util";
import { useState } from "react";
import type { Season } from "../../utils/Constants";
import * as AdminUI from "../../utils/AdminComponents";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { deleteSeasonAndCleanup } from "../../redux/thunks/showsThunks";
import { upsertSeason } from "../../redux/slices/seasonsSlice";
import { selectCurrShow } from "../../redux/selectors";

const AdminSeasons = () => {

  const dispatch = useAppDispatch();
  const currShow = useAppSelector(selectCurrShow);

  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Season>>({})
  const { data: shows = [] } = useQuery({ queryKey: ['shows'], queryFn: getShows })
  const { data: seasons = [], isLoading } = useQuery({ queryKey: ['seasons', currShow], queryFn: () => getSeasons(currShow.id) })
  const create = useMutation({ mutationFn: addSeason, onSuccess: (season) => { dispatch(upsertSeason(season)); qc.invalidateQueries({ queryKey: ['seasons'] }); setForm({}) } })
  const remove = useMutation({
    mutationFn: async (seasonId: string) => {
      await deleteSeason(seasonId);
      return dispatch(deleteSeasonAndCleanup(seasonId)).unwrap();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seasons'] })
  });

  return (
    <div>
      <AdminUI.PageHeader title="Seasons" subtitle="Attach seasons to existing shows" />
      <ShowSelect
        currShow={currShow}
        currSeason={currShow?.currSeason}
      />
      {currShow && <AdminUI.TwoCol>
        <AdminUI.Card title="Add new season">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AdminUI.FormGroup label="Season number"><AdminUI.Input type="number" placeholder="47" min={1} value={form.seasonNumber || ''} onChange={e => setForm(f => ({ ...f, seasonNumber: parseInt(e.target.value) }))} /></AdminUI.FormGroup>
            <AdminUI.PrimaryButton onClick={() => currShow?.id && form.seasonNumber && create.mutate({ ...form, showId: currShow.id })} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add season'}</AdminUI.PrimaryButton>
            {create.isError && <AdminUI.ErrorMsg />}
          </div>
        </AdminUI.Card>
        <AdminUI.Card title="All seasons">
          {isLoading && <AdminUI.EmptyState message="Loading..." />}
          {!isLoading && seasons.length === 0 && <AdminUI.EmptyState message="No seasons yet. Add one!" />}
          {seasons.map(season => {
            const show = shows.find(s => s.id === season.showId)
            const isActive = season.isCurrent
            return (
              <AdminUI.ListItem key={season.id}
                left={<><AdminUI.Avatar name={String(season.seasonNumber)} rounded /><AdminUI.ItemInfo name={`${show?.name || '?'} S${season.seasonNumber}`} meta="" /></>}
                right={<><AdminUI.Badge label={isActive ? 'Airing' : 'Complete'} variant={isActive ? 'purple' : 'green'} /><AdminUI.DangerButton onClick={() => remove.mutate(season.id)} /></>}
              />
            )
          })}
        </AdminUI.Card>
      </AdminUI.TwoCol>}
    </div>
  )
}

export default AdminSeasons;
