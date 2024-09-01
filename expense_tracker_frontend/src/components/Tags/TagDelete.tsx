import {observer} from "mobx-react-lite";
import {DefaultDelete} from "../DefaultDelete.tsx";
import {Navbar} from "../Navbar.tsx";
import {useNavigate, useParams} from "react-router-dom";
import {useState} from "react";


export const TagDelete = observer(function TagDelete() {
    const {id} = useParams();
    const backLink: string = `/tags/${id}`;
    return (
        <div className="container">
            <Navbar />
            <DefaultDelete backLink={backLink} returnPoint={`/tags`} id={id} deleteRequestUrl={`/api/tags`} />
        </div>
    )
})