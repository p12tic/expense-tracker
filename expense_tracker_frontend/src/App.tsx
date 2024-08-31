import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Accounts} from "./components/Accounts.tsx";
import {Tags} from "./components/Tags.tsx";
import './components/common.css';
import {TransactionsList} from "./components/Transactions.tsx";
import {PresetsList} from "./components/Presets.tsx";
import {Login} from "./components/Login.tsx";
import {UserEdit} from "./components/UserEdit.tsx";
import {TagCreate} from "./components/TagCreate.tsx";
import {AccountCreate} from "./components/AccountCreate.tsx";







function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="accounts" element={<Accounts />}></Route>
                <Route path="tags" element={<Tags />}></Route>
                <Route path="transactions" element={<TransactionsList />}></Route>
                <Route path="presets" element={<PresetsList />}></Route>
                <Route path="login" element={<Login />}></Route>
                <Route path="user/edit" element={<UserEdit />}></Route>
                <Route path="tags/add" element={<TagCreate />}></Route>
                <Route path="accounts/add" element={<AccountCreate />}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
