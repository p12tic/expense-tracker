import {observer} from "mobx-react-lite";
import {StaticField} from "../StaticField";
import {useToken} from "../Auth/AuthContext";
import {Link, useNavigate, useParams} from "react-router-dom";
import axios from "axios";
import React, {useEffect, useState} from "react";
import {NavbarComponent} from "../Navbar";
import {TableButton} from "../TableButton";
import {centsToString, formatDate} from "../Tools";
import {AuthAxios} from "../../utils/Network";
import {Col, Row, Container, Table, Button} from "react-bootstrap";
import {TimezoneTag} from "../TimezoneTag";
import dayjs, {Dayjs} from "dayjs";


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
    dateTime: Dayjs;
    timezoneOffset: number;
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

    const auth = useToken();
    const [state, setState] = useState<TagElement>({id:0, name:"", desc:"", user:0,
        transTag:[]});
    const {id} = useParams();
    const navigate = useNavigate();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {

        const fetchTag = async() => {
            const tagRes = await AuthAxios.get(`tags?id=${id}`, auth.getToken());
            const tag: TagElement = tagRes.data[0];
            const transTagRes = await AuthAxios.get(`transaction_tags?tag=${id}`, auth.getToken());
            const transTagData: TransTag[] = transTagRes.data;
            const transTagsWithTrans = await Promise.all(transTagData.map(async (transTag:TransTag) => {
                const transRes = await AuthAxios.get(`transactions?id=${transTag.transaction}`, auth.getToken());
                const transData: Transaction = transRes.data[0];
                transData.dateTime = dayjs(transData.date_time);
                transData.timezoneOffset = transData.timezone_offset;
                const subsRes = await AuthAxios.get(`subtransactions?transaction=${transData.id}`, auth.getToken());
                const subsData: Subtransaction[] = subsRes.data;
                transData.subs = await Promise.all(subsData.map(async (sub) => {
                    const accountsRes = await AuthAxios.get(`accounts?id=${sub.account}`, auth.getToken());
                    sub.accountElement = accountsRes.data[0];
                    return sub;
                }));
                transTag.transactionElement = transData;
                return transTag;
            }));

            transTagsWithTrans.sort((a, b) => a.transactionElement.dateTime.valueOf()-b.transactionElement.dateTime.valueOf());
            tag.transTag = transTagsWithTrans;
            setState(tag);
        }
        fetchTag();
    }, []);


    return (
        <Container>
            <NavbarComponent/>
            <>
                <Row>
                    <Col><h1>Tag "{state.name}"</h1></Col>
                    <Col md="auto" className='d-flex justify-content-end'>
                        <TableButton dest={`/tags/${state.id}/edit`} name={"Edit"}/>
                        <TableButton dest={`/tags/${state.id}/delete`} name={"Delete"} class="danger"/>
                    </Col>
                </Row>
                <StaticField label="Description" content={state.desc}/>
                <h3>Transactions</h3>
                <Table size="sm">
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
                                    <td>
                                        <Link to={`/transactions/${output.transactionElement.id}`}>
                                            {output.transactionElement.desc}
                                        </Link>
                                    </td>
                                    <td>
                                        {formatDate(dayjs(output.transactionElement.dateTime))}
                                        <TimezoneTag offset={output.transactionElement.timezoneOffset}/>
                                    </td>
                                    <td>
                                        {output.transactionElement.subs ? (
                                            output.transactionElement.subs.map((sub, id) => (
                                            <Button variant="secondary" className="btn-xs"
                                                    style={{marginLeft: 5}} role="button" key={id}>
                                                {sub.accountElement.name}&nbsp;{centsToString(sub.amount)}
                                            </Button>))
                                            )
                                                :
                                            (
                                            <></>
                                            )
                                        }
                                    </td>
                                </tr>
                            ))
                                :
                                <tr><td>No transactions yet</td></tr>
                        }
                    </tbody>
                </Table>
            </>
        </Container>
    );
});
