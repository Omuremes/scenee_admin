import { Link } from "react-router-dom";

export function UnauthorizedPage() {
  return (
    <div className="screen-shell">
      <div className="status-view">
        <h1>Admin access required</h1>
        <p>Your account is authenticated, but it does not have the `admin` role required for this panel.</p>
        <Link className="button" to="/login">
          Return to sign-in
        </Link>
      </div>
    </div>
  );
}
