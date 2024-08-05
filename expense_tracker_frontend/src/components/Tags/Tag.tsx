import { observer } from "mobx-react-lite";
import {StaticField} from "../StaticField.tsx";
import { useToken } from "../Auth/AuthContext.tsx";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {Navbar} from "../Navbar.tsx";
import {TableButton} from "../TableButton.tsx";
import {centsToString, formatDate} from "../Tools.tsx";


interface TagElement {
    id: number;
    name: string;
    desc: string;
    user: number;
    transTag: TransTag[];
}
interface TransTag {
    id: number;
    transaction: number;
    tag: number;
    transactionElement: Transaction;
}
interface Transaction {
    id: number;
    desc: string;
    dateTime: Date;
    user: string;
    subs: Subtransaction[];
}
interface Subtransaction {
    id: number;
    amount: number;
    transaction: string;
    account: string;
    accountElement: Account;
}
interface Account {
    id: number;
    name: string;
    desc: string;
    user: string;
}
export const Tag = observer(function Tag() {

    const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<TagElement>({id:0, name:"", desc:"", user:0,
        transTag:[]});
    const {id} = useParams();
    const navigate = useNavigate();
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {

        const fetchTag = async() => {
            const tagRes = await axios.get(`http://localhost:8000/api/tags?id=${id}`);
            const tag: TagElement = tagRes.data[0];
            const transTagRes = await axios.get(`http://localhost:8000/api/transaction_tags?tag=${id}`);
            const transTagData: TransTag[] = transTagRes.data;
            const transTagsWithTrans = await Promise.all(transTagData.map(async (transTag:TransTag) => {
                const transRes = await axios.get(`http://localhost:8000/api/transactions?id=${transTag.transaction}`);
                const transData: Transaction = transRes.data[0];
                transData.dateTime = new Date(transData.date_time);
                const subsRes = await axios.get(`http://localhost:8000/api/subtransactions?transaction=${transData.id}`);
                const subsData: Subtransaction[] = subsRes.data;
                const subsAccountRes = await Promise.all(subsData.map(async (sub) => {
                    const accountsRes = await axios.get(`http://localhost:8000/api/accounts?id=${sub.account}`);
                    const accountData:Account = accountsRes.data[0];
                    sub.accountElement = accountData;
                    return sub;
                }));
                transData.subs = subsAccountRes;
                transTag.transactionElement = transData;
                return transTag;
            }));

            transTagsWithTrans.sort((a, b) => a.transactionElement.dateTime.getTime()-b.transactionElement.dateTime.getTime());
            tag.transTag = transTagsWithTrans;
            setState(tag);
        }
        fetchTag();
    }, []);


    return (
        <div className="container">
            <Navbar />
            <>
                <h1>
                    Tag "{state.name}"
                    <div className="pull-right">
                        <TableButton dest={`/tags/${state.id}/edit`} name={"Edit"} />
                        <TableButton dest={`/tags/${state.id}/delete`} name={"Delete"} class="btn-danger" />
                    </div>
                </h1>
                <StaticField label="Description" content={state.desc} />
                <h3>Transactions</h3>
                <table className="table table-condensed">
                    <thead>
                        {state.transTag.length > 0 ?
                            <tr>
                                <th>Description</th>
                                <th>Date/Time</th>
                                <th>Actions</th>
                
                            </tr>
                            :
                            <></>}
                    </thead>
                    <tbody>
                        {state.transTag.length > 0 ?
                            state.transTag.map((output, id) => (
                                <tr key={id}>
                                    <td><Link to={`/transactions/${output.transactionElement.id}`}>{output.transactionElement.desc}</Link></td>
                                    <td>{formatDate(new Date(output.transactionElement.dateTime))}</td>
                                    <td>
                                        {output.transactionElement.subs ? (
                                            output.transactionElement.subs.map((sub, id) => (
                                            <button className="btn btn-xs" style={{marginLeft: 5}} role="button"
                                                    key={id}>{sub.accountElement.name}&nbsp;{centsToString(sub.amount)}</button>)))
                                                :
                                            (
                                            <></>
                                            )
                                        }
                                    </td>
                                </tr>
                            ))
                                :
                                <tr><td>No transactions yet</td></tr>}
                    </tbody>
                </table>
            </>
        </div>
    );
});
