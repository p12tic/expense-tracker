import {observer} from "mobx-react-lite";
import {NavbarComponent} from "../../components/Navbar";
import {useToken} from "../../utils/AuthContext";
import {useLocation, useNavigate} from "react-router-dom";
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {SubmitButton} from "../../components/SubmitButton";
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
export const TransactionCreate = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetInUse, setPresetInUse] = useState<Preset>(
    location.state?.presetInUse ?? defaultPreset,
  );
  const [openPresets, setOpenPresets] = useState(
    location.state?.presetInUse.id !== 0,
  );
  const [desc, setDesc] = useState(location.state?.desc ?? "");
  const [date, setDate] = useState<Dayjs>(dayjs(location.state?.date));
  const [timezoneOffset, setTimezoneOffset] = useState<number>(
    location.state?.timezoneOffset ?? -dayjs().utcOffset(),
  );
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [images, setImages] = useState<TransactionImage[]>(
    location.state?.images ?? [],
  );

  useEffect(() => {
    const fetch = async () => {
      if (location.state && location.state.presetInUse) {
        const presetsData: Preset[] = await fetchPresets(auth.getToken());
        setPresets(presetsData);
      } else {
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
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bodyParams = new FormData();
    bodyParams.append("action", "create");
    bodyParams.append("desc", desc);
    bodyParams.append("date", formatDateIso8601(date));
    bodyParams.append("preset", JSON.stringify(presetInUse));
    bodyParams.append("timezoneOffset", timezoneOffset.toString());
    images.map((image) => bodyParams.append("images", image.image));
    await AuthAxios.post("transactions", auth.getToken(), bodyParams);
    navigate("/transactions", {
      state: {
        desc,
        date: formatDateIso8601(date),
        presetInUse,
        timezoneOffset,
        images,
      },
    });
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
        <SubmitButton text="Save" />
      </Form>
    </Container>
  );
});
