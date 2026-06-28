export interface ToastPayload {
  type:   "success" | "error" | "info";
  title:  string;
  body?:  string;
}
