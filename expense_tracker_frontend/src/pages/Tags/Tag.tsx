import {observer} from "mobx-react-lite";
import {StaticField} from "../../components/StaticField";
import {useToken} from "../../utils/AuthContext";
import {Link, useNavigate, useParams} from "react-router-dom";
import axios from "axios";
import React, {useEffect, useState} from "react";
import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {centsToString, formatDate} from "../../components/Tools";
import {AuthAxios} from "../../utils/Network";
import {Col, Row, Container, Table, Button} from "react-bootstrap";
import {TimezoneTag} from "../../components/TimezoneTag";
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
  date_time: Dayjs;
  timezone_offset: number;
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
export const Tag = observer(() => {
  const auth = useToken();
  const [state, setState] = useState<TagElement>({
    id: 0,
    name: "",
    desc: "",
    user: 0,
    transTag: [],
  });
  const {id} = useParams();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  useEffect(() => {
    const fetchTag = async () => {
      const tagRes = await AuthAxios.get(`tags?id=${id}`, auth.getToken());
      const tag: TagElement = tagRes.data[0];
      const transTagRes = await AuthAxios.get(
        `transaction_tags?tag=${id}`,
        auth.getToken(),
      );
      const transTagData: TransTag[] = transTagRes.data;
      const transTagsWithTrans = await Promise.all(
        transTagData.map(async (transTag: TransTag) => {
          const transRes = await AuthAxios.get(
            `transactions?id=${transTag.transaction}`,
            auth.getToken(),
          );
          const transData: Transaction = transRes.data[0];
          transData.date_time = dayjs(transData.date_time);
          const subsRes = await AuthAxios.get(
            `subtransactions?transaction=${transData.id}`,
            auth.getToken(),
          );
          const subsData: Subtransaction[] = subsRes.data;
          transData.subs = await Promise.all(
            subsData.map(async (sub) => {
              const accountsRes = await AuthAxios.get(
                `accounts?id=${sub.account}`,
                auth.getToken(),
              );
              sub.accountElement = accountsRes.data[0];
              return sub;
            }),
          );
          transTag.transactionElement = transData;
          return transTag;
        }),
      );

      transTagsWithTrans.sort(
        (a, b) =>
          a.transactionElement.date_time.valueOf() -
          b.transactionElement.date_time.valueOf(),
      );
      tag.transTag = transTagsWithTrans;
      setState(tag);
    };
    fetchTag();
  }, []);
  if (id === undefined) {
    navigate("/tags");
    return;
  }

  return (
    <Container>
      <NavbarComponent />
      <>
        <Row>
          <Col>
            <h1>Tag "{state.name}"</h1>
          </Col>
          <Col md="auto" className="d-flex justify-content-end">
            <TableButton dest={`/tags/${state.id}/edit`} name={"Edit"} />
            <TableButton
              dest={`/tags/${state.id}/delete`}
              name={"Delete"}
              type="danger"
            />
          </Col>
        </Row>
        <StaticField label="Description" content={state.desc} />
        <h3>Transactions</h3>
        <Table size="sm">
          <thead>
            {state.transTag.length > 0 ? (
              <tr>
                <th>Description</th>
                <th>Date/Time</th>
                <th>Actions</th>
              </tr>
            ) : (
              <></>
            )}
          </thead>
          <tbody>
            {state.transTag.length > 0 ? (
              state.transTag.map((output, id) => (
                <tr key={id}>
                  <td>
                    <Link to={`/transactions/${output.transactionElement.id}`}>
                      {output.transactionElement.desc}
                    </Link>
                  </td>
                  <td>
                    {formatDate(dayjs(output.transactionElement.date_time))}
                    <TimezoneTag
                      offset={output.transactionElement.timezone_offset}
                    />
                  </td>
                  <td>
                    {output.transactionElement.subs ? (
                      output.transactionElement.subs.map((sub, id) => (
                        <Button
                          variant="secondary"
                          className="btn-xs"
                          style={{marginLeft: 5}}
                          role="button"
                          key={id}
                        >
                          {sub.accountElement.name}&nbsp;
                          {centsToString(sub.amount)}
                        </Button>
                      ))
                    ) : (
                      <></>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td>No transactions yet</td>
              </tr>
            )}
          </tbody>
        </Table>
      </>
    </Container>
  );
});
