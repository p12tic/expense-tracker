import {Navbar} from "../Navbar.tsx";
import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import {SubmitButton} from "../SubmitButton.tsx";
import axios from "axios";
import {useToken} from "../Auth/AuthContext.tsx";
import {useNavigate, useParams} from "react-router-dom";
import {centsToString, formatDate} from "../Tools.tsx";

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
export const AccountSync = observer(function AccountSync() {
    const [lastBalance, setLastBalance] = useState(0);
    const [balance, setBalance] = useState(0);
    const [date, setDate] = useState<Date>(new Date(Date.now()));
    const Auth = useToken();
    const navigate = useNavigate();
    const {id} = useParams();
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    useEffect(() => {

        const fetchAccounts = async () => {
            try {
                const data = await axios.get(`http://localhost:8000/api/accounts?id=${id}`).then(res => {
                    const data = res.data[0];
                    return data;
                })
                const balanceRes =
                    await axios.get(`http://localhost:8000/api/account_balance_cache?account=${id}&date_lte=${formatDate(new Date(Date.now()))}`);
                let sum: number;
                if (balanceRes.data.length > 0) {
                    data.lastCacheBalance = balanceRes.data[balanceRes.data.length - 1].balance;
                    data.lastCacheDate = new Date(balanceRes.data[balanceRes.data.length - 1].date);
                    sum = data.lastCacheBalance;
                } else {
                    data.lastCacheBalance = 0;
                    data.lastCacheDate = new Date(Date.now());
                    sum = 0;
                }
                const subRes = await axios.get(`http://localhost:8000/api/subtransactions?account=${data.id}&date_gte=${formatDate(data.lastCacheDate)}&date_lte=${formatDate(new Date(Date.now()))}`);
                const subs: Subtransaction[] = subRes.data;
                await Promise.all(subs.map(async (sub) => {
                    sum = sum + sub.amount;
                }));
                data.balance = sum;
                setBalance(parseFloat(centsToString(sum)));
                setLastBalance(sum);
                return data;
            } catch (err) {
                console.error(err);
            }
        }
        fetchAccounts()
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const bodyParams = {
            action: "sync",
            id: id,
            balance: balance*100,
            sub_balance: balance-lastBalance,
            date: date,
            dateYear: formatDateYear(date)
        };
        await axios.post("http://localhost:8000/api/account_sync_event", bodyParams);
        navigate("/accounts");
    };
    const formatDateYear = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    return (
        <div className="container">
            <Navbar />
            <form action="" method="post" onSubmit={handleSubmit}>
                <h1>Create new</h1>
                <div className="form-horizontal">
                    <div className="form-group">
                        <label className="col-xs-4 col-sm-2 control-label" htmlFor="id_balance">Balance</label>
                        <div className="col-xs-8 col-sm-10">
                            <input type="text" className={"form-control"} name="balance" key="id_balance"
                                   value={(balance)}
                                   onChange={(e) => setBalance(parseFloat(e.target.value))}/>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="col-xs-4 col-sm-2 control-label" htmlFor="id_Date">Date time</label>
                        <div className="col-xs-8 col-sm-10">
                            <input type="datetime-local" className={"form-control"} name="date"
                                   value={date.toISOString().slice(0, 16)}
                                   key="id_date"
                                   onChange={(e) => setDate(new Date(e.target.value))}/>
                        </div>
                    </div>
                </div>
                <SubmitButton text="Save" />
            </form>
        </div>
)
})