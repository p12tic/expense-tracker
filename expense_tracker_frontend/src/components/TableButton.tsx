import "../../../expenses/static/expenses/common.css";
import {Button} from "react-bootstrap";

interface TableButtonProps {
  dest: string;
  name: string;
  type?: string;
}
export const TableButton = ({
  dest,
  name,
  type,
}: TableButtonProps) => {
  return (
    <Button
      style={{marginLeft: 10}}
      className="my-auto"
      href={dest}
      variant={`${type ? type : `primary`}`}
    >
      {name}
    </Button>
  );
};
