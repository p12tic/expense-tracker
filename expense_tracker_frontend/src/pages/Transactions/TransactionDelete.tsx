import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../../components/DefaultDelete";
import {NavbarComponent} from "../../components/Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../../utils/AuthContext";
import {Container} from "react-bootstrap";

export const TransactionDelete = observer(() => {
  const {id} = useParams();
  const backLink: string = `/transactions/${id}`;
  const auth = useToken();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  if (id === undefined) {
    navigate("/transactions");
    return;
  }
  return (
    <Container>
      <NavbarComponent />
      <DefaultDelete
        backLink={backLink}
        returnPoint={`/transactions`}
        id={id}
        deleteRequestUrl={`transactions`}
      />
    </Container>
  );
});
