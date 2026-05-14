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
  TrendingUp,
  Zap,
} from "lucide-react";

const KPI_ENDPOINT = import.meta.env.VITE_KPI_ENDPOINT;

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#dc2626", "#64748b"];

function normalizeIncidentType(type) {
  const map = {
    SLAVE_OFFLINE: "OFFLINE",
    SLAVE_DOWN: "DOWN",
    IOT_DEVICE_DISCONNECTED: "DISCONNECTED",
  };

  return map[type] || type || "UNKNOWN";
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

  useEffect(() => {
    fetchData();

    const timer = setInterval(() => {
      fetchData();
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const incidents = data?.recentIncidents || [];
  const summary = data?.summary || {};
  const incidentsByType = data?.incidentsByType || [];
  const incidentsBySite = data?.incidentsBySite || [];
  const incidentTrend = data?.incidentTrend || [];

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="eyebrow">
            <TrendingUp size={18} />
            IoT Attendance Monitoring
          </div>
          <h1>KPI Summary Dashboard</h1>
          <p>
            Management summary, incident trends, recovery performance, and site
            comparison.
          </p>
        </div>

        <div className="header-actions">
          <button onClick={() => fetchData(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            Refresh now
          </button>
          <small>Auto-refresh every 60 seconds</small>
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

          <section className="kpi-layout-improved">
            {/* Full-width Incident Trend */}
            <section className="panel kpi-panel-full">
              <h2>Incident Trend</h2>
              <p>Incident count by date.</p>

              <div className="chart-box chart-box-large">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={incidentTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="StartDate" />
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