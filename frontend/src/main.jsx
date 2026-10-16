import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API = '/api';

function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0, closed: 0 });
  const [filter, setFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setError('');
      const [ticketsRes, statsRes] = await Promise.all([
        fetch(`${API}/tickets`),
        fetch(`${API}/tickets/stats`)
      ]);

      if (!ticketsRes.ok || !statsRes.ok) {
        throw new Error('Backend service unavailable');
      }

      const ticketsData = await ticketsRes.json();
      const statsData = await statsRes.json();

      setTickets(ticketsData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || 'Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleTickets = tickets.filter(ticket => {
    const matchesStatus = filter === 'ALL' || ticket.status === filter;
    const matchesCategory = categoryFilter === 'ALL' || ticket.category === categoryFilter;
    return matchesStatus && matchesCategory;
  });

  const nextStatusMap = {
    'OPEN': 'IN_PROGRESS',
    'IN_PROGRESS': 'RESOLVED',
    'RESOLVED': 'CLOSED',
    'CLOSED': 'OPEN'
  };

  const advanceStatus = async (ticket) => {
    try {
      const nextStatus = nextStatusMap[ticket.status] || 'OPEN';
      const res = await fetch(`${API}/tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const deleteTicket = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ticket?')) return;
    try {
      const res = await fetch(`${API}/tickets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Error deleting ticket:', err);
    }
  };

  const createTicket = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      priority: formData.get('priority'),
      assignee: formData.get('assignee') || 'Bharath Kadali',
      status: 'OPEN'
    };

    try {
      const res = await fetch(`${API}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        e.currentTarget.reset();
        setShowForm(false);
        loadData();
      }
    } catch (err) {
      console.error('Error creating ticket:', err);
    }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">⚡</span>
          <div>
            <b>CloudDesk</b>
            <small>IT Helpdesk & SRE Ops</small>
          </div>
        </div>

        <nav>
          <a className="active">
            <span>📊</span>
            <span>Ticket Console</span>
          </a>
          <a>
            <span>🛡️</span>
            <span>Security & Compliance</span>
          </a>
          <a>
            <span>⚙️</span>
            <span>Cluster Services</span>
          </a>
          <a>
            <span>📈</span>
            <span>Metrics & Observability</span>
          </a>
        </nav>

        <div className="side-bottom">
          <div className="upgrade">
            <strong>DevSecOps Pipeline</strong>
            <p>Automated builds, Trivy CVE scans & GitOps deployment.</p>
          </div>
          <div className="profile">
            <div className="avatar">BK</div>
            <div>
              <b>Bharath Kadali</b>
              <small>DevSecOps Lead</small>
            </div>
            <span>⋮</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main">
        <header>
          <div>
            <p className="eyebrow">OPERATIONS / HELPDESK OVERVIEW</p>
            <h1>IT Helpdesk Console</h1>
            <p className="muted">Monitor, prioritize, and resolve enterprise infrastructure and access requests.</p>
          </div>
          <button className="primary" onClick={() => setShowForm(true)}>
            ＋ Create Ticket
          </button>
        </header>

        {error && (
          <div className="alert">
            ⚠️ <strong>Connection Notice:</strong> {error}. Ensure backend is running at <code>:8000</code> with PostgreSQL.
          </div>
        )}

        {/* Metric Cards */}
        <section className="stats">
          <Stat label="Total Tickets" value={stats.total} icon="📋" color="blue" />
          <Stat label="Open Issues" value={stats.open} icon="🚨" color="amber" />
          <Stat label="In Progress" value={stats.inProgress} icon="⏳" color="purple" />
          <Stat label="Resolved" value={stats.resolved} icon="✅" color="green" />
        </section>

        {/* Main Grid: Tickets Table + Live Activity */}
        <section className="content-grid">
          <div className="panel tickets-panel">
            <div className="panel-head">
              <div>
                <h2>Active Incident Tickets</h2>
                <p className="muted">Real-time status updates across cloud infrastructure.</p>
              </div>
              <div className="filter-controls">
                <div className="filters">
                  {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(statusKey => (
                    <button
                      key={statusKey}
                      className={filter === statusKey ? 'selected' : ''}
                      onClick={() => setFilter(statusKey)}
                    >
                      {statusKey === 'ALL' ? 'All Status' : statusKey.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="empty">Loading ticket records...</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ticket Summary</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assignee</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleTickets.map(ticket => (
                      <tr key={ticket.id}>
                        <td>
                          <div className="ticket-title">
                            <span className={`dot ${ticket.status.toLowerCase()}`}></span>
                            <div>
                              <b>{ticket.title}</b>
                              <small>{ticket.description || 'No description provided.'}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="category-pill">{ticket.category}</span>
                        </td>
                        <td>
                          <span className={`priority ${ticket.priority.toLowerCase()}`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`status ${ticket.status.toLowerCase()}`}>
                            {ticket.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <span className="assignee-text">{ticket.assignee}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="icon-btn"
                            onClick={() => advanceStatus(ticket)}
                            title="Advance to next workflow state"
                          >
                            ↻ Status
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => deleteTicket(ticket.id)}
                            title="Delete ticket"
                            style={{ marginLeft: '6px' }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!visibleTickets.length && (
                  <div className="empty">No tickets match the selected filters.</div>
                )}
              </div>
            )}
          </div>

          {/* Activity Stream & CI/CD Status */}
          <aside className="panel activity">
            <div className="panel-head">
              <div>
                <h2>Live Ops Activity</h2>
                <p className="muted">Recent cluster & CI events.</p>
              </div>
            </div>
            <Activity icon="🛡️" text="Trivy security scan passed with 0 critical CVEs" time="4 min ago" />
            <Activity icon="⚡" text="ArgoCD synchronized revision to EKS" time="15 min ago" />
            <Activity icon="📈" text="Prometheus scraping targets verified UP" time="32 min ago" />
            <Activity icon="🔒" text="TLS certificate renewed for Ingress" time="1 hr ago" />
            <Activity icon="🚀" text="GitHub Actions workflow ran tests clean" time="2 hrs ago" />

            <div className="pipeline">
              <span className="pipe-step passed">Pytest</span>
              <i></i>
              <span className="pipe-step passed">Trivy</span>
              <i></i>
              <span className="pipe-step passed">GHCR</span>
              <i></i>
              <span className="pipe-step passed">ArgoCD</span>
            </div>
          </aside>
        </section>

        {/* Modal: Create Ticket */}
        {showForm && (
          <div className="modal-backdrop">
            <form className="modal" onSubmit={createTicket}>
              <div className="modal-head">
                <div>
                  <p className="eyebrow">NEW INCIDENT / REQUEST</p>
                  <h2>Create Support Ticket</h2>
                </div>
                <button type="button" className="close" onClick={() => setShowForm(false)}>
                  ×
                </button>
              </div>

              <label>
                Ticket Title
                <input
                  name="title"
                  required
                  placeholder="e.g., Ingress 502 Bad Gateway on staging cluster"
                />
              </label>

              <label>
                Detailed Description
                <textarea
                  name="description"
                  placeholder="Describe root cause, logs or user symptoms..."
                />
              </label>

              <div className="form-row">
                <label>
                  Category
                  <select name="category" defaultValue="INFRASTRUCTURE">
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="APPLICATION">APPLICATION</option>
                    <option value="ACCESS">ACCESS</option>
                    <option value="GENERAL">GENERAL</option>
                  </select>
                </label>

                <label>
                  Priority Level
                  <select name="priority" defaultValue="MEDIUM">
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </label>
              </div>

              <div className="form-row">
                <label>
                  Assignee
                  <input name="assignee" defaultValue="Bharath Kadali" />
                </label>
              </div>

              <button className="primary full" type="submit">
                Submit Support Ticket
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value, icon, color }) {
  return (
    <div className={`stat ${color || ''}`}>
      <div className="stat-icon">{icon}</div>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>Real-time metric</span>
      </div>
    </div>
  );
}

function Activity({ icon, text, time }) {
  return (
    <div className="activity-row">
      <span className="activity-icon">{icon}</span>
      <div>
        <b>{text}</b>
        <small>{time}</small>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
