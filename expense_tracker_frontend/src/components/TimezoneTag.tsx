import dayjs from "dayjs";
import React from "react";
import {Button} from "react-bootstrap";

import {pad} from "./Tools";

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
