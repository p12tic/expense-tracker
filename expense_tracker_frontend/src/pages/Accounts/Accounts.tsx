import "../../components/common.scss";

import {Dayjs} from "dayjs";
import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Button, Col, Container, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {AutoSizer, Column, Table} from "react-virtualized";

import {getAccountBalance} from "../../components/getSubtransactionBalances";
import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";

interface Account {
  id: number;
  name: string;
  desc: string;
  user: string;
  lastCacheBalance: number;
  lastCacheDate: Dayjs;
  balance: number;
}

export const Accounts = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [state, setState] = useState<Account[]>([]);

  const limit = 30;
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;

    try {
      const data = (
        await AuthAxios.get("accounts", auth.getToken(), {
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

      const cache = await Promise.all(
        data.map(async (account: Account) => {
          account.balance = await getAccountBalance(account.id, auth);
          return account;
        }),
      );

      setState(cache);
      setOffset(cache.length);
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
    }
  }, [auth, offset]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  function rowRenderer({index}: {index: number}) {
    const Account = state[index];

    if (!Account) {
      if (finished || state.length < limit) {
        return {
          Name: "",
          Description: "",
          Balance: "",
          Button: "",
        };
      } else {
        return {
          Name: "loading...",
          Description: "loading...",
          Balance: "loading...",
          Button: "",
        };
      }
    }

    return {
      Name: <a href={`/accounts/${Account.id}`}>{Account.name}</a>,

      Description: Account.desc,

      Balance: Account.balance / 100,

      Button: (
        <Button
          href={`/accounts/${Account.id}/sync`}
          variant="default"
          className="btn-xs pull-right"
          role="button"
        >
          Sync
        </Button>
      ),
    };
  }

  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Accounts</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/accounts/add`} name={"New"} />
        </Col>
      </Row>
      <div style={{height: "70vh", width: "100%"}}>
        <AutoSizer>
          {({height, width}) => (
            <Table
              width={width}
              height={height}
              headerHeight={20}
              rowHeight={33}
              rowCount={state.length > 0 ? state.length + 1 : 0}
              rowGetter={({index}: {index: number}) => rowRenderer({index})}
              rowStyle={() => ({
                borderBottom: "1px solid #DEE2E6",
              })}
              noRowsRenderer={() => (
                <div style={{padding: 16, textAlign: "center"}}>
                  {loadingRef.current ? "loading..." : "No accounts"}
                </div>
              )}
              onScroll={({clientHeight, scrollHeight, scrollTop}) => {
                if (
                  scrollTop + clientHeight >= scrollHeight - 5 &&
                  !loadingRef.current &&
                  state.length > 25
                ) {
                  fetchAccounts();
                }
              }}
            >
              <Column
                label="Name"
                dataKey="Name"
                width={width / 2}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Description"
                dataKey="Description"
                width={width / 2}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Balance"
                dataKey="Balance"
                width={width / 2}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label=""
                dataKey="Button"
                width={width / 10}
                cellRenderer={({cellData}) => cellData}
              />
            </Table>
          )}
        </AutoSizer>
      </div>
    </Container>
  );
});
