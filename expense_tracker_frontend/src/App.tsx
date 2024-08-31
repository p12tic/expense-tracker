import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Accounts} from "./components/Accounts.tsx";
import {Tags} from "./components/Tags.tsx";
import './components/common.css';
import {TransactionsList} from "./components/Transactions.tsx";
import {PresetsList} from "./components/Presets.tsx";

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="accounts" element={<Accounts />}></Route>
            <Route path="tags" element={<Tags />}></Route>
            <Route path="transactions" element={<TransactionsList />}></Route>
            <Route path="presets" element={<PresetsList />}></Route>
        </Routes>
    </BrowserRouter>
  )
}

export default App
