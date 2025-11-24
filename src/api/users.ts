import { invoke } from "@tauri-apps/api/core";
import type { SafeUser } from "../types";

export interface UserListItem {
  id: number;
  username: string;
  role: 'admin' | 'operator';
  created_at: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role: 'admin' | 'operator';
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  role?: 'admin' | 'operator';
}

export const usersApi = {
  getAll: async (): Promise<UserListItem[]> => {
    return await invoke("get_users");
  },

  create: async (payload: CreateUserPayload): Promise<number> => {
    return await invoke("create_user", { payload });
  },

  update: async (id: number, payload: UpdateUserPayload): Promise<void> => {
    return await invoke("update_user", { id, payload });
  },

  delete: async (id: number): Promise<void> => {
    return await invoke("delete_user", { id });
  },
};

