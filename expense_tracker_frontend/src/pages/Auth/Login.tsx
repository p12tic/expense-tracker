import axios from "axios";
import {observer} from "mobx-react-lite";
import {FormEvent, useEffect, useState} from "react";
import {Col, Container, Form, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";

import {NavbarEmpty} from "../../components/NavbarEmpty";
import {SubmitButton} from "../../components/SubmitButton";
import {useToken} from "../../utils/AuthContext";
import {getApiUrlForCurrentWindow} from "../../utils/Network";
import {popup} from "../../utils/popupUtils";

export const Login = observer(() => {
  const auth = useToken();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isValidating, setIsValidating] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const validateToken = async () => {
      if (auth.getToken()) {
        const isValid = await auth.validateToken();
        if (isValid) {
          navigate("/transactions");
        } else {
          // Token is invalid, clear it
          auth.clearToken();
        }
      }
      setIsValidating(false);
    };

    validateToken();
  }, [auth, navigate]);

  const submitHandler = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    axios
      .post(`${getApiUrlForCurrentWindow()}api-token-auth/`, {
        username: username,
        password: password,
      })
      .then((response) => {
        auth.setToken(response.data.token);
        navigate("/transactions");
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        popup(message as string, "Server", "danger");
      });
  };

  if (isValidating) {
    return (
      <Container>
        <NavbarEmpty />
        <div className="text-center mt-5">
          <p>Logging in...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <NavbarEmpty />
      <Form id="login-form" onSubmit={submitHandler}>
        <Form.Group>
          <Row className="mb-3">
            <Col xs={4} sm={2} className="text-end">
              <Form.Label htmlFor="id_username">Username</Form.Label>
            </Col>
            <Col xs={8} sm={10}>
              <Form.Control
                type="text"
                name="username"
                key="id_username"
                required={true}
                onChange={(e) => setUsername(e.target.value)}
              />
            </Col>
          </Row>
          <Row className="mb-3">
            <Col xs={4} sm={2} className="text-end">
              <Form.Label htmlFor="id_password">Password</Form.Label>
            </Col>
            <Col xs={8} sm={10}>
              <Form.Control
                type="password"
                name="password"
                key="id_password"
                required={true}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Col>
          </Row>
          <SubmitButton text="Log in" />
        </Form.Group>
      </Form>
    </Container>
  );
});
