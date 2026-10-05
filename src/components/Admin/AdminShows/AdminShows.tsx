import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addShow, deleteShow, updateShowRankingMode } from "../../../utils/util";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RankingModes, type Show } from "../../../utils/Constants";
import * as AdminUI from "../../../utils/AdminComponents";
import { showsQueryKey, useShows } from "../../../hooks/queries";
import { slugifyShowName } from "../../../utils/slug";

interface AdminShowsProps {
    showId?: string;
}

const EMPTY_FORM: Partial<Show> = { currSeason: 1, rankingMode: RankingModes.EPISODE };

const AdminShows = ({ showId }: AdminShowsProps) => {
    const navigate = useNavigate();
    const qc = useQueryClient()
    const [form, setForm] = useState<Partial<Show>>(EMPTY_FORM)
    const [adding, setAdding] = useState(false)
    const { data: shows = [] } = useShows()
    const currShow = shows.find(s => s.id === showId);

    const selectShow = (id: string) => {
        const show = shows.find(s => s.id === id);
        navigate(show ? `/admin/${slugifyShowName(show.name)}` : '/admin');
    };

    const closeAdd = () => { setAdding(false); setForm(EMPTY_FORM); };

    // addShow also creates the show's first season, so navigating to the new
    // show's slug lands straight on an editable season.
    const create = useMutation({
        mutationFn: addShow,
        onSuccess: (_data, variables) => {
            qc.invalidateQueries({ queryKey: showsQueryKey() });
            closeAdd();
            if (variables.name) navigate(`/admin/${slugifyShowName(variables.name)}`);
        }
    })
    const remove = useMutation({
        mutationFn: async (showId: string) => {
            await deleteShow(showId);
            return showId;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: showsQueryKey() });
            navigate('/admin');
        }
    })
    const updateMode = useMutation({
        mutationFn: ({ showId, rankingMode }: { showId: string; rankingMode: string }) => updateShowRankingMode(showId, rankingMode),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: showsQueryKey() });
        }
    })

    return (
        <div className="admin-picker-row">
            <div className="admin-picker-field">
                <span className="admin-picker-label">Show</span>
                <AdminUI.Select aria-label="Show" value={showId ?? ''} onChange={e => selectShow(e.target.value)}>
                    <option value="">Select a show...</option>
                    {shows.map(show => <option key={show.id} value={show.id}>{show.name}</option>)}
                </AdminUI.Select>
                <AdminUI.SecondaryButton onClick={() => setAdding(true)}>+ New show</AdminUI.SecondaryButton>
            </div>
            {currShow && (
                <div className="admin-picker-actions">
                    <span className="text-xs text-[#888]">{currShow.network ? `${currShow.network} · ` : ''}{currShow.rankingMode === RankingModes.DAILY ? 'Daily' : 'By episode'}</span>
                    <AdminUI.Toggle
                        checked={currShow.rankingMode === RankingModes.DAILY}
                        onChange={checked => updateMode.mutate({ showId: currShow.id, rankingMode: checked ? RankingModes.DAILY : RankingModes.EPISODE })}
                        title={currShow.rankingMode === RankingModes.DAILY ? 'Daily' : 'By episode'}
                    />
                    <AdminUI.DangerButton onClick={() => { if (window.confirm(`Delete ${currShow.name}?`)) remove.mutate(currShow.id) }} />
                </div>
            )}
            {adding && (
                <AdminUI.Modal title="Add new show" onClose={closeAdd}>
                    <div className="flex flex-col gap-3">
                        <AdminUI.FormGroup label="Show name"><AdminUI.Input placeholder="e.g. Survivor" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></AdminUI.FormGroup>
                        <AdminUI.FormGroup label="Network"><AdminUI.Input placeholder="e.g. CBS" value={form.network || ''} onChange={e => setForm(f => ({ ...f, network: e.target.value }))} /></AdminUI.FormGroup>
                        <AdminUI.FormGroup label="Current season #"><AdminUI.Input type="number" placeholder="47" min={1} value={form.currSeason || ''} onChange={e => setForm(f => ({ ...f, currSeason: parseInt(e.target.value) || 1 }))} /></AdminUI.FormGroup>
                        <AdminUI.FormGroup label="Ranking mode">
                            <div className="flex items-center gap-2">
                                <AdminUI.Toggle
                                    checked={form.rankingMode === RankingModes.DAILY}
                                    onChange={checked => setForm(f => ({ ...f, rankingMode: checked ? RankingModes.DAILY : RankingModes.EPISODE }))}
                                    title={form.rankingMode === RankingModes.DAILY ? 'Daily' : 'By episode'}
                                />
                                <span className="text-sm text-[#333]">{form.rankingMode === RankingModes.DAILY ? 'Daily' : 'By episode'}</span>
                            </div>
                        </AdminUI.FormGroup>
                        <AdminUI.PrimaryButton onClick={() => form.name?.trim() && create.mutate(form)} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add show'}</AdminUI.PrimaryButton>
                        {create.isError && <AdminUI.ErrorMsg />}
                    </div>
                </AdminUI.Modal>
            )}
        </div>
    )
};

export default AdminShows;
