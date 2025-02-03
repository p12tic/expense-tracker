import {observer} from "mobx-react-lite";
import {useToken} from "../Auth/AuthContext";
import React, {useEffect, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import {Navbar} from "../Navbar";
import {TableButton} from "../TableButton";
import {StaticField} from "../StaticField";
import {getSubtransactionBalances} from "../getSubtransactionBalances";
import {centsToString, formatDate} from "../Tools";
import {AuthAxios} from "../../utils/Network";

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
    const auth = useToken();
    const [state, setState] = useState<AccountElement>({
        id: 0,
        name: "",
        desc: "",
        user: 0,
        subtransactions: [],
        balances: []
    });
    const {id} = useParams();
    const navigate = useNavigate();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {
        const fetchTag = async () => {

            const accountRes = await AuthAxios.get(`accounts?id=${id}`, auth.getToken());
            const account: AccountElement = accountRes.data[0];
            const accountSubRes = await AuthAxios.get(`subtransactions?account=${id}`, auth.getToken());
            const accountSubs: Subtransaction[] = accountSubRes.data;
            account.subtransactions = await Promise.all(accountSubs.map(async (sub) => {
                const transactionRes = await AuthAxios.get(`transactions?id=${sub.transaction}`, auth.getToken());
                const transaction: Transaction = transactionRes.data[0];
                transaction.dateTime = transaction.date_time;
                if(!transaction.desc) {
                    const syncRes = await AuthAxios.get(`account_sync_event?subtransaction=${sub.id}`, auth.getToken());
                    transaction.syncEvent = syncRes.data[0];
                }
                sub.transactionElement = transaction;
                const cacheRes = await AuthAxios.get(
                    `account_balance_cache?subtransaction=${sub.id}&date_lte=1970-01-01`, auth.getToken());
                let cacheDate: Date;
                let sum = 0;
                if(cacheRes.data.length > 0) {
                    cacheDate = cacheRes.data[cacheRes.data.length-1].date;
                    sum = cacheRes.data[cacheRes.data.length-1].balance;
                } else {
                    cacheDate = new Date(0);
                    sum = 0;
                }
                const cacheSubsRes = await AuthAxios.get(
                    `subtransactions?account=${id}&date_gte=${formatDate(new Date(cacheDate))}&date_lte=${formatDate(new Date(sub.transactionElement.dateTime))}`,
                    auth.getToken());
                const cacheSubs: Subtransaction[] = cacheSubsRes.data;
                await Promise.all(cacheSubs.map(async (cacheSub) => {
                    sum = sum + cacheSub.amount;
                }));
                sub.transactionElement = transaction;
                return sub;
            }));
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
                        {state.subtransactions.length > 0 ?
                            <tr>
                                <th>Description</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Balance</th>
                                <th></th>
                            </tr>
                            :
                            <></>
                        }
                    </thead>
                    <tbody>
                        {state.subtransactions.length > 0 ?
                            state.subtransactions.map((sub, id) => (
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
                            ))
                            :
                            <tr><td>No transactions yet</td></tr>
                        }
                    </tbody>
                </table>
            </>
        </div>
    );
})