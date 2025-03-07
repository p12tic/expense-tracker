import {NavbarComponent} from "../Navbar";
import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import {SubmitButton} from "../SubmitButton";
import {useToken} from "../Auth/AuthContext";
import {useNavigate, useParams} from "react-router-dom";
import {centsToString, formatDate, formatDateIso8601, formatDateTimeForInput} from "../Tools";
import {AuthAxios} from "../../utils/Network";
import {Col, Form, Row, Container, InputGroup} from "react-bootstrap";
import dayjs, {Dayjs} from "dayjs";
import {TimezoneSelect} from "../TimezoneSelect";

interface Subtransaction {
    id: number;
    amount: number;
    transaction: string;
    account: string;
}
export const AccountSync = observer(function AccountSync() {
    const [lastBalance, setLastBalance] = useState(0);
    const [balance, setBalance] = useState(0);
    const [date, setDate] = useState(dayjs());
    const [timezoneOffset, setTimezoneOffset] = useState<number>(-dayjs().utcOffset())
    const auth = useToken();
    const navigate = useNavigate();
    const {id} = useParams();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {

        const fetchAccounts = async () => {
            try {
                const data = await AuthAxios.get(`accounts?id=${id}`, auth.getToken()).then(res => {
                    return res.data[0];
                })
                const balanceRes =
                    await AuthAxios.get(`account_balance_cache?account=${id}&date_lte=${formatDate(dayjs())}`, auth.getToken());
                let sum: number;
                if (balanceRes.data.length > 0) {
                    data.lastCacheBalance = balanceRes.data[balanceRes.data.length - 1].balance;
                    data.lastCacheDate = dayjs(balanceRes.data[balanceRes.data.length - 1].date);
                    sum = data.lastCacheBalance;
                } else {
                    data.lastCacheBalance = 0;
                    data.lastCacheDate = dayjs();
                    sum = 0;
                }
                const subRes =
                    await AuthAxios.get(`subtransactions?account=${data.id}
                                        &date_gte=${formatDate(data.lastCacheDate)}
                                        &date_lte=${formatDate(dayjs())}`, auth.getToken());
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
        fetchAccounts();
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const bodyParams = {
            action: "sync",
            id: id,
            balance: balance*100,
            sub_balance: balance-lastBalance,
            timezoneOffset: timezoneOffset,
            date: formatDateIso8601(date),
            dateYear: formatDateYear(date)
        };
        await AuthAxios.post("account_sync_event", auth.getToken(), bodyParams);
        navigate("/accounts");
    };
    const formatDateYear = (date: Dayjs): string => {
        return date.format("YYYY-MM-DD");
    };
    return (
        <Container>
            <NavbarComponent/>
            <Form onSubmit={handleSubmit}>
                <h1>Create new</h1>
                <Form.Group>
                    <Row className="mb-3">
                        <Col xs={4} sm={2} className="text-end">
                            <Form.Label htmlFor="id_balance">Balance</Form.Label>
                        </Col>
                        <Col xs={8} sm={10}>
                            <Form.Control type="text" name="balance" key="id_balance"
                                          value={(balance)} required={true}
                                          onChange={(e) => setBalance(parseFloat(e.target.value))}/>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col xs={4} sm={2} className="text-end">
                            <Form.Label htmlFor="id_Date">Date time</Form.Label>
                        </Col>
                        <Col xs={8} sm={10}>
                            <InputGroup>
                                <Form.Control type="datetime-local" name="date"
                                              value={formatDateTimeForInput(date)}
                                              key="id_date" required={true}
                                              onChange={(e) => setDate(dayjs(e.target.value))}/>
                                <InputGroup.Text>
                                    Using timezone:&nbsp;
                                    <TimezoneSelect offset={timezoneOffset} onChange={setTimezoneOffset}/>
                                </InputGroup.Text>
                            </InputGroup>
                        </Col>
                    </Row>
                </Form.Group>
                <SubmitButton text="Save"/>
            </Form>
        </Container>
    )
})