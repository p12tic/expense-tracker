import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../../components/DefaultDelete";
import {NavbarComponent} from "../../components/Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../../utils/AuthContext";
import {Container} from "react-bootstrap";

export const TagDelete = observer(function TagDelete() {
  const {id} = useParams();
  const backLink: string = `/tags/${id}`;
  const auth = useToken();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  return (
    <Container>
      <NavbarComponent />
      <DefaultDelete
        backLink={backLink}
        returnPoint={`/tags`}
        id={id ? id : ""}
        deleteRequestUrl={`tags`}
      />
    </Container>
  );
});
