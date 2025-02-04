import {NavbarEmpty} from "../NavbarEmpty";
import {observer} from "mobx-react-lite";
import {useState} from "react";
import {useToken} from "../Auth/AuthContext";
import {Navbar} from "../Navbar";
import {useNavigate} from "react-router-dom";
import {AuthAxios} from "../../utils/Network";


export const TagCreate = observer(function TagCreate() {
    const auth = useToken();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    if (auth.getToken() === '') {
        navigate('/login');
    }
    let bodyParameters = {
        'Name': ``,
        'Description': ``,
        'action': 'create'
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        bodyParameters.Name = name;
        bodyParameters.Description = desc;
        await AuthAxios.post("tags", auth.getToken(), bodyParameters).catch(err => console.error(err));
        navigate('/tags');
    }
    return <div className='container'>
        <Navbar />
        <h1>Create new tag</h1>
        <form method="post" id="tag-create-form" onSubmit={submitHandler}>
            <div className="form-horizontal">
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_name">Name</label>
                    <div className="col-xs-8 col-sm-10">
                        <input type="text" className={"form-control"} name="name" key="id_name" required={true}
                               onChange={(e) => setName(e.target.value)}/>
                    </div>
                </div>
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_desc">Description</label>
                    <div className="col-xs-8 col-sm-10">
                        <input type="text" className={"form-control"} name="description" key="id_desc"
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