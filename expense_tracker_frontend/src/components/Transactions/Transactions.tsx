import {Navbar} from "../Navbar";
import React, {useEffect, useState} from "react";
import axios from "axios";
import {Link, useNavigate} from "react-router-dom";
import {TableButton} from "../TableButton";
import {formatDate, centsToString} from "../Tools";
import {observer} from "mobx-react-lite";
import {useToken} from "../Auth/AuthContext";

interface Transaction {
    id: number;
    desc: string;
    dateTime: Date;
    user: string;
    transactionTag: TransactionTag[];
    subtransaction: Subtransaction[];
    syncEvent: SyncEvent;
}
interface TransactionTag {
    id: number;
    transaction: number;
    tag: number;
    tagElement: Tag;
}
interface Tag {
    id: number;
    name: string;
    desc: string;
    user: string;
}
interface Subtransaction {
    id: number;
    amount: number;
    transaction: string;
    account: string;
    accountElement: Account;
}
interface SyncEvent {
    id: number;
    balance: number;
    account: string;
    subtransaction: string;
    accountElement: Account;
}
interface Account {
    id: number;
    name: string;
    desc: string;
    user: string;
}

export const TransactionsList = observer(function TransactionsList() {
    const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<Transaction[]>([]);
    const navigate = useNavigate();
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {
        const fetchTransactions = async() => {
            try {
                const res = await axios.get("http://localhost:8000/api/transactions");
                let data: Transaction[] = res.data;
                const transactionWithTags = await Promise.all(data.map(async (transaction) => {
                    transaction.dateTime = transaction.date_time;
                    const transactionTagRes = await axios.get(`http://localhost:8000/api/transaction_tags?transaction=${transaction.id}`);
                    transaction.transactionTag = transactionTagRes.data;
                    const tagOfTransaction = await Promise.all(transaction.transactionTag.map(async (transTag) => {
                        const tagRes = await axios.get(`http://localhost:8000/api/tags?id=${transTag.tag}`);
                        transTag.tagElement = tagRes.data[0];
                        return transTag;
                    }));
                    const subtransactionRes = await axios.get(`http://localhost:8000/api/subtransactions?transaction=${transaction.id}`);

                    transaction.subtransaction = subtransactionRes.data;
                    await Promise.all(transaction.subtransaction.map(async (sub) => {
                        const subAccRes = await axios.get(`http://localhost:8000/api/accounts?id=${sub.account}`);
                        sub.accountElement = subAccRes.data[0];
                    }));
                    transaction.transactionTag=tagOfTransaction;
                    if (!transaction.desc) {
                        const syncEventRes = await axios.get(`http://localhost:8000/api/account_sync_event?subtransaction=${subtransactionRes.data[0].id}`);
                        let syncEvents = syncEventRes.data[0];
                        const syncEventAccRes = await axios.get(`http://localhost:8000/api/accounts?id=${syncEvents.account}`);
                        syncEvents.accountElement = syncEventAccRes.data[0];
                        transaction.syncEvent = syncEvents;
                    }
                    return transaction;
                }));
                setState(transactionWithTags);
            }
            catch (err) {
                console.error(err);
            }
        }
        fetchTransactions();
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
                    {state.length>0 ?
                        <tr>
                            <th>Description</th>
                            <th>Date/time</th>
                            <th>Actions</th>
                            <th>Tags</th>
                        </tr>
                        :
                        <></>
                    }
                </thead>
                <tbody>
                    {state.length>0 ?
                        state.map((output, id) => (
                            <tr key={id}>
                                {output.desc ? <td><Link to={`/transactions/${output.id}`}>{output.desc}</Link></td>
                                    :
                                    (<td><Link to={`/sync/${output.syncEvent.id}`}>Sync event</Link>
                                        <button className="btn btn-xs" style={{marginLeft: 5}} role="button"
                                                key={id}>{output.syncEvent.accountElement.name}&nbsp;{output.syncEvent.balance/100}</button>
                                    </td>)}

                                <td>{formatDate(new Date(output.dateTime))}</td>
                                <td>{output.subtransaction ?
                                    output.subtransaction.map((sub: Subtransaction, id) => (
                                    <button className="btn btn-xs" style={{marginLeft: 5}} role="button" key={id}>{sub.accountElement.name}&nbsp;{centsToString(sub.amount)}</button>
                                ))
                                    :
                                    <></>
                                }
                                </td>
                                <td>
                                    {output.transactionTag ?
                                        output.transactionTag.map((tags: TransactionTag, id) => (
                                        <button className="btn btn-xs" role="button" style={{marginLeft: 5}} key={id}>{tags.tagElement.name}</button>
                                    ))
                                        :
                                    <></>}
                                </td>
                            </tr>
                        ))
                        :
                        <tr>
                            <td>No transactions yet</td>
                        </tr>
                    }
                </tbody>
            </table>
        </div>
    )
})