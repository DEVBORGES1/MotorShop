import { api } from './api.js';

/**
 * Chamadas administrativas. Única camada do painel que conhece as rotas da API.
 */

export const motosAdmin = {
  list: (params) => api.get('/admin/motos', { params }),
  get: (id) => api.get(`/admin/motos/${id}`).then((e) => e.data),
  create: (data) => api.post('/admin/motos', data).then((e) => e.data),
  update: (id, data) => api.patch(`/admin/motos/${id}`, data).then((e) => e.data),
  changeStatus: (id, status) =>
    api.patch(`/admin/motos/${id}/status`, { status }).then((e) => e.data),
  deactivate: (id) => api.delete(`/admin/motos/${id}`).then((e) => e.data),
};

export const marcasAdmin = {
  list: () => api.get('/admin/marcas').then((e) => e.data),
  create: (data) => api.post('/admin/marcas', data).then((e) => e.data),
  update: (id, data) => api.patch(`/admin/marcas/${id}`, data).then((e) => e.data),
  remove: (id) => api.delete(`/admin/marcas/${id}`),
};

export const usuariosAdmin = {
  list: () => api.get('/admin/usuarios').then((e) => e.data),
  create: (data) => api.post('/admin/usuarios', data).then((e) => e.data),
  update: (id, data) => api.patch(`/admin/usuarios/${id}`, data).then((e) => e.data),
  deactivate: (id) => api.delete(`/admin/usuarios/${id}`).then((e) => e.data),
};

export const storeAdmin = {
  get: () => api.get('/admin/store').then((e) => e.data),
  update: (data) => api.patch('/admin/store', data).then((e) => e.data),
};
