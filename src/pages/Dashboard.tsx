import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Clapperboard, Tag, Calendar, CalendarRange, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { useToast } from '../components/Toast';
import { actorsService } from '../services/actors';
import { serialsService } from '../services/series';
import { movieCategoriesService } from '../services/movieCategories';
import { eventsService, eventCategoriesService } from '../services/events';
import type { EventListItem } from '../services/events';
import styles from './Dashboard.module.css';

interface KpiData {
  serials: number;
  actors: number;
  movieCategories: number;
  events: number;
  eventCategories: number;
}

const initialKpi: KpiData = {
  serials: 0,
  actors: 0,
  movieCategories: 0,
  events: 0,
  eventCategories: 0,
};

export function Dashboard() {
  const toast = useToast();
  const [kpi, setKpi] = useState<KpiData>(initialKpi);
  const [recentEvents, setRecentEvents] = useState<EventListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [serials, actors, movieCats, events, eventCats] = await Promise.all([
          serialsService.getSerials({ limit: 5 }).catch(() => null),
          actorsService.getActors({ limit: 1 }).catch(() => null),
          movieCategoriesService.getMovieCategories({ limit: 1 }).catch(() => null),
          eventsService.getEvents({ limit: 5 }).catch(() => null),
          eventCategoriesService.getCategories({ limit: 1 }).catch(() => null),
        ]);
        if (!alive) return;
        setKpi({
          serials: serials?.total || 0,
          actors: actors?.total || 0,
          movieCategories: movieCats?.total || 0,
          events: events?.total || 0,
          eventCategories: eventCats?.total || 0,
        });
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
            <div className={styles.value}>{isLoading ? '-' : card.value}</div>
            <div className={styles.label}>{card.label}</div>
          </Link>
        ))}
      </div>

      <div className={styles.recentGrid}>
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
                      {event.type} · {event.city || '-'}
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
