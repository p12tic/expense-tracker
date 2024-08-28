import axios from "axios";
import React, {useState} from "react";
import {Link} from "react-router-dom";

interface Account {
    id: number;
    name: string;
    desc: string;
    user: string;
}
export function Accounts() {
    const [state, setState] = useState<Account[]>([]);


    let data;

    axios.get("http://localhost:8000/api/accounts").then(res => {
        data = res.data;
        setState(data);
    }).catch(() => {});
    return (
        <>
            <div>
                <table cellSpacing={200}>
                    <tbody>
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Balance</th>
                            <th></th>
                        </tr>
                        {state.map((output, id) => (
                            <tr key={id}>
                                <td><Link to={`/accounts/${output.id}`}>{output.name}</Link></td>
                                <td>{output.desc}</td>
                                <td>{output.user}</td>
                                <td><Link to={`/accounts/${output.id}/sync`} role="button" className="btn btn-xs btn-default pull-right">Sync</Link></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    )
}