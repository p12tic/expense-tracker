import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Accounts} from "./components/Accounts/Accounts.tsx";
import {Tags} from "./components/Tags/Tags.tsx";
import './components/common.css';
import {TransactionsList} from "./components/Transactions/Transactions.tsx";
import {PresetsList} from "./components/Presets/Presets.tsx";
import {Login} from "./components/Auth/Login.tsx";
import {UserEdit} from "./components/Auth/UserEdit.tsx";
import {TagCreate} from "./components/Tags/TagCreate.tsx";
import {AccountCreate} from "./components/Accounts/AccountCreate.tsx";
import {Tag} from "./components/Tags/Tag.tsx";
import {TagDelete} from "./components/Tags/TagDelete.tsx";
import {TagEdit} from "./components/Tags/TagEdit.tsx";
import {Account} from "./components/Accounts/Account.tsx";
import {AccountDelete} from "./components/Accounts/AccountDelete.tsx";
import {AccountEdit} from "./components/Accounts/AccountEdit.tsx";
import {PresetCreate} from "./components/Presets/PresetCreate.tsx";







function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="accounts" element={<Accounts />}></Route>
                <Route path="tags" element={<Tags />}></Route>
                <Route path="transactions" element={<TransactionsList />}></Route>
                <Route path="presets" element={<PresetsList />}></Route>
                <Route path="presets/add" element={<PresetCreate />}></Route>
                <Route path="login" element={<Login />}></Route>
                <Route path="user/edit" element={<UserEdit />}></Route>
                <Route path="tags/add" element={<TagCreate />}></Route>
                <Route path="tags/:id" element={<Tag />}></Route>
                <Route path="tags/:id/delete" element={<TagDelete />}></Route>
                <Route path="tags/:id/edit" element={<TagEdit />}></Route>
                <Route path="accounts/add" element={<AccountCreate />}></Route>
                <Route path="accounts/:id" element={<Account />}></Route>
                <Route path="accounts/:id/delete" element={<AccountDelete />}></Route>
                <Route path="accounts/:id/edit" element={<AccountEdit />}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
