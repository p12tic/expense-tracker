import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../DefaultDelete";
import {NavbarComponent} from "../Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../Auth/AuthContext";
import {Container} from "react-bootstrap";



export const TagDelete = observer(function TagDelete() {
    const {id} = useParams();
    const backLink: string = `/tags/${id}`;
    const auth = useToken();
    const navigate = useNavigate();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    return (
        <Container>
            <NavbarComponent/>
            <DefaultDelete backLink={backLink} returnPoint={`/tags`} id={id}
                           deleteRequestUrl={`tags`}/>
        </Container>
    )
})