import {observer} from "mobx-react-lite";
import {SubmitButton} from "../SubmitButton";
import {NavbarComponent} from "../Navbar";
import {useToken} from "../Auth/AuthContext";
import {useNavigate} from "react-router-dom";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {AuthAxios} from "../../utils/Network";
import {Col, Form, InputGroup, Row, Button, Container, Alert} from "react-bootstrap";



interface AccountElement {
    id: number;
    name: string;
    desc: string;
    user: number;
    isUsed: boolean;
    fraction: string;
}
interface TagElement {
    id: number;
    name: string;
    desc: string;
    user: number;
    isChecked: boolean;
}
export const PresetCreate = observer(function PresetCreate() {
    const auth = useToken();
    const navigate = useNavigate();
    const [tags, setTags] = useState<TagElement[]>([]);
    const [accounts, setAccounts] = useState<AccountElement[]>([]);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [transactionDesc, setTransactionDesc] = useState('');
    const intervalRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    if (auth.getToken() === '') {
        navigate('/login');
    }
    const handleTagClick = useCallback((clickedTag: TagElement) => {
        setTags(prevTags =>
            prevTags.map(tag =>
                tag.id === clickedTag.id ? { ...tag, isChecked: !tag.isChecked } : tag
            )
        );
    }, []);
     const handleMultiplierMouseDown = (clickedAccUse: AccountElement, step: number) => {
         setAccounts(prevAccounts =>
            prevAccounts.map(acc =>
                acc.id === clickedAccUse.id ? { ...acc, fraction: (parseFloat(acc.fraction)+step).toFixed(2) } : acc
            )
         )
        if (intervalRef.current !== null) return; // Prevent multiple intervals
         timeoutRef.current = window.setTimeout(() => {
             intervalRef.current = window.setInterval(() => {
            setAccounts(prevAccounts =>
            prevAccounts.map(acc =>
                acc.id === clickedAccUse.id ? { ...acc, fraction: (parseFloat(acc.fraction)+step).toFixed(2) } : acc
            )
        );
        }, 100);
         }, 1000);

    };

    const handleMultiplierMouseUp = () => {
        if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    };
    const handleMultiplierChange = ((e, accMulti:AccountElement) => {
        setAccounts(prevAccounts =>
            prevAccounts.map(acc =>
                acc.id === accMulti.id ? { ...acc, fraction: acc.fraction=parseFloat(e.target.value).toString() } : acc
            )
        );
    })
    const handleAccUseClick = useCallback((clickedAccUse: AccountElement) => {
        setAccounts(prevAccounts =>
            prevAccounts.map(acc =>
                acc.id === clickedAccUse.id ? { ...acc, isUsed: !acc.isUsed } : acc
            )
        );
    }, []);

    const renderTags = useMemo(() => {
        return tags.map((tag, id) => (
            <Button variant={tag.isChecked ? "info" : "default"} key={id} className="tmp-tag-button"
                    role="button" onClick={() => handleTagClick(tag)}>
                <Form.Label htmlFor={`tag-${tag.id}`}>{tag.name}</Form.Label>
            </Button>
        ));
    }, [tags, handleTagClick]);
    const renderAccounts = useMemo(() => {
        return (
            accounts.map((acc) => (
                <Form.Group key={acc.id} className="align-items-center">
                    <Row className="mb-3">
                        <Col xs={2} sm={1} className="align-content-center">
                            <Form.Label className="mb-0">Name</Form.Label>
                        </Col>
                        <Col xs={4} sm={2} className="align-content-center">
                            <Form.Text className="tmp-account-name">{acc.name}</Form.Text>
                        </Col>
                        {acc.isUsed ?
                            <>
                                <Col xs={12} sm={1} className="align-content-center">
                                    <Form.Label className="tmp-account-amount-label mb-0">
                                        Multiplier
                                    </Form.Label>
                                </Col>
                                <Col xs={12} sm={4} className="tmp-account-amount-box">
                                    <InputGroup className="bootstrap-touchspin">
                                        <Button variant="default"
                                                className="bootstrap-touchspin-down" type="button"
                                                onMouseDown={() => handleMultiplierMouseDown(acc, -0.1)}
                                                onMouseUp={() => handleMultiplierMouseUp()}
                                                onMouseLeave={() => handleMultiplierMouseUp()}>
                                            -
                                        </Button>
                                        <span className="input-group-addon bootstrap-touchspin-prefix"
                                              style={{ display: "none" }}></span>
                                        <Form.Control type="number" name="accounts-0-amount"
                                                      value={acc.fraction ? (acc.fraction) : ""}
                                                      step="0.1"
                                                      className="form-control tmp-account-amount"
                                                      placeholder="Amount"
                                                      id="id_accounts-0-amount"
                                                      style={{ display: "block" }}
                                                      onChange={(e) => handleMultiplierChange(e, acc)}/>
                                        <span className="input-group-addon bootstrap-touchspin-postfix"
                                              style={{ display: "none" }}></span>
                                        <Button variant="default" className="bootstrap-touchspin-up"
                                                type="button"
                                                onMouseDown={() => handleMultiplierMouseDown(acc, 0.1)}
                                                onMouseUp={() => handleMultiplierMouseUp()}
                                                onMouseLeave={() => handleMultiplierMouseUp()}>+</Button>
                                    </InputGroup>
                                </Col>
                            </>
                            :
                            null
                        }
                        <Col xs={4} sm={2} className="ms-auto tmp-account-buttons">
                            {!acc.isUsed ?
                                <Button variant="default" className="tmp-account-enable" style={{ width: "100%" }}
                                        type="button" onClick={() => handleAccUseClick(acc)}>
                                    Use
                                </Button>
                                :
                                <Button variant="default" className="tmp-account-disable" style={{ width: "100%" }}
                                        type="button" onClick={() => handleAccUseClick(acc)}>
                                    Don't use
                                </Button>
                            }
                        </Col>
                    </Row>
                </Form.Group>
            ))

        )
    }, [accounts])
    const handleSubmit = async (e) => {
        e.preventDefault();
        const bodyParams = {
            'action': "create",
            'name': name,
            'desc': desc,
            'transDesc': transactionDesc,
            'tags': tags,
            'accounts': accounts
        };
        await AuthAxios.post("presets", auth.getToken(), bodyParams);
        navigate("/presets");
    };
    useEffect(() => {
        const FetchTags = async () => {
            const TagsRes = await AuthAxios.get("tags", auth.getToken());
            const Tags: TagElement[] = TagsRes.data;
            Tags.map((tag) => {
                tag.isChecked = false;
            });
            setTags(Tags);
        };
        const FetchAccounts = async () => {
            const AccountsRes = await AuthAxios.get("accounts", auth.getToken());
            const Accounts: AccountElement[] = AccountsRes.data;
            Accounts.map((acc) => {
                acc.isUsed = false;
                acc.fraction = '0'
            });
            setAccounts(Accounts);
        };
        FetchTags();
        FetchAccounts();
    }, []);

    return (
        <Container>
            <NavbarComponent/>
            <Form onSubmit={handleSubmit}>
                <h1>New preset</h1>
                <Form.Group>
                    <Row className="mb-3">
                        <Col xs={4} sm={2} className="text-end">
                            <Form.Label htmlFor="id_name">Name</Form.Label>
                        </Col>
                        <Col xs={8} sm={10}>
                            <Form.Control type="text" name="name" key="id_name" required={true}
                                          onChange={(e) => setName(e.target.value)}/>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col xs={4} sm={2} className="text-end">
                            <Form.Label htmlFor="id_description">Description</Form.Label>
                        </Col>
                        <Col xs={8} sm={10}>
                            <Form.Control type="text" name="description" key="id_description"
                                          onChange={(e) => setDesc(e.target.value)}/>
                        </Col>
                    </Row>
                </Form.Group>
                <Form.Group>
                    <h3>Transaction template</h3>
                    <Row className="mb-3">
                        <Col xs={4} sm={2} className="text-end">
                            <Form.Label htmlFor="id_transaction_desc">Description</Form.Label>
                        </Col>
                        <Col xs={8} sm={10}>
                            <Form.Control type="text" name="transaction_desc" key="id_transaction_desc"
                                          onChange={(e) => setTransactionDesc(e.target.value)}/>
                        </Col>
                    </Row>
                </Form.Group>
                <h4>Accounts</h4>
                {accounts.length > 0 ?
                    <div id="tmp-accounts">
                        {renderAccounts}
                    </div>
                    :
                    <Alert variant="info" transition={false} role="alert">
                        No accounts have been created
                    </Alert>
                }
                <h4>Tags</h4>
                {tags.length > 0 ?
                    <div id="tmp-tags">
                        {renderTags}
                    </div>
                    :
                    <Alert variant="info" transition={false} role="alert">
                        No tags have been created
                    </Alert>
                }
                <SubmitButton text={"Save"}/>
            </Form>
        </Container>
    )
})