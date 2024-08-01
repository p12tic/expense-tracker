import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../DefaultDelete.tsx";
import {Navbar} from "../Navbar.tsx";
import {useParams} from "react-router-dom";


export const TransactionDelete = observer(function TransactionDelete() {
    const {id} = useParams();
    const backLink: string = `/transactions/${id}`;
    return (
        <div className="container">
            <Navbar />
            <DefaultDelete backLink={backLink} returnPoint={`/transactions`} id={id} deleteRequestUrl={`/api/transactions`} />
        </div>
    )
})