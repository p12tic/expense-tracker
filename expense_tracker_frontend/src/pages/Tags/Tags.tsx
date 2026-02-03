import "react-virtualized/styles.css";

import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Col, Container, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {AutoSizer, Column, Table} from "react-virtualized";

import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";

interface Tag {
  id: number;
  name: string;
  desc: string;
  user: string;
}
export const Tags = observer(() => {
  const auth = useToken();
  const [state, setState] = useState<Tag[]>([]);
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }

  const limit = 30;
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const fetchTags = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const data: Tag[] = (
        await AuthAxios.get("tags", auth.getToken(), {
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

      setState(data);
      setOffset(data.length);
    } catch (err) {
      console.error(err);
    } finally {
      loadingRef.current = false;
    }
  }, [auth, offset]);

  //initial load
  useEffect(() => {
    fetchTags();
  }, []);

  function rowRenderer({index}: {index: number}) {
    const tag = state[index];

    if (!tag) {
      if (finished || state.length < limit) {
        return {
          Name: "",
          Description: "",
        };
      } else {
        return {
          Name: "loading...",
          Description: "loading...",
        };
      }
    }

    return {
      Name: <a href={`/tags/${tag.id}`}>{tag.name}</a>,

      Description: tag.desc,
    };
  }

  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Tags</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/tags/add`} name={"New"} />
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
                  {loadingRef.current ? "loading..." : "No tags"}
                </div>
              )}
              onScroll={({clientHeight, scrollHeight, scrollTop}) => {
                if (
                  scrollTop + clientHeight >= scrollHeight - 5 &&
                  !loadingRef.current &&
                  state.length > 25
                ) {
                  fetchTags();
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
            </Table>
          )}
        </AutoSizer>
      </div>
    </Container>
  );
});
