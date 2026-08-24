'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
    <div style={{ minHeight: '100vh', background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #27272a', borderTopColor: 'oklch(65% 0.18 30)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ color: '#52525b', fontSize: '0.875rem', marginTop: '1rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Loading Control Center</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', fontFamily: "'Inter', sans-serif" }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #18181b', padding: '0 2rem', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#09090b', zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontWeight: 900, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            Swift<span style={{ color: 'oklch(65% 0.18 30)' }}>Path</span>
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', borderLeft: '1px solid #27272a', paddingLeft: '0.75rem' }}>
            Control Center
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button onClick={fetchAll} disabled={refreshing}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', display: 'flex', padding: '0.5rem' }}>
            <RefreshCw size={16} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>
          <button id="btn-admin-logout" onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', padding: '0.5rem 0.875rem', color: '#a1a1aa', cursor: 'pointer', fontSize: '0.8rem' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'oklch(65% 0.18 30)', marginBottom: '0.375rem' }}>
            System Overview
          </p>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 900, letterSpacing: '-0.03em', color: '#f4f4f5' }}>
            Admin Dashboard
          </h1>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Total Orders', value: stats.totalOrders, icon: Package, color: 'oklch(65% 0.18 30)' },
              { label: 'Total Revenue', value: `฿${Number(stats.totalRevenue).toLocaleString()}`, icon: TrendingUp, color: 'oklch(65% 0.15 150)' },
              { label: 'Active Users', value: stats.activeUsers?.total ?? 0, icon: Users, color: 'oklch(65% 0.15 260)' },
              { label: 'Delivered', value: stats.deliveredOrders, icon: CheckCircle, color: 'oklch(65% 0.15 150)' },
              { label: 'Pending', value: stats.pendingOrders, icon: Clock, color: 'oklch(70% 0.18 80)' },
              { label: 'Cancelled', value: stats.cancelledOrders, icon: XCircle, color: 'oklch(60% 0.18 20)' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#71717a' }}>{label}</span>
                  <Icon size={16} style={{ color }} />
                </div>
                <div style={{ fontSize: '1.875rem', fontWeight: 900, color: '#f4f4f5', letterSpacing: '-0.03em' }}>{value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Revenue Chart */}
        {stats?.revenueChart && (
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525b' }}>Revenue</p>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f4f4f5', marginTop: '0.25rem' }}>7-Day Overview</h2>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#71717a' }}>Success Rate: <strong style={{ color: 'oklch(65% 0.15 150)' }}>{stats.successRate}%</strong></span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.revenueChart} barSize={28}>
                <XAxis dataKey="date" tickFormatter={d => d.slice(5)} tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#09090b', border: '1px solid #27272a', borderRadius: '8px', color: '#f4f4f5' }}
                  formatter={(v: any) => [`฿${Number(v).toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {stats.revenueChart.map((_: any, i: number) => (
                    <Cell key={i} fill={i === stats.revenueChart.length - 1 ? 'oklch(65% 0.18 30)' : '#27272a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* User Management */}
        <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #27272a' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525b' }}>User Management</p>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f4f4f5', marginTop: '0.25rem' }}>All Accounts</h2>
              </div>
              <input
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px',
                  padding: '0.5rem 0.875rem', color: '#f4f4f5', fontSize: '0.875rem', outline: 'none', width: '240px'
                }}
              />
            </div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['customers', 'merchants', 'drivers'] as const).map(tab => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '0.375rem 0.875rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600,
                    border: '1px solid',
                    borderColor: activeTab === tab ? 'oklch(65% 0.18 30)' : '#27272a',
                    background: activeTab === tab ? 'oklch(20% 0.05 30)' : 'transparent',
                    color: activeTab === tab ? 'oklch(65% 0.18 30)' : '#71717a',
                    cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'capitalize'
                  }}
                >
                  {tabLabel[tab]} ({users[tab].length})
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #27272a' }}>
                  {['ID', 'Name', 'Email', 'Balance', 'Verified', 'Phone', 'Status', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525b' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#3f3f46', fontSize: '0.875rem' }}>
                      No users found
                    </td>
                  </tr>
                ) : filteredUsers.map((u: any) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #18181b', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1c1c1f')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '0.875rem 1.25rem', color: '#52525b', fontSize: '0.8rem', fontFamily: 'monospace' }}>#{u.id}</td>
                    <td style={{ padding: '0.875rem 1.25rem', color: '#f4f4f5', fontWeight: 600, fontSize: '0.875rem' }}>{u.name || '—'}</td>
                    <td style={{ padding: '0.875rem 1.25rem', color: '#a1a1aa', fontSize: '0.875rem' }}>{u.email}</td>
                    <td style={{ padding: '0.875rem 1.25rem', color: '#f4f4f5', fontWeight: 700, fontSize: '0.9rem' }}>
                      ฿{Number(u.balance || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.25rem 0.625rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                        background: u.isVerified ? 'oklch(20% 0.06 150)' : 'oklch(20% 0.05 0)',
                        color: u.isVerified ? 'oklch(65% 0.15 150)' : 'oklch(60% 0.12 0)',
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                        {u.isVerified ? 'Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem', color: '#71717a', fontSize: '0.875rem', fontFamily: 'monospace' }}>{u.phone || '—'}</td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                        padding: '0.25rem 0.625rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 700,
                        background: u.isActive !== false ? 'oklch(20% 0.06 150)' : 'oklch(20% 0.05 0)',
                        color: u.isActive !== false ? 'oklch(65% 0.15 150)' : 'oklch(60% 0.12 0)',
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'currentColor' }} />
                        {u.isActive !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1.25rem' }}>
                      {u.isActive !== false ? (
                        <button
                          onClick={() => setSuspendingUser(u)}
                          disabled={actionLoading === u.id}
                          style={{
                            background: 'transparent', border: '1px solid oklch(60% 0.18 20)', color: 'oklch(60% 0.18 20)',
                            padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
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
                            background: 'transparent', border: '1px solid oklch(65% 0.15 150)', color: 'oklch(65% 0.15 150)',
                            padding: '0.375rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: '16px', padding: '2rem', width: '90%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f4f4f5', marginBottom: '1rem' }}>Suspend User</h3>
            <p style={{ color: '#a1a1aa', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              You are about to suspend <strong>{suspendingUser.name || suspendingUser.email}</strong>. They will be logged out and cannot access the system until approved.
            </p>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', marginBottom: '0.5rem' }}>Reason for Suspension</label>
              <input
                type="text"
                value={suspendReason}
                onChange={e => setSuspendReason(e.target.value)}
                placeholder="e.g. Fraudulent activity"
                autoFocus
                style={{
                  width: '100%', background: '#09090b', border: '1px solid #3f3f46', borderRadius: '8px',
                  padding: '0.75rem', color: '#f4f4f5', fontSize: '0.875rem', outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => { setSuspendingUser(null); setSuspendReason(''); }}
                style={{ background: 'transparent', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '0.625rem 1.25rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={!suspendReason.trim() || actionLoading === suspendingUser.id}
                style={{ background: 'oklch(65% 0.18 30)', border: 'none', color: '#fff', padding: '0.625rem 1.25rem', borderRadius: '8px', fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: !suspendReason.trim() || actionLoading ? 0.5 : 1 }}
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
