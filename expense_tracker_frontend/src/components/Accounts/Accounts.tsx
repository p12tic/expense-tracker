import React, {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {NavbarComponent} from "../Navbar";
import '../common.scss';
import {TableButton} from "../TableButton";
import {useToken} from "../Auth/AuthContext";
import {observer} from "mobx-react-lite";
import {formatDate} from "../Tools";
import {AuthAxios} from "../../utils/Network";
import {Col, Row, Container, Table, Button} from "react-bootstrap";
import dayjs, {Dayjs} from "dayjs";

interface Account {
    id: number;
    name: string;
    desc: string;
    user: string;
    lastCacheBalance: number;
    lastCacheDate: Dayjs;
    balance: number;
}
interface Subtransaction {
    id: number;
    amount: number;
    transaction: string;
    account: string;
}
export const Accounts = observer(function Accounts() {
    const auth = useToken();
    const navigate = useNavigate();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    const [state, setState] = useState<Account[]>([]);

    useEffect(() => {

        const fetchAccounts = async() => {
            try {
                const data = await AuthAxios.get("accounts", auth.getToken()).then(res => {
                    const data: Account[] = res.data;
                    return data;
                });
                const cache = await Promise.all(data.map(async (account) => {
                    const balanceRes =
                        await AuthAxios.get(`account_balance_cache?account=${account.id}`, auth.getToken());
                    let sum: number;
                    if (balanceRes.data.length > 0) {
                        account.lastCacheBalance = balanceRes.data[balanceRes.data.length - 1].balance;
                        account.lastCacheDate = dayjs(balanceRes.data[balanceRes.data.length - 1].date);
                        sum = account.lastCacheBalance;
                    } else {
                        account.lastCacheBalance = 0;
                        account.lastCacheDate = dayjs(99999999);
                        sum = 0;
                    }
                    const subRes =
                        await AuthAxios.get(`subtransactions?account=${account.id}
                                            &date_gte=${formatDate(account.lastCacheDate)}`, auth.getToken());
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
        <Container>
            <NavbarComponent/>
            <Row>
                <Col><h1>Accounts</h1></Col>
                <Col md="auto" className='d-flex justify-content-end'>
                    <TableButton dest={`/accounts/add`} name={'New'} />
                </Col>
            </Row>
            <Table size="sm">
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
                                <td className="text-end">
                                    <Button href={`/accounts/${output.id}/sync`} variant="default"
                                            className="btn-xs pull-right" role="button">Sync</Button>
                                </td>
                            </tr>
                        ))
                        :
                        <tr><td>No accounts yet</td></tr>
                    }
                </tbody>
            </Table>
        </Container>
    );
})