import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../../components/DefaultDelete";
import {NavbarComponent} from "../../components/Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../../utils/AuthContext";
import {Container} from "react-bootstrap";

export const AccountDelete = observer(function AccountDelete() {
  const auth = useToken();
  const navigate = useNavigate();
  const {id} = useParams();
  const backLink: string = `/accounts/${id}`;
  if (auth.getToken() === "") {
    navigate("/login");
  }

  return (
    <Container>
      <NavbarComponent />
      <DefaultDelete
        backLink={backLink}
        id={id ? id : ""}
        returnPoint={`/accounts`}
        deleteRequestUrl={"accounts"}
      />
    </Container>
  );
});
