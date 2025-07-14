import type {AccountElement, Preset} from "../utils/Interfaces";
import {Button, Col, Form, Row} from "react-bootstrap";
import React, {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useCallback,
  useRef,
} from "react";
import {TouchSpin} from "./TouchSpin";

interface AccountsListItemProps {
  account: AccountElement;
  setPresetInUse: Dispatch<SetStateAction<Preset>>;
}

export const AccountsListItem = ({
  account,
  setPresetInUse,
}: AccountsListItemProps) => {
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const handleAccountAmountMouseDown = (
    step: number,
    clickedAccID?: number,
  ) => {
    if (clickedAccID === undefined) return;
    const updateAccountAmount = (
      accounts: AccountElement[],
      accountId: number,
      step: number,
    ) => {
      return accounts.map((acc) =>
        acc.id === accountId ? {...acc, amount: acc.amount + step} : acc,
      );
    };

    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedAccounts = updateAccountAmount(
        prevPresetInUse.accounts,
        clickedAccID,
        step,
      );
      return {...prevPresetInUse, accounts: updatedAccounts};
    });

    // Prevent multiple intervals
    if (intervalRef.current !== null) return;

    // Set a timeout to start the interval
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        setPresetInUse((prevPresetInUse) => {
          if (!prevPresetInUse) return prevPresetInUse;
          const updatedAccounts = updateAccountAmount(
            prevPresetInUse.accounts,
            clickedAccID,
            step,
          );
          return {...prevPresetInUse, accounts: updatedAccounts};
        });
      }, 100);
    }, 1000);
  };
  const handleAccountAmountMouseUp = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  const handleAccountAmountChange = (
    e: ChangeEvent<HTMLInputElement>,
    accID?: number,
  ) => {
    if (accID === undefined) return;
    const newAmount = parseFloat(e.target.value);
    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedAccounts = prevPresetInUse.accounts.map((acc) =>
        acc.id === accID ? {...acc, amount: newAmount} : acc,
      );
      return {...prevPresetInUse, accounts: updatedAccounts};
    });
  };
  const handleAccUseClick = useCallback(
    (clickedAccUse: AccountElement, state?: boolean) => {
      setPresetInUse((prevPresetInUse) => {
        if (!prevPresetInUse) return prevPresetInUse;
        const updatedAccounts = prevPresetInUse.accounts.map((acc) =>
          acc.id === clickedAccUse.id
            ? {...acc, isUsed: state ?? !acc.isUsed}
            : acc,
        );
        return {...prevPresetInUse, accounts: updatedAccounts};
      });
    },
    [],
  );
  return (
    <Form.Group key={account.id} className="align-items-center">
      <Row className="mb-3">
        <Col xs={2} sm={1} className="align-content-center">
          <Form.Label className="mb-0">Name</Form.Label>
        </Col>
        <Col xs={4} sm={2} className="align-content-center">
          <Form.Text className="tmp-account-name">{account.name}</Form.Text>
        </Col>
        {account.isUsed ? (
          <>
            <Col xs={12} sm={1} className="align-content-center">
              <Form.Label className="tmp-account-amount-label mb-0">
                Amount
              </Form.Label>
            </Col>
            <Col xs={12} sm={4} className="tmp-account-amount-box">
              <TouchSpin
                value={account.amount || ""}
                handleMouseUp={handleAccountAmountMouseUp}
                handleMouseDown={handleAccountAmountMouseDown}
                handleChange={handleAccountAmountChange}
                itemID={account.id}
              />
            </Col>
          </>
        ) : null}
        <Col xs={4} sm={2} className="ms-auto tmp-account-buttons">
          {!account.isUsed ? (
            <Button
              variant="default"
              className="tmp-account-enable"
              style={{width: "100%"}}
              type="button"
              onClick={() => handleAccUseClick(account)}
            >
              Use
            </Button>
          ) : (
            <Button
              variant="default"
              className="tmp-account-disable"
              style={{width: "100%"}}
              type="button"
              onClick={() => handleAccUseClick(account)}
            >
              Don't use
            </Button>
          )}
        </Col>
      </Row>
    </Form.Group>
  );
};
