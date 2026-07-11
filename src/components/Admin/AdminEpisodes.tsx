import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addEpisode, deleteEpisode } from "../../utils/util";
import { RankingModes, type Episode } from "../../utils/Constants";
import * as AdminUI from "../../utils/AdminComponents";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useNavigate } from "react-router-dom";
import { showsQueryKey, useEpisodesByShow, useSeasons, useShows } from "../../hooks/queries";
import { slugifyShowName } from "../../utils/slug";

interface AdminEpisodesProps {
    showId?: string;
}

const AdminEpisodes = ({ showId }: AdminEpisodesProps) => {
    const navigate = useNavigate();
    const { data: shows = [] } = useShows();
    const currShow = shows.find(s => s.id === showId);
    const qc = useQueryClient()
    const [episode, setEpisode] = useState<Partial<Episode>>({})
    const [airTime, setAirTime] = useState("20:00");
    const { data: seasons = [] } = useSeasons(showId)
    const { data: episodes = [], isLoading } = useEpisodesByShow(showId)
    const create = useMutation({ mutationFn: (newEpisode: Partial<Episode>) => addEpisode(newEpisode), onSuccess: () => { qc.invalidateQueries({ queryKey: showsQueryKey() }); setEpisode({}); setAirTime("20:00"); } })
    const remove = useMutation({ mutationFn: (episodeId: string) => deleteEpisode(episodeId), onSuccess: () => qc.invalidateQueries({ queryKey: showsQueryKey() }) })

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'

    const handleCreate = () => {
        if (!episode.seasonId || !episode.airDate) return;
        const isoAirDate = new Date(`${episode.airDate}T${airTime}:00`).toISOString();
        create.mutate({ ...episode, airDate: isoAirDate });
    }

    return (
        <div>
        <AdminUI.PageHeader title="Episodes" subtitle="Log episodes for each season" />
        <ShowSelect
        shows={shows}
        currShowId={showId}
        onSelectShow={(id) => {
          const show = shows.find(s => s.id === id);
          if (show) navigate(`/admin/${slugifyShowName(show.name)}`);
        }}
      />
        {currShow &&<AdminUI.TwoCol>
            {currShow.rankingMode === RankingModes.DAILY ? (
                <AdminUI.Card title="Add episode">
                    <p className="text-sm text-[#888]">Episodes are created automatically each day for daily-ranking shows. Set the season's premiere date in Admin → Seasons to control when they start.</p>
                </AdminUI.Card>
            ) : (
            <AdminUI.Card title="Add episode">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AdminUI.FormGroup label="Season">
                    <AdminUI.Select value={episode.seasonId || ''} onChange={e => setEpisode(w => ({ ...w, seasonId: e.target.value }))}>
                        <option value="">Select a season...</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>Season {s.seasonNumber}</option>)}
                    </AdminUI.Select>
                </AdminUI.FormGroup>
                <AdminUI.FormGroup label="Air date"><AdminUI.Input type="date" value={episode.airDate || ''} onChange={e => setEpisode(w => ({ ...w, airDate: e.target.value }))} /></AdminUI.FormGroup>
                <AdminUI.FormGroup label="Air time"><AdminUI.Input type="time" value={airTime} onChange={e => setAirTime(e.target.value)} /></AdminUI.FormGroup>
                <AdminUI.PrimaryButton onClick={handleCreate} disabled={create.isPending || !episode.seasonId || !episode.airDate}>{create.isPending ? 'Adding...' : 'Add episode'}</AdminUI.PrimaryButton>
                {create.isError && <AdminUI.ErrorMsg />}
            </div>
            </AdminUI.Card>
            )}
            <AdminUI.Card title="All episodes">
            {isLoading && <AdminUI.EmptyState message="Loading..." />}
            {!isLoading && episodes.length === 0 && <AdminUI.EmptyState message="No episodes yet. Add one!" />}
            {episodes.map(ep => {
                const season = seasons.find(s => s.id === ep.seasonId)
                return (
                <AdminUI.ListItem key={ep.id}
                    left={<><AdminUI.Avatar name={`E${ep.episodeNumber}`} rounded /><AdminUI.ItemInfo name={`Episode ${ep.episodeNumber}`} meta={`Season ${season?.seasonNumber || '?'} · ${formatDate(ep.airDate)}`} /></>}

                    right={<AdminUI.DangerButton onClick={() => remove.mutate(ep.id)} />}
                />
                )
            })}
            </AdminUI.Card>
        </AdminUI.TwoCol>}
        </div>
    )
};

export default AdminEpisodes;
