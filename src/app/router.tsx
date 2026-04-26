import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { RequireAdmin } from "../features/auth/auth";
import { LoginPage } from "../features/auth/LoginPage";
import { UnauthorizedPage } from "../features/auth/UnauthorizedPage";
import { AdminLayout } from "../features/layout/AdminLayout";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ActorsPage } from "../features/actors/ActorsPage";
import { MoviesPage } from "../features/movies/MoviesPage";
import { MovieEditorPage } from "../features/movies/MovieEditorPage";
import { CategoriesPage } from "../features/categories/CategoriesPage";
import { EventsPage } from "../features/events/EventsPage";
import { EventEditorPage } from "../features/events/EventEditorPage";

function IndexRedirect() {
  return <Navigate to="/admin" replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="actors" element={<ActorsPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="movies/new" element={<MovieEditorPage mode="create" />} />
          <Route path="movies/:movieId" element={<MovieEditorPage mode="edit" />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="events/new" element={<EventEditorPage mode="create" />} />
          <Route path="events/:eventId" element={<EventEditorPage mode="edit" />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
