import { observer } from "mobx-react-lite";
import {Navbar} from "../Navbar.tsx";
import { useToken } from "../Auth/AuthContext.tsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {SubmitButton} from "../SubmitButton.tsx";


interface Preset {
    id: number;
    name: string;
    desc: string;
    transactionDesc: string;
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
export const TransactionCreate = observer(function TransactionCreate() {
    const Auth = useToken();
    const navigate = useNavigate();
    axios.defaults.headers.common = { Authorization: `Token ${Auth.getToken()}` };
    const [presets, setPresets] = useState<Preset[]>([]);
    const [presetInUse, setPresetInUse] = useState<Preset>();
    const [desc, setDesc] = useState("");
    const [date, setDate] = useState<Date>(new Date(Date.now()));
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    const intervalRef = useRef<number | null>(null);
    const timeoutRef = useRef<number | null>(null);
    const intervalRefPreset = useRef<number | null>(null);
    const timeoutRefPreset = useRef<number | null>(null);

    useEffect(() => {
        const FetchAccounts = async () => {
            await axios.get("http://localhost:8000/api/accounts").then(async (res) => {
                const AccountsData: AccountElement[] = await Promise.all(res.data.map(async (acc: AccountElement) => {
                    acc.amount = 0;
                    acc.isUsed = false;
                    acc.fraction = 0;
                    return acc;
                }));
                const Tags: TagElement[] = await axios.get("http://localhost:8000/api/tags").then(async (tagsRes) => {
                    const TagsData: TagElement[] = await Promise.all(tagsRes.data.map(async (tag: TagElement) => {
                        tag.isChecked = false;
                        return tag;
                    }));
                    return TagsData;
                });
                const newPreset: Preset = {
                    id: 0,
                    name: "",
                    desc: "",
                    transactionDesc: "",
                    user: "",
                    amount: "0",
                    accounts: AccountsData,
                    tags: Tags
                };
                setPresetInUse(newPreset);
            });
        };
        const FetchPresets = async () => {
            await axios.get("http://localhost:8000/api/presets").then(async (presetsRes) => {
                const PresetsData: Preset[] = await Promise.all(presetsRes.data.map(async (preset: Preset) => {
                    let AccountsData: AccountElement[] = [];
                    preset.transactionDesc = preset.transaction_desc;
                    await axios.get(`http://localhost:8000/api/preset_subtransactions?preset=${preset.id}`).then(async (presetSubsRes) => {
                        await axios.get("http://localhost:8000/api/accounts").then(async (res) => {
                            AccountsData = await Promise.all(res.data.map(async (acc: AccountElement) => {
                                await Promise.all(presetSubsRes.data.map(async (presetSub: PresetSub) => {
                                    acc.amount=0;
                                    if (presetSub.account === acc.id) {
                                        acc.fraction = presetSub.fraction;
                                        acc.isUsed = true;
                                    } else acc.isUsed = false;
                                }));
                                return acc;
                            }));
                        });
                    });
                    let TagsData: TagElement[] = [];
                    await axios.get(`http://localhost:8000/api/preset_transaction_tags?preset=${preset.id}`).then(async (presetTransactionTags) => {
                        await axios.get("http://localhost:8000/api/tags").then(async (tags) => {
                            TagsData = await Promise.all((tags.data.map(async (tag: TagElement) => {
                                await Promise.all(presetTransactionTags.data.map(async (presetTransactionTag:PresetTransactionTag) => {
                                    tag.isChecked = tag.id === presetTransactionTag.tag;
                                }));
                                return tag;
                            })));
                        });
                    });
                    preset.amount = "0";
                    preset.accounts = AccountsData;
                    preset.tags = TagsData;
                    return preset;
                }));
                setPresets(PresetsData);
            });
        };

        FetchAccounts();
        FetchPresets();
    }, []);

    const handlePresetSelect = async (selectedPreset: Preset) => {
        setPresetInUse(selectedPreset);
        setDesc(selectedPreset.transactionDesc || "");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const bodyParams = {
            action: "create",
            desc: desc,
            date: date,
            preset: presetInUse
        };
        await axios.post("http://localhost:8000/api/transactions", bodyParams);
        navigate("/transactions");
    };
    const handleAccountAmountMouseDown = (clickedAccUse: AccountElement, step: number) => {
    const updateAccountAmount = (accounts: AccountElement[], accountId: number, step: number) => {
        return accounts.map(acc =>
            acc.id === accountId
                ? { ...acc, amount: (acc.amount + step) }
                : acc
        );
    };

    setPresetInUse(prevPresetInUse => {
        if (!prevPresetInUse) return prevPresetInUse;
        const updatedAccounts = updateAccountAmount(prevPresetInUse.accounts, clickedAccUse.id, step);
        return { ...prevPresetInUse, accounts: updatedAccounts };
    });

    // Prevent multiple intervals
    if (intervalRef.current !== null) return;

    // Set a timeout to start the interval
    timeoutRef.current = window.setTimeout(() => {
        intervalRef.current = window.setInterval(() => {
            setPresetInUse(prevPresetInUse => {
                if (!prevPresetInUse) return prevPresetInUse;
                const updatedAccounts = updateAccountAmount(prevPresetInUse.accounts, clickedAccUse.id, step);
                return { ...prevPresetInUse, accounts: updatedAccounts };
            });
        }, 100);
    }, 1000);
};
    const handlePresetAmountMouseDown = (step: number) => {
    const updateAccountAmount = (accounts: AccountElement[], amount: string) => {
        return accounts.map(acc =>
            acc.fraction
                ? { ...acc, amount: (parseFloat(amount)*acc.fraction) }
                : acc
        );
    };

    setPresetInUse(prevPresetInUse => {
        if (!prevPresetInUse) return prevPresetInUse;
        const newAmount = (parseFloat(prevPresetInUse.amount) + step).toFixed(2);
        const updatedAccounts = updateAccountAmount(prevPresetInUse.accounts, newAmount);
        return { ...prevPresetInUse, accounts: updatedAccounts, amount: newAmount };
    });

    // Prevent multiple intervals
    if (intervalRefPreset.current !== null) return;

    // Set a timeout to start the interval
    timeoutRefPreset.current = window.setTimeout(() => {
        intervalRefPreset.current = window.setInterval(() => {
            setPresetInUse(prevPresetInUse => {
                if (!prevPresetInUse) return prevPresetInUse;
                const newAmount = (parseFloat(prevPresetInUse.amount) + step).toFixed(2)
                const updatedAccounts = updateAccountAmount(prevPresetInUse.accounts, newAmount);
                return { ...prevPresetInUse, accounts: updatedAccounts, amount: newAmount };
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

const handleAccountAmountChange = (e, accMulti: AccountElement) => {
    const newAmount = parseFloat(e.target.value);
    setPresetInUse(prevPresetInUse => {
        if (!prevPresetInUse) return prevPresetInUse;
        const updatedAccounts = prevPresetInUse.accounts.map(acc =>
            acc.id === accMulti.id ? { ...acc, amount: newAmount } : acc
        );
        return { ...prevPresetInUse, accounts: updatedAccounts };
    });
};
const handlePresetAmountChange = (e) => {
    const newAmount = parseFloat(e.target.value).toFixed(2);
    setPresetInUse(prevPresetInUse => {
        if (!prevPresetInUse) return prevPresetInUse;
        const updatedAccounts = prevPresetInUse.accounts.map(acc =>
            acc.fraction ? { ...acc, amount: (parseFloat(newAmount)*acc.fraction) } : acc
        );
        return { ...prevPresetInUse, accounts: updatedAccounts, amount: newAmount };
    });
};

    const handleAccUseClick = useCallback((clickedAccUse: AccountElement) => {
        setPresetInUse(prevPresetInUse => {
            if (!prevPresetInUse) return prevPresetInUse;
            const updatedAccounts = prevPresetInUse.accounts.map(acc =>
                acc.id === clickedAccUse.id ? { ...acc, isUsed: !acc.isUsed } : acc
            );
            return { ...prevPresetInUse, accounts: updatedAccounts };
        });
    }, []);
    const handleTagClick = useCallback((clickedTag: TagElement) => {
        setPresetInUse(prevPresetInUse => {
            if (!prevPresetInUse) return prevPresetInUse;
            const updatedTags = prevPresetInUse.tags.map(tag =>
                tag.id === clickedTag.id ? { ...tag, isChecked: !tag.isChecked } : tag
            );
            return { ...prevPresetInUse, tags: updatedTags };
        });
    }, []);

    const accountsList = (acc: AccountElement) => (
        <div className="form-group" key={acc.id}>
            <div className="col-xs-4 col-sm-2 pull-right tmp-account-buttons">
                {!acc.isUsed ?
                    <button className="tmp-account-enable btn btn-default" style={{ width: "100%" }} role="button"
                        type="button" onClick={() => handleAccUseClick(acc)}>
                        Use
                    </button>
                    :
                    <button className="tmp-account-disable btn btn-default" style={{ width: "100%" }}
                        role="button"
                        type="button" onClick={() => handleAccUseClick(acc)}>
                        Don't use
                    </button>
                }
            </div>
            <label className="col-xs-2 col-sm-1 control-label">Name</label>
            <div className="col-xs-4 col-sm-2 form-control-static tmp-account-name">{acc.name}</div>
            {acc.isUsed ?
                <>
                    <label className="col-xs-12 col-sm-1 control-label tmp-account-amount-label">Amount</label>
                    <div className="col-xs-12 col-sm-4 tmp-account-amount-box">
                        <div className="input-group bootstrap-touchspin">
                            <span className="input-group-btn">
                                <button className="btn btn-default bootstrap-touchspin-down" type="button"
                                        onMouseDown={() => handleAccountAmountMouseDown(acc, -1)}
                                        onMouseUp={() => handleAccountAmountMouseUp()}
                                        onMouseLeave={() => handleAccountAmountMouseUp()}>-</button>
                            </span>
                            <span className="input-group-addon bootstrap-touchspin-prefix" style={{ display: "none" }}></span>
                            <input type="number" name="accounts-0-amount"
                                value={acc.amount || ""}
                                step="0.1"
                                className="form-control tmp-account-amount"
                                placeholder="Amount"
                                id="id_accounts-0-amount"
                                style={{ display: "block" }}
                                onChange={(e) => handleAccountAmountChange(e, acc)}/>
                            <span className="input-group-addon bootstrap-touchspin-postfix" style={{ display: "none" }}></span>
                            <span className="input-group-btn">
                                <button className="btn btn-default bootstrap-touchspin-up" type="button"
                                        onMouseDown={() => handleAccountAmountMouseDown(acc, 1)}
                                        onMouseUp={() => handleAccountAmountMouseUp()}
                                        onMouseLeave={() => handleAccountAmountMouseUp()}>+</button>
                            </span>
                        </div>
                    </div>
                </>
                :
                null
            }
        </div>
    );

    const renderAccounts = useMemo(() => {
        return (
            <>
                {presetInUse?.accounts.map((acc) => (
                    accountsList(acc)
                ))}
            </>
        );
    }, [presetInUse]);
    const renderTags = useMemo(() => {
        return presetInUse?.tags.map((tag, id) => (
            <div key={id} className={tag.isChecked ? "tmp-tag-button btn btn-info" : "tmp-tag-button btn btn-default"} role="button" onClick={() => handleTagClick(tag)}>
                <label htmlFor={`tag-${tag.id}`}>{tag.name}</label>
            </div>
        ));
    }, [presetInUse?.tags, handleTagClick]);

    return (
        <div className="container">
            <Navbar />
            <form action="" method="post" onSubmit={handleSubmit}>
                <h1>New transaction</h1>
                <div id="tmp-presets" className="panel panel-default">
                    <div className="panel-body">
                        <a className="btn btn-default" data-toggle="collapse" data-target="#view-presets"><b>Import
                            preset</b></a>
                        <div className="collapse" id="view-presets">
                            <div style={{margin: "1em"}}></div>
                            <div className="form-group">
                                <p><b>Select preset</b></p>
                                {presets.map((preset, id) => (
                                    presetInUse?.id === preset.id ?
                                        <div className="tmp-preset-button btn btn-info" role="button"
                                             style={{marginBottom: "0.2em"}} data-id={`${preset.id}`} key={id}>
                                            {preset.name}
                                        </div>
                                        :
                                        <div className="tmp-preset-button btn btn-default" role="button"
                                             onClick={() => handlePresetSelect(preset)}
                                             style={{marginBottom: "0.2em"}} data-id={`${preset.id}`} key={id}>
                                            {preset.name}
                                        </div>
                                ))}
                            </div>
                            {presetInUse && presetInUse.id !== 0 ?
                                <div className="form-group tmp-preset-amount-line" style={{display: "block"}}>
                                    <label className="col-xs-12 col-sm-2 control-label">Amount</label>
                                    <div className="col-xs-12 col-sm-10">
                                        <div className="input-group bootstrap-touchspin">
                                            <span className="input-group-btn">
                                                <button className="btn btn-default bootstrap-touchspin-down"
                                                        type="button"
                                                        onMouseDown={() => handlePresetAmountMouseDown(-1)}
                                                        onMouseUp={() => handlePresetAmountMouseUp()}
                                                        onMouseLeave={() => handlePresetAmountMouseUp()}>-</button>
                                            </span>
                                            <span className="input-group-addon bootstrap-touchspin-prefix"
                                                  style={{display: "none"}}></span>
                                            <input className="form-control tmp-preset-amount" placeholder="Amount"
                                                   step="0.01" type="number" value={presetInUse.amount}
                                                   onChange={(e) => handlePresetAmountChange(e)}/>
                                            <span className="input-group-addon bootstrap-touchspin-postfix"
                                                  style={{display: "none"}}></span>
                                            <span className="input-group-btn">
                                                <button className="btn btn-default bootstrap-touchspin-up" type="button"
                                                        onMouseDown={() => handlePresetAmountMouseDown(1)}
                                                        onMouseUp={() => handlePresetAmountMouseUp()}
                                                        onMouseLeave={() => handlePresetAmountMouseUp()}
                                                >+</button>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                :
                                null
                            }
                        </div>
                    </div>
                </div>
                <div className="form-horizontal">
                    <div className="form-group">
                        <label className="col-xs-4 col-sm-2 control-label" htmlFor="id_description">Description</label>
                        <div className="col-xs-8 col-sm-10">
                            <input type="text" className={"form-control"} name="description" key="id_description"
                                   value={desc}
                                   onChange={(e) => setDesc(e.target.value)}/>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="col-xs-4 col-sm-2 control-label" htmlFor="id_Date">Date</label>
                        <div className="col-xs-8 col-sm-10">
                            <input type="datetime-local" className={"form-control"} name="date"
                                   value={date.toISOString().slice(0, 16)}
                                   key="id_date"
                                   onChange={(e) => setDate(new Date(e.target.value))}/>
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
                <SubmitButton text="Save" />
            </form>
        </div>
    );
});
