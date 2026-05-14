import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  UserCheck,
} from "lucide-react";

const INCIDENTS_ENDPOINT = import.meta.env.VITE_EMPLOYEE_INCIDENTS_ENDPOINT;
const CLOSE_ENDPOINT = import.meta.env.VITE_CLOSE_EMPLOYEE_INCIDENT_ENDPOINT;

const POLL_INTERVAL_MS = 60000;

function statusClass(status) {
  switch (status) {
    case "CLOSED":
      return "status online";

    case "OPEN":
      return "status down";

    default:
      return "status unknown";
  }
}

function errorClass(errorType) {
  switch (errorType) {
    case "length":
      return "status down";
    case "pattern":
      return "status offline";
    case "directory":
      return "status disconnected";
    default:
      return "status unknown";
  }
}

function formatDate(value) {
  if (!value) return "—";
  return String(value).replace("T", " ");
}

function getIncidentStatus(incident) {
  if (incident.ValidationStatus !== "INVALID") {
    return "NOT_APPLICABLE";
  }

  if (incident.IncidentStatus === "CLOSED") {
    return "CLOSED";
  }

  return "OPEN";
}

function isClosedIncident(incident) {
  const status = getIncidentStatus(incident);
  return status === "CLOSED";
}

function getSortRank(incident) {
  const status = getIncidentStatus(incident);

  if (status === "OPEN") return 1;
  if (status === "CLOSED") return 2;

  return 3;
}

