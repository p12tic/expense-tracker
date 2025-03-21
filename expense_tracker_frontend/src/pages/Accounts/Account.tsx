import {observer} from "mobx-react-lite";
import {useToken} from "../../utils/AuthContext";
import React, {useEffect, useState} from "react";
import {Link, useNavigate, useParams} from "react-router-dom";
import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {StaticField} from "../../components/StaticField";
import {getSubtransactionBalances} from "../../components/getSubtransactionBalances";
import {centsToString, formatDate} from "../../components/Tools";
import {AuthAxios} from "../../utils/Network";
import {Col, Dropdown, Row, Container, Table} from "react-bootstrap";
import {TimezoneTag} from "../../components/TimezoneTag";
import dayjs, {Dayjs} from "dayjs";

interface AccountElement {
  id: number;
  name: string;
  desc: string;
  user: number;
  subtransactions: Subtransaction[];
  balances: number[];
}
interface Subtransaction {
  id: number;
  amount: number;
  transaction: string;
  account: string;
  transactionElement: Transaction;
}
interface Transaction {
  id: number;
  desc: string;
  date_time: Dayjs;
  timezone_offset: number;
  user: string;
  syncEvent: SyncEvent;
}
interface SyncEvent {
  id: number;
  balance: number;
  account: string;
  subtransaction: string;
}
export const Account = observer(function Account() {
  const auth = useToken();
  const [state, setState] = useState<AccountElement>({
    id: 0,
    name: "",
    desc: "",
    user: 0,
    subtransactions: [],
    balances: [],
  });
  const {id} = useParams();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  useEffect(() => {
    const fetchTag = async () => {
      const accountRes = await AuthAxios.get(
        `accounts?id=${id}`,
        auth.getToken(),
      );
      const account: AccountElement = accountRes.data[0];
      const accountSubRes = await AuthAxios.get(
        `subtransactions?account=${id}`,
        auth.getToken(),
      );
      const accountSubs: Subtransaction[] = accountSubRes.data;
      account.subtransactions = await Promise.all(
        accountSubs.map(async (sub) => {
          const transactionRes = await AuthAxios.get(
            `transactions?id=${sub.transaction}`,
            auth.getToken(),
          );
          const transaction: Transaction = transactionRes.data[0];
          transaction.date_time = dayjs(transaction.date_time);
          if (!transaction.desc) {
            const syncRes = await AuthAxios.get(
              `account_sync_event?subtransaction=${sub.id}`,
              auth.getToken(),
            );
            transaction.syncEvent = syncRes.data[0];
          }
          sub.transactionElement = transaction;
          const cacheRes = await AuthAxios.get(
            `account_balance_cache?subtransaction=${sub.id}&date_lte=1970-01-01`,
            auth.getToken(),
          );
          let cacheDate: Dayjs;
          let sum = 0;
          if (cacheRes.data.length > 0) {
            cacheDate = cacheRes.data[cacheRes.data.length - 1].date;
            sum = cacheRes.data[cacheRes.data.length - 1].balance;
          } else {
            cacheDate = dayjs(0);
            sum = 0;
          }
          const cacheSubsRes = await AuthAxios.get(
            `subtransactions?account=${id}&date_gte=${formatDate(dayjs(cacheDate))}&date_lte=${formatDate(dayjs(sub.transactionElement.date_time))}`,
            auth.getToken(),
          );
          const cacheSubs: Subtransaction[] = cacheSubsRes.data;
          await Promise.all(
            cacheSubs.map(async (cacheSub) => {
              sum = sum + cacheSub.amount;
            }),
          );
          sub.transactionElement = transaction;
          return sub;
        }),
      );
      account.balances = getSubtransactionBalances(account.subtransactions);
      account.subtransactions.reverse();
      setState(account);
    };

    fetchTag();
  }, []);

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
              class="danger"
            />
          </Col>
        </Row>
        <StaticField label="Description" content={state.desc} />
        <h3>Transactions</h3>
        <Table size="sm">
          <thead>
            {state.subtransactions.length > 0 ? (
              <tr>
                <th>Description</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Balance</th>
                <th></th>
              </tr>
            ) : (
              <></>
            )}
          </thead>
          <tbody>
            {state.subtransactions.length > 0 ? (
              state.subtransactions.map((sub, id) => (
                <tr key={id}>
                  <td>
                    {sub.transactionElement.desc ? (
                      <Link to={`/transactions/${sub.transactionElement.id}`}>
                        {sub.transactionElement.desc}
                      </Link>
                    ) : (
                      <Link to={`/sync/${sub.transactionElement.syncEvent.id}`}>
                        Sync event
                      </Link>
                    )}
                  </td>
                  <td>
                    {formatDate(sub.transactionElement.date_time)}
                    <TimezoneTag
                      offset={sub.transactionElement.timezone_offset}
                    />
                  </td>
                  <td>{centsToString(sub.amount)}</td>
                  <td>
                    {centsToString(
                      state.balances[state.balances.length - 1 - id],
                    )}
                  </td>
                  <td>
                    {sub.transactionElement.desc ? (
                      <Dropdown className="text-end">
                        <Dropdown.Toggle
                          size="sm"
                          variant="default"
                          style={{padding: "1px 5px", fontSize: "12px"}}
                        />
                        <Dropdown.Menu>
                          <Dropdown.Item
                            href={`/accounts/${state.id}/sync?after_tr=${sub.transactionElement.id}`}
                          >
                            Sync after
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
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
