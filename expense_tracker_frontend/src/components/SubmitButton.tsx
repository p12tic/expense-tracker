import {Col, Row, Button} from "react-bootstrap";

type SubmitButtonProps = {
  text: string;
};

export function SubmitButton(submitButtonProps: SubmitButtonProps) {
  return (
    <Row>
      <Col xs={4} sm={2} className="ms-auto">
        <Button variant="primary" type="submit" style={{width: "100%"}}>
          {submitButtonProps.text}
        </Button>
      </Col>
    </Row>
  );
}
