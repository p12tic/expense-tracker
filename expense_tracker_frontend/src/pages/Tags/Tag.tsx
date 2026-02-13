import "react-virtualized/styles.css";

import dayjs, {Dayjs} from "dayjs";
import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Button, Col, Container, Row} from "react-bootstrap";
import {Link, useNavigate, useParams} from "react-router-dom";
import {AutoSizer, Column, Table} from "react-virtualized";

import {NavbarComponent} from "../../components/Navbar";
import {StaticField} from "../../components/StaticField";
import {TableButton} from "../../components/TableButton";
import {TimezoneTag} from "../../components/TimezoneTag";
import {centsToString, formatDate} from "../../components/Tools";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";

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

  const limit = 30;
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const fetchTag = useCallback(async () => {
    if (loadingRef.current) {
      return;
    }
    loadingRef.current = true;

    try {
      const tag: TagElement = (
        await AuthAxios.get(`tags?id=${id}`, auth.getToken())
      ).data[0];
      const transTagData: TransTag[] = (
        await AuthAxios.get(`transaction_tags?tag=${id}`, auth.getToken(), {
          params: {
            limit: limit,
            offset: offset,
          },
        })
      ).data;
      if (transTagData.length <= 0) {
        setState((prev) => ({
          id: tag.id,
          name: tag.name,
          desc: tag.desc,
          user: tag.user,
          transTag: prev.transTag,
        }));
        setFinished(true);
        loadingRef.current = false;
        return;
      }

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

      setState((prev) => {
        const merged = [
          ...prev.transTag.slice(0, offset),
          ...transTagsWithTrans,
        ];

        setOffset(merged.length);
        return {
          id: tag.id,
          name: tag.name,
          desc: tag.desc,
          user: tag.user,
          transTag: merged,
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
    fetchTag();
  }, []);
  if (id === undefined) {
    navigate("/tags");
    return;
  }

  function rowRenderer({index}: {index: number}) {
    const TransTag = state.transTag[index];

    if (!TransTag) {
      if (finished) {
        return {
          Description: "",
          Date: "",
          Actions: "",
        };
      } else {
        return {
          Description: "loading...",
          Date: "loading...",
          Actions: "loading...",
        };
      }
    }

    return {
      Description: (
        <Link to={`/transactions/${TransTag.transactionElement.id}`}>
          {TransTag.transactionElement.desc}
        </Link>
      ),

      Date: (
        <>
          {formatDate(TransTag.transactionElement.date_time)}
          <TimezoneTag offset={TransTag.transactionElement.timezone_offset} />
        </>
      ),

      Actions: TransTag.transactionElement.subs ? (
        TransTag.transactionElement.subs.map((sub, id) => (
          <a key={id} href={`/accounts/${sub.accountElement.id}`}>
            <Button
              variant="secondary"
              className="btn-xs"
              style={{marginLeft: 5}}
              role="button"
            >
              {sub.accountElement.name}&nbsp;
              {centsToString(sub.amount)}
            </Button>
          </a>
        ))
      ) : (
        <></>
      ),
    };
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
        <div style={{height: "70vh", width: "100%"}}>
          <AutoSizer>
            {({height, width}) => (
              <Table
                width={width}
                height={height}
                headerHeight={20}
                rowHeight={33}
                rowCount={
                  state.transTag.length > 0 ? state.transTag.length + 1 : 0
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
                    state.transTag.length > 25
                  ) {
                    fetchTag();
                  }
                }}
              >
                <Column
                  label="Description"
                  dataKey="Description"
                  width={width / 3}
                  cellRenderer={({cellData}) => cellData}
                />
                <Column
                  label="Date/Time"
                  dataKey="Date"
                  width={width / 3}
                  cellRenderer={({cellData}) => cellData}
                />
                <Column
                  label="Actions"
                  dataKey="Actions"
                  width={width / 3}
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
