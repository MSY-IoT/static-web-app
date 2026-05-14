import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  PlugZap,
  RefreshCw,
  Server,
  XCircle,
  WifiOff,
} from "lucide-react";
import "./App.css";

const ENDPOINT = import.meta.env.VITE_DASHBOARD_ENDPOINT;
const REBOOT_ENDPOINT = import.meta.env.VITE_REBOOT_ENDPOINT;

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

function tileClassByTitle(title) {
  const lower = String(title || "").toLowerCase();

  if (lower.includes("online")) return "tile tile-online";
  if (lower.includes("offline")) return "tile tile-offline";
  if (lower.includes("down")) return "tile tile-down";
  if (lower.includes("disconnect")) return "tile tile-disconnected";
  if (lower.includes("incident")) return "tile tile-down";

  return "tile";
}

function TileIcon({ title }) {
  const lower = String(title || "").toLowerCase();

  if (lower.includes("online")) {
    return <CheckCircle2 className="icon-green" size={24} />;
  }

  if (lower.includes("offline")) {
    return <WifiOff className="icon-amber" size={24} />;
  }

  if (lower.includes("down")) {
    return <PlugZap className="icon-red" size={24} />;
  }

  if (lower.includes("disconnect")) {
    return <XCircle className="icon-gray" size={24} />;
  }

  if (lower.includes("incident")) {
    return <AlertTriangle className="icon-red" size={24} />;
  }

  return <Server className="icon-gray" size={24} />;
}

export default function LiveOperations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastClientRefresh, setLastClientRefresh] = useState(null);
  
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [rebootRequestedBy, setRebootRequestedBy] = useState("");
  const [rebooting, setRebooting] = useState(false);
  const [rebootMessage, setRebootMessage] = useState(null);

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
  const tiles = (data?.summaryTiles || []).filter(
    (tile) => !String(tile.Title || "").toLowerCase().includes("incident")
  );

  const devices = useMemo(() => {
    return [...(data?.devices || [])].sort(
      (a, b) => (a.SortRank ?? 99) - (b.SortRank ?? 99)
    );
  }, [data]);

  //   const incidents = data?.openIncidents || [];

  const rebootSelectedDevice = async () => {
    if (!selectedDevice) {
      setError("Please select a device first.");
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to send reboot_slave to ${selectedDevice.DeviceId}?`
    );

    if (!confirmed) return;

    try {
      setRebooting(true);
      setError(null);
      setRebootMessage(null);

      const params = new URLSearchParams();
      params.set("deviceId", selectedDevice.DeviceId);
      params.set("confirm", "true");
      params.set("requestedBy", rebootRequestedBy || "Dashboard User");

      const response = await fetch(`${REBOOT_ENDPOINT}?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const text = await response.text();

      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { rawResponse: text };
      }

      if (!response.ok) {
        throw new Error(
          json.error ||
            json.message ||
            json.rawResponse ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      setRebootMessage(
        `Reboot command sent successfully to ${selectedDevice.DeviceId}. Result code: ${
          json.resultCode ?? "N/A"
        }`
      );

      await fetchData(true);
    } catch (err) {
      setError(err.message || "Failed to send reboot command.");
    } finally {
      setRebooting(false);
    }
  }; 

  return (
    <main className="page">
      <section className="header">
        <div>
          <h1>Operational Summary Dashboard</h1>
          <p>
            Live device health, heartbeat freshness, and controlled device action.
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
              <div className={tileClassByTitle(tile.Title)} key={tile.Title}>
                <div>
                  <p>{tile.Title}</p>
                  <strong>{tile.Value}</strong>
                </div>
                <div className="tile-icon">
                  <TileIcon title={tile.Title} />
                </div>
              </div>
            ))}
          </section>


          <section className="grid live-only-grid">
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
                      {/* <th>Device</th> */}
                      <th>Status</th>
                      <th>Last heartbeat</th>
                      <th>Age</th>
                      <th>Open</th>
                      <th>Latest</th>
                      {/* <th>Recommended action</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {devices.map((device) => (
                      <tr
                          key={device.DeviceId}
                          className={
                            selectedDevice?.DeviceId === device.DeviceId ? "selected-row" : ""
                          }
                          onClick={() => {
                            setSelectedDevice(device);
                            setRebootMessage(null);
                            setError(null);
                          }}
                        >
                        <td>
                          <strong>{device.SiteName}</strong>
                          <span>{device.DeviceId}</span>
                        </td>
                        {/* <td className="mono">{device.DeviceId}</td> */}
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
                        {/* <td>{device.RecommendedAction || "—"}</td> */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>

          <section className="panel selected-device-action-panel">
            <div className="selected-device-action-header">
              <div>
                <h2>Selected Device Action</h2>
                <p>Select a device from the table below, then send a controlled reboot command if needed.</p>
              </div>

              {selectedDevice && (
                <span className={statusClass(selectedDevice.CurrentStatus)}>
                  {selectedDevice.CurrentStatus}
                </span>
              )}
            </div>

            {!selectedDevice ? (
              <div className="selected-device-empty">
                Select a device from the Device Current Status table.
              </div>
            ) : (
              <div className="selected-device-action-content">
                <div className="selected-device-summary">
                  <div>
                    <span>Site</span>
                    <strong>{selectedDevice.SiteName}</strong>
                    <small>{selectedDevice.SiteCode}</small>
                  </div>

                  <div>
                    <span>Device ID</span>
                    <strong>{selectedDevice.DeviceId}</strong>
                  </div>

                  <div>
                    <span>Last Heartbeat</span>
                    <strong>{selectedDevice.LastHeartbeatAst || "—"}</strong>
                  </div>

                  <div>
                    <span>Open Incidents</span>
                    <strong>{selectedDevice.OpenIncidentCount ?? 0}</strong>
                  </div>
                </div>

                <div className="reboot-form">
                  <label>
                    Requested by
                    <input
                      value={rebootRequestedBy}
                      onChange={(event) => setRebootRequestedBy(event.target.value)}
                      placeholder="user name"
                    />
                  </label>

                  <button
                    type="button"
                    className="reboot-button"
                    onClick={rebootSelectedDevice}
                    disabled={rebooting}
                  >
                    {rebooting ? "Sending reboot..." : "Send Reboot Command"}
                  </button>
                </div>

                {rebootMessage && (
                  <div className="reboot-success-message">
                    {rebootMessage}
                  </div>
                )}
              </div>
            )}
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