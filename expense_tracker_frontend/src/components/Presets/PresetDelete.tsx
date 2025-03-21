import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../DefaultDelete";
import {NavbarComponent} from "../Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../Auth/AuthContext";
import {Container} from "react-bootstrap";

export const PresetDelete = observer(function PresetDelete() {
    const auth = useToken();
    const navigate = useNavigate();
    const {id} = useParams();
    const backLink: string = `/presets/${id}`;
    if (auth.getToken() === '') {
        navigate('/login');
    }

    return (
        <Container>
            <NavbarComponent/>
            <DefaultDelete backLink={backLink} id={id ? id : ""} returnPoint={`/presets`}
                           deleteRequestUrl={"presets"}/>
        </Container>
    )
})