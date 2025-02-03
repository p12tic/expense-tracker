
export const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
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

export function formatDateTimeForInput(date) {
    const pad = (num) => (num < 10 ? '0' : '') + num;

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}