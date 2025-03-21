import {pad} from "./Tools";
import {Button} from "react-bootstrap";
import React from "react";
import dayjs from "dayjs";

type TimezoneTagProps = {
  offset: number;
};

export function TimezoneTag({offset}: TimezoneTagProps) {
  if (offset !== -dayjs().utcOffset()) {
    return (
      <Button variant="secondary" className="btn-xs" style={{marginLeft: 5}}>
        UTC {offset < 0 ? "+" : ""}
        {-offset / 60}:{pad(Math.abs(offset % 60))}
      </Button>
    );
  } else {
    return <></>;
  }
}
