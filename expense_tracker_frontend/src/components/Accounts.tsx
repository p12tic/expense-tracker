import axios from "axios";
import React, {useState} from "react";
import {Link} from "react-router-dom";


export function Accounts() {

    const [state, setState] = useState([]);
    let data;

    axios.get("http://localhost:8000/api/accounts").then(res => {
        data = res.data;
        setState(data);
    }).catch(() => {});
    return (
        <>
            <div>
                <table cellSpacing={200}>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Balance</th>
                    <th></th>
                    {state.map((output, id) => (
                        <tr key = {id}>
                            <td><Link to={`/accounts/${output.id}`}>{output.name}</Link></td>
                            <td>{output.desc}</td>
                            <td>{output.user}</td>
                            <td><Link to={`/accounts/${output.id}/sync`} role="button" className="btn btn-xs btn-default pull-right">Sync</Link></td>
                        </tr>
                    ))}
                </table>
            </div>
        </>
    )
}