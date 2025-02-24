import {Navbar} from "../Navbar.tsx";
import React, {useEffect, useState} from "react";
import axios from "axios";
import {Link, useNavigate} from "react-router-dom";
import {TableButton} from "../TableButton.tsx";
import {useToken} from "../Auth/AuthContext.tsx";
import {observer} from "mobx-react-lite";

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

export const PresetsList = observer(function PresetsList() {
    const Auth = useToken();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    const [state, setState] = useState<Presets[]>([]);
    const navigate = useNavigate();
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {
        const fetchPresets = async() => {
            try {
                const data = await axios.get("http://localhost:8000/api/presets").then(res => {
                const data: Presets[] = res.data;
                return data;
            });
                await Promise.all(data.map(async (preset) => {
                    const transTagsRes = await axios.get(`http://localhost:8000/api/preset_transaction_tags?preset=${preset.id}`);
                    const transTags = transTagsRes.data;
                    preset.tags = await Promise.all(transTags.map(async (transTag: PresetTransactionTag) => {
                        const tagsRes = await axios.get(`http://localhost:8000/api/tags?id=${transTag.tag}`);
                        return tagsRes.data[0].name;
                    }));
                    const presetSubsRes = await axios.get(`http://localhost:8000/api/preset_subtransactions?preset=${preset.id}`);
                    const presetSubs: PresetSub[] = presetSubsRes.data;
                    preset.presetSubs = await Promise.all(presetSubs.map(async (preSub) => {
                        const accSubRes = await axios.get(`http://localhost:8000/api/accounts?id=${preSub.account}`);
                        preSub.accountName = accSubRes.data[0].name;
                        return preSub;
                    }));

                }));
                setState(data);
            }
            catch (err) {
                console.error(err);
            }
        }
        fetchPresets();
    }, []);

    return (
        <div className='container'>
            <Navbar />
            <h1>Presets
                <div className='pull-right'>
                    <TableButton dest={`/presets/add`} name={'New'} />
                </div>
            </h1>
            <table className="table table-condensed">
                <thead>
                    {state.length > 0 ?
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Accounts</th>
                            <th>Tags</th>
                        </tr>
                        :
                        <></>
                    }
                </thead>
                <tbody>
                    {state.length > 0 ?
                        state.map((output, id) => (
                            <tr key={id}>

                                <td><Link to={`/presets/${output.id}`}>{output.name}</Link></td>

                                <td>{output.desc}</td>
                                <td>
                                    {output.presetSubs.map((presetSub) => (
                                        <button className="btn btn-xs" style={{marginLeft: 5}}
                                                role="button">{presetSub.accountName}&nbsp;{presetSub.fraction}</button>
                                    ))}
                                </td>
                                <td>
                                    {output.tags.map((tag, id) => (
                                        <button key={id} style={{marginLeft: 5}} className="btn btn-xs" role="button">{tag}</button>
                                    ))}
                                </td>

                            </tr>
                        ))
                        :
                        <tr><td>No presets yet</td></tr>
                    }
                </tbody>
            </table>
        </div>
    )
})