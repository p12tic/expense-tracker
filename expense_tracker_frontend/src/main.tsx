import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import {AuthProvider} from "./components/Auth/AuthContext";
import './boot_override.scss'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <AuthProvider>
        <React.StrictMode>
            <App/>
        </React.StrictMode>
    </AuthProvider>,
)
