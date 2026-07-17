import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addSeason, changeCurrentSeason, deleteSeason, updateSeasonPremiereDate } from "../../../utils/util";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { RankingModes, type Season } from "../../../utils/Constants";
import * as AdminUI from "../../../utils/AdminComponents";
import ShowSelect from "../../ShowSelect/ShowSelect";
import { showsQueryKey, useSeasons, useShows } from "../../../hooks/queries";
import { dayKeyToEasternMidnightMs } from "../../../utils/episodeRankability";
import { slugifyShowName } from "../../../utils/slug";

// Premiere date is stored/edited as a plain "YYYY-MM-DD" date-input value but
// persisted as an Eastern-midnight ISO timestamp — not UTC midnight — so it
// compares cleanly against getTodayDayKey's Eastern calendar-day convention
// (see episodeRankability.ts). Eastern is always behind UTC, so the UTC date
// portion of that timestamp still matches the picked date, which is why
// isoToDateInput can stay a simple slice.
const dateInputToIso = (value: string): string => new Date(dayKeyToEasternMidnightMs(value)).toISOString();
const isoToDateInput = (value?: string | null): string => value ? value.slice(0, 10) : '';

interface AdminSeasonsProps {
  showId?: string;
}

const AdminSeasons = ({ showId }: AdminSeasonsProps) => {

  const navigate = useNavigate();
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Season> & { premiereDateInput?: string }>({})
  const { data: shows = [] } = useShows()
  const currShow = shows.find(s => s.id === showId);
  const { data: seasons = [], isLoading } = useSeasons(showId)
  const create = useMutation({
    mutationFn: addSeason,
    onSuccess: () => { qc.invalidateQueries({ queryKey: showsQueryKey() }); setForm({}) }
  })
  const remove = useMutation({
    mutationFn: async (seasonId: string) => {
      await deleteSeason(seasonId);
      // The backend doesn't automatically move a show off a season that
      // just got deleted — if it was the current one, point the show at
      // whichever remaining season has the highest number (mirrors the
      // old deleteSeasonAndCleanup Redux thunk's fallback logic).
      const removedSeason = seasons.find(s => s.id === seasonId);
      if (currShow && removedSeason && removedSeason.seasonNumber === currShow.currSeason) {
        const nextSeason: Season | null = seasons
          .filter(s => s.id !== seasonId)
          .reduce((max: Season | null, s: Season) => (!max || s.seasonNumber > max.seasonNumber ? s : max), null);
        if (nextSeason) {
          await changeCurrentSeason(currShow.id, nextSeason.id);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showsQueryKey() });
    }
  });
  const updatePremiereDate = useMutation({
    mutationFn: ({ seasonId, premiereDate }: { seasonId: string; premiereDate: string | null }) => updateSeasonPremiereDate(seasonId, premiereDate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: showsQueryKey() });
    }
  });

  return (
    <div>
      <AdminUI.PageHeader title="Seasons" subtitle="Attach seasons to existing shows" />
      <ShowSelect
        shows={shows}
        currShowId={showId}
        onSelectShow={(id) => {
          const show = shows.find(s => s.id === id);
          if (show) navigate(`/admin/${slugifyShowName(show.name)}`);
        }}
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
