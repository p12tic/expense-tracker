import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../DefaultDelete";
import {Navbar} from "../Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../Auth/AuthContext";
import axios from "axios";

export const PresetDelete = observer(function PresetDelete() {
    const Auth = useToken();
    const navigate = useNavigate();
    const {id} = useParams();
    const backLink: string = `/presets/${id}`;
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    if(Auth.getToken() === '') {
        navigate('/login');
    }

    return (
        <div className="container">
            <Navbar />
            <DefaultDelete backLink={backLink} id={id} returnPoint={`/presets`} deleteRequestUrl={"/api/presets"} />
        </div>
    )
})