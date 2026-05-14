import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Server,
  ShieldAlert,
  WifiOff,
} from "lucide-react";
import "./App.css";

const ENDPOINT = import.meta.env.VITE_DASHBOARD_ENDPOINT;
const POLL_INTERVAL_MS = 30000;

function normalizeIncidentType(type) {
  if (!type) return "—";

  const map = {
    SLAVE_OFFLINE: "OFFLINE",
    SLAVE_DOWN: "DOWN",
    IOT_DEVICE_DISCONNECTED: "DISCONNECTED",
  };

  return map[type] || type;
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

function statusClass(status) {
  switch (status) {
    case "ONLINE":
      return "status online";
    case "OFFLINE":
    case "SLAVE_OFFLINE":
      return "status offline";
    case "DOWN":
    case "SLAVE_DOWN":
      return "status down";
    case "DISCONNECTED":
    case "IOT_DEVICE_DISCONNECTED":
      return "status disconnected";
    default:
      return "status unknown";
  }
}

function tileClass(status) {
  switch (status) {
    case "Healthy":
      return "tile healthy";
    case "Critical":
      return "tile critical";
    case "Warning":
      return "tile warning";
    default:
      return "tile";
  }
}

function TileIcon({ title, status }) {
  const cls =
    status === "Critical"
      ? "icon-red"
      : status === "Healthy"
      ? "icon-green"
      : "icon-gray";

  const lower = String(title || "").toLowerCase();

  if (lower.includes("online")) return <CheckCircle2 className={cls} size={22} />;
  if (lower.includes("offline")) return <WifiOff className={cls} size={22} />;
  if (lower.includes("down")) return <ShieldAlert className={cls} size={22} />;
  if (lower.includes("disconnect")) return <WifiOff className={cls} size={22} />;
  if (lower.includes("incident")) return <AlertTriangle className={cls} size={22} />;

  return <Server className={cls} size={22} />;
}

export default function LiveOperations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastClientRefresh, setLastClientRefresh] = useState(null);

  const fetchData = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);

      setError(null);

      const response = await fetch(ENDPOINT, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();

      setData(json);
      setLastClientRefresh(new Date());
    } catch (err) {
      setError(err.message || "Failed to fetch dashboard data");
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

  const summary = data?.summary?.[0] || {};
  const tiles = data?.summaryTiles || [];

  const devices = useMemo(() => {
    return [...(data?.devices || [])].sort(
      (a, b) => (a.SortRank ?? 99) - (b.SortRank ?? 99)
    );
  }, [data]);

  const incidents = data?.openIncidents || [];

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="eyebrow">
            <Activity size={18} />
            IoT Attendance Monitoring
          </div>
          <h1>Operational Summary Dashboard</h1>
          <p>
            Live device health, heartbeat freshness, and open incident overview
            from the Azure Function App endpoint.
          </p>
        </div>

        <div className="header-actions">
          <button onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            Refresh now
          </button>
          <small>
            Auto-refresh every {POLL_INTERVAL_MS / 1000}s
            {lastClientRefresh
              ? ` • Last client refresh: ${lastClientRefresh.toLocaleTimeString()}`
              : ""}
          </small>
        </div>
      </section>

      {error && (
        <section className="error-box">
          <strong>Could not load endpoint data.</strong> {error}. If this
          happens after deployment, enable CORS on the Azure Function App for
          the Static Web App URL.
        </section>
      )}

      {loading && !data ? (
        <section className="loading">Loading operational dashboard data...</section>
      ) : (
        <>
          <section className="tiles">
            {tiles.map((tile) => (
              <div className={tileClass(tile.Status)} key={tile.Title}>
                <div>
                  <p>{tile.Title}</p>
                  <strong>{tile.Value}</strong>
                </div>
                <div className="tile-icon">
                  <TileIcon title={tile.Title} status={tile.Status} />
                </div>
              </div>
            ))}
          </section>

          <section className="grid">
            <section className="panel device-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Device Current Status</h2>
                  <p>Sorted by operational priority.</p>
                </div>
                <div className="heartbeat">
                  <Clock size={16} />
                  Latest heartbeat AST: {summary.LatestHeartbeatAst || "—"}
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Site</th>
                      <th>Device</th>
                      <th>Status</th>
                      <th>Last heartbeat</th>
                      <th>Age</th>
                      <th>Open incidents</th>
                      <th>Latest incident</th>
                      <th>Recommended action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr key={device.DeviceId}>
                        <td>
                          <strong>{device.SiteName}</strong>
                          <span>{device.SiteCode}</span>
                        </td>
                        <td className="mono">{device.DeviceId}</td>
                        <td>
                          <span className={statusClass(device.CurrentStatus)}>
                            {device.CurrentStatus}
                          </span>
                        </td>
                        <td>{device.LastHeartbeatAst || "—"}</td>
                        <td>{formatAge(device.SecondsSinceLastHeartbeat)}</td>
                        <td>
                          <strong>{device.OpenIncidentCount ?? 0}</strong>
                        </td>
                        <td>
                          {normalizeIncidentType(device.LatestOpenIncidentType)}
                          {device.LatestOpenIncidentId && (
                            <span>ID {device.LatestOpenIncidentId}</span>
                          )}
                        </td>
                        <td>{device.RecommendedAction || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel incidents-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Open Incidents</h2>
                  <p>Active incidents requiring follow-up.</p>
                </div>
                <AlertTriangle
                  className={incidents.length ? "icon-red" : "icon-green"}
                />
              </div>

              <div className="incident-list">
                {incidents.length === 0 ? (
                  <div className="no-incidents">No open incidents.</div>
                ) : (
                  incidents.map((incident) => (
                    <div className="incident-card" key={incident.IncidentId}>
                      <div className="incident-top">
                        <div>
                          <strong>Incident #{incident.IncidentId}</strong>
                          <p>{incident.SiteName}</p>
                          <span>{incident.DeviceId}</span>
                        </div>

                        <span className={statusClass(incident.IncidentType)}>
                          {normalizeIncidentType(incident.IncidentType)}
                        </span>
                      </div>

                      <div className="incident-details">
                        <div>
                          <span>Started</span>
                          {incident.StartAst || "—"}
                        </div>
                        <div>
                          <span>Age</span>
                          {formatAge(incident.IncidentAgeSec)}
                        </div>
                        <div>
                          <span>Auto action</span>
                          {incident.AutoActionType || "—"}
                        </div>
                        <div>
                          <span>Result</span>
                          {incident.AutoActionResultCode || "—"}
                        </div>
                      </div>

                      <p className="recommendation">
                        {incident.RecommendedAction || "—"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </section>

          <section className="footer">
            <div>
              Function App refresh AST:{" "}
              <strong>{summary.RefreshedAst || "—"}</strong>
            </div>
            <div>
              Endpoint status: <strong>{data?.status || "—"}</strong>
            </div>
          </section>
        </>
      )}
    </main>
  );
}