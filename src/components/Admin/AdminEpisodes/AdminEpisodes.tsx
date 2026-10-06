import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addEpisode, deleteEpisode } from "../../../utils/util";
import { RankingModes, type Episode } from "../../../utils/Constants";
import * as AdminUI from "../../../utils/AdminComponents";
import { showsQueryKey, useSeasons, useShows } from "../../../hooks/queries";
import { isSeasonEnded } from "../../../utils/episodeRankability";

interface AdminEpisodesProps {
    showId: string;
    seasonId: string;
}

const AdminEpisodes = ({ showId, seasonId }: AdminEpisodesProps) => {
    const { data: shows = [] } = useShows();
    const currShow = shows.find(s => s.id === showId);
    const qc = useQueryClient()
    const [airDate, setAirDate] = useState("");
    const [airTime, setAirTime] = useState("20:00");
    const { data: seasons = [], isLoading } = useSeasons(showId)
    const currSeason = seasons.find(s => s.id === seasonId);
    const episodes = [...(currSeason?.episodes ?? [])].sort((a, b) => a.episodeNumber - b.episodeNumber);
    const create = useMutation({ mutationFn: (newEpisode: Partial<Episode>) => addEpisode(newEpisode), onSuccess: () => { qc.invalidateQueries({ queryKey: showsQueryKey() }); setAirDate(""); setAirTime("20:00"); } })
    const remove = useMutation({ mutationFn: (episodeId: string) => deleteEpisode(episodeId), onSuccess: () => qc.invalidateQueries({ queryKey: showsQueryKey() }) })

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'

    // Mirrors the server's POST /episodes/create guard: no episodes once the
    // season has ended, or airing after its end date.
    const seasonEnded = isSeasonEnded(currSeason);
    const airsAfterEnd = !!airDate && !!currSeason?.endDate
        && new Date(`${airDate}T${airTime}:00`).getTime() > new Date(currSeason.endDate).getTime();
    const endBlockReason = seasonEnded
        ? 'This season has ended — no new episodes can be added.'
        : airsAfterEnd ? "That air time is after the season's end date." : null;

    const handleCreate = () => {
        if (!airDate || endBlockReason) return;
        const isoAirDate = new Date(`${airDate}T${airTime}:00`).toISOString();
        create.mutate({ seasonId, airDate: isoAirDate });
    }

    return (
        <AdminUI.TwoCol>
            {currShow?.rankingMode === RankingModes.DAILY ? (
                <AdminUI.Card title="Add episode">
                    <p className="text-sm text-[#888]">Episodes are created automatically each day for daily-ranking shows. Set the season's premiere date and end date in the season bar above to control when they start and stop.</p>
                </AdminUI.Card>
            ) : (
            <AdminUI.Card title="Add episode">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AdminUI.FormGroup label="Air date"><AdminUI.Input type="date" value={airDate} onChange={e => setAirDate(e.target.value)} /></AdminUI.FormGroup>
                <AdminUI.FormGroup label="Air time"><AdminUI.Input type="time" value={airTime} onChange={e => setAirTime(e.target.value)} /></AdminUI.FormGroup>
                <AdminUI.PrimaryButton onClick={handleCreate} disabled={create.isPending || !airDate || !!endBlockReason}>{create.isPending ? 'Adding...' : 'Add episode'}</AdminUI.PrimaryButton>
                {endBlockReason && <p className="text-xs text-[#A32D2D]">{endBlockReason}</p>}
                {create.isError && <AdminUI.ErrorMsg />}
            </div>
            </AdminUI.Card>
            )}
            <AdminUI.Card title="All episodes">
            <div className="admin-scroll-list">
            {isLoading && <AdminUI.EmptyState message="Loading..." />}
            {!isLoading && episodes.length === 0 && <AdminUI.EmptyState message="No episodes yet. Add one!" />}
            {episodes.map(ep => (
                <AdminUI.ListItem key={ep.id}
                    left={<><AdminUI.Avatar name={`E${ep.episodeNumber}`} rounded /><AdminUI.ItemInfo name={`Episode ${ep.episodeNumber}`} meta={`Season ${currSeason?.seasonNumber ?? '?'} · ${formatDate(ep.airDate)}`} /></>}
                    right={<AdminUI.DangerButton onClick={() => remove.mutate(ep.id)} />}
                />
            ))}
            </div>
            </AdminUI.Card>
        </AdminUI.TwoCol>
    )
};

export default AdminEpisodes;
