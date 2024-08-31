import React, {useEffect, useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import {Navbar} from "./Navbar.tsx";
import {TableButton} from "./TableButton.tsx";
import {useToken} from "./AuthContext.tsx";
import {observer} from "mobx-react-lite";

interface Tag {
    id: number;
    name: string;
    desc: string;
    user: string;
}
export const Tags = observer(function Tags() {
    const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<Tag[]>([]);
    useEffect(() => {
        axios.get("http://localhost:8000/api/tags").then(res => {
            const data: Tag[] = res.data;
            setState(data);
        }).catch(err => {console.error(err)});
    }, []);
    return(
        <div className='container'>
            <Navbar />
            <h1>Tags
                <div className='pull-right'>
                    <TableButton dest={`/tags/add`} name={'New'}/>
                </div>
            </h1>
            <table className="table table-condensed">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    {state.map((output, id) => (
                        <tr key={id}>
                            <td><Link to={`/tags/${output.id}`}>{output.name}</Link></td>
                            <td>{output.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
)
