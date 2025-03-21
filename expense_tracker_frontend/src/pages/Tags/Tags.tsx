import React, {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {useToken} from "../../utils/AuthContext";
import {observer} from "mobx-react-lite";
import {AuthAxios} from "../../utils/Network";
import {Col, Row, Container, Table} from "react-bootstrap";

interface Tag {
  id: number;
  name: string;
  desc: string;
  user: string;
}
export const Tags = observer(function Tags() {
  const auth = useToken();
  const [state, setState] = useState<Tag[]>([]);
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }

  useEffect(() => {
    AuthAxios.get("tags", auth.getToken())
      .then((res) => {
        const data: Tag[] = res.data;
        setState(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);
  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Tags</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/tags/add`} name={"New"} />
        </Col>
      </Row>
      <Table size="sm">
        <thead>
          {state.length > 0 ? (
            <tr>
              <th>Name</th>
              <th>Description</th>
            </tr>
          ) : (
            <></>
          )}
        </thead>
        <tbody>
          {state.length > 0 ? (
            state.map((output, id) => (
              <tr key={id}>
                <td>
                  <Link to={`/tags/${output.id}`}>{output.name}</Link>
                </td>
                <td>{output.desc}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td>No tags yet</td>
            </tr>
          )}
        </tbody>
      </Table>
    </Container>
  );
});
