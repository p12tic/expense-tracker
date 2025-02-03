import React, {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {Navbar} from "../Navbar";
import {TableButton} from "../TableButton";
import {useToken} from "../Auth/AuthContext";
import {observer} from "mobx-react-lite";
import {AuthAxios} from "../../utils/Network";

interface Tag {
    id: number;
    name: string;
    desc: string;
    user: string;
}
export const Tags = observer(function Tags() {
    const Auth = useToken();
    const [state, setState] = useState<Tag[]>([]);
    const navigate = useNavigate();
    if(Auth.getToken() === '') {
        navigate('/login');
    }

    useEffect(() => {
        AuthAxios.get("http://localhost:8000/api/tags", Auth.getToken()).then(res => {
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
                    {state.length > 0 ?
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                        </tr>
                        :
                        <></>
                    }
                </thead>
                <tbody>
                    {state.length > 0 ?
                        state.map((output, id) => (
                            <tr key={id}>
                                <td><Link to={`/tags/${output.id}`}>{output.name}</Link></td>
                                <td>{output.desc}</td>
                            </tr>
                        ))
                        :
                        <tr>
                            <td>No tags yet</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    )
}
)
