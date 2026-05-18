import { useEffect, useState } from "react";
import LiveOperations from "./LiveOperations";
import OpenIncidents from "./OpenIncidents";
import EmployeeRegistrationIncidents from "./EmployeeRegistrationIncidents";
import KpiSummary from "./KpiSummary";
import "./App.css";

async function getCurrentUser() {
  const response = await fetch("/.auth/me", { cache: "no-store" });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.clientPrincipal || null;
}

export default function App() {
  const [page, setPage] = useState("live");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((currentUser) => setUser(currentUser))
      .finally(() => setAuthLoading(false));
  }, []);

  const roles = user?.userRoles || [];
  const isOperator = roles.includes("contributor");
  const isViewer = roles.includes("authenticated") || isOperator;

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
              <span>{user.userDetails}</span>
              <a href="/logout">Sign out</a>
            </>
          ) : (
            <a href="/login">Sign in</a>
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
      {page === "employee" && (<EmployeeRegistrationIncidents isOperator={isOperator} /> )}
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