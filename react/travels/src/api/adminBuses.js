import api from "./api";

export const fetchAdminBuses = () => api.get("/api/admin/buses/");

export const createAdminBus = (formData) =>
  api.post("/api/admin/buses/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateAdminBus = (id, formData) =>
  api.put(`/api/admin/buses/${id}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteAdminBus = (id) => api.delete(`/api/admin/buses/${id}/`);
