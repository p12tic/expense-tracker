import {observer} from "mobx-react-lite";
import {FormEvent, useEffect, useState} from "react";
import {useToken} from "../../utils/AuthContext";
import {NavbarComponent} from "../../components/Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {AuthAxios} from "../../utils/Network";
import {Col, Form, Row, Container} from "react-bootstrap";
import {SubmitButton} from "../../components/SubmitButton";

interface Tag {
  id: number;
  name: string;
  desc: string;
  user: string;
}

export const TagEdit = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  const {id} = useParams();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  useEffect(() => {
    AuthAxios.get(`tags?id=${id}`, auth.getToken())
      .then((res) => {
        const data: Tag = res.data[0];
        setName(data.name);
        setDesc(data.desc);
      })
      .catch((err) => console.error(err));
  }, []);
  if (id === undefined) {
    navigate("/tags");
    return;
  }

  let bodyParameters = {
    id: id,
    Name: ``,
    Description: ``,
    action: "edit",
  };

  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    bodyParameters.Name = name;
    bodyParameters.Description = desc;
    AuthAxios.post("tags", auth.getToken(), bodyParameters).catch((err) =>
      console.error(err),
    );
    navigate(`/tags/${id}`);
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
