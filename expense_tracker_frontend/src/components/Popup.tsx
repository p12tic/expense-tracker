type Props = {
  header: string;
  message: string;
  visible: boolean;
  setVisible: React.Dispatch<React.SetStateAction<boolean>>;
  variant?: "success" | "danger" | "warning" | "info";
};

export function SinglePopup({
  header,
  message,
  visible,
  setVisible,
  variant,
}: Props) {
  if (!visible) return null;

  return (
    <div
      className={`alert alert-${variant} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-5 w-50`}
      role="alert"
      style={{zIndex: 9999}}
    >
      <strong className="me-2">{header}</strong>
      {message}

      <button
        type="button"
        className="btn-close"
        onClick={() => setVisible(false)}
        aria-label="Close"
      />
    </div>
  );
}
