import {NavbarComponent} from "../../components/Navbar";
import React, {useEffect, useState} from "react";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {TableButton} from "../../components/TableButton";
import {formatDate, centsToString} from "../../components/Tools";
import {observer} from "mobx-react-lite";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";
import {Col, Row, Table, Button, Container, Alert} from "react-bootstrap";
import {TimezoneTag} from "../../components/TimezoneTag";
import dayjs, {Dayjs} from "dayjs";

interface Transaction {
  id: number;
  desc: string;
  date_time: Dayjs;
  user: string;
  transactionTag: TransactionTag[];
  subtransaction: Subtransaction[];
  syncEvent: SyncEvent;
  timezone_offset: number;
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
interface Batch {
  id: number;
  name: string;
  count: number;
  nextID: number;
}

export const TransactionsList = observer(() => {
  const auth = useToken();
  const [state, setState] = useState<Transaction[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await AuthAxios.get("transactions", auth.getToken());
        let data: Transaction[] = res.data;
        const transactionWithTags = await Promise.all(
          data.map(async (transaction) => {
            transaction.date_time = dayjs(transaction.date_time);
            const transactionTagRes = await AuthAxios.get(
              `transaction_tags?transaction=${transaction.id}`,
              auth.getToken(),
            );
            transaction.transactionTag = transactionTagRes.data;
            const tagOfTransaction = await Promise.all(
              transaction.transactionTag.map(async (transTag) => {
                const tagRes = await AuthAxios.get(
                  `tags?id=${transTag.tag}`,
                  auth.getToken(),
                );
                transTag.tagElement = tagRes.data[0];
                return transTag;
              }),
            );
            const subtransactionRes = await AuthAxios.get(
              `subtransactions?transaction=${transaction.id}`,
              auth.getToken(),
            );

            transaction.subtransaction = subtransactionRes.data;
            await Promise.all(
              transaction.subtransaction.map(async (sub) => {
                const subAccRes = await AuthAxios.get(
                  `accounts?id=${sub.account}`,
                  auth.getToken(),
                );
                sub.accountElement = subAccRes.data[0];
              }),
            );
            transaction.transactionTag = tagOfTransaction;
            if (!transaction.desc) {
              const syncEventRes = await AuthAxios.get(
                `account_sync_event?subtransaction=${subtransactionRes.data[0].id}`,
                auth.getToken(),
              );
              let syncEvents = syncEventRes.data[0];
              const syncEventAccRes = await AuthAxios.get(
                `accounts?id=${syncEvents.account}`,
                auth.getToken(),
              );
              syncEvents.accountElement = syncEventAccRes.data[0];
              transaction.syncEvent = syncEvents;
            }
            return transaction;
          }),
        );
        setState(transactionWithTags);
      } catch (err) {
        console.error(err);
      }
    };
    const fetchBatches = async () => {
      const res = await AuthAxios.get("transaction_batch", auth.getToken());
      const data: Batch[] = res.data;
      setBatches(
        await Promise.all(
          data.map(async (batch) => {
            const batchRes = await AuthAxios.get(
              `transaction_batch/${batch.id}/count`,
              auth.getToken(),
            );
            batch.count = batchRes.data.count;
            const nextBatchRes = await AuthAxios.get(
              `transaction_batch/${batch.id}/0/next`,
              auth.getToken(),
            );
            batch.nextID = nextBatchRes.data.id;
            return batch;
          }),
        ),
      );
    };
    fetchTransactions();
    fetchBatches();
  }, []);

  function onClose() {
    navigate(location.pathname, {state: null});
  }

  return (
    <Container>
      <NavbarComponent />
      {location.state && (
        <Alert
          dismissible
          variant={"success"}
          style={{marginTop: "10px", cursor: "pointer"}}
          onClose={onClose}
        >
          <div
            onClick={() =>
              navigate(`/transactions/add`, {state: location.state})
            }
          >
            Click to create another transaction like this
          </div>
        </Alert>
      )}
      <Row>
        <Col>
          <h1>Incoming batches</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/transactions/batch/create`} name={"New Batch"} />
        </Col>
      </Row>
      <Table size="sm">
        <thead>
          {batches.length > 0 ? (
            <tr>
              <th>Name</th>
              <th>Remaining transactions</th>
            </tr>
          ) : (
            <></>
          )}
        </thead>
        <tbody>
          {batches.length > 0 ? (
            batches.map((output) => (
              <tr key={output.id}>
                <td>
                  <Link
                    to={`/transactions/batch/${output.id}/${output.nextID}`}
                  >
                    {output.name}
                  </Link>
                </td>
                <td>{output.count}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td>No incoming batches</td>
            </tr>
          )}
        </tbody>
      </Table>
      <Row>
        <Col>
          <h1>Transactions</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/transactions/add`} name={"New"} />
        </Col>
      </Row>

      <Table size="sm">
        <thead>
          {state.length > 0 ? (
            <tr>
              <th>Description</th>
              <th>Date/time</th>
              <th>Actions</th>
              <th>Tags</th>
            </tr>
          ) : (
            <></>
          )}
        </thead>
        <tbody>
          {state.length > 0 ? (
            state.map((output, id) => (
              <tr key={id}>
                {output.desc ? (
                  <td>
                    <Link to={`/transactions/${output.id}`}>{output.desc}</Link>
                  </td>
                ) : (
                  <td>
                    <Link to={`/sync/${output.syncEvent.id}`}>Sync event</Link>
                    <Button
                      variant="secondary"
                      className="btn-xs"
                      style={{marginLeft: 5}}
                      key={id}
                    >
                      {output.syncEvent.accountElement.name}&nbsp;
                      {output.syncEvent.balance / 100}
                    </Button>
                  </td>
                )}

                <td>
                  {formatDate(output.date_time)}
                  <TimezoneTag offset={output.timezone_offset} />
                </td>
                <td>
                  {output.subtransaction ? (
                    output.subtransaction.map((sub: Subtransaction, id) => (
                      <Button
                        variant="secondary"
                        className="btn-xs"
                        style={{marginLeft: 5}}
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
                <td>
                  {output.transactionTag ? (
                    output.transactionTag.map((tags: TransactionTag, id) => (
                      <Button
                        variant="secondary"
                        className="btn-xs"
                        style={{marginLeft: 5}}
                        key={id}
                      >
                        {tags.tagElement.name}
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
    </Container>
  );
});
