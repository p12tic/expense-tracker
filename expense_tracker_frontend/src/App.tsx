import {BrowserRouter, Routes, Route} from 'react-router-dom';
import {Accounts} from "./components/Accounts.tsx";
import './components/common.css';

function App() {

  return (
    <BrowserRouter>
        <Routes>
            <Route path="accounts" element={<Accounts />}></Route>
        </Routes>
    </BrowserRouter>
  )
}

export default App
