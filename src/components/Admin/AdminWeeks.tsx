import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { addWeek, deleteWeek, getSeasons, getWeeksByShow } from "../../utils/util";
import type { Show, Week } from "../../utils/Constants";
import * as AdminUI from "../../utils/AdminComponents";
import { Card } from "../../utils/AdminComponents";
import ShowSelect from "../ShowSelect/ShowSelect";
import { useAppSelector } from "../../redux/hooks";

const AdminWeeks = () => {
    const currShow = useAppSelector(state => state.shows.currShow);
    const qc = useQueryClient()
    const [week, setWeek] = useState<Partial<Week>>({})
    const [airTime, setAirTime] = useState("20:00");
    const { data: seasons = [] } = useQuery({ queryKey: ['seasons', currShow?.id], queryFn: () => getSeasons(currShow?.id), enabled: !!currShow?.id })
    const { data: episodes = [], isLoading } = useQuery({ queryKey: ['episodes', currShow?.id], queryFn: () => getWeeksByShow(currShow.id), enabled: !!currShow?.id })
    const create = useMutation({ mutationFn: (newWeek: Partial<Week>) => addWeek(newWeek), onSuccess: () => { qc.invalidateQueries({ queryKey: ['episodes', currShow?.id] }); setWeek({}); setAirTime("20:00"); } })
    const remove = useMutation({ mutationFn: (weekId: string) => deleteWeek(weekId), onSuccess: () => qc.invalidateQueries({ queryKey: ['episodes', currShow?.id] }) })

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'

    const handleCreate = () => {
        if (!week.seasonId || !week.airDate) return;
        const isoAirDate = new Date(`${week.airDate}T${airTime}:00`).toISOString();
        create.mutate({ ...week, airDate: isoAirDate });
    }

    return (
        <div>
        <AdminUI.PageHeader title="Episodes" subtitle="Log episodes for each season" />
        <ShowSelect 
        currShow={currShow} 
        currSeason={currShow?.currSeason} 
      />
        {currShow &&<AdminUI.TwoCol>
            <AdminUI.Card title="Add episode">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AdminUI.FormGroup label="Season">
                    <AdminUI.Select value={week.seasonId || ''} onChange={e => setWeek(w => ({ ...w, seasonId: e.target.value }))}>
                        <option value="">Select a season...</option>
                        {seasons.map(s => <option key={s.id} value={s.id}>Season {s.seasonNumber}</option>)}
                    </AdminUI.Select>
                </AdminUI.FormGroup>
                <AdminUI.FormGroup label="Air date"><AdminUI.Input type="date" value={week.airDate || ''} onChange={e => setWeek(w => ({ ...w, airDate: e.target.value }))} /></AdminUI.FormGroup>
                <AdminUI.FormGroup label="Air time"><AdminUI.Input type="time" value={airTime} onChange={e => setAirTime(e.target.value)} /></AdminUI.FormGroup>
                <AdminUI.PrimaryButton onClick={handleCreate} disabled={create.isPending || !week.seasonId || !week.airDate}>{create.isPending ? 'Adding...' : 'Add episode'}</AdminUI.PrimaryButton>
                {create.isError && <AdminUI.ErrorMsg />}
            </div>
            </AdminUI.Card>
            <AdminUI.Card title="All episodes">
            {isLoading && <AdminUI.EmptyState message="Loading..." />}
            {!isLoading && episodes.length === 0 && <AdminUI.EmptyState message="No episodes yet. Add one!" />}
            {episodes.map(ep => {
                const season = seasons.find(s => s.id === ep.seasonId)
                return (
                <AdminUI.ListItem key={ep.id}
                    left={<><AdminUI.Avatar name={`E${ep.weekNumber}`} rounded /><AdminUI.ItemInfo name={`Week ${ep.weekNumber}`} meta={`Season ${season?.seasonNumber || '?'} · ${formatDate(ep.airDate)}`} /></>}

                    right={<AdminUI.DangerButton onClick={() => remove.mutate(ep.id)} />}
                />
                )
            })}
            </AdminUI.Card>
        </AdminUI.TwoCol>}
        </div>
    )
};

export default AdminWeeks;