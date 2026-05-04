let externalPopup: (
  header: string,
  msg: string,
  variant?: "success" | "danger" | "warning" | "info",
) => void = () => {
  console.warn("Popup is not ready");
};

export const setExternalPopup = (fn: typeof externalPopup) => {
  externalPopup = fn;
};

export const popup = (
  msg: string,
  header: string = "Notification",
  variant?: "success" | "danger" | "warning" | "info" | null,
) => {
  externalPopup(header, msg, variant ?? "info");
};
