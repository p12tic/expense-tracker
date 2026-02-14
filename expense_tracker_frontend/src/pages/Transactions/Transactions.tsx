import "react-virtualized/styles.css";

import dayjs, {Dayjs} from "dayjs";
import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Alert, Button, Col, Container, Row, Table} from "react-bootstrap";
import {Link, useLocation, useNavigate} from "react-router-dom";
import {AutoSizer, Column, Table as VirtTable} from "react-virtualized";

import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {TimezoneTag} from "../../components/TimezoneTag";
import {centsToString, formatDate} from "../../components/Tools";
import {useToken} from "../../utils/AuthContext";
import {checkIfVirtTableNeedsFetch} from "../../utils/Math";
import {AuthAxios} from "../../utils/Network";

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

  const limit = 100;
  const rowHeight = 33;
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;

    try {
      const data: Transaction[] = (
        await AuthAxios.get("transactions", auth.getToken(), {
          params: {
            limit: limit,
            offset: offset,
          },
        })
      ).data;

      if (data.length <= 0) {
        setFinished(true);
        loadingRef.current = false;
        return;
      }

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
            const syncEvents = syncEventRes.data[0];

            if (!syncEvents) {
              console.error(
                `syncEvents was not found, but it should be there, transaction id=${transaction.id}`,
              );
              return transaction;
            }

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

      setState((prev) => {
        const mergedSubs = [...prev.slice(0, offset), ...transactionWithTags];

        setOffset(mergedSubs.length);
        return mergedSubs;
      });
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
    }
  }, [auth, offset]);

  useEffect(() => {
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

  function rowRenderer({index}: {index: number}) {
    const transaction = state[index];

    if (!transaction) {
      if (finished || state.length < limit) {
        return {
          Description: "",
          Date: "",
          Actions: "",
          Tags: "",
          Dropdown: "",
        };
      } else {
        return {
          Description: "loading...",
          Date: "loading...",
          Actions: "loading...",
          Tags: "loading...",
          Dropdown: "",
        };
      }
    }

    return {
      Description: transaction.desc ? (
        <Link to={`/transactions/${transaction.id}`}>{transaction.desc}</Link>
      ) : transaction.syncEvent ? (
        <>
          <Link to={`/sync/${transaction.syncEvent?.id}`}>Sync event</Link>
          <a href={`/accounts/${transaction.syncEvent?.accountElement?.id}`}>
            <Button
              variant="secondary"
              className="btn-xs"
              style={{marginLeft: 5}}
            >
              {transaction.syncEvent?.accountElement?.name}
            </Button>
          </a>
        </>
      ) : (
        <>{`ERROR no syncEvent was found for transaction id=${transaction.id}`}</>
      ),

      Date: (
        <>
          {formatDate(transaction.date_time)}
          <TimezoneTag offset={transaction.timezone_offset} />
        </>
      ),

      Actions: transaction.subtransaction?.map((sub, id) => (
        <a key={id} href={`/accounts/${sub.accountElement?.id}`}>
          <Button
            variant="secondary"
            className="btn-xs"
            style={{marginLeft: 5}}
          >
            {sub.accountElement?.name} {centsToString(sub.amount)}
          </Button>
        </a>
      )),

      Tags: transaction.transactionTag?.map((tag: TransactionTag, id) => (
        <a key={id} href={`/tags/${tag.tagElement?.id}`}>
          <Button
            variant="secondary"
            className="btn-xs"
            style={{marginLeft: 5}}
          >
            {tag.tagElement?.name}
          </Button>
        </a>
      )),
    };
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
      <div style={{height: "70vh", width: "100%"}}>
        <AutoSizer>
          {({height, width}) => (
            <VirtTable
              width={width}
              height={height}
              headerHeight={20}
              rowHeight={rowHeight}
              rowCount={state.length > 0 ? state.length + 1 : 0}
              rowGetter={({index}: {index: number}) => rowRenderer({index})}
              rowStyle={() => ({
                borderBottom: "1px solid #DEE2E6",
              })}
              noRowsRenderer={() => (
                <div style={{padding: 16, textAlign: "center"}}>
                  {loadingRef.current ? "loading..." : "No transactions"}
                </div>
              )}
              onScroll={({clientHeight, scrollTop}) => {
                if (
                  !loadingRef.current &&
                  !finished &&
                  checkIfVirtTableNeedsFetch(
                    scrollTop,
                    clientHeight,
                    rowHeight,
                    state.length,
                    limit / 2,
                  )
                ) {
                  fetchTransactions();
                }
              }}
            >
              <Column
                label="Description"
                dataKey="Description"
                width={width / 4}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Date/Time"
                dataKey="Date"
                width={width / 4}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Actions"
                dataKey="Actions"
                width={width / 4}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Tags"
                dataKey="Tags"
                width={width / 4}
                cellRenderer={({cellData}) => cellData}
              />
            </VirtTable>
          )}
        </AutoSizer>
      </div>
    </Container>
  );
});
