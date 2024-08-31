import {Navbar} from "./Navbar.tsx";
import React, {useEffect, useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import {TableButton} from "./TableButton.tsx";

interface Presets {
    id: number;
    name: string;
    desc: string;
    transactionDesc: string;
    user: string;
}
export function PresetsList() {
    const [state, setState] = useState<Presets[]>([]);

    useEffect(() => {
        axios.get("http://localhost:8000/api/presets").then(res => {
            const data: Presets[] = res.data;
            setState(data);
        }).catch(err => {console.error(err)})
    }, []);

    return (
        <div className='container'>
            <Navbar />
            <h1>Presets
                <div className='pull-right'>
                    <TableButton dest={`/presets/add`} name={'New'} />
                </div>
            </h1>
            <table className="table table-condensed">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Accounts</th>
                        <th>Tags</th>
                    </tr>
                </thead>
                <tbody>
                    {state.map((output, id) => (
                        <tr key={id}>
                            <td><Link to={`/presets/${output.id}`}>{output.name}</Link></td>
                            <td>{output.desc}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}