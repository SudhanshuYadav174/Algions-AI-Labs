import React, { useState, useEffect } from 'react';
import { Package, Clock, Eye, AlertCircle, XCircle } from 'lucide-react';
import { orderApi } from '../services/api.js';

interface OrderHistoryPageProps {
  onViewOrder: (order: any) => void;
  onNavigate: (view: string) => void;
}

export const OrderHistoryPage: React.FC<OrderHistoryPageProps> = ({
  onViewOrder,
  onNavigate,
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderApi.getMyOrders();
      setOrders(data.orders || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('Cancel this order and restore stock?')) return;
    try {
      await orderApi.cancelOrder(orderId, 'Customer cancellation from order history');
      await fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel order');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-green-950/70 text-green-300 border border-green-800">Paid</span>;
      case 'packed':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-blue-950/70 text-blue-300 border border-blue-800">Packed</span>;
      case 'shipped':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-purple-950/70 text-purple-300 border border-purple-800">Shipped</span>;
      case 'delivered':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-emerald-950/70 text-emerald-300 border border-emerald-800">Delivered</span>;
      case 'cancelled':
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-red-950/70 text-red-300 border border-red-800">Cancelled</span>;
      default:
        return <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-gray-800 text-gray-300">Placed</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold uppercase text-white font-bebas tracking-wide">
          ORDER HISTORY
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Track fulfillment status, review past drops, or manage eligible order cancellations.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-950/60 border border-red-800 p-4 text-xs text-red-200 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-xs text-gray-400">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="bg-[#111111] border border-[#222222] p-12 text-center space-y-4">
          <Package className="mx-auto text-gray-600" size={40} />
          <h3 className="text-sm font-bold uppercase text-white">No orders found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            You haven't placed any orders yet. Discover our latest streetwear drops in the shop.
          </p>
          <button
            onClick={() => onNavigate('catalog')}
            className="bg-white text-black font-extrabold text-xs px-6 py-2.5 uppercase tracking-wider hover:bg-gray-200"
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isCancellable = ['placed', 'paid'].includes(order.status);
            return (
              <div
                key={order.id}
                className="bg-[#111111] border border-[#222222] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#333333] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-white">{order.order_number}</span>
                    {getStatusBadge(order.status)}
                  </div>
                  <p className="text-xs text-gray-400 flex items-center space-x-1">
                    <Clock size={12} />
                    <span>{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </p>
                  <p className="text-xs text-gray-300 pt-1">
                    {(order.items || []).map((i: any) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center space-x-4 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Total: </span>
                    <span className="text-sm font-extrabold text-white">
                      ${Number(order.total_amount).toFixed(2)} USD
                    </span>
                  </div>

                  <button
                    onClick={() => onViewOrder(order)}
                    className="bg-[#1c1c1c] hover:bg-white text-gray-200 hover:text-black border border-[#333333] text-xs font-bold px-3 py-2 uppercase tracking-wider flex items-center space-x-1 transition-colors"
                  >
                    <Eye size={13} />
                    <span>View</span>
                  </button>

                  {isCancellable && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
