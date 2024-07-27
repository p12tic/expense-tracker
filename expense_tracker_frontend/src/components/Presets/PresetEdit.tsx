import {observer} from "mobx-react-lite";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import axios from "axios";
import {useToken} from "../Auth/AuthContext.tsx";
import {useNavigate, useParams} from "react-router-dom";
import {Navbar} from "../Navbar.tsx";
import {SubmitButton} from "../SubmitButton.tsx";


interface Preset {
    id: number;
    name: string;
    desc: string;
    transactionDesc: string;
    user: string;
}
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

export const PresetEdit = observer(function PresetEdit() {
    const navigate = useNavigate();
    const intervalRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const [tags, setTags] = useState<TagElement[]>([]);
    const [accounts, setAccounts] = useState<AccountElement[]>([]);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [transDesc, setTransDesc] = useState('');
    const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const {id} = useParams();

    useEffect(() => {
        const FetchPreset = async () => {
            const presetRes = await axios.get(`http://localhost:8000/api/presets?id=${id}`);
            const presetData: Preset = presetRes.data[0];
            setName(presetData.name);
            setDesc(presetData.desc);
            setTransDesc(presetData.transaction_desc);
        };
        const FetchTags = async () => {
            const TagsRes = await axios.get("http://localhost:8000/api/tags");
            const Tags: TagElement[] = TagsRes.data;
            await Promise.all(Tags.map(async (tag) => {
                await axios.get(`http://localhost:8000/api/preset_transaction_tags?tag=${tag.id}&preset=${id}`).then((res) => {
                    tag.isChecked = res.data.length > 0;
                });
            }));

            setTags(Tags);
        };
        const FetchAccounts = async () => {
            const AccountsRes = await axios.get("http://localhost:8000/api/accounts");
            const Accounts: AccountElement[] = AccountsRes.data;
            await Promise.all(Accounts.map(async (acc) => {
                await axios.get(`http://localhost:8000/api/preset_subtransactions?account=${acc.id}&preset=${id}`).then((res) => {
                    if(res.data.length > 0) {
                        acc.isUsed = true;
                        acc.fraction = res.data[0].fraction;
                    } else {
                        acc.isUsed = false;
                        acc.fraction = "0";
                    }
                });
            }));
            setAccounts(Accounts);
        }
        FetchPreset();
        FetchTags();
        FetchAccounts();
    }, []);
    const handleTagClick = useCallback((clickedTag: TagElement) => {
        setTags(prevTags =>
            prevTags.map(tag =>
                tag.id === clickedTag.id ? { ...tag, isChecked: !tag.isChecked } : tag
            )
        );
    }, []);
    const handleSubmit = async (e) => {
        e.preventDefault();
        const bodyParams = {
            'id': id,
            'action': "edit",
            'name': name,
            'desc': desc,
            'transDesc': transDesc ? transDesc : "",
            'tags': tags,
            'accounts': accounts
        };
        await axios.post("http://localhost:8000/api/presets", bodyParams);
        navigate(`/presets/${id}`);
    }
     const handleMultiplierMouseDown = (clickedAccUse: AccountElement, step:number) => {
         setAccounts(prevAccounts =>
            prevAccounts.map(acc =>
                acc.id === clickedAccUse.id ? { ...acc, fraction: (parseFloat(acc.fraction)+step).toFixed(2) } : acc
            )
         );
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
    const handleMultiplierChange = ((e, accMulti: AccountElement) => {
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
            <div key={id} className={tag.isChecked ? "tmp-tag-button btn btn-info" : "tmp-tag-button btn btn-default"} role="button" onClick={() => handleTagClick(tag)}>
                <label htmlFor={`tag-${tag.id}`}>{tag.name}</label>
            </div>
        ));
    }, [tags, handleTagClick]);
    const renderAccounts = useMemo(() => {
        return (
            accounts.map((acc) => (
                <div className="form-group">
                    <div className="col-xs-4 col-sm-2 pull-right tmp-account-buttons">
                        {!acc.isUsed ?
                            <button className="tmp-account-enable btn btn-default" style={{width: "100%"}} role="button"
                                    type="button"
                                    onClick={() => handleAccUseClick(acc)}>
                                Use
                            </button>
                            :
                            <button className="tmp-account-disable btn btn-default" style={{width: "100%"}}
                                    role="button"
                                    type="button"
                                    onClick={() => handleAccUseClick(acc)}>
                                Don't use
                            </button>
                        }
                    </div>
                    <label className="col-xs-2 col-sm-1 control-label">Name</label>
                    <div className="col-xs-4 col-sm-2 form-control-static tmp-account-name">{acc.name}</div>
                    {acc.isUsed ?
                        <>
                            <label className="col-xs-12 col-sm-1 control-label tmp-account-amount-label">Multiplier</label>
                            <div className="col-xs-12 col-sm-4 tmp-account-amount-box">
                                <div className="input-group bootstrap-touchspin">
                                    <span className="input-group-btn">
                                        <button
                                            className="btn btn-default bootstrap-touchspin-down"
                                            type="button" onMouseDown={() => handleMultiplierMouseDown(acc, -0.1)}
                                            onMouseUp={() => handleMultiplierMouseUp()}
                                            onMouseLeave={() => handleMultiplierMouseUp()}>-</button>
                                    </span>
                                    <span
                                        className="input-group-addon bootstrap-touchspin-prefix"
                                        style={{display: "none"}}></span>
                                    <input type="number" name="accounts-0-amount"
                                            value={acc.fraction ? (acc.fraction) : ""}
                                            step="0.1"
                                            className="form-control tmp-account-amount"
                                            placeholder="Multiplier"
                                            onChange={(e) => handleMultiplierChange(e, acc)}
                                            id="id_accounts-0-amount"
                                            style={{display: "block"}}/>
                                    <span
                                        className="input-group-addon bootstrap-touchspin-postfix"
                                        style={{display: "none"}}></span>
                                    <span
                                        className="input-group-btn">
                                        <button
                                            className="btn btn-default bootstrap-touchspin-up"
                                            type="button"
                                            onMouseDown={() => handleMultiplierMouseDown(acc, 0.1)}
                                            onMouseUp={() => handleMultiplierMouseUp()}
                                            onMouseLeave={() => handleMultiplierMouseUp()}
                                            >+</button>
                                    </span>
                                </div>
                            </div>
                        </>
                        :
                        <></>
                    }
                </div>
            ))
        )
    }, [accounts])

    return (
        <div className="container">
            <Navbar />
            <form action="" method="post" onSubmit={handleSubmit}>
                <h1>Update preset</h1>
                <div className="form-horizontal">
                    <div className="form-group">
                        <label className="col-xs-4 col-sm-2 control-label"
                               htmlFor="id_name">Name</label>
                        <div className="col-xs-8 col-sm-10">
                            <input type="text" className={"form-control"} name="name" key="id_name" value={name}
                                   onChange={(e) => setName(e.target.value)}/>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="col-xs-4 col-sm-2 control-label"
                               htmlFor="id_description">Description</label>
                        <div className="col-xs-8 col-sm-10">
                            <input type="text" className={"form-control"} name="description" key="id_description"
                                   value={desc}
                                   onChange={(e) => setDesc(e.target.value)}/>
                        </div>
                    </div>
                </div>
                <div className="form-horizontal">
                    <h3>Transaction template</h3>
                    <div className="form-group">
                        <label className="col-xs-4 col-sm-2 control-label"
                               htmlFor="id_transaction_desc">Description</label>
                        <div className="col-xs-8 col-sm-10">
                            <input type="text" className={"form-control"} name="transaction_desc"
                                   key="id_transaction_desc" value={transDesc}
                                   onChange={(e) => setTransDesc(e.target.value)}/>
                        </div>
                    </div>
                </div>
                <div className="form-horizontal">
                    <h4>Accounts</h4>
                    <div id="tmp-accounts">
                        {renderAccounts}
                    </div>
                </div>
                <div className="form-horizontal">
                    <h4>Tags</h4>
                    <div id="tmp-tags">
                        {renderTags}
                    </div>
                </div>
                <SubmitButton text="save" />
            </form>
        </div>
    )
})