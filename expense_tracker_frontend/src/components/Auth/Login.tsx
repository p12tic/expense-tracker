import axios from "axios";
import {useState} from "react";
import {useNavigate} from "react-router-dom";
import {NavbarEmpty} from "../NavbarEmpty";
import {observer} from "mobx-react-lite";
import {useToken} from "./AuthContext";
import {getApiUrlForCurrentWindow} from "../../utils/Network";

export const Login = function Login() {
    const auth = useToken();

    let bodyParameters ={
        username: "",
        password: ""
    };
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    if (auth.getToken() !== '') {
        navigate('/transactions');
    }
    const submitHandler = (e) => {
        e.preventDefault();
        bodyParameters.username=username;
        bodyParameters.password = password;

        axios.post(`${getApiUrlForCurrentWindow()}/api-token-auth/`,
            bodyParameters
            ).then((response) => {
                auth.setToken(response.data.token);
                navigate("/transactions");
            }).catch((err) => {console.error(err)})
    }
    return <div className='container'>
        <NavbarEmpty />
        <form method="post" id="login-form" onSubmit={submitHandler}>
            <div className="form-horizontal">
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_username">Username</label>
                    <div className="col-xs-8 col-sm-10">
                        <input type="text" className={"form-control"} name="username" key="id_username" required={true}
                               onChange={(e) => setUsername(e.target.value)}/>
                    </div>
                </div>
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_password">Password</label>
                    <div className="col-xs-8 col-sm-10">
                        <input type="password" className={"form-control"} name="password" key="id_password"
                               required={true} onChange={(e) => setPassword(e.target.value)}/>
                    </div>
                </div>
                <div className="form-horizontal">
                    <div className="col-xs-4 col-sm-2 pull-right">
                        <input className="btn btn-primary" type="submit" style={{width: "100%"}} role="button"
                               value="Log in"/>
                    </div>
                </div>
            </div>
        </form>
    </div>
}