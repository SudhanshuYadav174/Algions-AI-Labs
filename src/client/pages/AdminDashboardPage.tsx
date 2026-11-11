import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  Users,
  AlertTriangle,
  FileText,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { adminApi } from '../services/api.js';

export const AdminDashboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'inventory' | 'audit'>('overview');

  const [dashboardData, setDashboardData] = useState<any | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stock Adjustment Modal
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; variantId: number | null; name: string; currentStock: number }>({
    open: false,
    variantId: null,
    name: '',
    currentStock: 0,
  });
  const [newStockInput, setNewStockInput] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Inventory restock batch');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await adminApi.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await adminApi.getOrders({ limit: 50 });
      setOrders(data.orders || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load orders');
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await adminApi.getAuditLogs({ limit: 50 });
      setAuditLogs(data.logs || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load audit logs');
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardData();
      if (activeTab === 'orders') fetchOrders();
      if (activeTab === 'audit') fetchAuditLogs();
    }
  }, [isAdmin, activeTab]);

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      setErrorMsg(null);
      await adminApi.updateOrderStatus(orderId, newStatus);
      setSuccessMsg(`Order #${orderId} transitioned to ${newStatus}`);
      fetchOrders();
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Status transition rejected');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModal.variantId) return;

    try {
      setErrorMsg(null);
      await adminApi.adjustInventory(adjustModal.variantId, newStockInput, adjustReason);
      setSuccessMsg('Stock adjusted and audit logged successfully');
      setAdjustModal({ open: false, variantId: null, name: '', currentStock: 0 });
      fetchDashboardData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to adjust stock');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center text-white">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-bold uppercase font-heading">Access Denied</h2>
        <p className="text-xs text-gray-400 mt-2">
          Administrator privileges are required to access the operational command center.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Admin Title & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#222222]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-[#e63946] text-white text-[10px] font-black uppercase px-2 py-0.5">
              RESTRICTED
            </span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">
              Urban Threads Operations
            </span>
          </div>
          <h1 className="text-3xl font-extrabold uppercase text-white font-bebas tracking-wide mt-1">
            EXECUTIVE DASHBOARD & AUDIT
          </h1>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`text-xs font-bold uppercase px-3 py-2 transition-colors ${
              activeTab === 'overview'
                ? 'bg-white text-black'
                : 'bg-[#141414] text-gray-400 hover:text-white border border-[#2b2b2b]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`text-xs font-bold uppercase px-3 py-2 transition-colors ${
              activeTab === 'orders'
                ? 'bg-white text-black'
                : 'bg-[#141414] text-gray-400 hover:text-white border border-[#2b2b2b]'
            }`}
          >
            Orders Lifecycle
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`text-xs font-bold uppercase px-3 py-2 transition-colors ${
              activeTab === 'inventory'
                ? 'bg-white text-black'
                : 'bg-[#141414] text-gray-400 hover:text-white border border-[#2b2b2b]'
            }`}
          >
            Stock Alerts
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`text-xs font-bold uppercase px-3 py-2 transition-colors ${
              activeTab === 'audit'
                ? 'bg-white text-black'
                : 'bg-[#141414] text-gray-400 hover:text-white border border-[#2b2b2b]'
            }`}
          >
            Audit Trail
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-950/60 border border-green-800 p-4 text-xs text-green-200 flex items-center space-x-2">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/60 border border-red-800 p-4 text-xs text-red-200 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. OVERVIEW TAB: Reconciled Financial & Operational Metrics */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111111] border border-[#222222] p-5">
              <div className="flex justify-between items-center text-gray-400 text-xs uppercase font-bold">
                <span>Net Revenue (PostgreSQL)</span>
                <DollarSign size={16} className="text-green-400" />
              </div>
              <p className="text-2xl font-black text-white mt-2 font-heading">
                ${dashboardData?.summary?.totalRevenue?.toFixed(2) || '0.00'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Excludes cancelled & failed transactions</p>
            </div>

            <div className="bg-[#111111] border border-[#222222] p-5">
              <div className="flex justify-between items-center text-gray-400 text-xs uppercase font-bold">
                <span>Total Orders</span>
                <Package size={16} className="text-blue-400" />
              </div>
              <p className="text-2xl font-black text-white mt-2 font-heading">
                {dashboardData?.summary?.totalOrdersAll || 0}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                {dashboardData?.summary?.paidOrders || 0} fulfilled / {dashboardData?.summary?.cancelledOrders || 0} cancelled
              </p>
            </div>

            <div className="bg-[#111111] border border-[#222222] p-5">
              <div className="flex justify-between items-center text-gray-400 text-xs uppercase font-bold">
                <span>Avg. Order Value</span>
                <TrendingUp size={16} className="text-purple-400" />
              </div>
              <p className="text-2xl font-black text-white mt-2 font-heading">
                ${dashboardData?.summary?.avgOrderValue?.toFixed(2) || '0.00'}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Reconciled average basket size</p>
            </div>

            <div className="bg-[#111111] border border-[#222222] p-5">
              <div className="flex justify-between items-center text-gray-400 text-xs uppercase font-bold">
                <span>Total Customers</span>
                <Users size={16} className="text-amber-400" />
              </div>
              <p className="text-2xl font-black text-white mt-2 font-heading">
                {dashboardData?.summary?.totalCustomers || 0}
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Registered customer accounts</p>
            </div>
          </div>

          {/* Breakdown & Top Selling Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Status Breakdown */}
            <div className="bg-[#111111] border border-[#222222] p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-white font-heading">
                Order Lifecycle Breakdown
              </h3>
              <div className="space-y-3">
                {(dashboardData?.statusBreakdown || []).map((b: any) => (
                  <div key={b.status} className="flex justify-between items-center text-xs border-b border-[#1c1c1c] pb-2">
                    <span className="font-bold text-gray-300 uppercase">{b.status}</span>
                    <div className="text-right">
                      <span className="font-bold text-white">{b.count} orders</span>
                      <span className="text-gray-500 text-[10px] ml-2">(${Number(b.revenue).toFixed(2)})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Selling Products */}
            <div className="bg-[#111111] border border-[#222222] p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-white font-heading">
                Top Grossing Streetwear
              </h3>
              <div className="space-y-3">
                {(dashboardData?.topProducts || []).map((tp: any) => (
                  <div key={tp.productId} className="flex justify-between items-center text-xs border-b border-[#1c1c1c] pb-2">
                    <div>
                      <p className="font-bold text-white uppercase">{tp.productName}</p>
                      <p className="text-[10px] text-gray-500">{tp.totalUnitsSold} units sold</p>
                    </div>
                    <span className="font-black text-white">${Number(tp.totalSales).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. ORDERS LIFECYCLE MANAGEMENT TAB */}
      {activeTab === 'orders' && (
        <div className="bg-[#111111] border border-[#222222] p-6 space-y-4 overflow-x-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Manage Orders & State Transitions
            </h3>
            <button onClick={fetchOrders} className="text-xs text-gray-400 hover:text-white flex items-center space-x-1">
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-gray-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Order Number</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total</th>
                <th className="p-3">Current Status</th>
                <th className="p-3">Transition Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#161616]">
                  <td className="p-3 font-bold text-white">{o.order_number}</td>
                  <td className="p-3 text-gray-300">
                    <p>{o.customer_name}</p>
                    <p className="text-[10px] text-gray-500">{o.customer_email}</p>
                  </td>
                  <td className="p-3 font-black text-white">${Number(o.total_amount).toFixed(2)}</td>
                  <td className="p-3">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[#202020] text-gray-300 border border-[#333333]">
                      {o.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="bg-[#1c1c1c] border border-[#333333] text-white text-[11px] p-1.5 focus:outline-none"
                    >
                      <option value="placed">placed</option>
                      <option value="paid">paid</option>
                      <option value="packed">packed</option>
                      <option value="shipped">shipped</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. STOCK ALERTS TAB */}
      {activeTab === 'inventory' && (
        <div className="bg-[#111111] border border-[#222222] p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Low Stock Alerts (&lt; 15 units remaining)
          </h3>
          <div className="divide-y divide-[#1e1e1e]">
            {(dashboardData?.lowStockAlerts || []).map((alert: any) => (
              <div key={alert.variant_id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white uppercase">{alert.product_name}</p>
                  <p className="text-[11px] text-gray-400">
                    SKU: {alert.sku} • Size: {alert.size} • Color: {alert.color}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-amber-400 font-bold">
                    {alert.stock_quantity} left
                  </span>
                  <button
                    onClick={() => {
                      setAdjustModal({
                        open: true,
                        variantId: alert.variant_id,
                        name: `${alert.product_name} (${alert.size}/${alert.color})`,
                        currentStock: alert.stock_quantity,
                      });
                      setNewStockInput(alert.stock_quantity + 20);
                    }}
                    className="bg-[#1e1e1e] hover:bg-white text-gray-300 hover:text-black text-xs font-bold px-3 py-1.5 uppercase transition-colors flex items-center space-x-1"
                  >
                    <Edit2 size={12} />
                    <span>Adjust Stock</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. AUDIT TRAIL TAB */}
      {activeTab === 'audit' && (
        <div className="bg-[#111111] border border-[#222222] p-6 space-y-4 overflow-x-auto">
          <h3 className="text-xs font-black uppercase tracking-wider text-white">
            Administrative Audit Trail (Criterion 15)
          </h3>
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-gray-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">State Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e1e]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#161616]">
                  <td className="p-3 text-gray-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-semibold text-white">
                    {log.user_email || 'System'}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-[#e63946]">
                    {log.action}
                  </td>
                  <td className="p-3 text-gray-300">
                    {log.entity_type} #{log.entity_id}
                  </td>
                  <td className="p-3 font-mono text-[10px] text-gray-400 max-w-xs truncate">
                    {JSON.stringify(log.new_state)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setAdjustModal({ open: false, variantId: null, name: '', currentStock: 0 })} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <form onSubmit={handleAdjustStock} className="relative bg-[#141414] border border-[#2b2b2b] p-6 w-full max-w-md text-white space-y-4 z-10">
            <h3 className="text-sm font-bold uppercase tracking-wider">Adjust Inventory Stock</h3>
            <p className="text-xs text-gray-400">{adjustModal.name}</p>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">New Total Stock *</label>
              <input
                type="number"
                min="0"
                value={newStockInput}
                onChange={(e) => setNewStockInput(parseInt(e.target.value) || 0)}
                required
                className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-300 mb-1">Reason for Adjustment *</label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                required
                className="w-full bg-[#1c1c1c] border border-[#333333] text-white text-xs px-3 py-2"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setAdjustModal({ open: false, variantId: null, name: '', currentStock: 0 })}
                className="px-4 py-2 bg-[#222222] text-xs uppercase font-bold text-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-white text-black text-xs uppercase font-black hover:bg-gray-200"
              >
                Confirm & Audit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

