import {Alert, Button, Card, Col, Collapse, Form, Row} from "react-bootstrap";
import React, {ChangeEvent, Dispatch, SetStateAction, useRef} from "react";
import {type AccountElement, Preset} from "../utils/Interfaces";
import {TouchSpin} from "./TouchSpin";

interface PresetSelectionProps {
  presets: Preset[];
  presetInUse: Preset;
  openPresets: boolean;
  setOpenPresets: Dispatch<SetStateAction<boolean>>;
  setPresetInUse: Dispatch<SetStateAction<Preset>>;
  setDesc: Dispatch<SetStateAction<string>>;
}
export const PresetSelection = ({
  presets,
  presetInUse,
  openPresets,
  setOpenPresets,
  setPresetInUse,
  setDesc,
}: PresetSelectionProps) => {
  const intervalRefPreset = useRef<number | null>(null);
  const timeoutRefPreset = useRef<number | null>(null);
  const handlePresetSelect = async (selectedPreset: Preset) => {
    setPresetInUse(selectedPreset);
    setDesc(selectedPreset.transaction_desc || "");
  };

  const handlePresetAmountMouseDown = (step: number) => {
    const updateAccountAmount = (
      accounts: AccountElement[],
      amount: string,
    ) => {
      return accounts.map((acc) =>
        acc.fraction
          ? {...acc, amount: parseFloat(amount) * acc.fraction}
          : acc,
      );
    };

    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const newAmount = (parseFloat(prevPresetInUse.amount) + step).toFixed(2);
      const updatedAccounts = updateAccountAmount(
        prevPresetInUse.accounts,
        newAmount,
      );
      return {
        ...prevPresetInUse,
        accounts: updatedAccounts,
        amount: newAmount,
      };
    });

    // Prevent multiple intervals
    if (intervalRefPreset.current !== null) return;

    // Set a timeout to start the interval
    timeoutRefPreset.current = window.setTimeout(() => {
      intervalRefPreset.current = window.setInterval(() => {
        setPresetInUse((prevPresetInUse) => {
          if (!prevPresetInUse) return prevPresetInUse;
          const newAmount = (parseFloat(prevPresetInUse.amount) + step).toFixed(
            2,
          );
          const updatedAccounts = updateAccountAmount(
            prevPresetInUse.accounts,
            newAmount,
          );
          return {
            ...prevPresetInUse,
            accounts: updatedAccounts,
            amount: newAmount,
          };
        });
      }, 100);
    }, 1000);
  };

  const handlePresetAmountMouseUp = () => {
    if (intervalRefPreset.current !== null) {
      clearInterval(intervalRefPreset.current);
      intervalRefPreset.current = null;
    }
    if (timeoutRefPreset.current !== null) {
      clearTimeout(timeoutRefPreset.current);
      timeoutRefPreset.current = null;
    }
  };

  const handlePresetAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value);
    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedAccounts = prevPresetInUse.accounts.map((acc) =>
        acc.fraction ? {...acc, amount: newAmount * acc.fraction} : acc,
      );
      return {
        ...prevPresetInUse,
        accounts: updatedAccounts,
        amount: newAmount.toString(),
      };
    });
  };
  return (
    <>
      {presets.length > 0 ? (
        <Card id="tmp-presets">
          <Card.Body>
            <Button
              variant="default"
              aria-controls="presets-collapse"
              aria-expanded={openPresets}
              onClick={() => setOpenPresets(!openPresets)}
            >
              <b>Import preset</b>
            </Button>
            <Collapse in={openPresets}>
              <div id="presets-collapse">
                <div style={{margin: "1em"}}></div>
                <Form.Group>
                  <Form.Label>Select preset</Form.Label>
                  <br></br>
                  {presets.map((preset, id) =>
                    presetInUse?.id === preset.id ? (
                      <Button
                        variant="info"
                        className="tmp-preset-button"
                        style={{marginBottom: "0.2em"}}
                        data-id={`${preset.id}`}
                        key={id}
                      >
                        {preset.name}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        className="tmp-preset-button"
                        onClick={() => handlePresetSelect(preset)}
                        style={{marginBottom: "0.2em"}}
                        data-id={`${preset.id}`}
                        key={id}
                      >
                        {preset.name}
                      </Button>
                    ),
                  )}
                </Form.Group>
                {presetInUse && presetInUse.id !== 0 ? (
                  <Form.Group className="tmp-preset-amount-line">
                    <Row>
                      <Col xs={12} sm={2} className="align-content-center">
                        <Form.Label className="mb-0">Amount</Form.Label>
                      </Col>
                      <Col xs={12} sm={10} className="align-content-center">
                        <TouchSpin
                          value={presetInUse.amount}
                          handleMouseUp={handlePresetAmountMouseUp}
                          handleMouseDown={handlePresetAmountMouseDown}
                          handleChange={handlePresetAmountChange}
                        />
                      </Col>
                    </Row>
                  </Form.Group>
                ) : null}
              </div>
            </Collapse>
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="info" transition={false}>
          No presets have been created
        </Alert>
      )}
    </>
  );
};
