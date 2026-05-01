import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { Button } from '../components/Button/Button';
import { Tabs } from '../components/Tabs/Tabs';
import { TextField } from '../components/TextField/TextField';
import { TextArea } from '../components/TextArea/TextArea';
import { MultiSelect } from '../components/MultiSelect/MultiSelect';
import { SidePanel } from '../components/SidePanel/SidePanel';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmDialog';
import { serialsService } from '../services/series';
import type {
  SerialDetail,
  SerialEpisode,
  SerialSeason,
} from '../services/series';
import { movieCategoriesService } from '../services/movieCategories';
import type { MovieCategory } from '../services/movieCategories';
import { actorsService } from '../services/actors';
import type { Actor } from '../services/actors';
import styles from './SeriesDetail.module.css';

type SeasonForm = {
  season_number: number;
  title: string;
  release_year: string;
};

type EpisodeForm = {
  episode_number: number;
  title: string;
  description: string;
  duration: string;
};

export function SeriesDetail() {
  const { serialId } = useParams<{ serialId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();

  const [serial, setSerial] = useState<SerialDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'seasons'>('overview');

  // overview
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [posterKey, setPosterKey] = useState('');
  const [actorIds, setActorIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [savingOverview, setSavingOverview] = useState(false);

  const [allActors, setAllActors] = useState<Actor[]>([]);
  const [allCategories, setAllCategories] = useState<MovieCategory[]>([]);

  // seasons
  const [seasonPanelOpen, setSeasonPanelOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<SerialSeason | null>(null);
  const [seasonForm, setSeasonForm] = useState<SeasonForm>({ season_number: 1, title: '', release_year: '' });
  const [savingSeason, setSavingSeason] = useState(false);

  // episodes
  const [episodePanelOpen, setEpisodePanelOpen] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<SerialEpisode | null>(null);
  const [episodeForm, setEpisodeForm] = useState<EpisodeForm>({
    episode_number: 1,
    title: '',
    description: '',
    duration: '',
  });
  const [savingEpisode, setSavingEpisode] = useState(false);
  const [uploadingEpisodeId, setUploadingEpisodeId] = useState<string | null>(null);

  const fetchSerial = useCallback(async () => {
    if (!serialId) return;
    setIsLoading(true);
    try {
      const data = await serialsService.getSerial(serialId);
      setSerial(data);
      setName(data.name);
      setDescription(data.description || '');
      setPosterKey(data.poster_key || '');
      setActorIds((data.actors || []).map((a) => a.id));
      setCategoryIds((data.categories || []).map((c) => c.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load series');
    } finally {
      setIsLoading(false);
    }
  }, [serialId, toast]);

  useEffect(() => {
    fetchSerial();
  }, [fetchSerial]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [cats, acts] = await Promise.all([
          movieCategoriesService.getMovieCategories({ limit: 100 }),
          actorsService.getActors({ limit: 100 }),
        ]);
        if (!alive) return;
        setAllCategories(cats.items || []);
        setAllActors(acts.items || []);
      } catch (err: any) {
        if (alive) toast.error(err.message || 'Failed to load related data');
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const handleOverviewSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialId) return;
    setSavingOverview(true);
    try {
      const updated = await serialsService.updateSerial(serialId, {
        name,
        description: description || undefined,
        poster_key: posterKey || undefined,
        actors: actorIds,
        categories: categoryIds,
      });
      setSerial(updated);
      toast.success('Series updated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update series');
    } finally {
      setSavingOverview(false);
    }
  };

  const openSeasonPanel = (season?: SerialSeason) => {
    setEditingSeason(season || null);
    if (season) {
      setSeasonForm({
        season_number: season.season_number,
        title: season.title || '',
        release_year: season.release_year ? String(season.release_year) : '',
      });
    } else {
      const nextNumber = (serial?.seasons?.length || 0) + 1;
      setSeasonForm({ season_number: nextNumber, title: '', release_year: '' });
    }
    setSeasonPanelOpen(true);
  };

  const handleSeasonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialId) return;
    setSavingSeason(true);
    try {
      const payload = {
        season_number: Number(seasonForm.season_number),
        title: seasonForm.title || undefined,
        release_year: seasonForm.release_year ? Number(seasonForm.release_year) : undefined,
      };
      if (editingSeason) {
        await serialsService.updateSeason(serialId, editingSeason.id, payload);
        toast.success('Season updated');
      } else {
        await serialsService.addSeason(serialId, payload);
        toast.success('Season added');
      }
      setSeasonPanelOpen(false);
      fetchSerial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save season');
    } finally {
      setSavingSeason(false);
    }
  };

  const handleSeasonDelete = async (season: SerialSeason) => {
    if (!serialId) return;
    const ok = await confirm({
      title: 'Delete season',
      message: `Delete season ${season.season_number}? All episodes will be removed.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await serialsService.deleteSeason(serialId, season.id);
      toast.success('Season deleted');
      fetchSerial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete season');
    }
  };

  const openEpisodePanel = (seasonId: string, episode?: SerialEpisode) => {
    setActiveSeasonId(seasonId);
    setEditingEpisode(episode || null);
    if (episode) {
      setEpisodeForm({
        episode_number: episode.episode_number,
        title: episode.title || '',
        description: episode.description || '',
        duration: episode.duration ? String(episode.duration) : '',
      });
    } else {
      const season = serial?.seasons.find((s) => s.id === seasonId);
      const nextNumber = (season?.episodes?.length || 0) + 1;
      setEpisodeForm({ episode_number: nextNumber, title: '', description: '', duration: '' });
    }
    setEpisodePanelOpen(true);
  };

  const handleEpisodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSeasonId) return;
    setSavingEpisode(true);
    try {
      const payload = {
        episode_number: Number(episodeForm.episode_number),
        title: episodeForm.title || undefined,
        description: episodeForm.description || undefined,
        duration: episodeForm.duration ? Number(episodeForm.duration) : undefined,
      };
      if (editingEpisode) {
        await serialsService.updateEpisode(activeSeasonId, editingEpisode.id, payload);
        toast.success('Episode updated');
      } else {
        await serialsService.addEpisode(activeSeasonId, payload);
        toast.success('Episode added');
      }
      setEpisodePanelOpen(false);
      fetchSerial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save episode');
    } finally {
      setSavingEpisode(false);
    }
  };

  const handleEpisodeDelete = async (seasonId: string, episode: SerialEpisode) => {
    const ok = await confirm({
      title: 'Delete episode',
      message: `Delete episode ${episode.episode_number}${episode.title ? ` ("${episode.title}")` : ''}?`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await serialsService.deleteEpisode(seasonId, episode.id);
      toast.success('Episode deleted');
      fetchSerial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete episode');
    }
  };

  const handleEpisodeUpload = async (episodeId: string, file: File) => {
    setUploadingEpisodeId(episodeId);
    try {
      await serialsService.uploadEpisodeVideo(episodeId, file);
      toast.success('Video uploaded');
      fetchSerial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload video');
    } finally {
      setUploadingEpisodeId(null);
    }
  };

  const sortedSeasons = useMemo(
    () => [...(serial?.seasons || [])].sort((a, b) => a.season_number - b.season_number),
    [serial],
  );

  if (isLoading || !serial) {
    return (
      <div>
        <Button variant="secondary" onClick={() => navigate('/series')}>
          <ArrowLeft size={14} /> Back
        </Button>
        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          {isLoading ? 'Loading...' : 'Series not found'}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="secondary" size="sm" onClick={() => navigate('/series')}>
        <ArrowLeft size={14} /> Back
      </Button>

      <div style={{ height: '1rem' }} />

      <PageHeader
        title={serial.name}
        subtitle={`Series · ${serial.seasons.length} season(s)`}
      />

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'seasons', label: `Seasons & episodes (${serial.seasons.length})` },
        ]}
        active={activeTab}
        onChange={(id) => setActiveTab(id as 'overview' | 'seasons')}
      >
        {activeTab === 'overview' && (
          <form
            onSubmit={handleOverviewSave}
            className={styles.formCard}
          >
            <TextField
              label="Title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextField
              label="Poster key (object key in storage)"
              value={posterKey}
              onChange={(e) => setPosterKey(e.target.value)}
              placeholder="e.g. serials/breaking-bad.jpg"
            />
            <MultiSelect
              label="Categories"
              value={categoryIds}
              options={allCategories.map((c) => ({ value: c.id, label: c.name }))}
              onChange={setCategoryIds}
            />
            <MultiSelect
              label="Actors"
              value={actorIds}
              options={allActors.map((a) => ({ value: a.id, label: a.full_name }))}
              onChange={setActorIds}
            />
            <TextArea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={savingOverview}>
                {savingOverview ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        )}

        {activeTab === 'seasons' && (
          <div className={styles.seasonsWrap}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => openSeasonPanel()}>
                <Plus size={16} /> Add season
              </Button>
            </div>

            {sortedSeasons.length === 0 && (
              <div className={styles.emptyState}>No seasons yet. Click "Add season" to start.</div>
            )}

            {sortedSeasons.map((season) => (
              <div key={season.id} className={styles.seasonCard}>
                <div className={styles.seasonHeader}>
                  <div>
                    <div className={styles.seasonTitle}>
                      Season {season.season_number}
                      {season.title ? ` · ${season.title}` : ''}
                    </div>
                    {season.release_year && (
                      <div className={styles.seasonMeta}>{season.release_year}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" size="sm" onClick={() => openEpisodePanel(season.id)}>
                      <Plus size={14} /> Episode
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openSeasonPanel(season)}>
                      <Pencil size={14} /> Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleSeasonDelete(season)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {(season.episodes || []).length === 0 ? (
                  <div className={styles.emptyEpisodes}>No episodes in this season yet.</div>
                ) : (
                  <table className={styles.episodesTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Title</th>
                        <th>Duration</th>
                        <th>Video</th>
                        <th style={{ width: 220 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {season.episodes
                        .slice()
                        .sort((a, b) => a.episode_number - b.episode_number)
                        .map((episode) => (
                          <tr key={episode.id}>
                            <td>{episode.episode_number}</td>
                            <td>{episode.title || '—'}</td>
                            <td>{episode.duration ? `${episode.duration} min` : '—'}</td>
                            <td>
                              {episode.episode_file?.video_url ? (
                                <a href={episode.episode_file.video_url} target="_blank" rel="noreferrer">
                                  open
                                </a>
                              ) : (
                                <span className={styles.muted}>not uploaded</span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                <label className={styles.uploadBtn} title="Upload video">
                                  <Upload size={14} />
                                  <input
                                    type="file"
                                    accept="video/mp4,video/x-matroska"
                                    style={{ display: 'none' }}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleEpisodeUpload(episode.id, file);
                                      e.target.value = '';
                                    }}
                                  />
                                  {uploadingEpisodeId === episode.id ? '...' : ''}
                                </label>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  onClick={() => openEpisodePanel(season.id, episode)}
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.iconBtn} ${styles.danger}`}
                                  onClick={() => handleEpisodeDelete(season.id, episode)}
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}
      </Tabs>

      <SidePanel
        isOpen={seasonPanelOpen}
        onClose={() => setSeasonPanelOpen(false)}
        title={editingSeason ? 'Edit season' : 'Add season'}
      >
        <form onSubmit={handleSeasonSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Season number"
            type="number"
            min={1}
            value={String(seasonForm.season_number)}
            onChange={(e) => setSeasonForm({ ...seasonForm, season_number: Number(e.target.value) })}
            required
          />
          <TextField
            label="Title (optional)"
            value={seasonForm.title}
            onChange={(e) => setSeasonForm({ ...seasonForm, title: e.target.value })}
          />
          <TextField
            label="Release year"
            type="number"
            value={seasonForm.release_year}
            onChange={(e) => setSeasonForm({ ...seasonForm, release_year: e.target.value })}
            placeholder="2008"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setSeasonPanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingSeason}>
              {savingSeason ? 'Saving...' : editingSeason ? 'Save' : 'Add season'}
            </Button>
          </div>
        </form>
      </SidePanel>

      <SidePanel
        isOpen={episodePanelOpen}
        onClose={() => setEpisodePanelOpen(false)}
        title={editingEpisode ? 'Edit episode' : 'Add episode'}
      >
        <form onSubmit={handleEpisodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Episode number"
            type="number"
            min={1}
            value={String(episodeForm.episode_number)}
            onChange={(e) => setEpisodeForm({ ...episodeForm, episode_number: Number(e.target.value) })}
            required
          />
          <TextField
            label="Title"
            value={episodeForm.title}
            onChange={(e) => setEpisodeForm({ ...episodeForm, title: e.target.value })}
          />
          <TextField
            label="Duration (minutes)"
            type="number"
            value={episodeForm.duration}
            onChange={(e) => setEpisodeForm({ ...episodeForm, duration: e.target.value })}
          />
          <TextArea
            label="Description"
            value={episodeForm.description}
            onChange={(e) => setEpisodeForm({ ...episodeForm, description: e.target.value })}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => setEpisodePanelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={savingEpisode}>
              {savingEpisode ? 'Saving...' : editingEpisode ? 'Save' : 'Add episode'}
            </Button>
          </div>
        </form>
      </SidePanel>
    </div>
  );
}
