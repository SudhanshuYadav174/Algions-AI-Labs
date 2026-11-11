import React, { useState, useEffect } from 'react';
import { CheckCircle, Package, ArrowRight, XCircle, AlertCircle } from 'lucide-react';
import { orderApi } from '../services/api.js';

interface OrderSuccessPageProps {
  orderData: any;
  onNavigate: (view: string, params?: any) => void;
}

export const OrderSuccessPage: React.FC<OrderSuccessPageProps> = ({
  orderData,
  onNavigate,
}) => {
  const [order, setOrder] = useState<any>(orderData);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function refreshOrder() {
      if (orderData?.orderId) {
        try {
          const fresh = await orderApi.getOrder(orderData.orderId);
          setOrder(fresh.order);
        } catch {
          // fallback to orderData
        }
      }
    }
    refreshOrder();
  }, [orderData?.orderId]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? Stock will be restored.')) {
      return;
    }

    try {
      setIsCancelling(true);
      setErrorMessage(null);
      const res = await orderApi.cancelOrder(order.id, 'Customer requested cancellation');
      setOrder(res.order);
      setCancelMessage('Order has been cancelled and stock has been restored to inventory.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel order');
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelled = order.status === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
      
      {/* Status Banner */}
      <div className={`p-8 text-center border ${
        isCancelled
          ? 'bg-red-950/30 border-red-800'
          : 'bg-[#111111] border-[#262626]'
      }`}>
        {isCancelled ? (
          <XCircle className="mx-auto text-red-500 mb-4" size={48} />
        ) : (
          <CheckCircle className="mx-auto text-green-500 mb-4" size={48} />
        )}

        <h1 className="text-2xl sm:text-3xl font-extrabold uppercase text-white font-bebas tracking-wide">
          {isCancelled ? 'ORDER CANCELLED' : 'ORDER CONFIRMED & PAID'}
        </h1>

        <p className="text-xs text-gray-400 mt-2">
          {isCancelled
            ? 'This order has been cancelled and its inventory restored.'
            : 'Thank you for your order. We are preparing your pieces for dispatch.'}
        </p>

        <div className="mt-4 inline-block bg-[#181818] border border-[#2b2b2b] px-4 py-2">
          <span className="text-[10px] uppercase font-bold text-gray-400">Order Number: </span>
          <span className="text-xs font-black text-white">{order.orderNumber || order.order_number}</span>
        </div>
      </div>

      {cancelMessage && (
        <div className="bg-green-950/60 border border-green-800 p-4 text-xs text-green-200">
          {cancelMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-950/60 border border-red-800 p-4 text-xs text-red-200 flex items-center space-x-2">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Order Details Card */}
      <div className="bg-[#111111] border border-[#222222] p-6 space-y-6">
        <div className="flex justify-between items-center pb-4 border-b border-[#222222]">
          <div className="flex items-center space-x-2">
            <Package size={18} className="text-gray-400" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Order Status: <strong className={isCancelled ? 'text-red-400' : 'text-green-400'}>{(order.status || 'paid').toUpperCase()}</strong>
            </span>
          </div>
          <span className="text-xs text-gray-400">
            Payment: <strong className="text-white">{order.paymentStatus || order.payment_status || 'completed'}</strong>
          </span>
        </div>

        {/* Order Items */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Items Ordered</h3>
          <div className="divide-y divide-[#1e1e1e]">
            {(order.items || []).map((item: any, idx: number) => (
              <div key={idx} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white uppercase">{item.productName || item.product_name}</p>
                  <p className="text-[11px] text-gray-400">{item.variantInfo || item.variant_info}</p>
                  <p className="text-[10px] text-gray-500">Qty: {item.quantity} × ${Number(item.unitPrice || item.unit_price).toFixed(2)}</p>
                </div>
                <span className="font-bold text-white">
                  ${Number(item.totalPrice || item.total_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="border-t border-[#222222] pt-4 space-y-2 text-xs">
          <div className="flex justify-between text-gray-300">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toFixed(2)}</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-[#e63946]">
              <span>Discount</span>
              <span>-${Number(order.discountAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-300">
            <span>Tax</span>
            <span>${Number(order.taxAmount || order.tax_amount || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>Shipping</span>
            <span>${Number(order.shippingFee || order.shipping_fee || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-[#222222]">
            <span>Total Paid</span>
            <span>${Number(order.totalAmount || order.total_amount).toFixed(2)} USD</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => onNavigate('catalog')}
          className="flex-1 bg-white hover:bg-gray-200 text-black font-black text-xs py-3.5 px-4 uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors"
        >
          <span>Continue Shopping</span>
          <ArrowRight size={16} />
        </button>

        {!isCancelled && ['placed', 'paid'].includes(order.status) && (
          <button
            onClick={handleCancelOrder}
            disabled={isCancelling}
            className="border border-red-900/60 hover:bg-red-950/40 text-red-300 font-bold text-xs py-3.5 px-6 uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {isCancelling ? 'Cancelling Order...' : 'Cancel Order & Restore Stock'}
          </button>
        )}
      </div>
    </div>
  );
};

