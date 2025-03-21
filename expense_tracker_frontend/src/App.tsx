import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import {Accounts} from "./components/Accounts/Accounts";
import {Tags} from "./components/Tags/Tags";
import "./components/common.scss";
import {TransactionsList} from "./components/Transactions/Transactions";
import {PresetsList} from "./components/Presets/Presets";
import {Login} from "./components/Auth/Login";
import {UserEdit} from "./components/Auth/UserEdit";
import {TagCreate} from "./components/Tags/TagCreate";
import {AccountCreate} from "./components/Accounts/AccountCreate";
import {Tag} from "./components/Tags/Tag";
import {TagDelete} from "./components/Tags/TagDelete";
import {TagEdit} from "./components/Tags/TagEdit";
import {Account} from "./components/Accounts/Account";
import {AccountDelete} from "./components/Accounts/AccountDelete";
import {AccountEdit} from "./components/Accounts/AccountEdit";
import {PresetCreate} from "./components/Presets/PresetCreate";
import {Preset} from "./components/Presets/Preset";
import {PresetDelete} from "./components/Presets/PresetDelete";
import {PresetEdit} from "./components/Presets/PresetEdit";
import {TransactionCreate} from "./components/Transactions/TransactionCreate";
import {Transaction} from "./components/Transactions/Transaction";
import {TransactionDelete} from "./components/Transactions/TransactionDelete";
import {TransactionEdit} from "./components/Transactions/TransactionEdit";
import {AccountSync} from "./components/Accounts/AccountSync";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*Account routes*/}
        <Route path="accounts" element={<Accounts />}></Route>
        <Route path="accounts/add" element={<AccountCreate />}></Route>
        <Route path="accounts/:id" element={<Account />}></Route>
        <Route path="accounts/:id/delete" element={<AccountDelete />}></Route>
        <Route path="accounts/:id/edit" element={<AccountEdit />}></Route>
        <Route path="accounts/:id/sync" element={<AccountSync />}></Route>
        {/*Tag routes*/}
        <Route path="tags" element={<Tags />}></Route>
        <Route path="tags/add" element={<TagCreate />}></Route>
        <Route path="tags/:id" element={<Tag />}></Route>
        <Route path="tags/:id/delete" element={<TagDelete />}></Route>
        <Route path="tags/:id/edit" element={<TagEdit />}></Route>
        {/*Transaction routes*/}
        <Route path="transactions" element={<TransactionsList />}></Route>
        <Route path="transactions/add" element={<TransactionCreate />}></Route>
        <Route path="transactions/:id" element={<Transaction />}></Route>
        <Route
          path="transactions/:id/delete"
          element={<TransactionDelete />}
        ></Route>
        <Route
          path="transactions/:id/edit"
          element={<TransactionEdit />}
        ></Route>
        {/*Preset routes*/}
        <Route path="presets" element={<PresetsList />}></Route>
        <Route path="presets/add" element={<PresetCreate />}></Route>
        <Route path="presets/:id" element={<Preset />}></Route>
        <Route path="presets/:id/delete" element={<PresetDelete />}></Route>
        <Route path="presets/:id/edit" element={<PresetEdit />}></Route>
        {/*Auth/User routes*/}
        <Route path="login" element={<Login />}></Route>
        <Route path="user/edit" element={<UserEdit />}></Route>
        {/*Redirect to login on startup route*/}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
