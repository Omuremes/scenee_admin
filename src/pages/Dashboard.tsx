import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader/PageHeader';
import { LogOut } from 'lucide-react';
import { authService } from '../services/auth';

export function Dashboard() {
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      authService.logout();
    }
  };

  return (
    <div>
      <PageHeader 
        title="Dashboard" 
        subtitle="Overview of your CineScope platform"
      />
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '1.5rem',
        marginTop: '2rem'
      }}>
        {['Movies', 'Actors', 'Series'].map(item => (
          <Link key={item} to={`/${item.toLowerCase()}`} style={{
            padding: '2rem',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border-light)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          }} className="dashboard-card">
            <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: 600 }}>{item}</h3>
            <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
              Manage your {item.toLowerCase()} database.
            </p>
          </Link>
        ))}

        <div onClick={handleLogout} style={{
          padding: '2rem',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }} className="dashboard-card logout">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LogOut size={18} color="var(--color-danger)" />
            <h3 style={{ fontSize: '1.125rem', margin: 0, fontWeight: 600 }}>Sign Out</h3>
          </div>
          <p className="text-secondary" style={{ fontSize: '0.875rem' }}>
            Securely end your administrative session.
          </p>
        </div>
      </div>
    </div>
  );
}

