import {observer} from "mobx-react-lite";
import {FormEvent, useEffect, useState} from "react";
import {Col, Container, Form, Row} from "react-bootstrap";
import {useNavigate, useParams} from "react-router-dom";

import {NavbarComponent} from "../../components/Navbar";
import {SubmitButton} from "../../components/SubmitButton";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";
import {popup} from "../../utils/popupUtils";

interface Account {
  id: number;
  name: string;
  desc: string;
  user: string;
}

export const AccountEdit = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  const {id} = useParams();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  useEffect(() => {
    AuthAxios.get(`accounts?id=${id}`, auth.getToken())
      .then((res) => {
        const data: Account = res.data[0];
        setName(data.name);
        setDesc(data.desc);
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        popup(message as string, "Server", "danger");
      });
  }, []);
  if (id === undefined) {
    navigate("/accounts");
    return;
  }
  const bodyParameters = {
    id: id,
    Name: ``,
    Description: ``,
    action: "edit",
  };
  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    bodyParameters.Name = name;
    bodyParameters.Description = desc;
    AuthAxios.post("accounts", auth.getToken(), bodyParameters).catch((err) => {
      const message = err instanceof Error ? err.message : String(err);
      popup(message as string, "Server", "danger");
    });
    navigate(`/accounts/${id}`);
  };
  return (
    <Container>
      <NavbarComponent />
      <h1>Edit</h1>
      <Form id="tag-create-form" onSubmit={submitHandler}>
        <Form.Group>
          <Row className="mb-3">
            <Col xs={4} sm={2} className="text-end">
              <Form.Label htmlFor="id_name">Name</Form.Label>
            </Col>
            <Col xs={8} sm={10}>
              <Form.Control
                value={name}
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
                value={desc}
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
