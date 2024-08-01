import {observer} from "mobx-react-lite";
import {Navbar} from "../Navbar.tsx";
import {TableButton} from "../TableButton.tsx";
import {StaticField} from "../StaticField.tsx";
import React, {useEffect, useState} from "react";
import {useToken} from "../Auth/AuthContext.tsx";
import axios from "axios";
import {Link, useParams} from "react-router-dom";
import {centsToString, formatDate} from "../Tools.tsx";

interface TransactionElement {
    desc: string;
    user: number;
    dateTime: Date;
    tags: Tag[];
    subs: Subtransaction[];
}
interface TransactionTag {
    tag: number;
    transaction: number;
}
interface Tag {
    id: number;
    name: string;
    desc: string;
    user: number;
}
interface Subtransaction {
    id: number;
    transaction: number;
    account: number;
    amount: number;
    accountName: string;
}
interface Account {
    id: number;
    user: number;
    name: string;
    desc: string;
}
export const Transaction = observer(function Transaction() {
    const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<TransactionElement>({desc:"", user:0, dateTime:new Date(), tags:[], subs:[]});
    const {id} = useParams();
    useEffect(() => {
        const FetchTransaction = async() => {
            await axios.get(`http://localhost:8000/api/transactions?id=${id}`).then(async (res) => {
                let transaction: TransactionElement = res.data[0];
                transaction.dateTime = res.data[0]['date_time'];
                let Tags: Tag[] = [];
                let Subs: Subtransaction[] = [];
                await axios.get(`http://localhost:8000/api/transaction_tags?transaction=${id}`).then(async (transactionTags) => {
                    Tags = await Promise.all(transactionTags.data.map(async (transTag: TransactionTag) => {
                        const tagRes = await axios.get(`http://localhost:8000/api/tags?id=${transTag.tag}`);
                        const tag: Tag = tagRes.data[0];
                        return tag;
                    }));
                });
                await axios.get(`http://localhost:8000/api/subtransactions?transaction=${id}`).then(async (subsRes) => {
                    Subs = await Promise.all(subsRes.data.map(async (sub: Subtransaction) => {
                        const accRes = await axios.get(`http://localhost:8000/api/accounts?id=${sub.account}`);
                        const acc:Account = accRes.data[0];
                        sub.accountName = acc.name;
                        return sub;
                    }));
                });
                transaction.dateTime = new Date(transaction.dateTime);
                transaction.subs = Subs;
                transaction.tags = Tags;
                setState(transaction);
            });
        };
        FetchTransaction();
    }, []);

    return (
        <div className="container">
            <Navbar />
            <h1>
                Transaction "{state?.desc}"
                <div className="pull-right">
                    <TableButton dest={`/transactions/${id}/edit`} name={"Edit"} />
                    <TableButton dest={`/transactions/${id}/delete`} name={"Delete"} class="btn-danger" />
                </div>
            </h1>
            <StaticField label="Date and time" content={formatDate(state?.dateTime)} />
            <h3>Tags</h3>
            {state.tags.map((tag) => (
                <button className="btn" role="button" style={{marginRight: 4}}>{tag.name}</button>
            ))}
            <h3>Affected accounts</h3>
            <table className="table table-condensed">
                <thead>
                    <tr>
                        <th>Account</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {state.subs.map((sub: Subtransaction, id) => (
                        <tr key={id}>
                            <td><Link to={`/accounts/${sub.account}`}>{sub.accountName}</Link></td>
                            <td>{centsToString(sub.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
})