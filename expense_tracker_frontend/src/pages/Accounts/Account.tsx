import "react-virtualized/styles.css";

import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Col, Container, Dropdown, Row} from "react-bootstrap";
import {Link, useNavigate, useParams} from "react-router-dom";
import {AutoSizer, Column, Table} from "react-virtualized";

import {
  getAccountBalance,
  getSubtransactionBalances,
} from "../../components/getSubtransactionBalances";
import {NavbarComponent} from "../../components/Navbar";
import {StaticField} from "../../components/StaticField";
import {TableButton} from "../../components/TableButton";
import {TimezoneTag} from "../../components/TimezoneTag";
import {centsToString, formatDate} from "../../components/Tools";
import {getStructuredTransactionData} from "../../utils/APICalls";
import {useToken} from "../../utils/AuthContext";
import {Subtransaction, Transaction} from "../../utils/Interfaces";
import {AuthAxios} from "../../utils/Network";

interface AccountElement {
  id: number;
  name: string;
  desc: string;
  user: number;
  subtransactions: SubtransactionWithTransactionElement[];
  balances: number[];
  balance: number;
}

interface SubtransactionWithTransactionElement extends Subtransaction {
  transactionElement: Transaction;
}

export const Account = observer(() => {
  const auth = useToken();
  const [state, setState] = useState<AccountElement>({
    id: 0,
    name: "",
    desc: "",
    user: 0,
    subtransactions: [],
    balances: [],
    balance: 0,
  });
  const {id} = useParams();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }

  const limit = 30;
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const fetchAccount = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;

    try {
      const account: AccountElement = (
        await AuthAxios.get(`accounts?id=${id}`, auth.getToken())
      ).data[0];
      const structuredTransactionData = await getStructuredTransactionData(
        auth,
        limit,
        offset,
        undefined,
        account.id,
      );
      const subtransactions: SubtransactionWithTransactionElement[] = [];
      structuredTransactionData.forEach((curTransaction) => {
        curTransaction.subtransaction.forEach((curSubtransaction) => {
          if (Number(curSubtransaction.account) === account.id) {
            subtransactions.push({
              ...curSubtransaction,
              transactionElement: curTransaction,
            });
          }
        });
      });
      if (structuredTransactionData.length <= 0) {
        setState((prev) => ({
          id: account.id,
          name: account.name,
          desc: account.desc,
          user: account.user,
          subtransactions: prev.subtransactions,
          balances: prev.balances,
          balance: prev.balance,
        }));
        setFinished(true);
        loadingRef.current = false;
        return;
      }

      const balance = await getAccountBalance(account.id, auth);

      setState((prev) => {
        const mergedSubs = [
          ...prev.subtransactions.slice(0, offset),
          ...subtransactions,
        ];

        setOffset(offset + structuredTransactionData.length);
        return {
          id: account.id,
          name: account.name,
          desc: account.desc,
          user: account.user,
          subtransactions: mergedSubs,
          balances: [],
          balance: balance,
        };
      });
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
    }
  }, [auth, id, offset]);

  //initial load
  useEffect(() => {
    fetchAccount();
  }, []);

  if (id === undefined) {
    navigate("/accounts");
    return;
  }

  function rowRenderer({index}: {index: number}) {
    const sub = state.subtransactions[index];
    if (!sub) {
      if (finished || state.subtransactions.length < limit) {
        return {
          Description: "",
          Date: "",
          Amount: "",
          Balance: "",
          Dropdown: "",
        };
      } else {
        return {
          Description: "loading...",
          Date: "loading...",
          Amount: "loading...",
          Balance: "loading...",
          Dropdown: "",
        };
      }
    }

    return {
      Description: sub.transactionElement.desc ? (
        <Link to={`/transactions/${sub.transactionElement.id}`}>
          {sub.transactionElement.desc}
        </Link>
      ) : sub.transactionElement.syncEvent ? (
        <Link to={`/sync/${sub.transactionElement.syncEvent.id}`}>
          Sync event
        </Link>
      ) : (
        <>{`ERROR no syncEvent was found for transaction id=${sub.transactionElement.id}`}</>
      ),

      Date: (
        <>
          {formatDate(sub.transactionElement.date_time)}
          <TimezoneTag offset={sub.transactionElement.timezone_offset} />
        </>
      ),

      Amount: centsToString(sub.amount),

      Balance: centsToString(
        getSubtransactionBalances(
          state.subtransactions.slice(0, index),
          state.balance,
        ),
      ),

      Dropdown: (
        <div>
          <Dropdown className="text-center">
            <Dropdown.Toggle
              size="sm"
              variant="default"
              style={{padding: "1px 5px", fontSize: "12px"}}
            />
            <Dropdown.Menu
              renderOnMount
              popperConfig={{
                strategy: "fixed",
              }}
            >
              <Dropdown.Item
                as={Link}
                to={`/accounts/${state.id}/sync?after_tr=${sub.transactionElement.id}`}
              >
                Sync after
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>
      ),
    };
  }

  return (
    <Container>
      <NavbarComponent />
      <>
        <Row>
          <Col>
            <h1>Account "{state.name}"</h1>
          </Col>
          <Col md="auto" className="d-flex justify-content-end">
            <TableButton dest={`/accounts/${state.id}/sync`} name={"Sync"} />
            <TableButton dest={`/accounts/${state.id}/edit`} name={"Edit"} />
            <TableButton
              dest={`/accounts/${state.id}/delete`}
              name={"Delete"}
              type="danger"
            />
          </Col>
        </Row>
        <StaticField label="Description" content={state.desc} />
        <h3>Transactions</h3>
        <div style={{height: "70vh", width: "100%"}}>
          <AutoSizer>
            {({height, width}) => (
              <Table
                width={width}
                height={height}
                headerHeight={20}
                rowHeight={33}
                rowCount={
                  state.subtransactions.length > 0
                    ? state.subtransactions.length + 1
                    : 0
                }
                rowGetter={({index}: {index: number}) => rowRenderer({index})}
                rowStyle={() => ({
                  borderBottom: "1px solid #DEE2E6",
                })}
                noRowsRenderer={() => (
                  <div style={{padding: 16, textAlign: "center"}}>
                    {loadingRef.current ? "loading..." : "No transactions"}
                  </div>
                )}
                onScroll={({clientHeight, scrollHeight, scrollTop}) => {
                  if (
                    scrollTop + clientHeight >= scrollHeight - 5 &&
                    !loadingRef.current &&
                    !finished
                  ) {
                    fetchAccount();
                  }
                }}
              >
                <Column
                  label="Description"
                  dataKey="Description"
                  width={width / 1}
                  cellRenderer={({cellData}) => cellData}
                />
                <Column
                  label="Date/Time"
                  dataKey="Date"
                  width={width / 1}
                  cellRenderer={({cellData}) => cellData}
                />
                <Column
                  label="Amount"
                  dataKey="Amount"
                  width={width / 1}
                  cellRenderer={({cellData}) => cellData}
                />
                <Column
                  label="Balance"
                  dataKey="Balance"
                  width={width / 1}
                  cellRenderer={({cellData}) => cellData}
                />
                <Column
                  label=""
                  dataKey="Dropdown"
                  width={width / 10}
                  cellRenderer={({cellData}) => cellData}
                />
              </Table>
            )}
          </AutoSizer>
        </div>
      </>
    </Container>
  );
});
