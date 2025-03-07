import {observer} from "mobx-react-lite";
import {NavbarComponent} from "../Navbar";
import {TableButton} from "../TableButton";
import {StaticField} from "../StaticField";
import React, {useEffect, useState} from "react";
import {useToken} from "../Auth/AuthContext";
import {Link, useNavigate, useParams} from "react-router-dom";
import {centsToString, formatDate, formatTimezone} from "../Tools";
import {AuthAxios} from "../../utils/Network";
import {Col, Row, Table, Button, Alert, Container} from "react-bootstrap";
import dayjs, {Dayjs} from "dayjs";

interface TransactionElement {
    desc: string;
    user: number;
    dateTime: Dayjs;
    timezoneOffset: number;
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
    const auth = useToken();
    const [state, setState] = useState<TransactionElement>({
        desc: "",
        user: 0,
        dateTime: dayjs(),
        timezoneOffset: -dayjs().utcOffset(),
        tags: [],
        subs: []
    });
    const {id} = useParams();
    const navigate = useNavigate();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {
        const FetchTransaction = async () => {
            await AuthAxios.get(`transactions?id=${id}`, auth.getToken()).then(async (res) => {
                const transaction: TransactionElement = res.data[0];
                transaction.dateTime = dayjs(res.data[0]['date_time']);
                transaction.timezoneOffset = res.data[0]['timezone_offset']
                let Tags: Tag[] = [];
                let Subs: Subtransaction[] = [];
                await AuthAxios.get(`transaction_tags?transaction=${id}`, auth.getToken()).then(async (transactionTags) => {
                    Tags = await Promise.all(transactionTags.data.map(async (transTag: TransactionTag) => {
                        const tagRes = await AuthAxios.get(`tags?id=${transTag.tag}`, auth.getToken());
                        const tag: Tag = tagRes.data[0];
                        return tag;
                    }));
                });
                await AuthAxios.get(`subtransactions?transaction=${id}`, auth.getToken()).then(async (subsRes) => {
                    Subs = await Promise.all(subsRes.data.map(async (sub: Subtransaction) => {
                        const accRes = await AuthAxios.get(`accounts?id=${sub.account}`, auth.getToken());
                        const acc: Account = accRes.data[0];
                        sub.accountName = acc.name;
                        return sub;
                    }));
                });
                transaction.dateTime = dayjs(transaction.dateTime);
                transaction.subs = Subs;
                transaction.tags = Tags;
                setState(transaction);
            });
        };
        FetchTransaction();
    }, []);

    return (
        <Container>
            <NavbarComponent/>
            <Row>
                <Col><h1>Transaction "{state?.desc}"</h1></Col>
                <Col md="auto" className='d-flex justify-content-end'>
                    <TableButton dest={`/transactions/${id}/edit`} name={"Edit"}/>
                    <TableButton dest={`/transactions/${id}/delete`} name={"Delete"} class="danger"/>
                </Col>
            </Row>
            <StaticField label="Date and time" content={formatDate(state?.dateTime)}/>
            <StaticField label="Timezone"
                         content={
                             <div>
                                 {formatTimezone(state.timezoneOffset)}
                             </div>
                         }/>
            <h3>Tags</h3>
            {state.tags.length > 0 ?
                state.tags.map((tag) => (
                    <Button variant="secondary" role="button" style={{marginRight: 4}}>
                        {tag.name}
                    </Button>
                ))
                :
                <Alert key="info" variant="info" transition={false}>
                    No tags have been defined for this transaction
                </Alert>
            }
            <h3>Affected accounts</h3>
            <Table size="sm">
                <thead>
                {state.subs.length > 0 ?
                    <tr>
                        <th>Account</th>
                        <th>Amount</th>
                    </tr>
                    :
                    <></>
                }
                </thead>
                <tbody>
                    {state.subs.length > 0 ?
                        state.subs.map((sub: Subtransaction, id) => (
                            <tr key={id}>
                                <td>
                                    <Link to={`/accounts/${sub.account}`}>{sub.accountName}</Link>
                                </td>
                                <td>{centsToString(sub.amount)}</td>
                            </tr>
                        ))
                        :
                        <tr><td>This transaction does not affect any accounts</td></tr>
                    }
                </tbody>
            </Table>
        </Container>
    )
})