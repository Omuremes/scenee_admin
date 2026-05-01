import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Movies } from './pages/Movies';
import { Actors } from './pages/Actors';
import { Series } from './pages/Series';
import { MovieCategories } from './pages/MovieCategories';
import { Events } from './pages/Events';
import { Login } from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="movies" element={<Movies />} />
            <Route path="movie-categories" element={<MovieCategories />} />
            <Route path="actors" element={<Actors />} />
            <Route path="series" element={<Series />} />
            <Route path="events" element={<Events />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
