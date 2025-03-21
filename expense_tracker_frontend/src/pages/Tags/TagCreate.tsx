import {NavbarEmpty} from "../../components/NavbarEmpty";
import {observer} from "mobx-react-lite";
import {FormEvent, useState} from "react";
import {useToken} from "../../utils/AuthContext";
import {NavbarComponent} from "../../components/Navbar";
import {useNavigate} from "react-router-dom";
import {AuthAxios} from "../../utils/Network";
import {Col, Form, Row, Container} from "react-bootstrap";
import {SubmitButton} from "../../components/SubmitButton";

export const TagCreate = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  if (auth.getToken() === "") {
    navigate("/login");
  }
  let bodyParameters = {
    Name: ``,
    Description: ``,
    action: "create",
  };

  const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    bodyParameters.Name = name;
    bodyParameters.Description = desc;
    await AuthAxios.post("tags", auth.getToken(), bodyParameters).catch((err) =>
      console.error(err),
    );
    navigate("/tags");
  };
  return (
    <Container>
      <NavbarComponent />
      <h1>Create new tag</h1>
      <Form id="tag-create-form" onSubmit={submitHandler}>
        <Form.Group>
          <Row className="mb-3">
            <Col xs={4} sm={2} className="text-end">
              <Form.Label htmlFor="id_name">Name</Form.Label>
            </Col>
            <Col xs={8} sm={10}>
              <Form.Control
                type="text"
                name="name"
                key="id_name"
                required={true}
                onChange={(e) => setName(e.target.value)}
              />
            </Col>
          </Row>
          <Row className="mb-3">
            <Col xs={4} sm={2} className="text-end">
              <Form.Label htmlFor="id_desc">Description</Form.Label>
            </Col>
            <Col xs={8} sm={10}>
              <Form.Control
                type="text"
                name="description"
                key="id_desc"
                onChange={(e) => setDesc(e.target.value)}
              />
            </Col>
          </Row>
          <SubmitButton text="Save" />
        </Form.Group>
      </Form>
    </Container>
  );
});
