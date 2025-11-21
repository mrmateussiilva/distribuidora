import { invoke } from "@tauri-apps/api/core";

export const receiptsApi = {
  generate: async (orderId: number): Promise<string> => {
    return await invoke("generate_receipt", { orderId });
  },
};

