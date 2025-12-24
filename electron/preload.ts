import { contextBridge, ipcRenderer } from "electron";
import type { ProcessSaleInput } from "./services/InventoryService";
import type {
  STKInitiateResult,
  PaymentStatusResult,
} from "./services/PaymentService";

const api = {
  product: {
    search: (query: string) =>
      ipcRenderer.invoke("product:search", query) as Promise<
        { id: number; name: string; price: number }[]
      >,
    scanLookup: (term: string) =>
      ipcRenderer.invoke(
        "product:scanLookup",
        term
      ) as Promise<{ id: number; name: string; price: number } | null>,
    createCustom: (name: string, price: number) =>
      ipcRenderer.invoke("product:createCustom", {
        name,
        price,
      }) as Promise<{ id: number; name: string; price: number }>,
    upsertBasic: (barcode: string, name: string, price: number) =>
      ipcRenderer.invoke("product:upsertBasic", {
        barcode,
        name,
        price,
      }) as Promise<{ id: number; name: string; price: number }>,
  },
  sale: {
    create: (payload: ProcessSaleInput) =>
      ipcRenderer.invoke("sale:create", payload),
  },
  stock: {
    receive: (entries: { productId: number; quantity: number }[]) =>
      ipcRenderer.invoke("stock:receive", { entries }) as Promise<void>,
  },
  user: {
    login: (pin: string) => ipcRenderer.invoke("user:login", pin),
  },
  payment: {
    initiateSTK: (phone: string, amount: number) =>
      ipcRenderer.invoke("payment:initiateSTK", {
        phone,
        amount,
      }) as Promise<STKInitiateResult>,
    checkStatus: (checkoutRequestId: string) =>
      ipcRenderer.invoke(
        "payment:checkStatus",
        checkoutRequestId
      ) as Promise<PaymentStatusResult>,
  },
  printer: {
    printSaleReceipt: (saleId: number) =>
      ipcRenderer.invoke("printer:printSaleReceipt", saleId) as Promise<void>,
  },
};

contextBridge.exposeInMainWorld("duka", api);

export type DukaApi = typeof api;