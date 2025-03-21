import {useNavigate} from "react-router-dom";
import {AuthAxios} from "../utils/Network";
import {useToken} from "./Auth/AuthContext";
import {Col, Form, Row, Button} from "react-bootstrap";
import {FormEvent} from "react";

type DefaultDeleteProps = {
  deleteRequestUrl: string;
  returnPoint: string;
  id: string;
  backLink: string;
};

export function DefaultDelete(defaultDeleteProps: DefaultDeleteProps) {
  const auth = useToken();
  const navigate = useNavigate();
  const submitHandle = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    let bodyParameters = {
      id: defaultDeleteProps.id,
      action: `delete`,
    };
    await AuthAxios.post(
      defaultDeleteProps.deleteRequestUrl,
      auth.getToken(),
      bodyParameters,
    );
    navigate(`${defaultDeleteProps.returnPoint}`);
  };
  return (
    <>
      <h1>Are you sure to delete</h1>
      <Form onSubmit={submitHandle}>
        <Row>
          <Col md="auto">
            <Button variant="primary" href={defaultDeleteProps.backLink}>
              Cancel
            </Button>
          </Col>
          <Col md="auto">
            <Button variant="danger" type="submit" style={{marginLeft: 10}}>
              Delete
            </Button>
          </Col>
        </Row>
      </Form>
    </>
  );
}
