import axios from "axios";
import React, {useEffect, useState} from "react";
import {Link} from "react-router-dom";
import {Navbar} from "./Navbar.tsx";
import './common.css';
import {TableButton} from "./TableButton.tsx";

interface Account {
    id: number;
    name: string;
    desc: string;
    user: string;
}
export function Accounts() {
    const [state, setState] = useState<Account[]>([]);

    useEffect(() => {
        axios.get("http://localhost:8000/api/accounts").then(res => {
            const data: Account[] = res.data;
            setState(data);
        }).catch(err => {console.error(err)});
    }, []);
    return (
        <div className='container' style={{minWidth: 'auto', justifySelf: 'center'}}>
            <Navbar />
            <h1>Accounts
                <div className='pull-right'>
                    <TableButton dest={`/accounts/add`} name={'New'} />
                </div>
            </h1>
            <table className="table table-condensed">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Balance</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {state.map((output, id) => (
                        <tr key={id}>
                            <td><Link to={`/accounts/${output.id}`}>{output.name}</Link></td>
                            <td>{output.desc}</td>
                            <td>{output.user}</td>
                            <td><Link to={`/accounts/${output.id}/sync`} role="button"
                                      className="btn btn-xs btn-default pull-right">Sync</Link></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}