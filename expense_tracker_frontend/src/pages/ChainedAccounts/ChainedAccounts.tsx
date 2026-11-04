import "react-virtualized/styles.css";
import "../../components/common.scss";

import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Button, Col, Container, Form, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {AutoSizer, Column, Table as VirtTable} from "react-virtualized";

import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";
import {popup} from "../../utils/popupUtils";

interface ChainedAccount {
  id: number;
  master_account: number;
  slave_account: number;
  master_account_name: string;
  slave_account_name: string;
  relation: number;
}
interface ChainedAccountRequest {
  id: number;
  master: number;
  slave: number;
  master_username: string;
  slave_username: string;
  master_account: number | null;
  desc: string;
  relation: number;
}
interface Account {
  id: number;
  name: string;
}

export const ChainedAccounts = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [state, setState] = useState<ChainedAccount[]>([]);
  const [requests, setRequests] = useState<ChainedAccountRequest[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<
    Record<number, number>
  >({});
  const [userId, setUserId] = useState<number | null>(null);

  const limit = 30;
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const showError = (err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    popup(message as string, "Server", "danger");
  };

  const fetchChainedAccounts = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;

    try {
      const data: ChainedAccount[] = (
        await AuthAxios.get("chained_accounts", auth.getToken(), {
          params: {
            limit: limit,
            offset: offset,
          },
        })
      ).data;

      if (data.length <= 0) {
        setFinished(true);
        return;
      }

      setState((prev) => {
        const merged = [...prev.slice(0, offset), ...data];
        setOffset(merged.length);
        return merged;
      });
    } catch (err) {
      showError(err);
    } finally {
      loadingRef.current = false;
    }
  }, [auth, offset]);

  const fetchRequests = async () => {
    try {
      const data: ChainedAccountRequest[] = (
        await AuthAxios.get("chained_account_requests", auth.getToken())
      ).data;
      setRequests(data);
    } catch (err) {
      showError(err);
    }
  };

  useEffect(() => {
    const fetchAccountsAndUser = async () => {
      try {
        const data: Account[] = (
          await AuthAxios.get("accounts", auth.getToken())
        ).data;
        setAccounts(data);
        const user = (await AuthAxios.get("token", auth.getToken())).data;
        setUserId(user[0]?.id ?? null);
      } catch (err) {
        showError(err);
      }
    };
    fetchChainedAccounts();
    fetchRequests();
    fetchAccountsAndUser();
  }, []);

  const postRequestAction = async (body: object) => {
    try {
      await AuthAxios.post("chained_account_requests", auth.getToken(), body);
      await fetchRequests();
      setState([]);
      setOffset(0);
      setFinished(false);
      const data: ChainedAccount[] = (
        await AuthAxios.get("chained_accounts", auth.getToken(), {
          params: {limit: limit, offset: 0},
        })
      ).data;
      setState(data);
      setOffset(data.length);
    } catch (err) {
      showError(err);
    }
  };

  const deleteChained = async (id: number) => {
    try {
      await AuthAxios.post("chained_accounts", auth.getToken(), {
        action: "delete",
        id: id,
      });
      setState((prev) => prev.filter((c) => c.id !== id));
      setOffset((prev) => prev - 1);
    } catch (err) {
      showError(err);
    }
  };

  function requestRowRenderer({index}: {index: number}) {
    const request = requests[index];
    const isSlave = userId !== null ? request.slave === userId : true;

    return {
      From: request.master_username,
      To: request.slave_username,
      Description: request.desc,
      Actions: isSlave ? (
        <>
          <Form.Select
            size="sm"
            style={{display: "inline-block", width: "auto"}}
            value={selectedAccounts[request.id] ?? ""}
            onChange={(e) =>
              setSelectedAccounts((prev) => ({
                ...prev,
                [request.id]: Number(e.target.value),
              }))
            }
          >
            <option value="" disabled>
              Select account
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Form.Select>
          <Button
            variant="success"
            className="btn-xs"
            style={{marginLeft: 5}}
            disabled={!selectedAccounts[request.id]}
            onClick={() =>
              postRequestAction({
                action: "accept",
                id: request.id,
                slave_account: selectedAccounts[request.id],
              })
            }
          >
            Accept
          </Button>
          <Button
            variant="danger"
            className="btn-xs"
            style={{marginLeft: 5}}
            onClick={() =>
              postRequestAction({action: "decline", id: request.id})
            }
          >
            Decline
          </Button>
        </>
      ) : (
        <Button
          variant="secondary"
          className="btn-xs"
          onClick={() => postRequestAction({action: "decline", id: request.id})}
        >
          Cancel
        </Button>
      ),
    };
  }

  function rowRenderer({index}: {index: number}) {
    const chained = state[index];

    if (!chained) {
      if (finished || state.length < limit) {
        return {Master: "", Slave: "", Button: ""};
      } else {
        return {Master: "loading...", Slave: "loading...", Button: ""};
      }
    }

    return {
      Master: chained.master_account_name,
      Slave: chained.slave_account_name,
      Button: (
        <Button
          variant="danger"
          className="btn-xs pull-right"
          onClick={() => deleteChained(chained.id)}
        >
          Delete
        </Button>
      ),
    };
  }

  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Pending requests</h1>
        </Col>
      </Row>
      <div style={{height: "25vh", width: "100%"}}>
        <AutoSizer>
          {({height, width}) => (
            <VirtTable
              width={width}
              height={height}
              headerHeight={20}
              rowHeight={40}
              rowCount={requests.length}
              rowGetter={({index}: {index: number}) =>
                requestRowRenderer({index})
              }
              rowStyle={() => ({
                borderBottom: "1px solid #DEE2E6",
              })}
              noRowsRenderer={() => (
                <div style={{padding: 16, textAlign: "center"}}>
                  No pending requests
                </div>
              )}
            >
              <Column
                label="From"
                dataKey="From"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="To"
                dataKey="To"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Description"
                dataKey="Description"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label=""
                dataKey="Actions"
                width={(width * 2) / 5}
                cellRenderer={({cellData}) => cellData}
              />
            </VirtTable>
          )}
        </AutoSizer>
      </div>
      <Row>
        <Col>
          <h1>Chained accounts</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/chained_accounts/add`} name={"New"} />
        </Col>
      </Row>
      <div style={{height: "45vh", width: "100%"}}>
        <AutoSizer>
          {({height, width}) => (
            <VirtTable
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
                  {loadingRef.current ? "loading..." : "No chained accounts"}
                </div>
              )}
              onScroll={({clientHeight, scrollHeight, scrollTop}) => {
                if (
                  scrollTop + clientHeight >= scrollHeight - 5 &&
                  !loadingRef.current &&
                  !finished
                ) {
                  fetchChainedAccounts();
                }
              }}
            >
              <Column
                label="Master account"
                dataKey="Master"
                width={width / 2}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Slave account"
                dataKey="Slave"
                width={width / 2}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label=""
                dataKey="Button"
                width={width / 10}
                cellRenderer={({cellData}) => cellData}
              />
            </VirtTable>
          )}
        </AutoSizer>
      </div>
    </Container>
  );
});
