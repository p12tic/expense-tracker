import {observer} from "mobx-react-lite";
import {useEffect, useState} from "react";
import {useToken} from "../Auth/AuthContext";
import {Navbar} from "../Navbar";
import {useNavigate, useParams} from "react-router-dom";
import {AuthAxios} from "../../utils/Network";

interface Account {
    id: number;
    name: string;
    desc: string;
    user: string;
}

export const AccountEdit = observer(function AccountEdit() {
    const auth = useToken();
    const navigate = useNavigate();
    const {id} = useParams();
    if (auth.getToken() === '') {
        navigate('/login');
    }
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    useEffect(() => {
        AuthAxios.get(`http://localhost:8000/api/accounts?id=${id}`, auth.getToken()).then(res => {
        const data:Account = res.data[0];
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
        AuthAxios.post("http://localhost:8000/api/accounts", auth.getToken(), bodyParameters).catch(err => console.error(err));
        navigate(`/accounts/${id}`);
    }
    return <div className='container'>
        <Navbar />
        <h1>Edit</h1>
        <form method="post" id="tag-create-form" onSubmit={submitHandler}>
            <div className="form-horizontal">
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_name">Name</label>
                    <div className="col-xs-8 col-sm-10">
                        <input value={name} type="text" className={"form-control"} name="name" key="id_name"
                               required={true}
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