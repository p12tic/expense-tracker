import {Col, Row} from "react-bootstrap";
import {ReactNode} from "react";

type StaticFieldProps = {
  label: string;
  content: string | ReactNode;
};

export function StaticField({label, content}: StaticFieldProps) {
  return (
    <Row>
      <Col xs={4} sm={2} className="tmp-static-field-label">
        {label}
      </Col>
      <Col xs={8} sm={10} className="tmp-static-field-content">
        {content}
      </Col>
    </Row>
  );
}
