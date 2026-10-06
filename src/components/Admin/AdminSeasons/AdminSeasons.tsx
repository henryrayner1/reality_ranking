import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addSeason, changeCurrentSeason, deleteSeason, updateSeasonEndDate, updateSeasonPremiereDate } from "../../../utils/util";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { RankingModes, type Season } from "../../../utils/Constants";
import * as AdminUI from "../../../utils/AdminComponents";
import { showsQueryKey, useSeasons, useShows } from "../../../hooks/queries";
import { dayKeyToEasternMidnightMs, isSeasonEnded } from "../../../utils/episodeRankability";
import { slugifyShowName } from "../../../utils/slug";

// Premiere date is stored/edited as a plain "YYYY-MM-DD" date-input value but
// persisted as an Eastern-midnight ISO timestamp — not UTC midnight — so it
// compares cleanly against getTodayDayKey's Eastern calendar-day convention
// (see episodeRankability.ts). Eastern is always behind UTC, so the UTC date
// portion of that timestamp still matches the picked date, which is why
// isoToDateInput can stay a simple slice.
const dateInputToIso = (value: string): string => new Date(dayKeyToEasternMidnightMs(value)).toISOString();
const isoToDateInput = (value?: string | null): string => value ? value.slice(0, 10) : '';

// End date + time is entered in the admin's local time zone (same convention
// as AdminEpisodes' air date/time inputs) via a datetime-local input, whose
// value is a zone-less "YYYY-MM-DDTHH:mm" string — stored as a real ISO
// instant.
const isoToDateTimeLocal = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const formatEndDate = (value: string): string =>
  new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

interface AdminSeasonsProps {
  showId: string;
  seasonId?: string;
}

