import {observer} from "mobx-react-lite";
import {useToken} from "../../utils/AuthContext";
import {NavbarComponent} from "../../components/Navbar";
import {Container, Button} from "react-bootstrap";

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
