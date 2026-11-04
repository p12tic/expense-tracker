import {observer} from "mobx-react-lite";
import {FormEvent, useEffect, useState} from "react";
import {Col, Container, Form, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";

import {NavbarComponent} from "../../components/Navbar";
import {SubmitButton} from "../../components/SubmitButton";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";
import {popup} from "../../utils/popupUtils";

interface Account {
  id: number;
  name: string;
}
interface User {
  id: number;
  username: string;
}

export const ChainedAccountCreate = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  const [slaveUsername, setSlaveUsername] = useState("");
  const [masterAccount, setMasterAccount] = useState("");
  const [desc, setDesc] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  if (auth.getToken() === "") {
    navigate("/login");
  }

  useEffect(() => {
    AuthAxios.get("accounts", auth.getToken())
      .then((res) => setAccounts(res.data))
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        popup(message as string, "Server", "danger");
      });
    AuthAxios.get("users", auth.getToken())
      .then((res) => setUsers(res.data))
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        popup(message as string, "Server", "danger");
      });
  }, []);

  const submitHandler = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bodyParameters = {
      slave_username: slaveUsername,
      master_account: Number(masterAccount),
      Description: desc,
      action: `create`,
    };
    try {
      await AuthAxios.post(
        "chained_account_requests",
        auth.getToken(),
        bodyParameters,
      );
      navigate("/chained_accounts");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      popup(message as string, "Server", "danger");
    }
  };
  return (
    <Container>
      <NavbarComponent />
      <h1>Create chained account request</h1>
      <Form id="chained-account-create-form" onSubmit={submitHandler}>
        <Form.Group>
          <Row className="mb-3">
            <Col sm={1}>
              <Form.Label htmlFor="id_slave">User</Form.Label>
            </Col>
            <Col>
              <Form.Select
                name="slave"
                key="id_slave"
                required={true}
                value={slaveUsername}
                onChange={(e) => setSlaveUsername(e.target.value)}
              >
                <option value="" disabled>
                  Select user
                </option>
                {users.map((user) => (
                  <option key={user.id} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col sm={1}>
              <Form.Label htmlFor="id_account">Account</Form.Label>
            </Col>
            <Col>
              <Form.Select
                name="account"
                key="id_account"
                required={true}
                value={masterAccount}
                onChange={(e) => setMasterAccount(e.target.value)}
              >
                <option value="" disabled>
                  Select input account
                </option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col sm={1}>
              <Form.Label htmlFor="id_desc">Description</Form.Label>
            </Col>
            <Col>
              <Form.Control
                type="text"
                name="description"
                key="id_desc"
                onChange={(e) => setDesc(e.target.value)}
              />
            </Col>
          </Row>
          <SubmitButton text="Send request" />
        </Form.Group>
      </Form>
    </Container>
  );
});
