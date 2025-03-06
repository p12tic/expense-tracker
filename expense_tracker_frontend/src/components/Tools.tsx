import {Dayjs} from "dayjs";

export const formatDate = (date: Dayjs): string => {
    return date.format("YYYY-MM-DD HH:mm");
};

export function centsToString(value) {
    try{
        let Value: number = value;
        if (Value % 100 == 0) {
            return (Value / 100).toString();
        }

        const negative = Value < 0;
        if (negative) {
            Value = -Value;
        }

        const cents = Value % 100;
        Value = Math.floor(Value / 100);
        if (negative)
            return `-${Value.toFixed(0)}.${cents.toFixed(0).padStart(2,'0')}`;
        else
            return `${Value.toFixed(0)}.${cents.toFixed(0).padStart(2,'0')}`;
    }
    catch{
        return '';
    }
    // don't use floating-point numbers here due to potential rounding
}

export function pad(num) {
    return (num < 10 ? '0' : '') + num;
}

export function formatDateTimeForInput(date) {
    return date.format("YYYY-MM-DD HH:mm:ss");
}