import "./components/common.scss";

import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";

import {Account} from "./pages/Accounts/Account";
import {AccountCreate} from "./pages/Accounts/AccountCreate";
import {AccountDelete} from "./pages/Accounts/AccountDelete";
import {AccountEdit} from "./pages/Accounts/AccountEdit";
import {Accounts} from "./pages/Accounts/Accounts";
import {AccountSync} from "./pages/Accounts/AccountSync";
import {Login} from "./pages/Auth/Login";
import {UserEdit} from "./pages/Auth/UserEdit";
import {Preset} from "./pages/Presets/Preset";
import {PresetCreate} from "./pages/Presets/PresetCreate";
import {PresetDelete} from "./pages/Presets/PresetDelete";
import {PresetEdit} from "./pages/Presets/PresetEdit";
import {PresetsList} from "./pages/Presets/Presets";
import {Tag} from "./pages/Tags/Tag";
import {TagCreate} from "./pages/Tags/TagCreate";
import {TagDelete} from "./pages/Tags/TagDelete";
import {TagEdit} from "./pages/Tags/TagEdit";
import {Tags} from "./pages/Tags/Tags";
import {Transaction} from "./pages/Transactions/Transaction";
import {TransactionBatch} from "./pages/Transactions/TransactionBatch";
import {TransactionCreate} from "./pages/Transactions/TransactionCreate";
import {TransactionCreateBatch} from "./pages/Transactions/TransactionCreateBatch";
import {TransactionDelete} from "./pages/Transactions/TransactionDelete";
import {TransactionEdit} from "./pages/Transactions/TransactionEdit";
import {TransactionsList} from "./pages/Transactions/Transactions";

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
        <Route
          path="transactions/batch/create"
          element={<TransactionCreateBatch />}
        ></Route>
        <Route
          path="transactions/batch/:batchID/:batchItemID"
          element={<TransactionBatch />}
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
