import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { EliminationTypes, type EliminationEntry, type EliminationType, type Season } from "../../utils/Constants"
import { addElimination, deleteElimination, getContestantsBySeason, getCurrentSeason, getEliminationsBySeason, getEpisodes, getEpisodesByShow } from "../../utils/util"
import * as AdminUI from "../../utils/AdminComponents"
import { useAppSelector } from "../../redux/hooks"
import ShowSelect from "../ShowSelect/ShowSelect"
import { selectCurrShow } from "../../redux/selectors"

const AdminEliminations = () => {
    const qc = useQueryClient()
    const [elimination, setElimination] = useState<Partial<EliminationEntry>>({ eliminationType: EliminationTypes.ELIMINATED })
    const currShow = useAppSelector(selectCurrShow);
    const [currSeason, setCurrSeason] = useState<Partial<Season>>({})
    const { data: episodes = [] } = useQuery({ queryKey: ['episodes', currSeason.id], queryFn: () => getEpisodesByShow(currShow.id) })
    const { data: contestants = [] } = useQuery({ queryKey: ['contestants', currSeason.id], queryFn: () => getContestantsBySeason(currSeason.id) })
    const { data: eliminations = [], isLoading } = useQuery({ queryKey: ['eliminations', currSeason.id], queryFn: () => getEliminationsBySeason(currSeason.id) })
    const create = useMutation({ mutationFn: () => addElimination(elimination), onSuccess: () => { qc.invalidateQueries({ queryKey: ['eliminations', currSeason.id] }); qc.invalidateQueries({ queryKey: ['contestants', currSeason.id] }); setElimination({ eliminationType: EliminationTypes.ELIMINATED }) } })
    const remove = useMutation({ mutationFn: deleteElimination, onSuccess: () => { qc.invalidateQueries({ queryKey: ['eliminations', currSeason.id] }); qc.invalidateQueries({ queryKey: ['contestants', currSeason.id] }) } })

    const ELIM_LABELS: Record<EliminationType, string> = {
        ELIMINATED: 'Voted out', QUIT: 'Quit', MEDICAL: 'Medical removal', WINNER: 'Winner', RUNNER_UP: 'Runner-up',
    }
    const ELIM_VARIANTS: Record<EliminationType, AdminUI.BadgeVariant> = {
        ELIMINATED: 'red', QUIT: 'amber', MEDICAL: 'amber', WINNER: 'green', RUNNER_UP: 'purple',
    }

    useEffect(() => {
        const fetchCurrentSeason = async () => {
            if (currShow?.currSeason) {
                let season = await getCurrentSeason(currShow.id);
                setCurrSeason(season);
            }
        };
        fetchCurrentSeason();
    }, [currShow])

    return (
        <div>
        <AdminUI.PageHeader title="Eliminations" subtitle="Record which contestants were eliminated each episode" />
        <ShowSelect
            currShow={currShow}
            currSeason={currShow?.currSeason}
        />
        {currShow && <AdminUI.TwoCol>
            <AdminUI.Card title="Log elimination">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AdminUI.FormGroup label="Episode">
                <AdminUI.Select value={elimination.episodeId || ''} onChange={e => setElimination(f => ({ ...f, episodeId: e.target.value }))}>
                    <option value="">Select an episode...</option>
                    {episodes.map(episode => <option key={episode.id} value={episode.id}>Episode {episode.episodeNumber}</option>)}
                </AdminUI.Select>
                </AdminUI.FormGroup>
                <AdminUI.FormGroup label="Contestant eliminated">
                <AdminUI.Select value={elimination.contestantId || ''} onChange={e => setElimination(f => ({ ...f, contestantId: e.target.value }))}>
                    <option value="">Select a contestant...</option>
                    {contestants.filter(c => c.status === 'ACTIVE').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </AdminUI.Select>
                </AdminUI.FormGroup>
                <AdminUI.FormGroup label="Elimination type">
                <AdminUI.Select value={elimination.eliminationType} onChange={e => setElimination(f => ({ ...f, eliminationType: e.target.value as EliminationType }))}>
                    {Object.entries(ELIM_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </AdminUI.Select>
                </AdminUI.FormGroup>
                <AdminUI.PrimaryButton onClick={() => elimination.episodeId && elimination.contestantId && create.mutate()} disabled={create.isPending}>{create.isPending ? 'Logging...' : 'Log elimination'}</AdminUI.PrimaryButton>
                {create.isError && <AdminUI.ErrorMsg />}
            </div>
            </AdminUI.Card>
            <AdminUI.Card title="Elimination history">
            {isLoading && <AdminUI.EmptyState message="Loading..." />}
            {!isLoading && eliminations.length === 0 && <AdminUI.EmptyState message="No eliminations logged yet." />}
            {eliminations.map(elim => {
                    const contestant = contestants.find(c => c.id === elim.contestantId)
                    const episode = episodes.find(e => e.id === elim.episodeId)
                    console.log(contestant, episode)
                    return (
                    <div key={contestant?.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0', borderBottom: '0.5px solid var(--color-border-tertiary,#e5e5e5)' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-secondary,#888)', minWidth: 40 }}>E{episode?.episodeNumber || '?'}</span>
                        <AdminUI.Avatar name={contestant?.name || '?'} size={28} />
                        <span style={{ fontSize: 14, flex: 1 }}>{contestant?.name || 'Unknown'}</span>
                        <AdminUI.Badge label={ELIM_LABELS[elim.eliminationType]} variant={ELIM_VARIANTS[elim.eliminationType]} />
                        <AdminUI.DangerButton onClick={() => remove.mutate(elim.id)} />
                    </div>
                    )
            })}
            </AdminUI.Card>
        </AdminUI.TwoCol>}
        </div>
    )
}

export default AdminEliminations;
