import {observer} from "mobx-react-lite";
import {Button, Container} from "react-bootstrap";

import {NavbarComponent} from "../../components/Navbar";
import {useToken} from "../../utils/AuthContext";

export const UserEdit = observer(() => {
  const Auth = useToken();
  const logout = () => {
    Auth.setToken("");
  };

  return (
    <Container>
      <NavbarComponent />
      <h1>User settings</h1>
      <Button variant="primary" onClick={logout} href="/login" role="button">
        Log out
      </Button>
      <p>TODO</p>
    </Container>
  );
});
