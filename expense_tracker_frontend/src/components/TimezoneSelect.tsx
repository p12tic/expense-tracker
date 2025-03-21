import {Form} from "react-bootstrap";
import {Dispatch, SetStateAction} from "react";

type TimezoneSelectProps = {
    offset: number,
    onChange: Dispatch<SetStateAction<number>>
}

export function TimezoneSelect(props: TimezoneSelectProps) {
    const timezones = Array.from({length: 26}, (_, index) => index - 11)
    return (
        <Form.Select value={props.offset}
                     onChange={(e) => props.onChange(Number(e.target.value))}
                     style={{width: "30%", minWidth: "100px"}}>
            {timezones.map((index) => (
                <option value={-index * 60}>{index > 0 ? '+' : ''}{index}:00</option>
            ))}
        </Form.Select>
    )
}