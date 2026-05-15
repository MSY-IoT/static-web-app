import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Zap,
} from "lucide-react";

const KPI_ENDPOINT = import.meta.env.VITE_KPI_ENDPOINT;
const TOP_PROBLEM_SITES_ENDPOINT = import.meta.env.VITE_TOP_PROBLEM_SITES_ENDPOINT;
const AUTO_REBOOT_IMPACT_ENDPOINT = import.meta.env.VITE_AUTO_REBOOT_IMPACT_ENDPOINT;
const DOWNTIME_IMPACT_ENDPOINT = import.meta.env.VITE_DOWNTIME_IMPACT_ENDPOINT;
const SITE_HEALTH_SCORE_ENDPOINT = import.meta.env.VITE_SITE_HEALTH_SCORE_ENDPOINT;

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#dc2626", "#64748b"];
const POLL_INTERVAL_MS = 30000;

function formatShortDate(value) {
  if (!value) return "";
  return String(value).substring(5, 10);
}

function normalizeIncidentType(type) {
  const map = {
    SLAVE_OFFLINE: "OFFLINE",
    SLAVE_DOWN: "DOWN",
    IOT_DEVICE_DISCONNECTED: "DISCONNECTED",
  };

  return map[type] || type || "UNKNOWN";
}

function formatKpiNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0";
  }

  return Number(value).toLocaleString();
}

function formatKpiPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0%";
  }

  return `${Number(value).toFixed(1)}%`;
}

function formatKpiMinutes(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  return `${Number(value).toFixed(1)} min`;
}

function formatMinutes(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "N/A";
  }

  const min = Number(value);

  if (min < 60) return `${Math.round(min)} min`;

  const hr = Math.floor(min / 60);
  const remainingMin = Math.round(min % 60);

  return `${hr} hr ${remainingMin} min`;
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "0%";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
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

function healthStatusClass(status) {
  switch (status) {
    case "Healthy":
      return "status online";
    case "Watch":
      return "status watch";
    case "Needs Attention":
      return "status attention";
    case "Critical":
      return "status down";
    default:
      return "status unknown";
  }
}

function formatHealthScore(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  return Number(value).toFixed(0);
}

