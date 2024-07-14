import React, {useEffect, useState} from "react";
import axios from "axios";
import {Link} from "react-router-dom";
import {Navbar} from "./Navbar.tsx";
import {TableButton} from "./TableButton.tsx";

interface Tag {
    id: number;
    name: string;
    desc: string;
    user: string;
}
export function Tags() {
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

