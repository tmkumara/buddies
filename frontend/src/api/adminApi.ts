import api from './client';

export type AdminUser = {
  id: number;
  email: string;
  fullName?: string | null;
  enabled: boolean;
  roles: string[];
  permissions: string[];
};

export type Role = {
  id: number;
  name: string;
  description?: string | null;
  permissions: string[];
};

export type Permission = {
  id: number;
  code: string;
  description?: string | null;
};

export const fetchUsers = async (): Promise<AdminUser[]> => {
  const response = await api.get('/api/admin/users');
  return response.data.content ?? response.data;
};

export const createUser = async (payload: {
  email: string;
  password: string;
  fullName?: string;
  enabled: boolean;
  roleNames?: string[];
}): Promise<AdminUser> => {
  const response = await api.post('/api/admin/users', payload);
  return response.data;
};

export const updateUser = async (id: number, payload: { fullName?: string; enabled?: boolean }): Promise<AdminUser> => {
  const response = await api.put(`/api/admin/users/${id}`, payload);
  return response.data;
};

export const toggleUser = async (id: number, enabled: boolean): Promise<AdminUser> => {
  const endpoint = enabled ? 'enable' : 'disable';
  const response = await api.patch(`/api/admin/users/${id}/${endpoint}`);
  return response.data;
};

export const fetchRoles = async (): Promise<Role[]> => {
  const response = await api.get('/api/admin/roles');
  return response.data;
};

export const createRole = async (payload: { name: string; description?: string; permissionCodes?: string[] }): Promise<Role> => {
  const response = await api.post('/api/admin/roles', payload);
  return response.data;
};

export const updateRole = async (id: number, payload: { name?: string; description?: string; permissionCodes?: string[] }): Promise<Role> => {
  const response = await api.put(`/api/admin/roles/${id}`, payload);
  return response.data;
};

export const fetchPermissions = async (): Promise<Permission[]> => {
  const response = await api.get('/api/admin/permissions');
  return response.data;
};

export const createPermission = async (payload: { code: string; description?: string }): Promise<Permission> => {
  const response = await api.post('/api/admin/permissions', payload);
  return response.data;
};

export const updatePermission = async (id: number, payload: { code?: string; description?: string }): Promise<Permission> => {
  const response = await api.put(`/api/admin/permissions/${id}`, payload);
  return response.data;
};
