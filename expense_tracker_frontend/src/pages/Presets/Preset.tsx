import {observer} from "mobx-react-lite";
import {TableButton} from "../../components/TableButton";
import React, {useEffect, useState} from "react";
import {StaticField} from "../../components/StaticField";
import {NavbarComponent} from "../../components/Navbar";
import {useToken} from "../../utils/AuthContext";
import {Link, useNavigate, useParams} from "react-router-dom";
import {AuthAxios} from "../../utils/Network";
import {Col, Row, Container, Table, Button, Alert} from "react-bootstrap";

interface Preset {
  id: number;
  name: string;
  desc: string;
  transactionDesc: string;
  user: string;
  presetSubs: PresetSub[];
  presetTransTags: PresetTransactionTag[];
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
  tagName: string;
}
const defaultPreset: Preset = {
  id: 0,
  name: "",
  desc: "",
  transactionDesc: "",
  user: "",
  presetSubs: [],
  presetTransTags: [],
};
export const Preset = observer(function Preset() {
  const auth = useToken();
  const [state, setState] = useState<Preset>(defaultPreset);
  const {id} = useParams();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  useEffect(() => {
    const fetchPreset = async () => {
      const presetRes = await AuthAxios.get(
        `presets?id=${id}`,
        auth.getToken(),
      );
      const preset: Preset = presetRes.data[0];
      const presetSubsRes = await AuthAxios.get(
        `preset_subtransactions?preset=${id}`,
        auth.getToken(),
      );
      const presetSubs: PresetSub[] = presetSubsRes.data;
      await Promise.all(
        presetSubs.map(async (presetSub) => {
          await AuthAxios.get(
            `accounts?id=${presetSub.account}`,
            auth.getToken(),
          ).then((res) => {
            const acc = res.data[0];
            presetSub.accountName = acc.name;
          });
        }),
      );
      const presetTransTagsRes = await AuthAxios.get(
        `preset_transaction_tags?preset=${id}`,
        auth.getToken(),
      );
      const presetTransTags: PresetTransactionTag[] = presetTransTagsRes.data;
      await Promise.all(
        presetTransTags.map(async (presetTransactionTag) => {
          await AuthAxios.get(
            `tags?id=${presetTransactionTag.tag}`,
            auth.getToken(),
          ).then((res) => {
            const tag = res.data[0];
            presetTransactionTag.tagName = tag.name;
          });
        }),
      );
      preset.presetTransTags = presetTransTags;
      preset.presetSubs = presetSubs;
      setState(preset);
    };
    fetchPreset();
  }, []);

  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Preset "{state?.name}"</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/presets/${id}/edit`} name={"Edit"} />
          <TableButton
            dest={`/presets/${id}/delete`}
            name={"Delete"}
            class="danger"
          />
        </Col>
      </Row>
      <StaticField label="Description" content={state?.desc} />

      <h3>Transaction template</h3>
      <Table size="sm">
        <thead>
          {state?.presetSubs.length > 0 ? (
            <tr>
              <th>Affected account</th>
              <th>Fraction</th>
            </tr>
          ) : (
            <></>
          )}
        </thead>
        <tbody>
          {state?.presetSubs.length > 0 ? (
            state?.presetSubs.map((presetSub, id) => (
              <tr key={id}>
                <td>
                  <Link to={`/accounts/${presetSub.account}`}>
                    {presetSub.accountName}
                  </Link>
                </td>
                <td>{presetSub.fraction.toFixed(3)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td>No accounts defined</td>
            </tr>
          )}
        </tbody>
      </Table>
      <h4>Tags</h4>
      {state?.presetTransTags.length > 0 ? (
        state?.presetTransTags.map((presetTransTag) => (
          <Button
            variant="secondary"
            className="btn-xs"
            style={{marginRight: 5}}
            role="button"
          >
            {presetTransTag.tagName}
          </Button>
        ))
      ) : (
        <Alert variant="info" transition={false} role="alert">
          No tags have been defined for this preset
        </Alert>
      )}
    </Container>
  );
});
