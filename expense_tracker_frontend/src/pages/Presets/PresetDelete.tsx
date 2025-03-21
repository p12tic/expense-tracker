import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../../components/DefaultDelete";
import {NavbarComponent} from "../../components/Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../../utils/AuthContext";
import {Container} from "react-bootstrap";

export const PresetDelete = observer(function PresetDelete() {
  const auth = useToken();
  const navigate = useNavigate();
  const {id} = useParams();
  const backLink: string = `/presets/${id}`;
  if (auth.getToken() === "") {
    navigate("/login");
  }
  if (id === undefined) {
    navigate("/presets");
    return;
  }

  return (
    <Container>
      <NavbarComponent />
      <DefaultDelete
        backLink={backLink}
        id={id}
        returnPoint={`/presets`}
        deleteRequestUrl={"presets"}
      />
    </Container>
  );
});
