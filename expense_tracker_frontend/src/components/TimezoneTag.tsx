import {pad} from "./Tools";
import {Button} from "react-bootstrap";
import React from "react";
import dayjs from "dayjs";

export function TimezoneTag(props) {
    if (props.offset !== -dayjs().utcOffset()) {
        return (
            <Button variant="secondary" className="btn-xs" style={{marginLeft: 5}}>
                UTC {props.offset < 0 ? '+' : ''}{-props.offset / 60}:{pad(Math.abs(props.offset % 60))}
            </Button>
        )
    } else {
        return (
            <></>
        )
    }
}