import "react-virtualized/styles.css";
import "../../components/common.scss";

import dayjs, {Dayjs} from "dayjs";
import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Button, Col, Container, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {AutoSizer, Column, Table as VirtTable} from "react-virtualized";

import {NavbarComponent} from "../../components/Navbar";
import {TimezoneTag} from "../../components/TimezoneTag";
import {centsToString, formatDate} from "../../components/Tools";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";
import {popup} from "../../utils/popupUtils";

interface Expense {
  id: number;
  desc: string;
  date_time: Dayjs;
  timezone_offset: number;
  amount: number;
  master_username: string;
  slave_account: number;
  slave_account_name: string;
}

export const Expenses = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [state, setState] = useState<Expense[]>([]);
  const [reviewdExpenses, setReviewdExpenses] = useState<Expense[]>([]);

  const limit = 30;
  const [offset, setOffset] = useState(0);
  const [offsetReviewdExpenses, setOffsetReviewdExpenses] = useState(0);
  const loadingRef = useRef(false);
  const loadingReviewedRef = useRef(false);
  const [finished, setFinished] = useState(false);
  const [reviewedFinished, setReviewedFinished] = useState(false);

  const fetchExpenses = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;

    try {
      const data: Expense[] = (
        await AuthAxios.get("expenses_pending", auth.getToken(), {
          params: {
            limit: limit,
            offset: offset,
          },
        })
      ).data.map((expense: Expense) => ({
        ...expense,
        date_time: dayjs(expense.date_time),
      }));

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
      const message = err instanceof Error ? err.message : String(err);
      popup(message as string, "Server", "danger");
    } finally {
      loadingRef.current = false;
    }
  }, [auth, offset]);

  const fetchReviewdExpenses = useCallback(
    async (reset = false) => {
      if (loadingReviewedRef.current) {
        return;
      }
      loadingReviewedRef.current = true;
      const from = reset ? 0 : offsetReviewdExpenses;

      try {
        const data: Expense[] = (
          await AuthAxios.get("expenses", auth.getToken(), {
            params: {
              limit: limit,
              offset: from,
            },
          })
        ).data.map((expense: Expense) => ({
          ...expense,
          date_time: dayjs(expense.date_time),
        }));

        if (data.length <= 0) {
          setReviewedFinished(true);
          return;
        }

        setReviewdExpenses((prev) => {
          const merged = [...prev.slice(0, from), ...data];
          setOffsetReviewdExpenses(merged.length);
          return merged;
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        popup(message as string, "Server", "danger");
      } finally {
        loadingReviewedRef.current = false;
      }
    },
    [auth, offsetReviewdExpenses],
  );

  useEffect(() => {
    fetchExpenses();
    fetchReviewdExpenses();
  }, []);

  const postAction = async (id: number, action: "accept" | "decline") => {
    try {
      await AuthAxios.post("expenses_pending", auth.getToken(), {
        action: action,
        id: id,
      });
      setState((prev) => prev.filter((e) => e.id !== id));
      setOffset((prev) => prev - 1);
      popup(
        action === "accept" ? "Expense accepted" : "Expense declined",
        "Expenses",
        "success",
      );
      if (action === "accept") {
        fetchReviewdExpenses(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      popup(message as string, "Server", "danger");
    }
  };

  function rowRenderer({index}: {index: number}) {
    const expense = state[index];

    if (!expense) {
      if (finished || state.length < limit) {
        return {
          Description: "",
          Date: "",
          From: "",
          Account: "",
          Amount: "",
          Actions: "",
        };
      } else {
        return {
          Description: "loading...",
          Date: "loading...",
          From: "loading...",
          Account: "loading...",
          Amount: "loading...",
          Actions: "",
        };
      }
    }

    return {
      Description: expense.desc,

      Date: (
        <>
          {formatDate(expense.date_time)}
          <TimezoneTag offset={expense.timezone_offset} />
        </>
      ),

      From: expense.master_username,

      Account: (
        <a href={`/accounts/${expense.slave_account}`}>
          {expense.slave_account_name}
        </a>
      ),

      Amount: centsToString(expense.amount),

      Actions: (
        <>
          <Button
            variant="success"
            className="btn-xs"
            onClick={() => postAction(expense.id, "accept")}
          >
            Accept
          </Button>
          <Button
            variant="danger"
            className="btn-xs"
            style={{marginLeft: 5}}
            onClick={() => postAction(expense.id, "decline")}
          >
            Decline
          </Button>
        </>
      ),
    };
  }

  function rowReviewdRenderer({index}: {index: number}) {
    const expense = reviewdExpenses[index];

    if (!expense) {
      if (reviewedFinished || reviewdExpenses.length < limit) {
        return {
          Description: "",
          Date: "",
          From: "",
          Account: "",
          Amount: "",
          Actions: "",
        };
      } else {
        return {
          Description: "loading...",
          Date: "loading...",
          From: "loading...",
          Account: "loading...",
          Amount: "loading...",
          Actions: "",
        };
      }
    }

    return {
      Description: expense.desc,

      Date: (
        <>
          {formatDate(expense.date_time)}
          <TimezoneTag offset={expense.timezone_offset} />
        </>
      ),

      From: expense.master_username,

      Account: (
        <a href={`/accounts/${expense.slave_account}`}>
          {expense.slave_account_name}
        </a>
      ),

      Amount: centsToString(expense.amount),
    };
  }

  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Incoming expenses</h1>
        </Col>
      </Row>
      <div style={{height: "20vh", width: "100%"}}>
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
                  {loadingRef.current ? "loading..." : "No incoming expenses"}
                </div>
              )}
              onScroll={({clientHeight, scrollHeight, scrollTop}) => {
                if (
                  scrollTop + clientHeight >= scrollHeight - 5 &&
                  !loadingRef.current &&
                  !finished
                ) {
                  fetchExpenses();
                }
              }}
            >
              <Column
                label="Description"
                dataKey="Description"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Date/Time"
                dataKey="Date"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="From"
                dataKey="From"
                width={width / 8}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="To account"
                dataKey="Account"
                width={width / 6}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Amount"
                dataKey="Amount"
                width={width / 8}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label=""
                dataKey="Actions"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
            </VirtTable>
          )}
        </AutoSizer>
      </div>
      <Row>
        <Col>
          <h1>Reviewed expenses</h1>
        </Col>
      </Row>
      <div style={{height: "70vh", width: "100%"}}>
        <AutoSizer>
          {({height, width}) => (
            <VirtTable
              width={width}
              height={height}
              headerHeight={20}
              rowHeight={33}
              rowCount={
                reviewdExpenses.length > 0 ? reviewdExpenses.length + 1 : 0
              }
              rowGetter={({index}: {index: number}) =>
                rowReviewdRenderer({index})
              }
              rowStyle={() => ({
                borderBottom: "1px solid #DEE2E6",
              })}
              noRowsRenderer={() => (
                <div style={{padding: 16, textAlign: "center"}}>
                  {loadingRef.current ? "loading..." : "No incoming expenses"}
                </div>
              )}
              onScroll={({clientHeight, scrollHeight, scrollTop}) => {
                if (
                  scrollTop + clientHeight >= scrollHeight - 5 &&
                  !loadingReviewedRef.current &&
                  !reviewedFinished
                ) {
                  fetchReviewdExpenses();
                }
              }}
            >
              <Column
                label="Description"
                dataKey="Description"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Date/Time"
                dataKey="Date"
                width={width / 5}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="From"
                dataKey="From"
                width={width / 8}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="To account"
                dataKey="Account"
                width={width / 6}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Amount"
                dataKey="Amount"
                width={width / 8}
                cellRenderer={({cellData}) => cellData}
              />
            </VirtTable>
          )}
        </AutoSizer>
      </div>
    </Container>
  );
});
