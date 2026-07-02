import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addShow, deleteShow, getShows } from "../../utils/util";
import { useState } from "react";
import type { Show } from "../../utils/Constants";
import * as AdminUI from "../../utils/AdminComponents";
import UploadImage from "../UploadImage";
import { useAppDispatch } from "../../redux/hooks";
import { deleteShowAndCleanup } from "../../redux/thunks/showsThunks";
import { upsertShow } from "../../redux/slices/showsSlice";

const AdminShows = () => {
    const dispatch = useAppDispatch();
    const qc = useQueryClient()
    const [form, setForm] = useState<Partial<Show>>({ currSeason: 1 })
    const { data: shows = [], isLoading } = useQuery({ queryKey: ['shows'], queryFn: getShows })
    const create = useMutation({ mutationFn: addShow, onSuccess: (show) => { dispatch(upsertShow(show)); qc.invalidateQueries({ queryKey: ['shows'] }); setForm({ currSeason: 1 }) } })
    const remove = useMutation({
        mutationFn: async (showId: string) => {
            await deleteShow(showId);
            return dispatch(deleteShowAndCleanup(showId)).unwrap();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['shows'] });
        }
    })

    return (
        <div>
        <AdminUI.PageHeader title="Shows" subtitle="Manage reality TV shows" />
        <div className="mb-6 grid grid-cols-3 gap-3">
            <AdminUI.StatCard label="Total shows" value={shows.length} />
            <AdminUI.StatCard label="Networks" value={new Set(shows.map(s => s.network)).size} />
            <AdminUI.StatCard label="Seasons tracked" value={shows.reduce((a, s) => a + (s.seasons?.length ?? 0), 0)} />
        </div>
        <AdminUI.TwoCol>
            <AdminUI.Card title="Add new show">
            <div className="flex flex-col gap-3">
                <AdminUI.FormGroup label="Show name"><AdminUI.Input placeholder="e.g. Survivor" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></AdminUI.FormGroup>
                <AdminUI.FormGroup label="Network"><AdminUI.Input placeholder="e.g. CBS" value={form.network || ''} onChange={e => setForm(f => ({ ...f, network: e.target.value }))} /></AdminUI.FormGroup>
                <AdminUI.FormGroup label="Current season #"><AdminUI.Input type="number" placeholder="47" min={1} value={form.currSeason || ''} onChange={e => setForm(f => ({ ...f, currSeason: parseInt(e.target.value) || 1 }))} /></AdminUI.FormGroup>
                <AdminUI.PrimaryButton onClick={() => form.name?.trim() && create.mutate(form)} disabled={create.isPending}>{create.isPending ? 'Adding...' : 'Add show'}</AdminUI.PrimaryButton>
                {create.isError && <AdminUI.ErrorMsg />}
            </div>
            </AdminUI.Card>
            <AdminUI.Card title="All shows">
            {isLoading && <AdminUI.EmptyState message="Loading..." />}
            {!isLoading && shows.length === 0 && <AdminUI.EmptyState message="No shows yet. Add one!" />}
            {shows.map(show => (
                <AdminUI.ListItem key={show.id}
                left={<><AdminUI.Avatar name={show.name} rounded /><AdminUI.ItemInfo name={show.name} meta={`${show.network} · Season ${show.currSeason}`} /></>}
                right={<><AdminUI.Badge label="Active" variant="green" /><AdminUI.DangerButton onClick={() => remove.mutate(show.id)} /></>}
                />
            ))}
            </AdminUI.Card>
        </AdminUI.TwoCol>
        </div>
    )
};

export default AdminShows;