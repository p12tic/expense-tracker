import {observer} from "mobx-react-lite";
import {useToken} from "../Auth/AuthContext.tsx";
import axios from "axios";
import React, {useEffect, useState} from "react";
import {Link, useParams} from "react-router-dom";
import {Navbar} from "../Navbar.tsx";
import {TableButton} from "../TableButton.tsx";
import {StaticField} from "../StaticField.tsx";
import {getSubtransactionBalances} from "../getSubtransactionBalances.tsx";
import {centsToString, formatDate} from "../Tools.tsx";

interface AccountElement {
    id: number;
    name: string;
    desc: string;
    user: number;
    subtransactions: Subtransaction[];
    balances: number[];
}
interface Subtransaction {
    id: number;
    amount: number;
    transaction: string;
    account: string;
    transactionElement: Transaction;
}
interface Transaction {
    id: number;
    desc: string;
    dateTime: Date;
    user: string;
    syncEvent: SyncEvent;
}
interface SyncEvent {
    id: number;
    balance: number;
    account: string;
    subtransaction: string;
}
export const Account = observer(function Account() {
const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<AccountElement>({id:0, name:"", desc:"", user:0, subtransactions:[], balances:[]});
    const {id} = useParams();

    useEffect(() => {
        const fetchTag = async() => {

            const accountRes = await axios.get(`http://localhost:8000/api/accounts?id=${id}`);
            const account: AccountElement = accountRes.data[0];
            const accountSubRes = await axios.get(`http://localhost:8000/api/subtransactions?account=${id}`);
            const accountSubs: Subtransaction[] = accountSubRes.data;
            const accountSubsWithTransRes = await Promise.all(accountSubs.map(async (sub) => {
                const transactionRes = await axios.get(`http://localhost:8000/api/transactions?id=${sub.transaction}`);
                const transaction: Transaction = transactionRes.data[0];
                transaction.dateTime = transaction.date_time;
                if(!transaction.desc) {
                    const syncRes = await axios.get(`http://localhost:8000/api/account_sync_event?subtransaction=${sub.id}`);
                    const sync = syncRes.data[0];
                    transaction.syncEvent = sync;
                }
                sub.transactionElement = transaction;
                const cacheRes = await axios.get(`http://localhost:8000/api/account_balance_cache?subtransaction=${sub.id}&date_lte=1970-01-01`);
                let cacheDate: Date;
                let sum = 0;
                if(cacheRes.data.length > 0) {
                    cacheDate = cacheRes.data[cacheRes.data.length-1].date;
                    sum = cacheRes.data[cacheRes.data.length-1].balance;
                } else {
                    cacheDate = new Date(0);
                    sum = 0;
                }
                const cacheSubsRes = await axios.get(`http://localhost:8000/api/subtransactions?account=${id}&date_gte=${formatDate(new Date(cacheDate))}&date_lte=${formatDate(new Date(sub.transactionElement.dateTime))}`);
                const cacheSubs: Subtransaction[] = cacheSubsRes.data;
                await Promise.all(cacheSubs.map(async (cacheSub) => {
                    sum = sum + cacheSub.amount;
                }));
                sub.transactionElement = transaction;
                return sub;
            }));
            account.subtransactions = accountSubsWithTransRes;
            account.balances = getSubtransactionBalances(account.subtransactions);
            account.subtransactions.reverse();
            setState(account);
        }

        fetchTag();

    }, []);

    return (
        <div className="container">
            <Navbar />
            <>
                <h1>
                    Account "{state.name}"
                    <div className="pull-right">
                        <TableButton dest={`/accounts/${state.id}/sync`} name={"Sync"} />
                        <TableButton dest={`/accounts/${state.id}/edit`} name={"Edit"} />
                        <TableButton dest={`/accounts/${state.id}/delete`} name={"Delete"} class="btn-danger" />
                    </div>
                </h1>
                <StaticField label="Description" content={state.desc} />
                <h3>Transactions</h3>
                <table className="table table-condensed">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Balance</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {state.subtransactions.map((sub, id) => (
                            <tr key={id}>
                                <td>{sub.transactionElement.desc ?
                                    <Link to={`/transactions/${sub.transactionElement.id}`}>
                                        {sub.transactionElement.desc}</Link>
                                    :
                                    <Link to={`/sync/${sub.transactionElement.syncEvent.id}`}>
                                        Sync event</Link>}</td>
                                <td>{formatDate(new Date(sub.transactionElement.dateTime))}</td>
                                <td>{centsToString(sub.amount)}</td>
                                <td>{centsToString(state.balances[state.balances.length - 1 - id])}</td>
                                <td>
                                    {sub.transactionElement.desc ?
                                        <div className="dropdown pull-right">
                                            <button className="btn-xs btn btn-default dropdown-toggle" type="button" data-toggle="dropdown">
                                                <span className="caret"></span>
                                            </button>
                                            <ul className="dropdown-menu pull-left" role="menu">
                                                <li role="presentation"><a role="menuitem" tabIndex={-1}
                                                                           href={`/accounts/${state.id}/sync?after_tr=${sub.transactionElement.id}`}>Sync
                                                    after</a></li>
                                            </ul>
                                        </div>
                                        :
                                        <></>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </>
        </div>
    );
})