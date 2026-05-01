import { NavLink, Outlet } from 'react-router-dom';
import { Film, Users, Clapperboard, Home, Tag, Calendar, LogOut } from 'lucide-react';
import { authService } from '../../services/auth';
import styles from './Layout.module.css';

export function Layout() {
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      authService.logout();
    }
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoText}>CineScope</span>
          <span className={styles.logoSub}>Admin</span>
        </div>
        
        <nav className={styles.nav}>
          <NavLink 
            to="/" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            end
          >
            <Home size={18} />
            Dashboard
          </NavLink>
          <NavLink 
            to="/movies" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Film size={18} />
            Movies
          </NavLink>
          <NavLink 
            to="/movie-categories" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Tag size={18} />
            Movie Categories
          </NavLink>
          <NavLink 
            to="/actors" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Users size={18} />
            Actors
          </NavLink>
          <NavLink 
            to="/series" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Clapperboard size={18} />
            Series
          </NavLink>
          <NavLink 
            to="/events" 
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            <Calendar size={18} />
            Events
          </NavLink>
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={18} />
            Log Out
          </button>
        </div>
      </aside>
      
      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

