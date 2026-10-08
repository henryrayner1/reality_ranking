import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addShow, deleteShow, updateShowRankingMode } from "../../../utils/util";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RankingModes, type RankingMode, type Show } from "../../../utils/Constants";
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
    // A ranking-mode choice that hasn't been confirmed yet. Keyed by show and
    // discarded (during render, not in an effect, so the other show's choice
    // never flashes) as soon as a different show is selected.
    const [pendingMode, setPendingMode] = useState<{ showId: string; rankingMode: RankingMode } | null>(null);
    if (pendingMode && pendingMode.showId !== showId) setPendingMode(null);
    const selectedMode = pendingMode && pendingMode.showId === currShow?.id ? pendingMode.rankingMode : currShow?.rankingMode;
    const modeChanged = !!currShow && selectedMode !== currShow.rankingMode;

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
        mutationFn: ({ showId, rankingMode }: { showId: string; rankingMode: RankingMode }) => updateShowRankingMode(showId, rankingMode),
        onSuccess: (_data, { showId, rankingMode }) => {
            // Write the new mode into the cached tree right away: the full
            // GET /api/shows refetch below is slow (it also creates DAILY
            // episode rows first), so waiting on it alone left the old mode
            // showing for seconds after the save had already succeeded.
            qc.setQueryData<Show[]>(showsQueryKey(), old => old?.map(s => s.id === showId ? { ...s, rankingMode } : s));
            setPendingMode(null);
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
                    {currShow.network && <span className="text-xs text-[#888]">{currShow.network}</span>}
                    {/* Radios + an explicit Confirm rather than an instant toggle:
                        switching to Daily makes the server auto-create a "Day N"
                        episode per day (not undone by switching back), so a
                        stray click shouldn't be able to trigger it. */}
                    <div role="radiogroup" aria-label="Ranking mode" className="flex items-center gap-3 text-[13px] text-[#333]">
                        {[{ value: RankingModes.EPISODE, label: 'By episode' }, { value: RankingModes.DAILY, label: 'Daily' }].map(option => (
                            <label key={option.value} className="flex cursor-pointer items-center gap-1">
                                <input
                                    type="radio"
                                    name={`ranking-mode-${currShow.id}`}
                                    value={option.value}
                                    checked={selectedMode === option.value}
                                    disabled={updateMode.isPending}
                                    onChange={() => { updateMode.reset(); setPendingMode({ showId: currShow.id, rankingMode: option.value }); }}
                                    className="accent-[#7F77DD]"
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                    {modeChanged && selectedMode && (
                        <>
                            <AdminUI.PrimaryButton
                                onClick={() => updateMode.mutate({ showId: currShow.id, rankingMode: selectedMode })}
                                disabled={updateMode.isPending}
                                size="sm"
                            >
                                {updateMode.isPending ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <span aria-hidden="true" className="inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Saving...
                                    </span>
                                ) : 'Confirm'}
                            </AdminUI.PrimaryButton>
                            <AdminUI.SecondaryButton onClick={() => { updateMode.reset(); setPendingMode(null); }} disabled={updateMode.isPending}>Cancel</AdminUI.SecondaryButton>
                            {selectedMode === RankingModes.DAILY && !updateMode.isError && (
                                <span className="text-xs text-[#888]">Creates an episode for each day since the season premiere</span>
                            )}
                            {updateMode.isError && <AdminUI.ErrorMsg />}
                        </>
                    )}
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
