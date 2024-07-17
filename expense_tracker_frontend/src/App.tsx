import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Accounts} from "./components/Accounts.tsx";
import {Tags} from "./components/Tags.tsx";
import './components/common.css';
import {TransactionsList} from "./components/Transactions.tsx";
import {PresetsList} from "./components/Presets.tsx";
import {AuthData} from "./components/AuthData.tsx";
import {NavbarEmpty} from "./components/NavbarEmpty.tsx";




const token = new AuthData();
function Login() {
    token.setToken('a5gf8sdgd52dfg52sdf');
    return <div className='container'>
        <NavbarEmpty />
        <form method="post" id="login-form">
            <div className="form-horizontal">
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_username">Username</label>
                    <div className="col-xs-8 col-sm-10">
                        <input type="text" className={"form-control"} name="username" key="id_username"/>
                    </div>
                </div>
                <div className="form-group">
                    <label className="col-xs-4 col-sm-2 control-label"
                           htmlFor="id_password">Password</label>
                    <div className="col-xs-8 col-sm-10">
                        <input type="password" className={"form-control"} name="password" key="id_password"/>
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

function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="accounts" element={<Accounts />}></Route>
                <Route path="tags" element={<Tags />}></Route>
                <Route path="transactions" element={<TransactionsList />}></Route>
                <Route path="presets" element={<PresetsList prop={token} />}></Route>
                <Route path="login" element={<Login />}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
