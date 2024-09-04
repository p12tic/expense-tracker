import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../DefaultDelete.tsx";
import {Navbar} from "../Navbar.tsx";
import {useParams} from "react-router-dom";
import {useToken} from "../Auth/AuthContext.tsx";
import axios from "axios";


export const AccountDelete = observer(function AccountDelete() {
    const Auth = useToken();
    const {id} = useParams();
    const backLink: string = `/accounts/${id}`;
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};

    return (
        <div className="container">
            <Navbar />
            <DefaultDelete backLink={backLink} id={id} returnPoint={`/accounts`} deleteRequestUrl={"/api/accounts"} />
        </div>
    )
})