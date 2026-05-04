import React, {createContext, useEffect, useState} from "react";

import {setExternalPopup} from "../utils/popupUtils";
import {SinglePopup} from "./Popup";

const PopupContext = createContext(null);

export const GlobalPopup = ({children}: {children: React.ReactNode}) => {
  const [header, setHeader] = useState<string>("Notification");
  const [message, setMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<
    "success" | "danger" | "warning" | "info" | undefined
  >("info");
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    setExternalPopup((header, msg, variant) => {
      setHeader(header);
      setMessage(msg);
      setVariant(variant);
      setVisible(true);
    });
  }, []);

  return (
    <PopupContext.Provider value={null}>
      {children}

      {message && (
        <SinglePopup
          header={header}
          message={message}
          visible={visible}
          setVisible={setVisible}
          variant={variant}
        />
      )}
    </PopupContext.Provider>
  );
};