export default function EmployeeRegistrationIncidents() {
  const [data, setData] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorFilter, setErrorFilter] = useState("ALL");
  const [empSearch, setEmpSearch] = useState("");

  const [closedBy, setClosedBy] = useState("");
  const [closureEmpId, setClosureEmpId] = useState("");
  const [closureName, setClosureName] = useState("");
  const [closureNotes, setClosureNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchIncidents = async (manual = false) => {
    try {
      if (manual) setRefreshing(true);

      setError(null);

      const params = new URLSearchParams();
      params.set("limit", "100");

      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      if (errorFilter !== "ALL") {
        params.set("error", errorFilter);
      }

      if (empSearch.trim()) {
        params.set("empId", empSearch.trim());
      }

      const response = await fetch(`${INCIDENTS_ENDPOINT}?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        let errorText = "";

        try {
          errorText = await response.text();
        } catch {
          errorText = "";
        }
      
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`
        );
      }

      const json = await response.json();
      setData(json);

      if (selectedIncident) {
        const updatedSelected = json.incidents?.find(
          (item) => item.ValidationId === selectedIncident.ValidationId
        );

        if (updatedSelected) {
          setSelectedIncident(updatedSelected);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load employee registration incidents");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    const timer = setInterval(() => {
      fetchIncidents();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, errorFilter]);

  const incidents = useMemo(() => {
    const list = data?.incidents || [];

    return [...list].sort((a, b) => {
      const rankDiff = getSortRank(a) - getSortRank(b);

      if (rankDiff !== 0) return rankDiff;

      const aDate = new Date(a.FirstDetectedUtc || a.LastCheckedUtc || 0).getTime();
      const bDate = new Date(b.FirstDetectedUtc || b.LastCheckedUtc || 0).getTime();

      return bDate - aDate;
    });
  }, [data]);

  const summary = data?.summary || {};

  const totalIncidents = summary.InvalidCount ?? 0;
  const openIncidents = summary.OpenIncidentCount ?? 0;
  const closedIncidents = summary.ClosedIncidentCount ?? 0;
  const validRecords = summary.ValidCount ?? 0;

  const selectIncident = (incident) => {
    setSelectedIncident(incident);
    setClosureEmpId(incident.EmpId || "");
    setClosureName("");
    setClosedBy("");
    setClosureNotes("");
    setSuccessMessage(null);
    setError(null);
  };

  const closeSelectedIncident = async () => {
    if (!selectedIncident) {
      setError("Please select an incident first.");
      return;
    }

    if (!closedBy.trim()) {
      setError("Please enter the name of the person closing the incident.");
      return;
    }

    if (!closureNotes.trim()) {
      setError("Please enter closure notes.");
      return;
    }

    try {
      setClosing(true);
      setError(null);
      setSuccessMessage(null);

      const notes = [
        closureNotes.trim(),
        closureName.trim() ? `Employee name: ${closureName.trim()}` : null,
        closureEmpId.trim() ? `Employee ID confirmed: ${closureEmpId.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const body = {
        validationId: selectedIncident.ValidationId,
        closedBy: closedBy.trim(),
        notes,
      };

      const response = await fetch(CLOSE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || json.message || `HTTP ${response.status}`);
      }

      if (json.status === "already_closed") {
        setSuccessMessage("Incident was already closed. The list has been refreshed.");
      } else {
        setSuccessMessage("Incident closed successfully.");
      }

      await fetchIncidents(true);
    } catch (err) {
      setError(err.message || "Failed to close incident");
    } finally {
      setClosing(false);
    }
  };

  return (
    <main className="page">
      <section className="header">
        <div>
          <div className="eyebrow">
            <UserCheck size={18} />
            IoT Attendance Monitoring
          </div>

          <h1>Employee Registration Incidents</h1>

          <p>
            Review invalid employee registration records, select an incident,
            and close it after HR/admin verification.
          </p>
        </div>

        <div className="header-actions">
          <button onClick={() => fetchIncidents(true)} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            Refresh now
          </button>

          <small>Auto-refresh every {POLL_INTERVAL_MS / 1000}s</small>
        </div>
      </section>

      {error && (
        <section className="error-box">
          <strong>Error:</strong> {error}
        </section>
      )}

      {successMessage && (
        <section className="success-box">
          <strong>Success:</strong> {successMessage}
        </section>
      )}

      {loading && !data ? (
        <section className="loading">Loading employee registration incidents...</section>
      ) : (
        <>
        <section className="kpi-grid employee-registration-summary">
        <div className="kpi-card">
            <div>
            <p>Total Incidents</p>
            <strong>{totalIncidents}</strong>
            <span>Invalid employee registration records</span>
            </div>
        </div>

        <div className="kpi-card">
            <div>
            <p>Open Incidents</p>
            <strong>{openIncidents}</strong>
            <span>Require review and closure</span>
            </div>
        </div>

        <div className="kpi-card">
            <div>
            <p>Closed Incidents</p>
            <strong>{closedIncidents}</strong>
            <span>Acknowledged and closed</span>
            </div>
        </div>

        <div className="kpi-card">
            <div>
            <p>Valid Records</p>
            <strong>{validRecords}</strong>
            <span>Not shown in incident list</span>
            </div>
        </div>
        </section>

          <section className="employee-registration-layout employee-registration-layout-stacked">
        <section className="panel employee-detail-panel">
            <h2>Selected Incident</h2>

            {!selectedIncident ? (
            <div className="employee-empty-selection">
                <AlertTriangle size={24} />
                <p>Select an incident from the table to review and close it.</p>
            </div>
            ) : (
            <>
                <div className="employee-detail-grid">
                <div>
                    <span>Validation ID</span>
                    <strong>{selectedIncident.ValidationId}</strong>
                </div>

                <div>
                    <span>Employee ID</span>
                    <strong>{selectedIncident.EmpId}</strong>
                </div>

                <div>
                    <span>Error Type</span>
                    <strong>{selectedIncident.ErrorType}</strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>{getIncidentStatus(selectedIncident)}</strong>
                </div>

                <div className="employee-detail-wide">
                    <span>Main Error</span>
                    <strong>{selectedIncident.MainValidationError}</strong>
                </div>

                <div>
                    <span>First Detected</span>
                    <strong>{formatDate(selectedIncident.FirstDetectedAst)}</strong>
                </div>

                <div>
                    <span>Last Checked</span>
                    <strong>{formatDate(selectedIncident.LastCheckedAst)}</strong>
                </div>

                {isClosedIncident(selectedIncident) && (
                <>
                    <div className="employee-detail-wide">
                    <span>Closed By</span>
                    <strong>{selectedIncident.ClosedBy || "—"}</strong>
                    </div>

                    <div className="employee-detail-wide">
                    <span>Closed Time</span>
                    <strong>{formatDate(selectedIncident.ClosedAst)}</strong>
                    </div>

                    <div className="employee-detail-wide">
                    <span>Closure Notes</span>
                    <strong>{selectedIncident.ClosureNotes || "—"}</strong>
                    </div>
                </>
                )}
                </div>

                <div className="closure-form">
                <h3>Close / Acknowledge Incident</h3>

                {isClosedIncident(selectedIncident) ? (
                    <div className="already-closed-box">
                    <CheckCircle2 size={18} />
                    This incident is already closed.
                    </div>
                ) : (
                    <>
                    <label>
                        Closed by
                        <input
                            value={closedBy}
                            onChange={(event) => setClosedBy(event.target.value)}
                            placeholder="Reviewer name"
                        />
                        </label>
                        <label>
                            Comments / closure notes
                        <input
                            value={closureNotes}
                            onChange={(event) => setClosureNotes(event.target.value)}
                            placeholder="Reviewed and acknowledged."
                        />
                        </label>

                        <button
                        type="button"
                        className="close-incident-button"
                        onClick={closeSelectedIncident}
                        disabled={closing}
                        >
                        {closing ? "Closing..." : "Close Incident"}
                        </button>
                    </>
                )}
                </div>
            </>
            )}
        </section>

        <section className="panel employee-list-panel">
            <div className="employee-panel-title">
            <div>
                <h2>Incident List</h2>
                <p>Open and active incidents are shown first.</p>
            </div>

            <div className="employee-filters">
                <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                >
                <option value="ALL">All statuses</option>
                <option value="OPEN">OPEN</option>
                <option value="CLOSED">CLOSED</option>
                </select>

                <select
                value={errorFilter}
                onChange={(event) => setErrorFilter(event.target.value)}
                >
                <option value="ALL">All errors</option>
                <option value="length">Length</option>
                <option value="pattern">Pattern</option>
                <option value="directory">Directory</option>
                <option value="other">Other</option>
                </select>

                <div className="employee-search">
                <Search size={16} />
                <input
                    value={empSearch}
                    onChange={(event) => setEmpSearch(event.target.value)}
                    onKeyDown={(event) => {
                    if (event.key === "Enter") fetchIncidents(true);
                    }}
                    placeholder="Employee ID"
                />
                </div>

                <button type="button" onClick={() => fetchIncidents(true)}>
                Search
                </button>
            </div>
            </div>

            <div className="table-wrap">
            <table className="employee-incident-table">
                <thead>
                <tr>
                    <th>Validation ID</th>
                    <th>Employee ID</th>
                    <th>Main Error</th>
                    <th>Error Type</th>
                    <th>Incident Status</th>
                    <th>First Detected</th>
                    <th>Last Checked</th>
                    <th>Closed By</th>
                    <th>Closed Time</th>
                    <th>Closure Notes</th>
                </tr>
                </thead>

                <tbody>
                {incidents.map((incident) => {
                    const selected =
                    selectedIncident?.ValidationId === incident.ValidationId;

                    return (
                    <tr
                        key={incident.ValidationId}
                        className={selected ? "selected-row" : ""}
                        onClick={() => selectIncident(incident)}
                    >
                        <td>{incident.ValidationId}</td>
                        <td className="mono">{incident.EmpId}</td>
                        <td>{incident.MainValidationError}</td>
                        <td>
                        <span className={errorClass(incident.ErrorType)}>
                            {incident.ErrorType || "other"}
                        </span>
                        </td>
                        <td>
                        <span className={statusClass(getIncidentStatus(incident))}>
                            {getIncidentStatus(incident)}
                        </span>
                        </td>
                        <td>{formatDate(incident.FirstDetectedAst)}</td>
                        <td>{formatDate(incident.LastCheckedAst)}</td>
                        <td>{incident.ClosedBy || "—"}</td>
                        <td>{formatDate(incident.ClosedAst)}</td>
                        <td>{incident.ClosureNotes || "—"}</td>
                    </tr>
                    );
                })}
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