import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addSeason, deleteSeason, getSeasons, getShows, updateSeasonPremiereDate } from "../../utils/util";
import { useState } from "react";
import { RankingModes, type Season } from "../../utils/Constants";
import * as AdminUI from "../../utils/AdminComponents";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { deleteSeasonAndCleanup } from "../../redux/thunks/showsThunks";
import { upsertSeason } from "../../redux/slices/seasonsSlice";
import { selectCurrShow } from "../../redux/selectors";
import { dayKeyToEasternMidnightMs } from "../../utils/episodeRankability";

// Premiere date is stored/edited as a plain "YYYY-MM-DD" date-input value but
// persisted as an Eastern-midnight ISO timestamp — not UTC midnight — so it
// compares cleanly against getTodayDayKey's Eastern calendar-day convention
// (see episodeRankability.ts). Eastern is always behind UTC, so the UTC date
// portion of that timestamp still matches the picked date, which is why
// isoToDateInput can stay a simple slice.
const dateInputToIso = (value: string): string => new Date(dayKeyToEasternMidnightMs(value)).toISOString();
const isoToDateInput = (value?: string | null): string => value ? value.slice(0, 10) : '';

const AdminSeasons = () => {

  const dispatch = useAppDispatch();
  const currShow = useAppSelector(selectCurrShow);

  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Season> & { premiereDateInput?: string }>({})
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
  const updatePremiereDate = useMutation({
    mutationFn: ({ seasonId, premiereDate }: { seasonId: string; premiereDate: string | null }) => updateSeasonPremiereDate(seasonId, premiereDate),
    onSuccess: (season) => {
      dispatch(upsertSeason(season));
      qc.invalidateQueries({ queryKey: ['seasons'] });
    }
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
            {currShow?.rankingMode === RankingModes.DAILY && (
              <AdminUI.FormGroup label="Premiere date"><AdminUI.Input type="date" value={form.premiereDateInput || ''} onChange={e => setForm(f => ({ ...f, premiereDateInput: e.target.value }))} /></AdminUI.FormGroup>
            )}
            <AdminUI.PrimaryButton onClick={() => currShow?.id && form.seasonNumber && create.mutate({ ...form, showId: currShow.id, premiereDate: form.premiereDateInput ? dateInputToIso(form.premiereDateInput) : undefined })} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add season'}</AdminUI.PrimaryButton>
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
                right={<>
                  <AdminUI.Badge label={isActive ? 'Airing' : 'Complete'} variant={isActive ? 'purple' : 'green'} />
                  {show?.rankingMode === RankingModes.DAILY && (
                    <AdminUI.Input
                      type="date"
                      value={isoToDateInput(season.premiereDate)}
                      onChange={e => updatePremiereDate.mutate({ seasonId: season.id, premiereDate: e.target.value ? dateInputToIso(e.target.value) : null })}
                      style={{ width: 'auto' }}
                    />
                  )}
                  <AdminUI.DangerButton onClick={() => remove.mutate(season.id)} />
                </>}
              />
            )
          })}
        </AdminUI.Card>
      </AdminUI.TwoCol>}
    </div>
  )
}

export default AdminSeasons;
