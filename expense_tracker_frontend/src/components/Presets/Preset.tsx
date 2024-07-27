import {observer} from "mobx-react-lite";
import {TableButton} from "../TableButton.tsx";
import React, {useEffect, useState} from "react";
import {StaticField} from "../StaticField.tsx";
import {Navbar} from "../Navbar.tsx";
import {useToken} from "../Auth/AuthContext.tsx";
import axios from "axios";
import {Link, useParams} from "react-router-dom";

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

export const Preset = observer(function Preset() {

    const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<Preset>();
    const {id} = useParams();
    useEffect(() => {
        const fetchPreset = async () => {
            const presetRes = await axios.get(`http://localhost:8000/api/presets?id=${id}`);
            const preset: Preset = presetRes.data[0];
            const presetSubsRes = await axios.get(`http://localhost:8000/api/preset_subtransactions?preset=${id}`);
            const presetSubs: PresetSub[] = presetSubsRes.data;
            await Promise.all(presetSubs.map(async (presetSub) => {
                await axios.get(`http://localhost:8000/api/accounts?id=${presetSub.account}`).then((res) => {
                    const acc = res.data[0];
                    presetSub.accountName = acc.name;
                });
            }));
            const presetTransTagsRes = await axios.get(`http://localhost:8000/api/preset_transaction_tags?preset=${id}`);
            const presetTransTags: PresetTransactionTag[] = presetTransTagsRes.data;
            await Promise.all(presetTransTags.map(async (presetTransactionTag) => {
                await axios.get(`http://localhost:8000/api/tags?id=${presetTransactionTag.tag}`).then((res) => {
                    const tag = res.data[0];
                    presetTransactionTag.tagName = tag.name;
                });
            }));
            preset.presetTransTags = presetTransTags;
            preset.presetSubs = presetSubs;
            setState(preset);
        }
        fetchPreset();
    }, []);

    return (
        <div className="container">
            <Navbar />
            <h1>
                Preset "{state?.name}"
                <div className="pull-right">
                    <TableButton dest={`/presets/${id}/edit`} name={"Edit"} />
                    <TableButton dest={`/presets/${id}/delete`} name={"Delete"} class="btn-danger" />
                </div>
            </h1>
            <StaticField label="Description" content={state?.desc} />

            <h3>Transaction template</h3>
            <table className="table table-condensed">
                <thead>
                    <tr>
                        <th>Affected account</th>
                        <th>Fraction</th>
                    </tr>
                </thead>
                <tbody>
                    {state?.presetSubs.map((presetSub, id) => (
                        <tr key={id}>
                            <td><Link to={`/accounts/${presetSub.account}`}>{presetSub.accountName}</Link></td>
                            <td>{presetSub.fraction.toFixed(3)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <h4>Tags</h4>
            {state?.presetTransTags.map((presetTransTag) => (
                <button className="btn btn-xs" style={{marginRight: 5}} role="button">{presetTransTag.tagName}</button>
            ))}
        </div>
    )
})