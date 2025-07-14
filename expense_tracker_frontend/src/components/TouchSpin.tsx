import {Button, Form, InputGroup} from "react-bootstrap";
import React, {ChangeEvent} from "react";

interface TouchSpinProps {
  value: number | string;
  handleMouseUp: () => void;
  handleMouseDown: (step: number, itemID?: number) => void;
  handleChange: (e: ChangeEvent<HTMLInputElement>, itemID?: number) => void;
  itemID?: number;
}
export const TouchSpin = ({
  value,
  handleMouseUp,
  handleMouseDown,
  handleChange,
  itemID,
}: TouchSpinProps) => {
  return (
    <InputGroup className="bootstrap-touchspin">
      <Button
        variant="default"
        className="bootstrap-touchspin-down"
        type="button"
        onMouseDown={() =>
          itemID ? handleMouseDown(-1, itemID) : handleMouseDown(-1)
        }
        onMouseUp={() => handleMouseUp()}
        onMouseLeave={() => handleMouseUp()}
      >
        -
      </Button>
      <span
        className="input-group-addon bootstrap-touchspin-prefix"
        style={{display: "none"}}
      ></span>
      <Form.Control
        className="tmp-preset-amount"
        placeholder="Amount"
        step="0.01"
        type="number"
        value={value}
        onChange={(e) =>
          itemID
            ? handleChange(e as ChangeEvent<HTMLInputElement>, itemID)
            : handleChange(e as ChangeEvent<HTMLInputElement>)
        }
      />
      <span
        className="input-group-addon bootstrap-touchspin-postfix"
        style={{display: "none"}}
      ></span>
      <Button
        variant="default"
        className="bootstrap-touchspin-up"
        type="button"
        onMouseDown={() =>
          itemID ? handleMouseDown(1, itemID) : handleMouseDown(1)
        }
        onMouseUp={() => handleMouseUp()}
        onMouseLeave={() => handleMouseUp()}
      >
        +
      </Button>
    </InputGroup>
  );
};
