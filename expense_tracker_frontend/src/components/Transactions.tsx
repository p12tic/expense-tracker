import {Navbar} from "./Navbar.tsx";
import React, {useEffect, useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import {TableButton} from "./TableButton.tsx";

interface Transaction {
    id: number;
    desc: string;
    dateTime: Date;
    user: string;
}
export function TransactionsList() {
    const [state, setState] = useState<Transaction[]>([]);

    useEffect(() => {
        axios.get("http://localhost:8000/api/transactions").then(res => {
            const data: Transaction[] = res.data;
            setState(data);
        }).catch(err => {console.error(err)})
    }, []);

    return (
        <div className='container' style={{minWidth: 'auto', justifySelf: 'center'}}>
            <Navbar />
            <h1>Transactions
                <div className='pull-right'>
                    <TableButton dest={`/transactions/add`} name={'New'} />
                </div>
            </h1>
            <table className="table table-condensed">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Date/Time</th>
                        <th>Actions</th>
                        <th>Tags</th>
                    </tr>
                </thead>
                <tbody>
                    {state.map((output, id) => (
                        <tr key={id}>
                            {output.desc ? <td><Link to={`/transactions/${output.id}`}>{output.desc}</Link></td> :
                                <td><Link to={`/sync/${output.id}`}>Sync Event</Link></td>}
                            <td>{output.dateTime.toString()}</td>
                            <td>{output.user}</td>
                            <td><Link to={`/transactions/${output.id}/sync`} role="button"
                                      className="btn btn-xs btn-default pull-right">Sync</Link></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}