const AdminSeasons = ({ showId, seasonId }: AdminSeasonsProps) => {

  const navigate = useNavigate();
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Season> & { premiereDateInput?: string }>({})
  const [adding, setAdding] = useState(false)
  const { data: shows = [] } = useShows()
  const currShow = shows.find(s => s.id === showId);
  const { data: seasons = [] } = useSeasons(showId)
  const currSeason = seasons.find(s => s.id === seasonId);
  const sortedSeasons = [...seasons].sort((a, b) => a.seasonNumber - b.seasonNumber);
  const showPath = currShow ? `/admin/${slugifyShowName(currShow.name)}` : '/admin';

  const closeAdd = () => { setAdding(false); setForm({}); };

  const create = useMutation({
    mutationFn: addSeason,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: showsQueryKey() });
      closeAdd();
      if (variables.seasonNumber) navigate(`${showPath}/${variables.seasonNumber}`);
    }
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
      // Drop the season number from the URL so the page falls back to the
      // show's (possibly just-repointed) current season.
      navigate(showPath);
    }
  });
  // Held locally and saved explicitly (not on every change) — a
  // datetime-local input fires onChange while the admin is still typing.
  const [endInput, setEndInput] = useState(isoToDateTimeLocal(currSeason?.endDate));
  useEffect(() => {
    setEndInput(isoToDateTimeLocal(currSeason?.endDate));
  }, [currSeason?.id, currSeason?.endDate]);
  const updateEndDate = useMutation({
    mutationFn: ({ seasonId, endDate }: { seasonId: string; endDate: string | null }) => updateSeasonEndDate(seasonId, endDate),
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

  const isDaily = currShow?.rankingMode === RankingModes.DAILY;

  return (
    <div className="admin-picker-row">
      <div className="admin-picker-field">
        <span className="admin-picker-label">Season</span>
        <AdminUI.Select
          aria-label="Season"
          value={seasonId ?? ''}
          onChange={e => {
            const season = seasons.find(s => s.id === e.target.value);
            if (season) navigate(`${showPath}/${season.seasonNumber}`);
          }}
        >
          {!currSeason && <option value="">Select a season...</option>}
          {sortedSeasons.map(s => <option key={s.id} value={s.id}>Season {s.seasonNumber}{isSeasonEnded(s) ? ' (ended)' : s.isCurrent ? ' (airing)' : ''}</option>)}
        </AdminUI.Select>
        <AdminUI.SecondaryButton onClick={() => setAdding(true)}>+ New season</AdminUI.SecondaryButton>
      </div>
      {currSeason && (
        <div className="admin-picker-actions">
          {isSeasonEnded(currSeason)
            ? <AdminUI.Badge label="Ended" variant="red" />
            : <AdminUI.Badge label={currSeason.isCurrent ? 'Airing' : 'Complete'} variant={currSeason.isCurrent ? 'purple' : 'green'} />}
          {isDaily && (
            <label className="flex items-center gap-2 text-xs text-[#888]">
              Premiere
              <AdminUI.Input
                type="date"
                value={isoToDateInput(currSeason.premiereDate)}
                onChange={e => updatePremiereDate.mutate({ seasonId: currSeason.id, premiereDate: e.target.value ? dateInputToIso(e.target.value) : null })}
                style={{ width: 'auto' }}
              />
            </label>
          )}
          <AdminUI.DangerButton onClick={() => { if (window.confirm(`Delete season ${currSeason.seasonNumber}?`)) remove.mutate(currSeason.id) }} />
        </div>
      )}
      {currSeason && (
        <div className="admin-picker-row admin-season-end-row">
          <label className="flex items-center gap-2 text-xs text-[#888]">
            Ends
            <AdminUI.Input
              type="datetime-local"
              aria-label="Season end date and time"
              value={endInput}
              onChange={e => setEndInput(e.target.value)}
              style={{ width: 'auto' }}
            />
          </label>
          <AdminUI.SecondaryButton
            onClick={() => endInput && updateEndDate.mutate({ seasonId: currSeason.id, endDate: new Date(endInput).toISOString() })}
            disabled={!endInput || updateEndDate.isPending || endInput === isoToDateTimeLocal(currSeason.endDate)}
          >
            {updateEndDate.isPending ? 'Saving...' : 'Save end'}
          </AdminUI.SecondaryButton>
          {currSeason.endDate && (
            <AdminUI.SecondaryButton
              onClick={() => updateEndDate.mutate({ seasonId: currSeason.id, endDate: null })}
              disabled={updateEndDate.isPending}
            >
              Clear end
            </AdminUI.SecondaryButton>
          )}
          <span className="text-xs text-[#888]">
            {currSeason.endDate
              ? (isSeasonEnded(currSeason)
                ? `Ended ${formatEndDate(currSeason.endDate)} — rankings closed`
                : `Rankings close ${formatEndDate(currSeason.endDate)}`)
              : (isDaily ? 'No end set — a new day opens every day' : 'No end set')}
          </span>
          {updateEndDate.isError && <AdminUI.ErrorMsg />}
        </div>
      )}
      {adding && (
        <AdminUI.Modal title="Add new season" onClose={closeAdd}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AdminUI.FormGroup label="Season number"><AdminUI.Input type="number" placeholder="47" min={1} value={form.seasonNumber || ''} onChange={e => setForm(f => ({ ...f, seasonNumber: parseInt(e.target.value) }))} /></AdminUI.FormGroup>
            {isDaily && (
              <AdminUI.FormGroup label="Premiere date"><AdminUI.Input type="date" value={form.premiereDateInput || ''} onChange={e => setForm(f => ({ ...f, premiereDateInput: e.target.value }))} /></AdminUI.FormGroup>
            )}
            <AdminUI.PrimaryButton onClick={() => form.seasonNumber && create.mutate({ ...form, showId, premiereDate: form.premiereDateInput ? dateInputToIso(form.premiereDateInput) : undefined })} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add season'}</AdminUI.PrimaryButton>
            {create.isError && <AdminUI.ErrorMsg />}
          </div>
        </AdminUI.Modal>
      )}
    </div>
  )
}

export default AdminSeasons;
