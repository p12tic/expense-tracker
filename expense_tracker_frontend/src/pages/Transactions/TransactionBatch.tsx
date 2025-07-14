import {observer} from "mobx-react-lite";
import {NavbarComponent} from "../../components/Navbar";
import {useToken} from "../../utils/AuthContext";
import {useNavigate, useParams} from "react-router-dom";
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  formatDateIso8601,
  formatDateTimeForInput,
} from "../../components/Tools";
import {AuthAxios} from "../../utils/Network";
import {
  Col,
  Form,
  InputGroup,
  Row,
  Button,
  Container,
  Alert,
} from "react-bootstrap";
import dayjs, {Dayjs} from "dayjs";
import {TimezoneSelect} from "../../components/TimezoneSelect";
import {fetchAccounts, fetchPresets, fetchTags} from "../../utils/APICalls";
import type {
  AccountElement,
  Preset,
  TagElement,
  TransactionImage,
} from "../../utils/Interfaces";
import {AccountsListItem} from "../../components/AccountsListItem";
import {PresetSelection} from "../../components/PresetSelection";
import {ImageField} from "../../components/ImageField";

interface scannedData {
  amount: string;
  date: string;
}
interface BatchData {
  id: number;
  name: string;
  preset: number;
  account: number;
  data: scannedData;
}
const defaultPreset: Preset = {
  id: 0,
  name: "",
  desc: "",
  transaction_desc: "",
  user: "",
  amount: "0",
  accounts: [],
  tags: [],
};
export const TransactionBatch = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetInUse, setPresetInUse] = useState<Preset>(defaultPreset);
  const [openPresets, setOpenPresets] = useState(false);
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [timezoneOffset, setTimezoneOffset] = useState<number>(
    -dayjs().utcOffset(),
  );
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [images, setImages] = useState<TransactionImage[]>([]);
  const {batchID, batchItemID} = useParams();
  const [nextItemID, setNextItemID] = useState<number>();
  const [isProcessed, setIsProcessed] = useState<boolean>(false);

  useEffect(() => {
    const fetch = async () => {
      const [accountsData, tagsData, presetsData]: [
        AccountElement[],
        TagElement[],
        Preset[],
      ] = await Promise.all([
        fetchAccounts(auth.getToken()),
        fetchTags(auth.getToken()),
        fetchPresets(auth.getToken()),
      ]);
      setPresetInUse((prevPresetInUse) => {
        return {...prevPresetInUse, accounts: accountsData, tags: tagsData};
      });
      setPresets(presetsData);
    };
    fetch();
  }, [batchItemID]);
  useEffect(() => {
    const fetchBatchData = async () => {
      const batchOptionsRes = await AuthAxios.get(
        `transaction_batch?id=${batchID}`,
        auth.getToken(),
      );
      const batchOptions: BatchData = batchOptionsRes.data[0];

      const batchTransactionRes = await AuthAxios.get(
        `transaction_batch_transactions/${batchItemID}`,
        auth.getToken(),
      );
      setImages([batchTransactionRes.data]);
      setIsProcessed(batchTransactionRes.data.data_done);
      if (batchTransactionRes.data.data_json) {
        batchOptions.data = batchTransactionRes.data.data_json;
      } else {
        batchOptions.data = {amount: "0", date: dayjs().toISOString()};
      }
      setDate(dayjs(batchOptions.data.date));
      if (batchOptions.preset) {
        const preset = presets.find((obj) => obj.id === batchOptions.preset);
        if (preset !== undefined) {
          preset.amount = batchOptions.data.amount;
          preset.accounts = preset.accounts.map((acc) => ({
            ...acc,
            amount: acc.fraction * parseFloat(preset.amount),
          }));
          setPresetInUse(preset);
          setDesc(preset.transaction_desc || "");
          setOpenPresets(true);
        }
      } else if (batchOptions.account) {
        const account = presetInUse.accounts.find(
          (obj) => obj.id === batchOptions.account,
        );
        if (account !== undefined) {
          setDesc(batchOptions.name);
          setPresetInUse((prevPresetInUse) => {
            if (!prevPresetInUse) return prevPresetInUse;
            const updatedAccounts = prevPresetInUse.accounts.map((acc) =>
              acc.id === account.id
                ? {
                    ...acc,
                    isUsed: true,
                    amount: parseFloat(batchOptions.data.amount),
                  }
                : acc,
            );
            return {...prevPresetInUse, accounts: updatedAccounts};
          });
        }
      }
      const nextBatchRes = await AuthAxios.get(
        `transaction_batch/${batchID}/${batchItemID}/next`,
        auth.getToken(),
      );
      if (nextBatchRes.status === 200) {
        setNextItemID(nextBatchRes.data.id);
      } else {
        setNextItemID(undefined);
      }
    };
    fetchBatchData();
  }, [presets.length, presetInUse.accounts.length, batchItemID]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bodyParams = new FormData();
    bodyParams.append("action", "create");
    bodyParams.append("desc", desc);
    bodyParams.append("date", formatDateIso8601(date));
    bodyParams.append("preset", JSON.stringify(presetInUse));
    bodyParams.append("timezoneOffset", timezoneOffset.toString());
    images.map((image) => bodyParams.append("images", image.image));
    const createdStatus = await AuthAxios.post(
      "transactions",
      auth.getToken(),
      bodyParams,
    );
    if (createdStatus.status === 201) {
      const deletedStatus = await AuthAxios.delete(
        `transaction_batch_transactions/${batchItemID}`,
        auth.getToken(),
      );
      if (deletedStatus.status === 200) {
        if (nextItemID !== undefined) {
          window.location.href = `/transactions/batch/${batchID}/${nextItemID}`;
        } else {
          navigate("/transactions");
        }
      }
    }
  };

  const handleTagClick = useCallback((clickedTag: TagElement) => {
    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedTags = prevPresetInUse.tags.map((tag) =>
        tag.id === clickedTag.id ? {...tag, isChecked: !tag.isChecked} : tag,
      );
      return {...prevPresetInUse, tags: updatedTags};
    });
  }, []);

  const renderAccounts = useMemo(() => {
    return (
      <>
        {presetInUse?.accounts.map((acc) => (
          <AccountsListItem account={acc} setPresetInUse={setPresetInUse} />
        ))}
      </>
    );
  }, [presetInUse]);
  const renderTags = useMemo(() => {
    return presetInUse?.tags.map((tag, id) => (
      <Button
        className="tmp-tag-button"
        key={id}
        variant={tag.isChecked ? "info" : "default"}
        onClick={() => handleTagClick(tag)}
      >
        <Form.Label htmlFor={`tag-${tag.id}`}>{tag.name}</Form.Label>
      </Button>
    ));
  }, [presetInUse?.tags, handleTagClick]);

  return (
    <Container>
      <NavbarComponent />
      <Form onSubmit={handleSubmit}>
        <Alert
          variant={isProcessed ? "success" : "danger"}
          style={{marginTop: "10px"}}
        >
          <Row>
            <Col>
              {isProcessed
                ? "Data prefilled by AI. Is data filled correctly?"
                : "Data has not been prefilled by AI yet. Submit it anyways?"}
            </Col>
            {nextItemID !== undefined && (
              <Col xs={4} sm={2} className="ms-auto">
                <Button
                  variant="outline-warning"
                  onClick={() =>
                    (window.location.href = `/transactions/batch/${batchID}/${nextItemID}`)
                  }
                  style={{width: "100%"}}
                >
                  {batchItemID && nextItemID < parseInt(batchItemID)
                    ? "Skip to first"
                    : "Skip"}
                </Button>
              </Col>
            )}
            <Col xs={4} sm={2} className="ms-auto">
              <Button
                variant={isProcessed ? "outline-success" : "outline-danger"}
                type="submit"
                style={{width: "100%"}}
              >
                Yes
              </Button>
            </Col>
          </Row>
        </Alert>
        <h1>New transaction</h1>
        <PresetSelection
          presets={presets}
          presetInUse={presetInUse}
          openPresets={openPresets}
          setOpenPresets={setOpenPresets}
          setPresetInUse={setPresetInUse}
          setDesc={setDesc}
        />
        <Form.Group>
          <Row className="mt-4">
            <Col xs={4} sm={2} className="align-content-center text-end">
              <Form.Label className="mb-0" htmlFor="id_description">
                Description
              </Form.Label>
            </Col>
            <Col xs={8} sm={10} className="align-content-center">
              <Form.Control
                type="text"
                name="description"
                key="id_description"
                value={desc}
                required={true}
                id="id_description"
                onChange={(e) => setDesc(e.target.value)}
              />
            </Col>
          </Row>
          <Row className="mt-4">
            <Col xs={4} sm={2} className="align-content-center text-end">
              <Form.Label className="mb-0" htmlFor="id_Date">
                Date
              </Form.Label>
            </Col>
            <Col xs={8} sm={10} className="align-content-center">
              <InputGroup size="sm">
                <Form.Control
                  type="datetime-local"
                  name="date"
                  value={formatDateTimeForInput(date)}
                  key="id_date"
                  required={true}
                  id="id_Date"
                  onChange={(e) => setDate(dayjs(e.target.value))}
                />
                <InputGroup.Text>
                  Using timezone:&nbsp;
                  <TimezoneSelect
                    offset={timezoneOffset}
                    onChange={setTimezoneOffset}
                  />
                </InputGroup.Text>
              </InputGroup>
            </Col>
          </Row>
        </Form.Group>
        <h4>Accounts</h4>
        {presetInUse.accounts.length > 0 ? (
          <div id="tmp-accounts">{renderAccounts}</div>
        ) : (
          <Alert variant="info" transition={false}>
            No accounts have been created
          </Alert>
        )}
        <h4>Tags</h4>
        {presetInUse?.tags.length > 0 ? (
          <div id="tmp-tags">{renderTags}</div>
        ) : (
          <Alert variant="info" transition={false}>
            No tags have been created
          </Alert>
        )}
        <ImageField images={images} setImages={setImages} />
      </Form>
    </Container>
  );
});
