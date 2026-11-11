import React, { createContext, useContext, useState, useEffect } from 'react';
import { cartApi } from '../services/api.js';

export interface CartItem {
  cartItemId: number;
  variantId: number;
  productId: number;
  productName: string;
  productSlug: string;
  size: string;
  color: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  stockAvailable: number;
  imageUrl: string;
}

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  loading: boolean;
  error: string | null;
  addItem: (variantId: number, quantity: number) => Promise<void>;
  updateItem: (cartItemId: number, quantity: number) => Promise<void>;
  removeItem: (cartItemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [itemCount, setItemCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cartApi.getCart();
      setItems(data.items || []);
      setSubtotal(data.subtotal || 0);
      setItemCount(data.itemCount || 0);
    } catch (err: any) {
      console.error('Failed to load cart:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addItem = async (variantId: number, quantity: number) => {
    setError(null);
    try {
      const data = await cartApi.addItem(variantId, quantity);
      setItems(data.items || []);
      setSubtotal(data.subtotal || 0);
      setItemCount(data.itemCount || 0);
      setIsOpen(true);
    } catch (err: any) {
      setError(err.message || 'Failed to add item to cart');
      throw err;
    }
  };

  const updateItem = async (cartItemId: number, quantity: number) => {
    setError(null);
    try {
      const data = await cartApi.updateItem(cartItemId, quantity);
      setItems(data.items || []);
      setSubtotal(data.subtotal || 0);
      setItemCount(data.itemCount || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to update item quantity');
      throw err;
    }
  };

  const removeItem = async (cartItemId: number) => {
    try {
      const data = await cartApi.removeItem(cartItemId);
      setItems(data.items || []);
      setSubtotal(data.subtotal || 0);
      setItemCount(data.itemCount || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to remove item');
      throw err;
    }
  };

  const clearCart = async () => {
    try {
      await cartApi.clearCart();
      setItems([]);
      setSubtotal(0);
      setItemCount(0);
    } catch (err: any) {
      setError(err.message || 'Failed to clear cart');
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        subtotal,
        itemCount,
        isOpen,
        setIsOpen,
        loading,
        error,
        addItem,
        updateItem,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