function formatHeartbeatAge(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }

  const minutes = Number(value);

  if (minutes < 60) {
    return `${minutes.toFixed(1)} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (hours < 24) {
    return `${hours} hr ${remainingMinutes} min`;
  }

  const days = Math.floor(hours / 24);
  return `${days} d ${hours % 24} hr`;
}

function KpiCard({ title, value, subtitle, icon }) {
  return (
    <div className="kpi-card">
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="kpi-icon">{icon}</div>
    </div>
  );
}

export default function KpiSummary() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topSitesData, setTopSitesData] = useState(null);
  const [topSitesError, setTopSitesError] = useState(null);
  const [autoRebootData, setAutoRebootData] = useState(null);
  const [autoRebootError, setAutoRebootError] = useState(null);
  const [autoRebootDays, setAutoRebootDays] = useState(7);
  const [downtimeImpactData, setDowntimeImpactData] = useState(null);
  const [downtimeImpactError, setDowntimeImpactError] = useState(null);
  const [downtimeImpactDays, setDowntimeImpactDays] = useState(7);
  const [siteHealthData, setSiteHealthData] = useState(null);
  const [siteHealthError, setSiteHealthError] = useState(null);

  const fetchData = async (manual = false) => {
    try {
      if (manual) setRefreshing(true);
      setError(null);

      const response = await fetch(KPI_ENDPOINT, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const json = await response.json();
      setData(json);
    } catch (err) {
      setError(err.message || "Failed to load KPI data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTopProblemSites = async () => {
    try {
      setTopSitesError(null);

      const response = await fetch(
        `${TOP_PROBLEM_SITES_ENDPOINT}?limit=10&minIncidents7Days=0`,
        { cache: "no-store" }
      );

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

      setTopSitesData(json);
    } catch (err) {
      setTopSitesError(err.message || "Failed to load top problem sites.");
    }
  };

  const fetchAutoRebootImpact = async (days = autoRebootDays) => {
    try {
      setAutoRebootError(null);

      const params = new URLSearchParams();
      params.set("days", String(days));
      params.set("limit", "20");

      const response = await fetch(
        `${AUTO_REBOOT_IMPACT_ENDPOINT}?${params.toString()}`,
        { cache: "no-store" }
      );

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

      setAutoRebootData(json);
    } catch (err) {
      setAutoRebootError(
        err.message || "Failed to load auto-reboot impact KPI."
      );
    }
  };

  const fetchDowntimeImpact = async (days = downtimeImpactDays) => {
    try {
      setDowntimeImpactError(null);

      const params = new URLSearchParams();
      params.set("days", String(days));
      params.set("limit", "10");

      const response = await fetch(
        `${DOWNTIME_IMPACT_ENDPOINT}?${params.toString()}`,
        { cache: "no-store" }
      );

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

      setDowntimeImpactData(json);
    } catch (err) {
      setDowntimeImpactError(
        err.message || "Failed to load downtime impact KPI."
      );
    }
  };

  const fetchSiteHealthScore = async () => {
    try {
      setSiteHealthError(null);

      const response = await fetch(SITE_HEALTH_SCORE_ENDPOINT, {
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

      setSiteHealthData(json);
    } catch (err) {
      setSiteHealthError(
        err.message || "Failed to load site health score KPI."
      );
    }
  };

  useEffect(() => {
    fetchData();
    fetchSiteHealthScore();
    fetchTopProblemSites();
    fetchAutoRebootImpact(autoRebootDays);
    fetchDowntimeImpact(downtimeImpactDays);

    const timer = setInterval(() => {
      fetchData();
      fetchSiteHealthScore();
      fetchTopProblemSites();
      fetchAutoRebootImpact(autoRebootDays);
      fetchDowntimeImpact(downtimeImpactDays);
    }, 60000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRebootDays, downtimeImpactDays]);

  const incidents = (data?.recentIncidents || []).filter(
    (item) => item.IncidentType !== "TEST_INCIDENT"
  );
  const summary = data?.summary || {};
  const incidentsByType = (data?.incidentsByType || []).filter(
    (item) => item.IncidentType !== "TEST_INCIDENT"
  );
  const incidentsBySite = data?.incidentsBySite || [];
  const incidentTrend = data?.incidentTrend || [];
  const topProblemSites = topSitesData?.sites || [];
  const topProblemSummary = topSitesData?.summary || {};
  const autoRebootCards = autoRebootData?.cards || {};
  const autoRebootRows = autoRebootData?.data || [];
  const downtimeCards = downtimeImpactData?.cards || {};
  const downtimeRows = downtimeImpactData?.data || [];
  const siteHealthCards = siteHealthData?.cards || {};
  const siteHealthRows = [...(siteHealthData?.data || [])].sort(
    (a, b) => Number(a.healthScore ?? 999) - Number(b.healthScore ?? 999)
  );

  return (
    <main className="page">
      <section className="header">
        <div>
          <h1>KPI Summary Dashboard</h1>
          <p>
            Incident trends, site performance, recovery time, and remote resolution metrics.
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
          <strong>Could not load KPI endpoint data.</strong> {error}
        </section>
      )}

      {loading && !data ? (
        <section className="loading">Loading KPI dashboard data...</section>
      ) : (
        <>
          <section className="kpi-grid">
            <KpiCard
              title="Total Incidents"
              value={summary.TotalIncidents ?? incidents.length}
              subtitle="All recorded incidents"
              icon={<AlertTriangle size={24} />}
            />

            <KpiCard
              title="Open Incidents"
              value={summary.OpenIncidents ?? 0}
              subtitle="Currently active"
              icon={<AlertTriangle size={24} />}
            />

            <KpiCard
              title="Recovered Incidents"
              value={summary.RecoveredIncidents ?? 0}
              subtitle="Closed incidents"
              icon={<CheckCircle2 size={24} />}
            />

            <KpiCard
              title="Avg Recovery Time"
              value={formatMinutes(summary.AverageRecoveryTimeMin)}
              subtitle="Based on recovered incidents"
              icon={<Clock size={24} />}
            />

            <KpiCard
              title="Remote Resolution"
              value={formatPercent(summary.RemoteResolutionRate)}
              subtitle="Successful auto-actions"
              icon={<Zap size={24} />}
            />
          </section>

          <section className="panel site-health-score-panel">
            <div className="panel-title-row">
              <div>
                <h2>Current Risk / Site Health Score</h2>
                <p>
                  Executive health classification for each site/device based on heartbeat
                  freshness, current slave status, open incidents, repeated incidents,
                  failed reboot attempts, and recovery duration.
                </p>
              </div>
            </div>

            {siteHealthError ? (
              <div className="error-box site-health-error">
                <strong>Could not load Site Health Score.</strong> {siteHealthError}
              </div>
            ) : (
              <>
                <section className="site-health-card-grid">
                  <div className="kpi-card site-health-card">
                    <div>
                      <p>Total Sites Returned</p>
                      <strong>{siteHealthCards.totalReturned ?? 0}</strong>
                      <span>Sites/devices assessed</span>
                    </div>
                  </div>

                  <div className="kpi-card site-health-card">
                    <div>
                      <p>Healthy Sites</p>
                      <strong>{siteHealthCards.healthy ?? 0}</strong>
                      <span>Score 80–100</span>
                    </div>
                  </div>

                  <div className="kpi-card site-health-card">
                    <div>
                      <p>Watch Sites</p>
                      <strong>{siteHealthCards.watch ?? 0}</strong>
                      <span>Score 60–79</span>
                    </div>
                  </div>

                  <div className="kpi-card site-health-card">
                    <div>
                      <p>Needs Attention</p>
                      <strong>{siteHealthCards.needsAttention ?? 0}</strong>
                      <span>Score 40–59</span>
                    </div>
                  </div>

                  <div className="kpi-card site-health-card">
                    <div>
                      <p>Critical Sites</p>
                      <strong>{siteHealthCards.critical ?? 0}</strong>
                      <span>Score below 40</span>
                    </div>
                  </div>

                  <div className="kpi-card site-health-card">
                    <div>
                      <p>Lowest Health Score</p>
                      <strong>{formatHealthScore(siteHealthCards.lowestHealthScore)}</strong>
                      <span>{siteHealthCards.highestRiskSite || "Highest risk site"}</span>
                    </div>
                  </div>
                </section>

                <div className="site-health-executive-note">
                  {Number(siteHealthCards.critical || 0) > 0 ? (
                    <span>
                      Critical sites are currently present. These sites should be reviewed
                      first because they combine weak health score, active incidents, or
                      recent recovery/reboot risk signals.
                    </span>
                  ) : Number(siteHealthCards.needsAttention || 0) > 0 ? (
                    <span>
                      Some sites require attention. Preventive maintenance should be
                      prioritized before they become critical.
                    </span>
                  ) : (
                    <span>
                      No critical site health conditions are currently detected. Continue
                      monitoring heartbeat freshness and incident recurrence.
                    </span>
                  )}
                </div>

                <div className="table-wrap">
                  <table className="site-health-score-table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Device</th>
                        <th>Environment</th>
                        <th>Health Score</th>
                        <th>Status</th>
                        <th>Heartbeat Age</th>
                        <th>Latest Slave Status</th>
                        <th>Open Incidents</th>
                        <th>Incidents 24h</th>
                        <th>Incidents 7d</th>
                        <th>Failed Reboots 24h</th>
                        <th>Main Reason</th>
                        <th>Recommended Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {siteHealthRows.map((row) => (
                        <tr key={`${row.siteCode}-${row.deviceId}`}>
                          <td>
                            <strong>{row.siteName}</strong>
                            <span>{row.siteCode}</span>
                          </td>

                          <td className="mono">{row.deviceId}</td>

                          <td>{row.environment || "—"}</td>

                          <td>
                            <div className="health-score-value">
                              {formatHealthScore(row.healthScore)}
                            </div>
                          </td>

                          <td>
                            <span className={healthStatusClass(row.healthStatus)}>
                              {row.healthStatus || "—"}
                            </span>
                          </td>

                          <td>{formatHeartbeatAge(row.heartbeatAgeMin)}</td>

                          <td>
                            <span className={statusClass(row.latestSlaveStatus)}>
                              {row.latestSlaveStatus || "—"}
                            </span>
                          </td>

                          <td>{row.openIncidents ?? 0}</td>

                          <td>{row.incidentsLast24h ?? 0}</td>

                          <td>{row.incidentsLast7Days ?? 0}</td>

                          <td>{row.failedRebootCountLast24h ?? 0}</td>

                          <td className="reason-cell">
                            {row.mainReason || "No major risk reason detected."}
                          </td>

                          <td className="recommendation-cell">
                            {row.recommendedAction || "Continue monitoring."}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="panel top-problem-sites-panel">
            <div className="panel-title-row">
              <div>
                <h2>Top Problem Sites</h2>
                <p>
                  Ranked sites with repeated incidents, downtime impact, and recommended
                  maintenance action.
                </p>
              </div>

              <div className="top-problem-summary">
                <span>Sites: {topProblemSummary.TotalSitesReturned ?? 0}</span>
                <span>7 Days: {topProblemSummary.TotalIncidentsLast7Days ?? 0}</span>
                <span>Open: {topProblemSummary.TotalOpenIncidents ?? 0}</span>
              </div>
            </div>

            {topSitesError ? (
              <div className="error-box top-problem-error">
                <strong>Could not load Top Problem Sites.</strong> {topSitesError}
              </div>
            ) : topProblemSites.length === 0 ? (
              <div className="no-incidents">
                No repeated problem sites found for the selected period.
              </div>
            ) : (
              <div className="table-wrap">
                <table className="top-problem-sites-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Site</th>
                      <th>Incidents 24h</th>
                      <th>Incidents 7d</th>
                      <th>Main Type</th>
                      <th>Open</th>
                      <th>Downtime</th>
                      <th>Last Incident</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topProblemSites.map((site) => (
                      <tr key={`${site.SiteCode}-${site.ProblemRank}`}>
                        <td>
                          <strong>#{site.ProblemRank}</strong>
                        </td>

                        <td>
                          <strong>{site.SiteName}</strong>
                          <span>{site.SiteCode}</span>
                        </td>

                        <td>{site.IncidentsLast24h ?? 0}</td>
                        <td>
                          <strong>{site.IncidentsLast7Days ?? 0}</strong>
                        </td>

                        <td>
                          <span className="status offline">
                            {site.MainIncidentType || "NONE"}
                          </span>
                          <span>{site.MainIncidentTypeCount ?? 0} times</span>
                        </td>

                        <td>{site.OpenIncidents ?? 0}</td>

                        <td>{Number(site.TotalDowntimeMin || 0).toFixed(1)} min</td>

                        <td>{site.LastIncidentAst || site.LastIncidentUtc || "—"}</td>

                        <td className="recommendation-cell">
                          {site.Recommendation || "Review site incident history."}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel auto-reboot-impact-panel">
            <div className="panel-title-row">
              <div>
                <h2>Auto-Reboot Success Rate and Recovery Impact</h2>
                <p>
                  Measures whether automatic reboot commands reduced manual intervention
                  and helped incidents recover faster.
                </p>
              </div>

              <div className="auto-reboot-controls">
                <label>
                  Period
                  <select
                    value={autoRebootDays}
                    onChange={(event) => setAutoRebootDays(Number(event.target.value))}
                  >
                    <option value={1}>Last 24 hours</option>
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </label>
              </div>
            </div>

            {autoRebootError ? (
              <div className="error-box auto-reboot-error">
                <strong>Could not load Auto-Reboot Impact.</strong> {autoRebootError}
              </div>
            ) : (
              <>
                <section className="auto-reboot-card-grid">
                  <div className="kpi-card auto-reboot-card">
                    <div>
                      <p>Auto Reboot Attempts</p>
                      <strong>
                        {formatKpiNumber(autoRebootCards.autoRebootAttempts)}
                      </strong>
                      <span>Commands attempted</span>
                    </div>
                  </div>

                  <div className="kpi-card auto-reboot-card">
                    <div>
                      <p>Successful Commands</p>
                      <strong>
                        {formatKpiNumber(autoRebootCards.successfulRebootCommands)}
                      </strong>
                      <span>Reboot command succeeded</span>
                    </div>
                  </div>

                  <div className="kpi-card auto-reboot-card">
                    <div>
                      <p>Failed Commands</p>
                      <strong>
                        {formatKpiNumber(autoRebootCards.failedRebootCommands)}
                      </strong>
                      <span>Command failed or timed out</span>
                    </div>
                  </div>

                  <div className="kpi-card auto-reboot-card">
                    <div>
                      <p>Success Rate</p>
                      <strong>
                        {formatKpiPercent(autoRebootCards.autoRebootSuccessPercent)}
                      </strong>
                      <span>Successful / attempted</span>
                    </div>
                  </div>

                  <div className="kpi-card auto-reboot-card">
                    <div>
                      <p>Recovered After Reboot</p>
                      <strong>
                        {formatKpiNumber(autoRebootCards.recoveredAfterReboot)}
                      </strong>
                      <span>Incidents recovered</span>
                    </div>
                  </div>

                  <div className="kpi-card auto-reboot-card">
                    <div>
                      <p>Avg Recovery Time</p>
                      <strong>
                        {formatKpiMinutes(
                          autoRebootCards.avgRecoveryTimeAfterRebootMin
                        )}
                      </strong>
                      <span>After reboot command</span>
                    </div>
                  </div>
                </section>

                <div className="auto-reboot-executive-note">
                  {Number(autoRebootCards.autoRebootAttempts || 0) === 0 ? (
                    <span>
                      No automatic reboot attempts were recorded during the selected
                      period.
                    </span>
                  ) : Number(autoRebootCards.recoveredAfterReboot || 0) > 0 ? (
                    <span>
                      Automatic reboot actions contributed to incident recovery during the
                      selected period. This indicates reduced need for manual site
                      intervention.
                    </span>
                  ) : (
                    <span>
                      Reboot commands were attempted, but no incident recovery was
                      confirmed after reboot during the selected period. Review failure
                      causes and device response logs.
                    </span>
                  )}
                </div>

                <div className="table-wrap">
                  <table className="auto-reboot-impact-table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Device</th>
                        <th>Incident Type</th>
                        <th>Reboot Time</th>
                        <th>Result Code</th>
                        <th>Recovered</th>
                        <th>Recovery Time</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>

                    <tbody>
                      {autoRebootRows.map((row) => (
                        <tr key={`${row.incidentId}-${row.deviceId}-${row.rebootRequestedUtc}`}>
                          <td>
                            <strong>{row.siteName}</strong>
                            <span>{row.siteCode}</span>
                          </td>

                          <td className="mono">{row.deviceId}</td>

                          <td>
                            <span className="status offline">
                              {normalizeIncidentType(row.incidentType)}
                            </span>
                          </td>

                          <td>{row.rebootRequestedAst || row.rebootRequestedUtc || "—"}</td>

                          <td>
                            <span
                              className={
                                Number(row.resultCode) >= 200 &&
                                Number(row.resultCode) < 300
                                  ? "status online"
                                  : "status down"
                              }
                            >
                              {row.resultCode ?? "—"}
                            </span>
                          </td>

                          <td>
                            <span
                              className={
                                row.recoveredAfterReboot ? "status online" : "status down"
                              }
                            >
                              {row.recoveredAfterReboot ? "YES" : "NO"}
                            </span>
                          </td>

                          <td>
                            {row.recoveryTimeAfterRebootMin !== null &&
                            row.recoveryTimeAfterRebootMin !== undefined
                              ? `${Number(row.recoveryTimeAfterRebootMin).toFixed(1)} min`
                              : "—"}
                          </td>

                          <td className="recommendation-cell">
                            {row.rebootImpactInterpretation || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="panel downtime-impact-panel">
            <div className="panel-title-row">
              <div>
                <h2>Downtime Impact by Site</h2>
                <p>
                  Identifies the sites with the highest operational downtime during the
                  selected period. This helps prioritize maintenance beyond simple
                  incident counts.
                </p>
              </div>

              <div className="downtime-impact-controls">
                <label>
                  Period
                  <select
                    value={downtimeImpactDays}
                    onChange={(event) =>
                      setDowntimeImpactDays(Number(event.target.value))
                    }
                  >
                    <option value={1}>Last 24 hours</option>
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                  </select>
                </label>
              </div>
            </div>

            {downtimeImpactError ? (
              <div className="error-box downtime-impact-error">
                <strong>Could not load Downtime Impact by Site.</strong>{" "}
                {downtimeImpactError}
              </div>
            ) : (
              <>
                <section className="downtime-impact-card-grid">
                  <div className="kpi-card downtime-impact-card">
                    <div>
                      <p>Sites Returned</p>
                      <strong>{formatKpiNumber(downtimeCards.sitesReturned)}</strong>
                      <span>Ranked sites</span>
                    </div>
                  </div>

                  <div className="kpi-card downtime-impact-card">
                    <div>
                      <p>Total Incidents</p>
                      <strong>
                        {formatKpiNumber(downtimeCards.totalIncidentCount)}
                      </strong>
                      <span>Selected period</span>
                    </div>
                  </div>

                  <div className="kpi-card downtime-impact-card">
                    <div>
                      <p>Total Downtime</p>
                      <strong>{formatKpiMinutes(downtimeCards.totalDowntimeMin)}</strong>
                      <span>Operational impact</span>
                    </div>
                  </div>

                  <div className="kpi-card downtime-impact-card">
                    <div>
                      <p>Open Incidents</p>
                      <strong>
                        {formatKpiNumber(downtimeCards.totalOpenIncidents)}
                      </strong>
                      <span>Currently unresolved</span>
                    </div>
                  </div>

                  <div className="kpi-card downtime-impact-card">
                    <div>
                      <p>Highest Downtime Site</p>
                      <strong>{downtimeCards.highestDowntimeSite || "—"}</strong>
                      <span>Highest impact site</span>
                    </div>
                  </div>

                  <div className="kpi-card downtime-impact-card">
                    <div>
                      <p>Highest Downtime</p>
                      <strong>
                        {formatKpiMinutes(downtimeCards.highestDowntimeMin)}
                      </strong>
                      <span>Single site impact</span>
                    </div>
                  </div>
                </section>

                <div className="downtime-impact-executive-note">
                  {Number(downtimeCards.totalIncidentCount || 0) === 0 ? (
                    <span>
                      No downtime-related incidents were recorded during the selected
                      period.
                    </span>
                  ) : Number(downtimeCards.totalDowntimeMin || 0) > 0 ? (
                    <span>
                      Downtime impact analysis highlights which sites contributed most to
                      operational disruption. Sites with high downtime should be
                      prioritized for root-cause analysis and preventive maintenance.
                    </span>
                  ) : (
                    <span>
                      Incidents were recorded, but no completed downtime duration was
                      available for the selected period. Review open incidents and recovery
                      tracking.
                    </span>
                  )}
                </div>

                <div className="table-wrap">
                  <table className="downtime-impact-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Site</th>
                        <th>Incidents</th>
                        <th>Total Downtime</th>
                        <th>Avg Downtime</th>
                        <th>Longest Incident</th>
                        <th>Open</th>
                        <th>Current Unresolved</th>
                        <th>Last Incident</th>
                        <th>Status</th>
                        <th>Interpretation</th>
                      </tr>
                    </thead>

                    <tbody>
                      {downtimeRows.map((row) => (
                        <tr key={`${row.siteCode}-${row.downtimeRank}`}>
                          <td>
                            <strong>#{row.downtimeRank}</strong>
                          </td>

                          <td>
                            <strong>{row.siteName}</strong>
                            <span>{row.siteCode}</span>
                          </td>

                          <td>{row.incidentCount ?? 0}</td>

                          <td>
                            <strong>{formatKpiMinutes(row.totalDowntimeMin)}</strong>
                          </td>

                          <td>{formatKpiMinutes(row.avgDowntimePerIncidentMin)}</td>

                          <td>{formatKpiMinutes(row.longestIncidentDurationMin)}</td>

                          <td>
                            <span
                              className={
                                Number(row.openIncidentCount || 0) > 0
                                  ? "status down"
                                  : "status online"
                              }
                            >
                              {row.openIncidentCount ?? 0}
                            </span>
                          </td>

                          <td>
                            {formatKpiMinutes(row.currentUnresolvedDurationMin)}
                          </td>

                          <td>{row.lastIncidentAst || row.lastIncidentUtc || "—"}</td>

                          <td>
                            <span
                              className={
                                String(row.status || "")
                                  .toLowerCase()
                                  .includes("high")
                                  ? "status down"
                                  : "status offline"
                              }
                            >
                              {row.status || "—"}
                            </span>
                          </td>

                          <td className="recommendation-cell">
                            {row.executiveInterpretation ||
                              "Review site downtime and incident pattern."}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="kpi-layout-improved">
            {/* Full-width Incident Trend */}
            <section className="panel kpi-panel-full">
              <h2>Incident Trend</h2>
              <p>Incident count by date.</p>

              <div className="chart-box chart-box-large">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incidentTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="StartDate"
                      tickFormatter={formatShortDate}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="IncidentCount"
                      stroke="#2563eb"
                      strokeWidth={3}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Two-column middle row */}
            <section className="panel">
              <h2>Incidents by Type</h2>
              <p>Distribution of incident categories.</p>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incidentsByType}
                      dataKey="IncidentCount"
                      nameKey="IncidentTypeDisplay"
                      outerRadius={105}
                      label
                    >
                      {incidentsByType.map((entry, index) => (
                        <Cell
                          key={entry.IncidentTypeDisplay || entry.IncidentType}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />

                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      formatter={(value) => (
                        <span style={{ color: "#334155", fontWeight: 600 }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <h2>Incidents by Site</h2>
              <p>Sites with the highest incident count.</p>

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incidentsBySite}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="SiteName" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="IncidentCount"
                      fill="#2563eb"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Full-width Recent Incidents */}
            <section className="panel kpi-panel-full">
              <h2>Recent Incidents</h2>
              <p>Latest incident records from the KPI endpoint.</p>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Site</th>
                      <th>Device</th>
                      <th>Type</th>
                      <th>State</th>
                      <th>Start</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.slice(0, 12).map((incident) => (
                      <tr key={incident.IncidentId}>
                        <td>{incident.IncidentId}</td>
                        <td>
                          <strong>{incident.SiteName}</strong>
                          <span>{incident.SiteCode}</span>
                        </td>
                        <td className="mono">{incident.DeviceId}</td>
                        <td>
                          {incident.IncidentTypeDisplay ||
                            normalizeIncidentType(incident.IncidentType)}
                        </td>
                        <td>
                          <span
                            className={
                              incident.State === "Recovered"
                                ? "status online"
                                : "status down"
                            }
                          >
                            {incident.State}
                          </span>
                        </td>
                        <td>{incident.StartAst || incident.StartUtc || "—"}</td>
                        <td>{formatMinutes(incident.DurationMin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>


        </>
      )}
    </main>
  );
}