'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { Users, Package, TrendingUp, CheckCircle, Clock, XCircle, LogOut, RefreshCw } from 'lucide-react';

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
        alert('Failed to suspend user');
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
        alert('Failed to approve user');
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

  if (loading) return (
    <div className="sp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--n-200)', borderTopColor: 'var(--brand-500)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p className="sp-caps" style={{ color: 'var(--n-500)', marginTop: '1rem' }}>Loading Control Center</p>
      </div>
    </div>
  );

  return (
    <div className="sp-page">

      {/* Nav */}
      <nav className="sp-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="sp-logo">
            Swift<span className="sp-logo-accent">Path</span>
          </span>
          <span className="sp-caps" style={{ color: 'var(--n-500)', borderLeft: '1px solid var(--n-200)', paddingLeft: '0.75rem' }}>
            Control Center
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={fetchAll} disabled={refreshing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--n-500)', display: 'flex' }}>
            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
          <button id="btn-admin-logout" onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'transparent', border: '1px solid var(--n-200)', padding: '0.5rem 1rem', color: 'var(--n-600)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Header */}
        <div className="sp-animate-d1" style={{ marginBottom: '3rem' }}>
          <span className="sp-section-eyebrow" style={{ color: 'var(--brand-500)' }}>System Overview</span>
          <h1 className="sp-font-display sp-text-hero">
            Admin Dashboard
          </h1>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="sp-kpi-row sp-animate-d2" style={{ marginBottom: '3rem' }}>
            {[
              { label: 'Total Orders', value: stats.totalOrders, color: 'var(--brand-500)' },
              { label: 'Total Revenue', value: `฿${Number(stats.totalRevenue).toLocaleString()}`, color: 'oklch(65% 0.15 150)' },
              { label: 'Active Users', value: stats.activeUsers?.total ?? 0, color: 'oklch(65% 0.15 260)' },
              { label: 'Delivered', value: stats.deliveredOrders, color: 'var(--success-text)' },
              { label: 'Pending', value: stats.pendingOrders, color: 'var(--brand-500)' },
              { label: 'Cancelled', value: stats.cancelledOrders, color: 'var(--error-text)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="sp-stat-label" style={{ color: 'var(--n-500)' }}>{label}</span>
                <div className="sp-stat-number sp-font-display" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Revenue Chart */}
        {stats?.revenueChart && (
          <div className="sp-animate-d3" style={{ marginBottom: '4rem' }}>
            <div className="sp-section-divider" style={{ marginBottom: '2rem' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p className="sp-caps" style={{ color: 'var(--n-500)' }}>Revenue</p>
                <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-900)' }}>7-Day Overview</h2>
              </div>
              <span className="sp-mono" style={{ fontSize: '0.875rem', color: 'var(--n-500)' }}>
                Success Rate: <strong style={{ color: 'oklch(65% 0.15 150)', fontSize: '1rem' }}>{stats.successRate}%</strong>
              </span>
            </div>
            <div style={{ padding: '2rem 0', background: 'var(--n-50)', borderTop: '2px solid var(--n-200)' }}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.revenueChart} barSize={40}>
                  <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fill: 'var(--n-400)', fontSize: 12, fontFamily: 'monospace' }} axisLine={{ stroke: 'var(--n-200)' }} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'var(--n-50)', border: '1px solid var(--n-200)', borderRadius: '0', color: 'var(--n-900)', fontFamily: 'monospace' }}
                    formatter={(v: any) => [`฿${Number(v).toLocaleString()}`, 'REVENUE']}
                    labelStyle={{ color: 'var(--brand-500)', fontWeight: 700, marginBottom: '0.5rem' }}
                  />
                  <Bar dataKey="revenue">
                    {stats.revenueChart.map((_: any, i: number) => (
                      <Cell key={i} fill={i === stats.revenueChart.length - 1 ? 'var(--brand-500)' : 'var(--n-200)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* User Growth Area Chart (Simulated Data) */}
        {stats && (
          <div className="sp-card sp-animate-d3" style={{ marginBottom: '3rem', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <div>
                <p className="sp-caps" style={{ color: 'var(--n-500)' }}>Platform Adoption</p>
                <h3 className="sp-font-display sp-text-md" style={{ fontWeight: 800 }}>User Growth</h3>
              </div>
            </div>
            <div style={{ width: '100%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Mon', users: 120 }, { name: 'Tue', users: 150 }, 
                  { name: 'Wed', users: 200 }, { name: 'Thu', users: 280 },
                  { name: 'Fri', users: 350 }, { name: 'Sat', users: 420 },
                  { name: 'Sun', users: 550 }
                ]}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="oklch(65% 0.15 150)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="oklch(65% 0.15 150)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--n-400)', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(v: any) => [`${v} Users`, 'Adoption']}
                  />
                  <Area type="monotone" dataKey="users" stroke="oklch(65% 0.15 150)" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* User Management */}
        <div className="sp-animate-d4">
          <div className="sp-section-divider" style={{ marginBottom: '2rem' }} />
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p className="sp-caps" style={{ color: 'var(--n-500)' }}>Management</p>
              <h2 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--n-900)' }}>User Accounts</h2>
            </div>
            <input
              type="search"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: 'var(--n-50)', border: 'none', borderBottom: '2px solid var(--n-200)',
                padding: '0.75rem 1rem', color: 'var(--n-900)', fontSize: '0.875rem', outline: 'none', width: '300px'
              }}
            />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', borderBottom: '2px solid var(--n-850)' }}>
            {(['customers', 'merchants', 'drivers'] as const).map(tab => (
              <button
                key={tab}
                id={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '0.75rem 0', fontSize: '0.875rem', fontWeight: 700,
                  border: 'none', borderBottom: '2px solid',
                  borderColor: activeTab === tab ? 'var(--brand-500)' : 'transparent',
                  background: 'transparent',
                  color: activeTab === tab ? 'var(--brand-500)' : 'var(--n-400)',
                  cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',
                  marginBottom: '-2px'
                }}
              >
                {tabLabel[tab]} <span className="sp-mono">[{users[tab].length}]</span>
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="sp-table-industrial">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  {['ID', 'Name', 'Email', 'Balance', 'Verified', 'Phone', 'Status', 'Action'].map(h => (
                    <th key={h} className="sp-caps" style={{ padding: '1rem', color: 'var(--n-500)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--n-500)', fontSize: '0.875rem' }}>
                      No users found
                    </td>
                  </tr>
                ) : filteredUsers.map((u: any) => (
                  <tr key={u.id}>
                    <td className="sp-mono" style={{ color: 'var(--n-500)' }}>#{u.id}</td>
                    <td style={{ fontWeight: 600, color: 'var(--n-900)' }}>{u.name || '—'}</td>
                    <td style={{ color: 'var(--n-300)' }}>{u.email}</td>
                    <td className="sp-mono" style={{ color: 'var(--brand-500)', fontWeight: 700 }}>
                      ฿{Number(u.balance || 0).toLocaleString()}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                        background: u.isVerified ? 'oklch(20% 0.06 150)' : 'var(--n-200)',
                        color: u.isVerified ? 'oklch(65% 0.15 150)' : 'var(--n-400)',
                      }}>
                        {u.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td className="sp-mono" style={{ color: 'var(--n-500)' }}>{u.phone || '—'}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', padding: '0.25rem 0.5rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                        background: u.isActive !== false ? 'oklch(20% 0.06 150)' : 'var(--error-bg)',
                        color: u.isActive !== false ? 'oklch(65% 0.15 150)' : 'var(--error-text)',
                      }}>
                        {u.isActive !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td>
                      {u.isActive !== false ? (
                        <button
                          onClick={() => setSuspendingUser(u)}
                          disabled={actionLoading === u.id}
                          style={{
                            background: 'var(--n-50)', border: 'none', color: 'var(--error-text)',
                            padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
                            opacity: actionLoading === u.id ? 0.5 : 1
                          }}
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApprove(u.id)}
                          disabled={actionLoading === u.id}
                          style={{
                            background: 'var(--brand-500)', border: 'none', color: 'var(--n-900)',
                            padding: '0.375rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer',
                            opacity: actionLoading === u.id ? 0.5 : 1
                          }}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="sp-animate-d1" style={{ background: 'var(--n-50)', borderTop: '4px solid var(--error-text)', padding: '3rem', width: '100%', maxWidth: '500px' }}>
            <h3 className="sp-font-display" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--n-900)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Suspend User</h3>
            <p style={{ color: 'var(--n-500)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              You are about to suspend <strong style={{ color: 'var(--error-text)' }}>{suspendingUser.name || suspendingUser.email}</strong>.<br/>They will be logged out immediately.
            </p>
            <div style={{ marginBottom: '2rem' }}>
              <label className="sp-caps" style={{ display: 'block', color: 'var(--n-500)', marginBottom: '0.5rem' }}>Reason for Suspension</label>
              <input
                type="text"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g. Fraudulent activity"
                autoFocus
                style={{
                  width: '100%', background: 'var(--n-50)', border: 'none', borderBottom: '2px solid var(--n-200)',
                  padding: '1rem', color: 'var(--n-900)', fontSize: '0.95rem', outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
              <button
                onClick={() => { setSuspendingUser(null); setSuspendReason(''); }}
                style={{ background: 'transparent', border: '1px solid var(--n-700)', color: 'var(--n-300)', padding: '0.875rem 1.5rem', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={!suspendReason.trim() || actionLoading === suspendingUser.id}
                style={{ background: 'var(--error-text)', border: 'none', color: '#fff', padding: '0.875rem 1.5rem', fontWeight: 800, cursor: actionLoading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', opacity: !suspendReason.trim() || actionLoading ? 0.5 : 1 }}
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
