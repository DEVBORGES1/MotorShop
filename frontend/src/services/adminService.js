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

export const leadsAdmin = {
  list: (params) => api.get('/admin/leads', { params }),
  get: (id) => api.get(`/admin/leads/${id}`).then((e) => e.data),
  update: (id, data) => api.patch(`/admin/leads/${id}`, data).then((e) => e.data),
  remove: (id) => api.delete(`/admin/leads/${id}`),
  removeMany: (ids) => api.post('/admin/leads/exclusao', { ids }).then((e) => e.data),
};

/** Fotos da moto. O arquivo vai direto ao provedor (`uploadService`); aqui, só metadados. */
export const fotosAdmin = {
  assinatura: (motoId) => api.post('/admin/uploads/assinatura', { motoId }).then((e) => e.data),
  vincular: (motoId, meta) => api.post(`/admin/motos/${motoId}/imagens`, meta).then((e) => e.data),
  ordenar: (motoId, body) =>
    api.patch(`/admin/motos/${motoId}/imagens/ordem`, body).then((e) => e.data),
  alterar: (motoId, imageId, body) =>
    api.patch(`/admin/motos/${motoId}/imagens/${imageId}`, body).then((e) => e.data),
  remover: (motoId, imageId) =>
    api.delete(`/admin/motos/${motoId}/imagens/${imageId}`).then((e) => e.data),
};
