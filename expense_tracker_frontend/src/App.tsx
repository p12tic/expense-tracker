import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Accounts} from "./components/Accounts.tsx";
import {Tags} from "./components/Tags.tsx";
import './components/common.css';
import {TransactionsList} from "./components/Transactions.tsx";

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="accounts" element={<Accounts />}></Route>
            <Route path="tags" element={<Tags />}></Route>
            <Route path="transactions" element={<TransactionsList />}></Route>
        </Routes>
    </BrowserRouter>
  )
}

export default App
