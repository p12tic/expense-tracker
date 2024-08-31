import {observer} from "mobx-react-lite";
import {useToken} from "./AuthContext.tsx";
import {Navbar} from "./Navbar.tsx";
import axios from "axios";


export const UserEdit = observer(function UserEdit() {
    const Auth = useToken();
    const logout =( (e) => {
        Auth.setToken('');
    });

    return(
        <div className='container' style={{minWidth: 'auto', justifySelf: 'center'}}>
            <Navbar />
            <h1>User settings</h1>
            <a onClick={logout} href="/login" className="btn btn-primary" role="button">Log
                out</a>
            <p>TODO</p>
        </div>
    )
})