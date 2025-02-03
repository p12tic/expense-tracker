import {observer} from "mobx-react-lite";
import {TableButton} from "../TableButton";
import React, {useEffect, useState} from "react";
import {StaticField} from "../StaticField";
import {Navbar} from "../Navbar";
import {useToken} from "../Auth/AuthContext";
import {Link, useNavigate, useParams} from "react-router-dom";
import {AuthAxios} from "../../utils/Network";

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
    presetTransTags: []
};
export const Preset = observer(function Preset() {

    const auth = useToken();
    const [state, setState] = useState<Preset>(defaultPreset);
    const {id} = useParams();
    const navigate = useNavigate();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {
        const fetchPreset = async () => {
            const presetRes = await AuthAxios.get(`http://localhost:8000/api/presets?id=${id}`, auth.getToken());
            const preset: Preset = presetRes.data[0];
            const presetSubsRes = await AuthAxios.get(`http://localhost:8000/api/preset_subtransactions?preset=${id}`, auth.getToken());
            const presetSubs: PresetSub[] = presetSubsRes.data;
            await Promise.all(presetSubs.map(async (presetSub) => {
                await AuthAxios.get(`http://localhost:8000/api/accounts?id=${presetSub.account}`, auth.getToken()).then((res) => {
                    const acc = res.data[0];
                    presetSub.accountName = acc.name;
                });
            }));
            const presetTransTagsRes = await AuthAxios.get(`http://localhost:8000/api/preset_transaction_tags?preset=${id}`, auth.getToken());
            const presetTransTags: PresetTransactionTag[] = presetTransTagsRes.data;
            await Promise.all(presetTransTags.map(async (presetTransactionTag) => {
                await AuthAxios.get(`http://localhost:8000/api/tags?id=${presetTransactionTag.tag}`, auth.getToken()).then((res) => {
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
                    {state?.presetSubs.length > 0 ?
                        <tr>
                            <th>Affected account</th>
                            <th>Fraction</th>
                        </tr>
                        :
                        <></>
                    }
                </thead>
                <tbody>
                    {state?.presetSubs.length > 0 ?
                        state?.presetSubs.map((presetSub, id) => (
                            <tr key={id}>
                                <td><Link to={`/accounts/${presetSub.account}`}>{presetSub.accountName}</Link></td>
                                <td>{presetSub.fraction.toFixed(3)}</td>
                            </tr>
                        ))
                        :
                        <tr><td>No accounts defined</td></tr>
                    }
                </tbody>
            </table>
            <h4>Tags</h4>
            {state?.presetTransTags.length > 0 ?
                state?.presetTransTags.map((presetTransTag) => (
                    <button className="btn btn-xs" style={{marginRight: 5}} role="button">{presetTransTag.tagName}</button>
                ))
                :
                <div className="alert alert-info" role="alert">
                    No tags have been defined for this preset
                </div>
            }
        </div>
    )
})