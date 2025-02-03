import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../DefaultDelete";
import {Navbar} from "../Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {useToken} from "../Auth/AuthContext";


export const TransactionDelete = observer(function TransactionDelete() {
    const {id} = useParams();
    const backLink: string = `/transactions/${id}`;
    const Auth = useToken();
    const navigate = useNavigate();
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    return (
        <div className="container">
            <Navbar />
            <DefaultDelete backLink={backLink} returnPoint={`/transactions`} id={id} deleteRequestUrl={`/api/transactions`} />
        </div>
    )
})