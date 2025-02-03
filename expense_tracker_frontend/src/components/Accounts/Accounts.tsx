import axios from "axios";
import React, {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {Navbar} from "../Navbar.tsx";
import '../common.css';
import {TableButton} from "../TableButton.tsx";
import {useToken} from "../Auth/AuthContext.tsx";
import {observer} from "mobx-react-lite";
import {formatDate} from "../Tools.tsx";

interface Account {
    id: number;
    name: string;
    desc: string;
    user: string;
    lastCacheBalance: number;
    lastCacheDate: Date;
    balance: number;
}
interface Subtransaction {
    id: number;
    amount: number;
    transaction: string;
    account: string;
}
export const Accounts = observer(function Accounts() {
    const Auth = useToken();
    const navigate = useNavigate();
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<Account[]>([]);

    useEffect(() => {

        const fetchAccounts = async() => {
            try {
                const data = await axios.get("http://localhost:8000/api/accounts").then(res => {
                    const data: Account[] = res.data;
                    return data;
                });
                const cache = await Promise.all(data.map(async (account) => {
                    const balanceRes =
                        await axios.get(`http://localhost:8000/api/account_balance_cache?account=${account.id}`);
                    let sum: number;
                    if (balanceRes.data.length > 0) {
                        account.lastCacheBalance = balanceRes.data[balanceRes.data.length - 1].balance;
                        account.lastCacheDate = new Date(balanceRes.data[balanceRes.data.length - 1].date);
                        sum = account.lastCacheBalance;
                    } else {
                        account.lastCacheBalance = 0;
                        account.lastCacheDate = new Date(99999999);
                        sum = 0;
                    }
                    const subRes =
                        await axios.get(`http://localhost:8000/api/subtransactions?account=${account.id}
                                            &date_gte=${formatDate(account.lastCacheDate)}`);
                    const subs: Subtransaction[] = subRes.data;
                    await Promise.all(subs.map(async (sub) => {
                        sum = sum + sub.amount;
                    }));
                    account.balance = sum;
                    return account;
                }));

                setState(cache);
            }
            catch (err) {
                console.error(err);
            }
        };
        fetchAccounts();
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
                    {state.length > 0 ?
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Balance</th>
                            <th></th>
                        </tr>
                        :
                        <></>
                    }
                </thead>
                <tbody>
                    {state.length > 0 ?
                        state.map((output, id) => (
                            <tr key={id}>
                                <td><Link to={`/accounts/${output.id}`}>{output.name}</Link></td>
                                <td>{output.desc}</td>
                                <td>{output.balance/100}</td>
                                <td><Link to={`/accounts/${output.id}/sync`} role="button"
                                          className="btn btn-xs btn-default pull-right">Sync</Link></td>
                            </tr>
                        ))
                        :
                        <tr><td>No accounts yet</td></tr>
                    }
                </tbody>
            </table>
        </div>
    );
})