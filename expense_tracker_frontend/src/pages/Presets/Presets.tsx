import "react-virtualized/styles.css";

import {observer} from "mobx-react-lite";
import React, {useCallback, useEffect, useRef, useState} from "react";
import {Button, Col, Container, Row} from "react-bootstrap";
import {useNavigate} from "react-router-dom";
import {AutoSizer, Column, Table} from "react-virtualized";

import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {useToken} from "../../utils/AuthContext";
import {AuthAxios} from "../../utils/Network";

interface Presets {
  id: number;
  name: string;
  desc: string;
  transactionDesc: string;
  user: string;
  tags: string[];
  presetSubs: PresetSub[];
}
interface PresetSub {
  id: number;
  fraction: number;
  preset: string;
  account: string;
  accountName: string;
}
interface PresetTransactionTag {
  id: number;
  preset: string;
  tag: string;
}

export const PresetsList = observer(() => {
  const auth = useToken();
  const [state, setState] = useState<Presets[]>([]);
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }

  const limit = 30;
  const [offset, setOffset] = useState(0);
  const loadingRef = useRef(false);
  const [finished, setFinished] = useState(false);

  const fetchPresets = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const data: Presets[] = (
        await AuthAxios.get("presets", auth.getToken(), {
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

      await Promise.all(
        data.map(async (preset) => {
          const transTagsRes = await AuthAxios.get(
            `preset_transaction_tags?preset=${preset.id}`,
            auth.getToken(),
          );
          const transTags = transTagsRes.data;
          preset.tags = await Promise.all(
            transTags.map(async (transTag: PresetTransactionTag) => {
              const tagsRes = await AuthAxios.get(
                `tags?id=${transTag.tag}`,
                auth.getToken(),
              );
              return tagsRes.data[0].name;
            }),
          );
          const presetSubsRes = await AuthAxios.get(
            `preset_subtransactions?preset=${preset.id}`,
            auth.getToken(),
          );
          const presetSubs: PresetSub[] = presetSubsRes.data;
          preset.presetSubs = await Promise.all(
            presetSubs.map(async (preSub) => {
              const accSubRes = await AuthAxios.get(
                `accounts?id=${preSub.account}`,
                auth.getToken(),
              );
              preSub.accountName = accSubRes.data[0].name;
              return preSub;
            }),
          );
        }),
      );

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
    fetchPresets();
  }, []);

  function rowRenderer({index}: {index: number}) {
    const preset = state[index];

    if (!preset) {
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
      Name: <a href={`/presets/${preset.id}`}>{preset.name}</a>,

      Description: preset.desc,

      Accounts: preset.presetSubs.map((presetSub) => (
        <Button
          variant="secondary"
          className="btn-xs"
          style={{marginLeft: 5}}
          role="button"
        >
          {presetSub.accountName}&nbsp;{presetSub.fraction}
        </Button>
      )),

      Tags: preset.tags.map((tag, id) => (
        <Button
          variant="secondary"
          key={id}
          style={{marginLeft: 5}}
          className="btn-xs"
          role="button"
        >
          {tag}
        </Button>
      )),
    };
  }

  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Presets</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/presets/add`} name={"New"} />
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
                  fetchPresets();
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
                label="Accounts"
                dataKey="Accounts"
                width={width / 2}
                cellRenderer={({cellData}) => cellData}
              />
              <Column
                label="Tags"
                dataKey="Tags"
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
