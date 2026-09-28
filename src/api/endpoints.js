import client from './client';

export const auth = {
  login: (username, password) => client.post('/auth/login/', { username, password }),
  register: (payload) => client.post('/auth/register/', payload),
  verifyOtp: (email, code) => client.post('/auth/verify-otp/', { email, code }),
  resendOtp: (email) => client.post('/auth/resend-otp/', { email }),
  me: () => client.get('/me/'),
  changePassword: (payload) => client.post('/auth/change-password/', payload),
};

export const branches = {
  list: () => client.get('/branches/'),
  get: (id) => client.get(`/branches/${id}/`),
  create: (data) => client.post('/branches/', data),
  update: (id, data) => client.patch(`/branches/${id}/`, data),
  remove: (id) => client.delete(`/branches/${id}/`),
};

export const devices = {
  list: () => client.get('/devices/'),
  remove: (id) => client.delete(`/devices/${id}/`),
};

export const dashboard = {
  stats: () => client.get('/dashboard/stats/'),
  activity: () => client.get('/dashboard/activity/'),
};

export const inventory = {
  list: (params) => client.get('/inventory/items/', { params }),
  get: (id) => client.get(`/inventory/items/${id}/`),
  byBarcode: (code) => client.get('/inventory/items/by-barcode/', { params: { code } }),
  create: (data) => client.post('/inventory/items/', data),
  update: (id, data) => client.patch(`/inventory/items/${id}/`, data),
  remove: (id) => client.delete(`/inventory/items/${id}/`),
  addBatch: (id, data) => client.post(`/inventory/items/${id}/batches/`, data),
  addVariant: (id, data) => client.post(`/inventory/items/${id}/variants/`, data),
};

export const batches = {
  update: (id, data) => client.patch(`/inventory/batches/${id}/`, data),
  remove: (id) => client.delete(`/inventory/batches/${id}/`),
};

export const variants = {
  update: (id, data) => client.patch(`/inventory/variants/${id}/`, data),
  remove: (id) => client.delete(`/inventory/variants/${id}/`),
};

export const suppliers = {
  list: (params) => client.get('/suppliers/', { params }),
  create: (data) => client.post('/suppliers/', data),
  update: (id, data) => client.patch(`/suppliers/${id}/`, data),
  remove: (id) => client.delete(`/suppliers/${id}/`),
};

export const service = {
  list: (params) => client.get('/service/tickets/', { params }),
  create: (data) => client.post('/service/tickets/', data),
  update: (id, data) => client.patch(`/service/tickets/${id}/`, data),
  remove: (id) => client.delete(`/service/tickets/${id}/`),
  addPayment: (id, amount) => client.post(`/service/tickets/${id}/add-payment/`, { amount }),
  addPart: (id, item, quantity) => client.post(`/service/tickets/${id}/add-part/`, { item, quantity }),
  removePart: (id, part) => client.post(`/service/tickets/${id}/remove-part/`, { part }),
};

export const sales = {
  list: (params) => client.get('/sales/', { params }),
  create: (data) => client.post('/sales/', data),
  remove: (id) => client.delete(`/sales/${id}/`),
  addPayment: (id, amount) => client.post(`/sales/${id}/add-payment/`, { amount }),
  replaceItem: (id, data) => client.post(`/sales/${id}/replace-item/`, data),
};

export const workers = {
  list: (params) => client.get('/workers/', { params }),
  create: (data) => client.post('/workers/', data),
  update: (id, data) => client.patch(`/workers/${id}/`, data),
  remove: (id) => client.delete(`/workers/${id}/`),
};

export const attendance = {
  list: (params) => client.get('/attendance/', { params }),
  today: (date) => client.get('/attendance/today/', { params: date ? { date } : undefined }),
  mark: (data) => client.post('/attendance/mark/', data),
};

export const controlCenter = {
  get: () => client.get('/control-center/'),
  update: (changes) => client.put('/control-center/', { changes }),
};

export const liabilities = {
  list: (params) => client.get('/liabilities/', { params }),
  create: (data) => client.post('/liabilities/', data),
  update: (id, data) => client.patch(`/liabilities/${id}/`, data),
  remove: (id) => client.delete(`/liabilities/${id}/`),
};

export const subscription = {
  status: () => client.get('/subscription/status/'),
  checkout: (callback_url, billing_cycle) => client.post('/subscription/checkout/', { callback_url, billing_cycle }),
  verify: (reference) => client.get('/subscription/verify/', { params: { reference } }),
};

export const reports = {
  salesSummary: (params) => client.get('/reports/sales-summary/', { params }),
  salesByItem: (params) => client.get('/reports/sales-by-item/', { params }),
  bestSelling: (params) => client.get('/reports/best-selling/', { params }),
  salesByCategory: (params) => client.get('/reports/sales-by-category/', { params }),
  salesByStaff: (params) => client.get('/reports/sales-by-staff/', { params }),
  paymentMethod: (params) => client.get('/reports/payment-method/', { params }),
  salesByCustomer: (params) => client.get('/reports/sales-by-customer/', { params }),
  tax: (params) => client.get('/reports/tax/', { params }),
  expiringInventory: (params) => client.get('/reports/expiring-inventory/', { params }),
  inventoryValuation: () => client.get('/reports/inventory-valuation/'),
  netWorth: () => client.get('/reports/net-worth/'),
};

