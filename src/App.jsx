import { useState } from "react";
import LiveOperations from "./LiveOperations";
import OpenIncidents from "./OpenIncidents";
import KpiSummary from "./KpiSummary";
import "./App.css";

export default function App() {
  const [page, setPage] = useState("live");

  return (
    <>
      <nav className="top-nav">
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
          className={page === "kpi" ? "nav-active" : "nav-button"}
          onClick={() => setPage("kpi")}
        >
          KPI Summary
        </button>
      </nav>

      {page === "live" && <LiveOperations />}
      {page === "open" && <OpenIncidents />}
      {page === "kpi" && <KpiSummary />}
    </>
  );
}