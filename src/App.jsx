import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import LiveOperations from "./LiveOperations";
import OpenIncidents from "./OpenIncidents";
import EmployeeRegistrationIncidents from "./EmployeeRegistrationIncidents";
import KpiSummary from "./KpiSummary";
import "./App.css";

async function getCurrentUser() {
  try {
    const response = await fetch("/.auth/me", { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return null;
    }

    const data = await response.json();
    return data.clientPrincipal || null;
  } catch {
    return null;
  }
}

function getUserEmail(user) {
  if (!user) return "";

  const claimEmail = user.claims?.find((claim) =>
    [
      "preferred_username",
      "email",
      "emails",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
    ].includes(claim.typ)
  )?.val;

  return (claimEmail || user.userDetails || "").toLowerCase();
}

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export default function App() {
  const [page, setPage] = useState("live");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .finally(() => setAuthLoading(false));
  }, []);

  const userEmail = getUserEmail(user);
  const isOperator = ADMIN_EMAILS.includes(userEmail);
  const isViewer = !!user;

  return (
    <>
      <header className="portal-header">
        <div className="portal-header-inner portal-header-centered">
          <img className="portal-logo-image"
              src="/msy-logo.png"
              alt="Ministry logo"
          />

          <div className="portal-title-block">
            <div className="portal-title">IoT Attendance Monitoring</div>
            <div className="portal-subtitle">
              Independent device health monitoring and incident management dashboard
            </div>
          </div>

          <div className="portal-header-spacer" />
          </div>
          <div className="portal-user">
          {authLoading ? (
            <span>Checking access...</span>
          ) : user ? (
            <>
              <div className="portal-user-info">
                <span title={user.userDetails}>{user.userDetails}</span>
                {isOperator && (
                  <Shield size={16} className="contributor-icon" title="Administrator access" />
                )}
              </div>
              <a href="/.auth/logout">Sign out</a>
            </>
          ) : (
            <a href="/.auth/login/aad">Sign in</a>
          )}
        </div>
      </header>

      <nav className="top-nav portal-nav">
        <button
          type="button"
          className={page === "live" ? "nav-active" : "nav-button"}
          onClick={() => setPage("live")}
        >
          Live Operations
        </button>

        <button
          type="button"
          className={page === "open" ? "nav-active" : "nav-button"}
          onClick={() => setPage("open")}
        >
          Open Incidents
        </button>

        <button
          type="button"
          className={page === "employee" ? "nav-active" : "nav-button"}
          onClick={() => setPage("employee")}
        >
          Employee Registration
        </button>

        <button
          type="button"
          className={page === "kpi" ? "nav-active" : "nav-button"}
          onClick={() => setPage("kpi")}
        >
          KPI Summary
        </button>
      </nav>

      {page === "live" && (<LiveOperations
        isOperator={isOperator}
        currentUserName={user?.userDetails || "Dashboard User"}
        />)}
      {page === "open" && <OpenIncidents />}
      {page === "employee" && (
        <EmployeeRegistrationIncidents
          isOperator={isOperator}
          currentUserName={user?.userDetails || "Dashboard User"}
        />
      )}
      {page === "kpi" && <KpiSummary />}

      <footer className="portal-footer">
        <div className="portal-footer-inner">
          <div>
            <strong>IoT Attendance Monitoring Platform</strong>
            <span>Independent device health monitoring and incident reporting</span>
          </div>

          {/* <div className="portal-footer-links">
            <span>Operational View</span>
            <span>Incident Management</span>
            <span>KPI Reporting</span>
          </div> */}
        </div>
      </footer>
    </>
  );
}