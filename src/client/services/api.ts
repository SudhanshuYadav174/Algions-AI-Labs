const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('ut_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  let sessionId = localStorage.getItem('ut_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('ut_session_id', sessionId);
  }
  headers['x-session-id'] = sessionId;
  return headers;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error: any = new Error(data.message || data.error || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.details = data.details;
    error.data = data;
    throw error;
  }

  return data;
}

// Authentication API
export const authApi = {
  login: (credentials: any) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData: any) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getProfile: () => apiRequest('/auth/me'),
  addAddress: (addr: any) => apiRequest('/auth/addresses', { method: 'POST', body: JSON.stringify(addr) }),
  deleteAddress: (id: number) => apiRequest(`/auth/addresses/${id}`, { method: 'DELETE' }),
};

// Products API
export const productApi = {
  getProducts: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    return apiRequest(`/products?${query.toString()}`);
  },
  getProduct: (slugOrId: string | number) => apiRequest(`/products/${slugOrId}`),
  getCategories: () => apiRequest('/products/categories'),
  getFeatured: () => apiRequest('/products/featured'),
};

// Cart API
export const cartApi = {
  getCart: () => apiRequest('/cart'),
  addItem: (variantId: number, quantity: number) =>
    apiRequest('/cart/items', { method: 'POST', body: JSON.stringify({ variantId, quantity }) }),
  updateItem: (cartItemId: number, quantity: number) =>
    apiRequest(`/cart/items/${cartItemId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
  removeItem: (cartItemId: number) => apiRequest(`/cart/items/${cartItemId}`, { method: 'DELETE' }),
  clearCart: () => apiRequest('/cart', { method: 'DELETE' }),
};

// Orders & Checkout API
export const orderApi = {
  getQuote: (items: any[], couponCode?: string | null) =>
    apiRequest('/checkout/quote', { method: 'POST', body: JSON.stringify({ items, couponCode }) }),
  validateCoupon: (code: string) =>
    apiRequest('/coupons/validate', { method: 'POST', body: JSON.stringify({ code }) }),
  checkout: (data: any, idempotencyKey?: string) =>
    apiRequest('/checkout', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(data),
    }),
  getMyOrders: () => apiRequest('/orders'),
  getOrder: (id: number) => apiRequest(`/orders/${id}`),
  cancelOrder: (id: number, reason?: string) =>
    apiRequest(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
};

// Admin API
export const adminApi = {
  getDashboard: () => apiRequest('/admin/reports/sales'),
  getOrders: (params: any = {}) => {
    const query = new URLSearchParams(params);
    return apiRequest(`/admin/orders?${query.toString()}`);
  },
  updateOrderStatus: (id: number, status: string) =>
    apiRequest(`/admin/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  adjustInventory: (variantId: number, stockQuantity: number, reason: string) =>
    apiRequest(`/admin/inventory/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify({ stockQuantity, reason }),
    }),
  createProduct: (data: any) => apiRequest('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: number, data: any) =>
    apiRequest(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: number) => apiRequest(`/admin/products/${id}`, { method: 'DELETE' }),
  getAuditLogs: (params: any = {}) => {
    const query = new URLSearchParams(params);
    return apiRequest(`/admin/audit-logs?${query.toString()}`);
  },
};

