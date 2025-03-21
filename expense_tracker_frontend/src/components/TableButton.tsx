import "../../../expenses/static/expenses/common.css";
import {Button} from "react-bootstrap";

interface TableButtonProps {
  dest: string;
  name: string;
  class?: string;
}
export const TableButton = function TableButton(
  tableButtonProps: TableButtonProps,
) {
  return (
    <Button
      style={{marginLeft: 10}}
      className="my-auto"
      href={tableButtonProps.dest}
      variant={`${tableButtonProps.class ? tableButtonProps.class : `primary`}`}
    >
      {tableButtonProps.name}
    </Button>
  );
};
