import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import {useToken} from "../Auth/AuthContext.tsx";
import axios from "axios";
import {Navbar} from "../Navbar.tsx";
import {useNavigate, useParams} from "react-router-dom";

interface Tag {
    id: number;
    name: string;
    desc: string;
    user: string;
}

export const TagEdit = observer(function TagEdit() {
    const Auth = useToken();
    const navigate = useNavigate();
    const {id} = useParams();
    axios.defaults.headers.common = {'Authorization': `Token ${Auth.getToken()}`};
    if(Auth.getToken() === '') {
        navigate('/login');
    }
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    useEffect(() => {
        axios.get(`http://localhost:8000/api/tags?id=${id}`).then(res => {
        const data: Tag = res.data[0];
        setName(data.name);
        setDesc(data.desc);
    }).catch(err => console.error(err))
    }, []);

    let bodyParameters = {
        'id': id,
        'Name': ``,
        'Description': ``,
        'action': 'edit'
    };

    const submitHandler = (e) => {
        e.preventDefault();
        bodyParameters.Name = name;
        bodyParameters.Description = desc;
        axios.post("http://localhost:8000/api/tags", bodyParameters).catch(err => console.error(err));
        navigate(`/tags/${id}`);
    };
    return <div className='container'>
        <Navbar />
        <h1>Edit</h1>
        <form method="post" id="tag-create-form" onSubmit={submitHandler}>
            <div className="form-horizontal">
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_name">Name</label>
                    <div className="col-xs-8 col-sm-10">
                        <input value={name} type="text" className={"form-control"} name="name" key="id_name" required={true}
                               onChange={(e) => setName(e.target.value)}/>
                    </div>
                </div>
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_desc">Description</label>
                    <div className="col-xs-8 col-sm-10">
                        <input value={desc} type="text" className={"form-control"} name="description" key="id_desc"
                               onChange={(e) => setDesc(e.target.value)}/>
                    </div>
                </div>
                <div className="form-horizontal">
                    <div className="col-xs-4 col-sm-2 pull-right">
                        <input className="btn btn-primary" type="submit" style={{width: "100%"}} role="button"
                               value="Save"/>
                    </div>
                </div>
            </div>
        </form>
    </div>
})