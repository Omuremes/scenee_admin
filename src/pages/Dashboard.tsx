import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Users, Clapperboard, Tag, Calendar, CalendarRange, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { useToast } from '../components/Toast';
import { moviesService } from '../services/movies';
import type { MovieListItem } from '../services/movies';
import { actorsService } from '../services/actors';
import { serialsService } from '../services/series';
import { movieCategoriesService } from '../services/movieCategories';
import { eventsService, eventCategoriesService } from '../services/events';
import type { EventListItem } from '../services/events';
import styles from './Dashboard.module.css';

interface KpiData {
  movies: number;
  serials: number;
  actors: number;
  movieCategories: number;
  events: number;
  eventCategories: number;
}

const initialKpi: KpiData = {
  movies: 0,
  serials: 0,
  actors: 0,
  movieCategories: 0,
  events: 0,
  eventCategories: 0,
};

export function Dashboard() {
  const toast = useToast();
  const [kpi, setKpi] = useState<KpiData>(initialKpi);
  const [recentMovies, setRecentMovies] = useState<MovieListItem[]>([]);
  const [recentEvents, setRecentEvents] = useState<EventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [movies, serials, actors, movieCats, events, eventCats] = await Promise.all([
          moviesService.getMovies({ limit: 5 }).catch(() => null),
          serialsService.getSerials({ limit: 5 }).catch(() => null),
          actorsService.getActors({ limit: 1 }).catch(() => null),
          movieCategoriesService.getMovieCategories({ limit: 1 }).catch(() => null),
          eventsService.getEvents({ limit: 5 }).catch(() => null),
          eventCategoriesService.getCategories({ limit: 1 }).catch(() => null),
        ]);
        if (!alive) return;
        setKpi({
          movies: movies?.total || 0,
          serials: serials?.total || 0,
          actors: actors?.total || 0,
          movieCategories: movieCats?.total || 0,
          events: events?.total || 0,
          eventCategories: eventCats?.total || 0,
        });
        setRecentMovies(movies?.items || []);
        setRecentEvents(events?.items || []);
      } catch (err: any) {
        if (alive) toast.error(err.message || 'Failed to load dashboard');
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [toast]);

  const cards = [
    { label: 'Movies', value: kpi.movies, to: '/movies', Icon: Film },
    { label: 'Series', value: kpi.serials, to: '/series', Icon: Clapperboard },
    { label: 'Actors', value: kpi.actors, to: '/actors', Icon: Users },
    { label: 'Movie categories', value: kpi.movieCategories, to: '/movie-categories', Icon: Tag },
    { label: 'Events', value: kpi.events, to: '/events', Icon: Calendar },
    { label: 'Event categories', value: kpi.eventCategories, to: '/event-categories', Icon: CalendarRange },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your CineScope platform" />

      <div className={styles.grid}>
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.iconWrap}>
                <card.Icon size={18} />
              </span>
              <ArrowUpRight size={16} className={styles.arrow} />
            </div>
            <div className={styles.value}>{isLoading ? '—' : card.value}</div>
            <div className={styles.label}>{card.label}</div>
          </Link>
        ))}
      </div>

      <div className={styles.recentGrid}>
        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2>Recent movies</h2>
            <Link to="/movies" className={styles.viewAll}>View all</Link>
          </header>
          {recentMovies.length === 0 ? (
            <div className={styles.empty}>No movies yet</div>
          ) : (
            <ul className={styles.list}>
              {recentMovies.map((movie) => (
                <li key={movie.id} className={styles.listItem}>
                  <div>
                    <div className={styles.itemTitle}>{movie.name}</div>
                    <div className={styles.itemMeta}>
                      {movie.duration ? `${movie.duration} min` : 'no duration'} · ⭐ {movie.average_rating.toFixed(1)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.section}>
          <header className={styles.sectionHeader}>
            <h2>Recent events</h2>
            <Link to="/events" className={styles.viewAll}>View all</Link>
          </header>
          {recentEvents.length === 0 ? (
            <div className={styles.empty}>No events yet</div>
          ) : (
            <ul className={styles.list}>
              {recentEvents.map((event) => (
                <li key={event.id} className={styles.listItem}>
                  <div>
                    <div className={styles.itemTitle}>{event.title}</div>
                    <div className={styles.itemMeta}>
                      {event.type} · {event.city || '—'}
                      {event.next_session_at
                        ? ` · ${new Date(event.next_session_at).toLocaleString()}`
                        : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
