import {Navbar} from "../Navbar";
import React, {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import {TableButton} from "../TableButton";
import {useToken} from "../Auth/AuthContext";
import {observer} from "mobx-react-lite";
import {AuthAxios} from "../../utils/Network";

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
    const [state, setState] = useState<Presets[]>([]);
    const navigate = useNavigate();
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    useEffect(() => {
        const fetchPresets = async() => {
            try {
                const data = await AuthAxios.get("http://localhost:8000/api/presets", Auth.getToken()).then(res => {
                const data: Presets[] = res.data;
                return data;
            });
                await Promise.all(data.map(async (preset) => {
                    const transTagsRes = await AuthAxios.get(`http://localhost:8000/api/preset_transaction_tags?preset=${preset.id}`, Auth.getToken());
                    const transTags = transTagsRes.data;
                    preset.tags = await Promise.all(transTags.map(async (transTag: PresetTransactionTag) => {
                        const tagsRes = await AuthAxios.get(`http://localhost:8000/api/tags?id=${transTag.tag}`, Auth.getToken());
                        return tagsRes.data[0].name;
                    }));
                    const presetSubsRes = await AuthAxios.get(`http://localhost:8000/api/preset_subtransactions?preset=${preset.id}`, Auth.getToken());
                    const presetSubs: PresetSub[] = presetSubsRes.data;
                    preset.presetSubs = await Promise.all(presetSubs.map(async (preSub) => {
                        const accSubRes = await AuthAxios.get(`http://localhost:8000/api/accounts?id=${preSub.account}`, Auth.getToken());
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