import React from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext.js';

interface CartDrawerProps {
  onNavigate: (view: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigate }) => {
  const { items, subtotal, itemCount, isOpen, setIsOpen, updateItem, removeItem, clearCart, error } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0f0f0f] border-l border-[#262626] text-white flex flex-col shadow-2xl">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-[#222222] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag size={20} className="text-[#e63946]" />
              <h2 className="text-base font-black tracking-wider uppercase font-heading">
                YOUR CART ({itemCount})
              </h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Error Alert if any */}
          {error && (
            <div className="bg-red-950/60 border-b border-red-800/80 px-6 py-2.5 text-xs text-red-200">
              {error}
            </div>
          )}

          {/* Drawer Body: Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <ShoppingBag size={48} className="text-gray-600 mb-4 stroke-1" />
                <p className="text-base font-bold uppercase tracking-wider text-gray-300">
                  Your cart is empty
                </p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Looks like you haven't added any pieces to your cart yet.
                </p>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigate('catalog');
                  }}
                  className="mt-6 bg-white text-black font-extrabold text-xs px-6 py-3 uppercase tracking-wider hover:bg-gray-200"
                >
                  Explore Drops
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex space-x-4 bg-[#141414] p-3 border border-[#222222] relative group"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-20 h-24 object-cover bg-[#1c1c1c] flex-shrink-0"
                  />
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-black uppercase text-white truncate max-w-[170px]">
                          {item.productName}
                        </h4>
                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {item.color} • Size {item.size}
                      </p>
                      <p className="text-xs font-bold text-white mt-1">
                        ${Number(item.unitPrice).toFixed(2)} USD
                      </p>
                    </div>

                    {/* Quantity controls & stock notice */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#1f1f1f]">
                      <div className="flex items-center border border-[#333333] bg-[#0a0a0a]">
                        <button
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateItem(item.cartItemId, item.quantity - 1);
                            } else {
                              removeItem(item.cartItemId);
                            }
                          }}
                          className="p-1 hover:text-white text-gray-400 px-2"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold px-2 text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => {
                            if (item.quantity < item.stockAvailable) {
                              updateItem(item.cartItemId, item.quantity + 1);
                            }
                          }}
                          disabled={item.quantity >= item.stockAvailable}
                          className="p-1 hover:text-white text-gray-400 px-2 disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label="Increase quantity"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-white">
                          ${Number(item.totalPrice).toFixed(2)}
                        </span>
                        {item.stockAvailable <= 5 && (
                          <p className="text-[10px] text-amber-500 font-semibold">
                            Only {item.stockAvailable} left
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer with Subtotal & Checkout */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#222222] bg-[#121212] space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 tracking-wider uppercase font-semibold">
                  Subtotal
                </span>
                <span className="text-lg font-black text-white">
                  ${subtotal.toFixed(2)} USD
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Taxes, coupons, and free shipping calculated at checkout.
              </p>

              <button
                onClick={() => {
                  setIsOpen(false);
                  onNavigate('checkout');
                }}
                className="w-full bg-white hover:bg-gray-200 text-black font-black text-xs py-3.5 px-4 uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors"
              >
                <span>PROCEED TO CHECKOUT</span>
                <ArrowRight size={16} />
              </button>

              <button
                onClick={clearCart}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-300 uppercase tracking-wider py-1"
              >
                Clear Cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

