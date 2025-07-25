import {observer} from "mobx-react-lite";
import {NavbarComponent} from "../../components/Navbar";
import {useToken} from "../../utils/AuthContext";
import {useNavigate, useParams} from "react-router-dom";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {SubmitButton} from "../../components/SubmitButton";
import {
  centsToString,
  formatDateIso8601,
  formatDateTimeForInput,
} from "../../components/Tools";
import {AuthAxios} from "../../utils/Network";
import {
  Card,
  Col,
  Form,
  InputGroup,
  Row,
  Button,
  Container,
  Alert,
  Collapse,
} from "react-bootstrap";
import dayjs, {Dayjs} from "dayjs";
import {TimezoneSelect} from "../../components/TimezoneSelect";
import ModalImage from "react-modal-image";
import {useDropzone} from "react-dropzone";
import {v4 as uuidv4} from "uuid";

interface Preset {
  id: number;
  name: string;
  desc: string;
  transaction_desc: string;
  user: string;
  amount: string;
  accounts: AccountElement[];
  tags: TagElement[];
}

interface AccountElement {
  id: number;
  name: string;
  desc: string;
  user: number;
  isUsed: boolean;
  fraction: number;
  amountView: string;
  amount: number;
}

interface PresetSub {
  id: number;
  account: number;
  fraction: number;
  preset: number;
}
interface TagElement {
  id: number;
  name: string;
  desc: string;
  user: number;
  isChecked: boolean;
}
interface PresetTransactionTag {
  id: number;
  preset: number;
  tag: number;
}
interface TransactionImage {
  id: string;
  image: string | File;
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
export const TransactionEdit = observer(() => {
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
  const [transactionImages, setTransactionImages] = useState<
    TransactionImage[]
  >([]);
  const {id} = useParams();
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const intervalRefPreset = useRef<number | null>(null);
  const timeoutRefPreset = useRef<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  if (auth.getToken() === "") {
    navigate("/login");
  }
  useEffect(() => {
    const FetchTransaction = async () => {
      await AuthAxios.get(`transactions?id=${id}`, auth.getToken()).then(
        async (transactionRes) => {
          const transaction = transactionRes.data[0];
          setDate(dayjs(transaction.date_time));
          setDesc(transaction.desc);
          setTimezoneOffset(transaction.timezone_offset);
          const updatedAccounts = await AuthAxios.get(
            "accounts",
            auth.getToken(),
          ).then(async (accountsRes) => {
            const accountsData: AccountElement[] = accountsRes.data;
            return await Promise.all(
              accountsData.map(async (account) => {
                const subRes = await AuthAxios.get(
                  `subtransactions?account=${account.id}&transaction=${id}`,
                  auth.getToken(),
                );
                account.fraction = 0;
                if (subRes.data.length > 0) {
                  account.amountView = parseFloat(
                    centsToString(subRes.data[0].amount),
                  ).toFixed(2);
                  account.amount = parseFloat(
                    centsToString(subRes.data[0].amount),
                  );
                  account.isUsed = true;
                } else {
                  account.amountView = "0";
                  account.amount = 0;
                  account.isUsed = false;
                }
                return account;
              }),
            );
          });
          const updatedTags = await AuthAxios.get("tags", auth.getToken()).then(
            async (tagsRes) => {
              const tagsData: TagElement[] = tagsRes.data;
              return await Promise.all(
                tagsData.map(async (tag) => {
                  const transTagRes = await AuthAxios.get(
                    `transaction_tags?tag=${tag.id}&transaction=${id}`,
                    auth.getToken(),
                  );
                  tag.isChecked = transTagRes.data.length > 0;
                  return tag;
                }),
              );
            },
          );
          const newPreset: Preset = {
            id: 0,
            name: "",
            desc: "",
            transaction_desc: "",
            user: "",
            amount: "0",
            accounts: updatedAccounts,
            tags: updatedTags,
          };
          setPresetInUse(newPreset);
          const imageRes = await AuthAxios.get(
            `transaction_image?transaction=${id}`,
            auth.getToken(),
          );
          setTransactionImages(imageRes.data);
        },
      );
    };

    const FetchPresets = async () => {
      await AuthAxios.get("presets", auth.getToken()).then(
        async (presetsRes) => {
          const PresetsData: Preset[] = await Promise.all(
            presetsRes.data.map(async (preset: Preset) => {
              let AccountsData: AccountElement[] = [];
              await AuthAxios.get(
                `preset_subtransactions?preset=${preset.id}`,
                auth.getToken(),
              ).then(async (presetSubtransactionsRes) => {
                await AuthAxios.get("accounts", auth.getToken()).then(
                  async (res) => {
                    AccountsData = await Promise.all(
                      res.data.map(async (acc: AccountElement) => {
                        await Promise.all(
                          presetSubtransactionsRes.data.map(
                            async (preSub: PresetSub) => {
                              acc.amountView = "0";
                              acc.amount = 0;
                              if (preSub.account === acc.id) {
                                acc.fraction = preSub.fraction;
                                acc.isUsed = true;
                              } else acc.isUsed = false;
                            },
                          ),
                        );
                        return acc;
                      }),
                    );
                  },
                );
              });
              let TagsData: TagElement[] = [];
              await AuthAxios.get(
                `preset_transaction_tags?preset=${preset.id}`,
                auth.getToken(),
              ).then(async (presetTransactionTags) => {
                await AuthAxios.get("tags", auth.getToken()).then(
                  async (tags) => {
                    TagsData = await Promise.all(
                      tags.data.map(async (tag: TagElement) => {
                        await Promise.all(
                          presetTransactionTags.data.map(
                            async (preTransTag: PresetTransactionTag) => {
                              tag.isChecked = tag.id === preTransTag.tag;
                            },
                          ),
                        );
                        return tag;
                      }),
                    );
                  },
                );
              });
              preset.amount = "0";
              preset.accounts = AccountsData;
              preset.tags = TagsData;
              return preset;
            }),
          );
          setPresets(PresetsData);
        },
      );
    };

    FetchTransaction();
    FetchPresets();
  }, []);
  if (id === undefined) {
    navigate("/transactions");
    return;
  }

  const handlePresetSelect = async (selectedPreset: Preset) => {
    setPresetInUse(selectedPreset);
    setDesc(selectedPreset.transaction_desc || "");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const bodyParams = new FormData();
    bodyParams.append("action", "edit");
    bodyParams.append("id", id);
    bodyParams.append("desc", desc);
    bodyParams.append("date", formatDateIso8601(date));
    bodyParams.append("preset", JSON.stringify(presetInUse));
    bodyParams.append("timezoneOffset", timezoneOffset.toString());
    transactionImages.map((image) => {
      bodyParams.append("images", image.image);
      typeof image.image == "string" && bodyParams.append("imageIds", image.id);
    });
    await AuthAxios.post("transactions", auth.getToken(), bodyParams);
    navigate("/transactions");
  };
  const handleAccountAmountMouseDown = (
    clickedAccUse: AccountElement,
    step: number,
  ) => {
    const updateAccountAmount = (
      accounts: AccountElement[],
      accountId: number,
      step: number,
    ) => {
      return accounts.map((acc) =>
        acc.id === accountId
          ? {
              ...acc,
              amountView: (parseFloat(acc.amountView) + step).toFixed(2),
              amount: acc.amount + step,
            }
          : acc,
      );
    };

    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedAccounts = updateAccountAmount(
        prevPresetInUse.accounts,
        clickedAccUse.id,
        step,
      );
      return {...prevPresetInUse, accounts: updatedAccounts};
    });

    // Prevent multiple intervals
    if (intervalRef.current !== null) return;

    // Set a timeout to start the interval
    timeoutRef.current = window.setTimeout(() => {
      intervalRef.current = window.setInterval(() => {
        setPresetInUse((prevPresetInUse) => {
          if (!prevPresetInUse) return prevPresetInUse;
          const updatedAccounts = updateAccountAmount(
            prevPresetInUse.accounts,
            clickedAccUse.id,
            step,
          );
          return {...prevPresetInUse, accounts: updatedAccounts};
        });
      }, 100);
    }, 1000);
  };
  const handlePresetAmountMouseDown = (step: number) => {
    const updateAccountAmount = (
      accounts: AccountElement[],
      amount: string,
    ) => {
      return accounts.map((acc) =>
        acc.fraction
          ? {
              ...acc,
              amountView: (parseFloat(amount) * acc.fraction).toFixed(2),
              amount: parseFloat(amount) * acc.fraction,
            }
          : acc,
      );
    };

    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const newAmount = (parseFloat(prevPresetInUse.amount) + step).toFixed(2);
      const updatedAccounts = updateAccountAmount(
        prevPresetInUse.accounts,
        newAmount,
      );
      return {
        ...prevPresetInUse,
        accounts: updatedAccounts,
        amount: newAmount,
      };
    });

    // Prevent multiple intervals
    if (intervalRefPreset.current !== null) return;

    // Set a timeout to start the interval
    timeoutRefPreset.current = window.setTimeout(() => {
      intervalRefPreset.current = window.setInterval(() => {
        setPresetInUse((prevPresetInUse) => {
          if (!prevPresetInUse) return prevPresetInUse;
          const newAmount = (parseFloat(prevPresetInUse.amount) + step).toFixed(
            2,
          );
          const updatedAccounts = updateAccountAmount(
            prevPresetInUse.accounts,
            newAmount,
          );
          return {
            ...prevPresetInUse,
            accounts: updatedAccounts,
            amount: newAmount,
          };
        });
      }, 100);
    }, 1000);
  };

  const handleAccountAmountMouseUp = () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  const handlePresetAmountMouseUp = () => {
    if (intervalRefPreset.current !== null) {
      clearInterval(intervalRefPreset.current);
      intervalRefPreset.current = null;
    }
    if (timeoutRefPreset.current !== null) {
      clearTimeout(timeoutRefPreset.current);
      timeoutRefPreset.current = null;
    }
  };

  const handleAccountAmountChange = (
    e: ChangeEvent<HTMLInputElement>,
    accMulti: AccountElement,
  ) => {
    const newAmount = e.target.value;
    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedAccounts = prevPresetInUse.accounts.map((acc) =>
        acc.id === accMulti.id
          ? {
              ...acc,
              amountView: newAmount.toString(),
              amount: parseFloat(newAmount),
            }
          : acc,
      );
      return {...prevPresetInUse, accounts: updatedAccounts};
    });
  };
  const handlePresetAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newAmount = e.target.value;
    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedAccounts = prevPresetInUse.accounts.map((acc) =>
        acc.fraction
          ? {
              ...acc,
              amountView: (parseFloat(newAmount) * acc.fraction).toFixed(2),
              amount: parseFloat(newAmount) * acc.fraction,
            }
          : acc,
      );
      return {
        ...prevPresetInUse,
        accounts: updatedAccounts,
        amount: newAmount,
      };
    });
  };

  const handleAccUseClick = useCallback((clickedAccUse: AccountElement) => {
    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedAccounts = prevPresetInUse.accounts.map((acc) =>
        acc.id === clickedAccUse.id ? {...acc, isUsed: !acc.isUsed} : acc,
      );
      return {...prevPresetInUse, accounts: updatedAccounts};
    });
  }, []);
  const handleTagClick = useCallback((clickedTag: TagElement) => {
    setPresetInUse((prevPresetInUse) => {
      if (!prevPresetInUse) return prevPresetInUse;
      const updatedTags = prevPresetInUse.tags.map((tag) =>
        tag.id === clickedTag.id ? {...tag, isChecked: !tag.isChecked} : tag,
      );
      return {...prevPresetInUse, tags: updatedTags};
    });
  }, []);
  const {getRootProps, getInputProps} = useDropzone({
    accept: {
      "image/*": [],
    },
    onDrop: (acceptedFiles) => {
      setTransactionImages((prevImg) => [
        ...prevImg,
        ...acceptedFiles.map((file) => ({id: uuidv4(), image: file})),
      ]);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    },
  });
  const handleImageRemove = (targetImage: string) => {
    setTransactionImages((image) =>
      image.filter((img) => img.id !== targetImage),
    );
  };

  const accountsList = (acc: AccountElement) => (
    <Form.Group key={acc.id} className="align-items-center">
      <Row className="mb-3">
        <Col xs={2} sm={1} className="align-content-center">
          <Form.Label className="mb-0">Name</Form.Label>
        </Col>
        <Col xs={4} sm={2} className="align-content-center">
          <Form.Text className="tmp-account-name">{acc.name}</Form.Text>
        </Col>
        {acc.isUsed ? (
          <>
            <Col xs={12} sm={1} className="align-content-center">
              <Form.Label className="tmp-account-amount-label mb-0">
                Amount
              </Form.Label>
            </Col>
            <Col xs={12} sm={4} className="tmp-account-amount-box">
              <InputGroup className="bootstrap-touchspin">
                <Button
                  variant="default"
                  className="bootstrap-touchspin-down"
                  type="button"
                  onMouseDown={() => handleAccountAmountMouseDown(acc, -1)}
                  onMouseUp={() => handleAccountAmountMouseUp()}
                  onMouseLeave={() => handleAccountAmountMouseUp()}
                >
                  -
                </Button>
                <span
                  className="input-group-addon bootstrap-touchspin-prefix"
                  style={{display: "none"}}
                ></span>
                <Form.Control
                  type="number"
                  name="accounts-0-amount"
                  value={acc.amountView}
                  step="0.1"
                  className="form-control tmp-account-amount"
                  placeholder="Amount"
                  id="id_accounts-0-amount"
                  style={{display: "block"}}
                  onChange={(e) =>
                    handleAccountAmountChange(
                      e as ChangeEvent<HTMLInputElement>,
                      acc,
                    )
                  }
                />
                <span
                  className="input-group-addon bootstrap-touchspin-postfix"
                  style={{display: "none"}}
                ></span>
                <Button
                  variant="default"
                  className="bootstrap-touchspin-up"
                  type="button"
                  onMouseDown={() => handleAccountAmountMouseDown(acc, 1)}
                  onMouseUp={() => handleAccountAmountMouseUp()}
                  onMouseLeave={() => handleAccountAmountMouseUp()}
                >
                  +
                </Button>
              </InputGroup>
            </Col>
          </>
        ) : null}
        <Col xs={4} sm={2} className="ms-auto tmp-account-buttons">
          {!acc.isUsed ? (
            <Button
              variant="default"
              className="tmp-account-enable"
              style={{width: "100%"}}
              type="button"
              onClick={() => handleAccUseClick(acc)}
            >
              Use
            </Button>
          ) : (
            <Button
              variant="default"
              className="tmp-account-disable"
              style={{width: "100%"}}
              type="button"
              onClick={() => handleAccUseClick(acc)}
            >
              Don't use
            </Button>
          )}
        </Col>
      </Row>
    </Form.Group>
  );

  const renderAccounts = useMemo(() => {
    return <>{presetInUse?.accounts.map((acc) => accountsList(acc))}</>;
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
        <h1>Update transaction</h1>
        {presets.length > 0 ? (
          <Card id="tmp-presets">
            <Card.Body>
              <Button
                variant="default"
                aria-controls="presets-collapse"
                aria-expanded={openPresets}
                onClick={() => setOpenPresets(!openPresets)}
              >
                <b>Import preset</b>
              </Button>
              <Collapse in={openPresets}>
                <div id="presets-collapse">
                  <div style={{margin: "1em"}}></div>
                  <Form.Group>
                    <Form.Label>Select preset</Form.Label>
                    <br></br>
                    {presets.map((preset, id) =>
                      presetInUse?.id === preset.id ? (
                        <Button
                          variant="info"
                          className="tmp-preset-button"
                          style={{marginBottom: "0.2em"}}
                          data-id={`${preset.id}`}
                          key={id}
                        >
                          {preset.name}
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          className="tmp-preset-button"
                          onClick={() => handlePresetSelect(preset)}
                          style={{marginBottom: "0.2em"}}
                          data-id={`${preset.id}`}
                          key={id}
                        >
                          {preset.name}
                        </Button>
                      ),
                    )}
                  </Form.Group>
                  {presetInUse && presetInUse.id !== 0 ? (
                    <Form.Group className="tmp-preset-amount-line">
                      <Row>
                        <Col xs={12} sm={2} className="align-content-center">
                          <Form.Label className="mb-0">Amount</Form.Label>
                        </Col>
                        <Col xs={12} sm={10} className="align-content-center">
                          <InputGroup className="bootstrap-touchspin">
                            <Button
                              variant="default"
                              className="bootstrap-touchspin-down"
                              type="button"
                              onMouseDown={() =>
                                handlePresetAmountMouseDown(-1)
                              }
                              onMouseUp={() => handlePresetAmountMouseUp()}
                              onMouseLeave={() => handlePresetAmountMouseUp()}
                            >
                              -
                            </Button>
                            <span
                              className="input-group-addon bootstrap-touchspin-prefix"
                              style={{display: "none"}}
                            ></span>
                            <Form.Control
                              className="tmp-preset-amount"
                              placeholder="Amount"
                              step="0.01"
                              type="number"
                              value={presetInUse.amount}
                              onChange={(e) =>
                                handlePresetAmountChange(
                                  e as ChangeEvent<HTMLInputElement>,
                                )
                              }
                            />
                            <span
                              className="input-group-addon bootstrap-touchspin-postfix"
                              style={{display: "none"}}
                            ></span>
                            <Button
                              variant="default"
                              className="bootstrap-touchspin-up"
                              type="button"
                              onMouseDown={() => handlePresetAmountMouseDown(1)}
                              onMouseUp={() => handlePresetAmountMouseUp()}
                              onMouseLeave={() => handlePresetAmountMouseUp()}
                            >
                              +
                            </Button>
                          </InputGroup>
                        </Col>
                      </Row>
                    </Form.Group>
                  ) : null}
                </div>
              </Collapse>
            </Card.Body>
          </Card>
        ) : (
          <Alert variant="info" transition={false}>
            No presets have been created
          </Alert>
        )}
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
        {presetInUse.tags.length > 0 ? (
          <div id="tmp-tags">{renderTags}</div>
        ) : (
          <Alert variant="info" transition={false}>
            No tags have been created
          </Alert>
        )}
        <h4 className="pt-2">Images</h4>
        <div
          {...getRootProps({className: "dropzone"})}
          style={{cursor: "pointer"}}
        >
          <input {...getInputProps()} />
          <p className="image-dropbox">
            Drag and drop images here, or click to select images
          </p>
        </div>
        {transactionImages.length > 0 ? (
          <Container className="pb-3" fluid>
            <Row>
              <Col style={{overflowX: "auto"}}>
                <div className="images-container">
                  {transactionImages.map((image: TransactionImage) => (
                    <Col key={image.id} className="image-box" xs="auto">
                      <Button
                        onClick={() => handleImageRemove(image.id)}
                        variant={""}
                        className="image-remove-button"
                      >
                        &#10006;
                      </Button>
                      <center>
                        <ModalImage
                          small={
                            typeof image.image != "string"
                              ? URL.createObjectURL(image.image)
                              : image.image
                          }
                          large={
                            typeof image.image != "string"
                              ? URL.createObjectURL(image.image)
                              : image.image
                          }
                        />
                      </center>
                    </Col>
                  ))}
                </div>
              </Col>
            </Row>
          </Container>
        ) : (
          <p>No images attached to this transaction</p>
        )}
        <SubmitButton text="Save" />
      </Form>
    </Container>
  );
});
