'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import { Users, Package, TrendingUp, CheckCircle, Clock, XCircle, LogOut, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Recharts config (props ของไลบรารี ไม่ใช่ inline style ของ JSX) ──
// ค่าสีอ้างอิง CSS Variables จาก globals.css เท่านั้น
const AXIS_TICK = { fill: 'var(--n-400)', fontSize: 12 };
const AXIS_TICK_MONO = { fill: 'var(--n-400)', fontSize: 12, fontFamily: 'monospace' };
const AXIS_LINE = { stroke: 'var(--n-200)' };
const TOOLTIP_SQUARE: CSSProperties = {
  background: 'var(--n-50)', border: '1px solid var(--n-200)', borderRadius: 0,
  color: 'var(--n-900)', fontFamily: 'monospace',
};
const TOOLTIP_SOFT: CSSProperties = {
  borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};
const TOOLTIP_LABEL: CSSProperties = {
  color: 'var(--brand-500)', fontWeight: 700, marginBottom: '0.5rem',
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<{ customers: any[]; merchants: any[]; drivers: any[] }>({
    customers: [], merchants: [], drivers: []
  });
  const [activeTab, setActiveTab] = useState<'customers' | 'merchants' | 'drivers'>('customers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<7 | 30 | 90>(90);

  const [suspendingUser, setSuspendingUser] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const getCookie = (name: string) => {
    const v = `; ${document.cookie}`;
    const p = v.split(`; ${name}=`);
    return p.length === 2 ? p.pop()?.split(';').shift() ?? null : null;
  };

  const fetchAll = useCallback(async () => {
    const role = getCookie('role');
    if (!role || role !== 'Admin') { router.push('/admin/login'); return; }
    setRefreshing(true);
    try {
      const [statsRes, custRes, merRes, drvRes] = await Promise.all([
        fetch('/api/proxy/orders/admin/stats'),
        fetch('/api/proxy/users?role=Customer'),
        fetch('/api/proxy/users?role=Merchant'),
        fetch('/api/proxy/users?role=Driver'),
      ]);
      if (statsRes.status === 401 || statsRes.status === 403) { router.push('/admin/login'); return; }
      if (statsRes.ok) setStats(await statsRes.json());
      setUsers({
        customers: custRes.ok ? await custRes.json() : [],
        merchants: merRes.ok ? await merRes.json() : [],
        drivers: drvRes.ok ? await drvRes.json() : [],
      });
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [router]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const handleSuspend = async () => {
    if (!suspendingUser || !suspendReason.trim()) return;
    setActionLoading(suspendingUser.id);
    try {
      const roleCapitalized = activeTab === 'customers' ? 'Customer' : activeTab === 'merchants' ? 'Merchant' : 'Driver';
      const res = await fetch(`/api/proxy/users/${suspendingUser.id}/suspend?role=${roleCapitalized}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason }),
      });
      if (res.ok) {
        setSuspendingUser(null);
        setSuspendReason('');
        await fetchAll();
      } else {
        toast.error('Failed to suspend user');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (id: number) => {
    setActionLoading(id);
    try {
      const roleCapitalized = activeTab === 'customers' ? 'Customer' : activeTab === 'merchants' ? 'Merchant' : 'Driver';
      const res = await fetch(`/api/proxy/users/${id}/approve?role=${roleCapitalized}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        await fetchAll();
      } else {
        toast.error('Failed to approve user');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const currentUsers = users[activeTab];
  const filteredUsers = search
    ? currentUsers.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : currentUsers;

  const tabLabel: Record<string, string> = { customers: 'Customer', merchants: 'Merchant', drivers: 'Driver' };

  // ข้อมูลกราฟจริงจาก API — ตัดตามช่วงวันที่เลือก
  const revenueData: { date: string; revenue: number }[] = (stats?.revenueChart ?? []).slice(-range);
  const userGrowthData: { date: string; users: number }[] = (stats?.userGrowth ?? []).slice(-range);
  const rangeRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
  const orderVolumeData: { date: string; orders: number }[] = (stats?.orderVolume ?? []).slice(-range);
  const rangeOrders = orderVolumeData.reduce((sum, d) => sum + d.orders, 0);

  const STATUS_META: { key: string; label: string; color: string }[] = [
    { key: 'DELIVERED', label: 'ส่งสำเร็จ', color: 'var(--adm-status-delivered)' },
    { key: 'SHIPPING', label: 'กำลังจัดส่ง', color: 'var(--adm-status-shipping)' },
    { key: 'PICKED_UP', label: 'รับพัสดุแล้ว', color: 'var(--adm-status-picked_up)' },
    { key: 'ACCEPTED', label: 'คนขับรับงาน', color: 'var(--adm-status-accepted)' },
    { key: 'PENDING', label: 'รอดำเนินการ', color: 'var(--adm-status-pending)' },
    { key: 'CANCELLED', label: 'ยกเลิก', color: 'var(--adm-status-cancelled)' },
  ];
  const statusData = STATUS_META
    .map(s => ({ key: s.key, name: s.label, value: stats?.statusDistribution?.[s.key] ?? 0, color: s.color }))
    .filter(s => s.value > 0);

  if (loading) return (
    <div className="sp-page-loading">
      <span className="sp-spinner sp-spinner-lg" />
      <p className="sp-caps adm-loading-caption">Loading Control Center</p>
    </div>
  );

  return (
    <div className="sp-page">

      {/* Nav */}
      <nav className="sp-nav">
        <div className="adm-nav-brand">
          <span className="sp-logo">
            Swift<span className="sp-logo-accent">Path</span>
          </span>
          <span className="sp-caps adm-nav-tag">
            Control Center
          </span>
        </div>
        <div className="adm-nav-actions">
          <button className="adm-icon-btn" onClick={fetchAll} disabled={refreshing} aria-label="Refresh">
            <RefreshCw size={16} className={refreshing ? 'adm-spin' : undefined} />
          </button>
          <button id="btn-admin-logout" className="adm-logout-btn" onClick={handleLogout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main className="adm-main">

        {/* Header */}
        <div className="sp-animate-d1 adm-header">
          <span className="sp-section-eyebrow adm-eyebrow">System Overview</span>
          <h1 className="sp-font-display sp-text-hero">
            Admin Dashboard
          </h1>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="sp-kpi-row sp-kpi-row--admin sp-animate-d2 adm-section">
            {[
              { label: 'Total Orders', value: stats.totalOrders, tone: 'orders' },
              { label: 'Total Revenue', value: `฿${Number(stats.totalRevenue).toLocaleString()}`, tone: 'revenue' },
              { label: 'Active Users', value: stats.activeUsers?.total ?? 0, tone: 'users' },
              { label: 'Delivered', value: stats.deliveredOrders, tone: 'delivered' },
              { label: 'Pending', value: stats.pendingOrders, tone: 'pending' },
              { label: 'Cancelled', value: stats.cancelledOrders, tone: 'cancelled' },
            ].map(({ label, value, tone }) => (
              <div key={label} className="adm-kpi-item">
                <span className="sp-stat-label adm-kpi-label">{label}</span>
                <div className={`sp-stat-number sp-font-display adm-kpi-num--${tone}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Range selector */}
        {stats && (
          <div className="sp-animate-d3 adm-range">
            {([7, 30, 90] as const).map(d => (
              <button
                key={d}
                id={`btn-range-${d}`}
                className={`adm-range-btn${range === d ? ' is-active' : ''}`}
                onClick={() => setRange(d)}
              >
                {d} Days
              </button>
            ))}
          </div>
        )}

        {/* Revenue Chart */}
        {stats?.revenueChart && (
          <div className="sp-animate-d3 adm-section-lg">
            <div className="sp-section-divider adm-divider" />
            <div className="adm-panel-head">
              <div>
                <p className="sp-caps adm-caps-muted">Revenue by Delivery Date</p>
                <h2 className="sp-font-display adm-h2">
                  {range}-Day Overview
                </h2>
              </div>
              <span className="sp-mono adm-meta">
                Period Revenue: <strong>฿{rangeRevenue.toLocaleString()}</strong>
                <br />
                Success Rate: <strong className="is-positive">{stats.successRate}%</strong>
              </span>
            </div>
            <div className="adm-chart-box">
              <ResponsiveContainer width="100%" height={240} minWidth={0} initialDimension={{ width: 600, height: 240 }}>
                <BarChart data={revenueData} barCategoryGap="20%">
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} interval="preserveStartEnd" minTickGap={24} tick={AXIS_TICK_MONO} axisLine={AXIS_LINE} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={TOOLTIP_SQUARE}
                    formatter={(v: any) => [`฿${Number(v).toLocaleString()}`, 'REVENUE']}
                    labelStyle={TOOLTIP_LABEL}
                  />
                  <Bar dataKey="revenue" minPointSize={0}>
                    {revenueData.map((d, i) => (
                      <Cell key={i} fill={d.revenue > 0 ? 'var(--brand-500)' : 'var(--n-200)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {rangeRevenue === 0 && (
                <p className="sp-mono adm-empty-note">
                  ไม่มีออเดอร์ที่ส่งสำเร็จในช่วง {range} วันที่ผ่านมา
                </p>
              )}
            </div>
          </div>
        )}

        {/* Order Volume + Delivery Status */}
        {stats?.orderVolume && stats?.statusDistribution && (
          <div className="sp-animate-d3 adm-grid-2">

            <div className="sp-card adm-card">
              <div className="adm-card-head">
                <div>
                  <p className="sp-caps adm-caps-muted">Order Volume</p>
                  <h3 className="sp-font-display sp-text-md adm-card-title">ปริมาณคำสั่งซื้อรายวัน</h3>
                </div>
                <span className="sp-mono adm-meta">
                  {range} Days: <strong>{rangeOrders}</strong>
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220} minWidth={0} initialDimension={{ width: 500, height: 220 }}>
                <BarChart data={orderVolumeData} barCategoryGap="20%">
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} interval="preserveStartEnd" minTickGap={24} tick={AXIS_TICK_MONO} axisLine={AXIS_LINE} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_SQUARE}
                    formatter={(v: any) => [`${v} รายการ`, 'ORDERS']}
                    labelStyle={TOOLTIP_LABEL}
                  />
                  <Bar dataKey="orders" fill="var(--brand-500)" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="sp-card adm-card adm-card--col">
              <div className="adm-card-head adm-card-head--block">
                <p className="sp-caps adm-caps-muted">Delivery Status</p>
                <h3 className="sp-font-display sp-text-md adm-card-title">สัดส่วนสถานะการจัดส่ง</h3>
              </div>
              {statusData.length === 0 ? (
                <p className="sp-mono adm-empty">ยังไม่มีออเดอร์ในระบบ</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180} minWidth={0} initialDimension={{ width: 300, height: 180 }}>
                    <PieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} stroke="none">
                        {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={TOOLTIP_SOFT}
                        formatter={(v: any, n: any) => [`${v} รายการ`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="adm-legend">
                    {statusData.map(s => (
                      <div key={s.name} className="adm-legend-item">
                        <span className={`adm-dot adm-dot--${s.key.toLowerCase()}`} />
                        {s.name}: <strong>{s.value}</strong>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* User Growth Area Chart (real signup data) */}
        {stats?.userGrowth && (
          <div className="sp-card sp-animate-d3 adm-card adm-card--spaced">
            <div className="adm-card-head adm-card-head--roomy">
              <div>
                <p className="sp-caps adm-caps-muted">Platform Adoption</p>
                <h3 className="sp-font-display sp-text-md adm-card-title">User Growth</h3>
              </div>
              <span className="sp-mono adm-meta">
                Verified Users: <strong>{userGrowthData[userGrowthData.length - 1]?.users ?? 0}</strong>
              </span>
            </div>
            <div className="adm-chart-fixed">
              <ResponsiveContainer width="100%" height={200} minWidth={0} initialDimension={{ width: 600, height: 200 }}>
                <AreaChart data={userGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--adm-green)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--adm-green)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} interval="preserveStartEnd" minTickGap={24} axisLine={false} tickLine={false} tick={AXIS_TICK} />
                  <YAxis hide allowDecimals={false} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={TOOLTIP_SOFT}
                    formatter={(v: any) => [`${v} Users`, 'Total']}
                  />
                  <Area type="stepAfter" dataKey="users" stroke="var(--adm-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="sp-animate-d4">
          <div className="sp-section-divider adm-divider" />

          <div className="adm-mgmt-head">
            <div>
              <p className="sp-caps adm-caps-muted">Management</p>
              <h2 className="sp-font-display adm-h2">User Accounts</h2>
            </div>
            <input
              type="search"
              className="adm-search"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Tabs */}
          <div className="adm-tabs">
            {(['customers', 'merchants', 'drivers'] as const).map(tab => (
              <button
                key={tab}
                id={`tab-${tab}`}
                className={`adm-tab${activeTab === tab ? ' is-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tabLabel[tab]} <span className="sp-mono">[{users[tab].length}]</span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="sp-table-industrial sp-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  {['ID', 'Name', 'Email', 'Balance', 'Verified', 'Phone', 'Status', 'Action'].map(h => (
                    <th key={h} className="sp-caps adm-th">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="adm-td-empty">
                      No users found
                    </td>
                  </tr>
                ) : filteredUsers.map((u: any) => (
                  <tr key={u.id}>
                    <td className="sp-mono adm-td-id">#{u.id}</td>
                    <td className="adm-td-name">{u.name || '—'}</td>
                    <td className="adm-td-email">{u.email}</td>
                    <td className="sp-mono adm-td-balance">
                      ฿{Number(u.balance || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className={`adm-badge ${u.isVerified ? 'adm-badge--ok' : 'adm-badge--muted'}`}>
                        {u.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="sp-mono adm-td-phone">{u.phone || '—'}</td>
                    <td>
                      <span className={`adm-badge ${u.isActive !== false ? 'adm-badge--ok' : 'adm-badge--bad'}`}>
                        {u.isActive !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      {u.isActive !== false ? (
                        <button
                          className="adm-action adm-action--suspend"
                          onClick={() => setSuspendingUser(u)}
                          disabled={actionLoading === u.id}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          className="adm-action adm-action--approve"
                          onClick={() => handleApprove(u.id)}
                          disabled={actionLoading === u.id}
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Suspend Modal */}
      {suspendingUser && (
        <div className="adm-modal-overlay">
          <div className="sp-animate-d1 adm-modal">
            <h3 className="sp-font-display adm-modal-title">Suspend User</h3>
            <p className="adm-modal-text">
              You are about to suspend <strong>{suspendingUser.name || suspendingUser.email}</strong>.<br/>They will be logged out immediately.
            </p>
            <div className="adm-modal-field">
              <label className="sp-caps adm-modal-label">Reason for Suspension</label>
              <input
                type="text"
                className="adm-modal-input"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g. Fraudulent activity"
                autoFocus
              />
            </div>
            <div className="adm-modal-actions">
              <button
                className="adm-btn-cancel"
                onClick={() => { setSuspendingUser(null); setSuspendReason(''); }}
              >
                Cancel
              </button>
              <button
                className="adm-btn-danger"
                onClick={handleSuspend}
                disabled={!suspendReason.trim() || actionLoading === suspendingUser.id}
              >
                {actionLoading === suspendingUser.id ? 'Suspending...' : 'Confirm Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
