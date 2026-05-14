import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  RefreshCw,
} from "lucide-react";

const ENDPOINT = import.meta.env.VITE_DASHBOARD_ENDPOINT;
const POLL_INTERVAL_MS = 30000;

function normalizeIncidentType(type) {
  const map = {
    SLAVE_OFFLINE: "OFFLINE",
    SLAVE_DOWN: "DOWN",
    IOT_DEVICE_DISCONNECTED: "DISCONNECTED",
  };

  return map[type] || type || "UNKNOWN";
}

function formatAge(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(Number(seconds))) {
    return "—";
  }

  const sec = Number(seconds);

  if (sec < 60) return `${Math.round(sec)} sec`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ${min % 60} min`;

  const days = Math.floor(hr / 24);
  return `${days} d ${hr % 24} hr`;
}

function statusClass(type) {
  switch (type) {
    case "SLAVE_OFFLINE":
    case "OFFLINE":
      return "status offline";

    case "SLAVE_DOWN":
    case "DOWN":
      return "status down";

    case "IOT_DEVICE_DISCONNECTED":
    case "DISCONNECTED":
      return "status disconnected";

    default:
      return "status unknown";
  }
}

export default function OpenIncidents() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = async (manual = false) => {
    try {
      if (manual) setRefreshing(true);

      setError(null);

      const response = await fetch(ENDPOINT, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message || "Failed to load open incidents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    const timer = setInterval(() => {
      fetchData();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, []);

  const incidents = data?.openIncidents || [];

  return (
    <main className="page">
      <section className="header">
        <div>

          <h1>Open Incidents</h1>

          <p>
            Active device incidents requiring monitoring, follow-up, or manual intervention.
          </p>
        </div>

        <div className="header-actions">
          <button onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            Refresh now
          </button>

          <small>Auto-refresh every {POLL_INTERVAL_MS / 1000}s</small>
        </div>
      </section>

      {error && (
        <section className="error-box">
          <strong>Could not load open incidents.</strong> {error}
        </section>
      )}

      {loading && !data ? (
        <section className="loading">Loading open incidents...</section>
      ) : (
        <>
          <section className="kpi-grid open-incident-summary">
            <div className="kpi-card">
              <div>
                <p>Total Open Incidents</p>
                <strong>{incidents.length}</strong>
                <span>Currently active</span>
              </div>
              <div className="kpi-icon">
                <AlertTriangle size={24} />
              </div>
            </div>
          </section>

          <section className="panel open-incidents-page-panel">
            <h2>Active Incident List</h2>
            <p>
              This page focuses only on unresolved incidents. Recovered incidents
              remain available in the KPI Summary page.
            </p>

            {incidents.length === 0 ? (
              <div className="no-incidents open-incidents-empty">
                No open incidents.
              </div>
            ) : (
              <div className="open-incidents-grid">
                {incidents.map((incident) => (
                  <article
                    className="open-incident-card"
                    key={incident.IncidentId}
                  >
                    <div className="open-incident-card-header">
                      <div>
                        <h3>Incident #{incident.IncidentId}</h3>
                        <p>{incident.SiteName}</p>
                        <span>{incident.SiteCode}</span>
                      </div>

                      <span className={statusClass(incident.IncidentType)}>
                        {incident.IncidentTypeDisplay ||
                          normalizeIncidentType(incident.IncidentType)}
                      </span>
                    </div>

                    <div className="open-incident-details">
                      <div>
                        <span>Device</span>
                        <strong>{incident.DeviceId}</strong>
                      </div>

                      <div>
                        <span>Started</span>
                        <strong>{incident.StartAst || incident.StartUtc || "—"}</strong>
                      </div>

                      <div>
                        <span>Age</span>
                        <strong>{formatAge(incident.IncidentAgeSec)}</strong>
                      </div>

                      <div>
                        <span>Detected</span>
                        <strong>
                          {incident.DetectedAst || incident.DetectedUtc || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Auto Action</span>
                        <strong>{incident.AutoActionType || "—"}</strong>
                      </div>

                      <div>
                        <span>Action Result</span>
                        <strong>{incident.AutoActionResultCode || "—"}</strong>
                      </div>
                    </div>

                    <div className="open-incident-recommendation">
                      <Clock size={16} />
                      <span>{incident.RecommendedAction || "Monitor and follow up."}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}