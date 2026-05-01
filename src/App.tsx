import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Movies } from './pages/Movies';
import { Actors } from './pages/Actors';
import { Series } from './pages/Series';
import { SeriesDetail } from './pages/SeriesDetail';
import { MovieCategories } from './pages/MovieCategories';
import { Events } from './pages/Events';
import { EventDetail } from './pages/EventDetail';
import { EventCategories } from './pages/EventCategories';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmDialog';

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="movies" element={<Movies />} />
                <Route path="movie-categories" element={<MovieCategories />} />
                <Route path="actors" element={<Actors />} />
                <Route path="series" element={<Series />} />
                <Route path="series/:serialId" element={<SeriesDetail />} />
                <Route path="events" element={<Events />} />
                <Route path="events/:eventId" element={<EventDetail />} />
                <Route path="event-categories" element={<EventCategories />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
