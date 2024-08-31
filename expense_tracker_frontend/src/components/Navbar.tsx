import React from "react";
import './common.css';
import '../../../expenses/static/libs/bootstrap-3.3.5/css/bootstrap.min.css';
import '../../../expenses/static/libs/bootstrap-datepicker/bootstrap-datetimepicker.min.css';
import '../../../expenses/static/libs/bootstrap-touchspin/jquery.bootstrap-touchspin.min.css';
import '../../../expenses/static/expenses/common.css';

export function Navbar() {
    return (
        <>
            <nav className="navbar navbar-default">
                <div className="container-fluid">
                    <div className="navbar-header">
                        <button type="button" className="navbar-toggle collapsed" data-toggle="collapse"
                                data-target="#navbar" aria-expanded="false" aria-controls="navbar">
                            <span className="sr-only">Toggle navigation</span>
                            <span className="icon-bar"></span>
                            <span className="icon-bar"></span>
                            <span className="icon-bar"></span>
                        </button>
                        <a className="navbar-brand" href="#">Expense tracker</a>
                    </div>
                    <div id="navbar" className="navbar-collapse collapse">
                        <ul className="nav navbar-nav">
                            <li className="navbar-right">
                                <a href="/user/login">Not authenticated</a>
                            </li>
                            <li className="active"><a href="/transactions">Transactions</a></li>
                            <li><a href="/accounts">Accounts</a></li>
                            <li><a href="/graphs">Graphs</a></li>
                            <li className="dropdown">
                                <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button"
                                   aria-haspopup="true" aria-expanded="false">Misc<span className="caret"></span></a>
                                <ul className="dropdown-menu">
                                    <li><a href="/chained_accounts">Chained accounts</a></li>
                                    <li><a href="/tags">Tags</a></li>
                                    <li><a href="/presets">Presets</a></li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </>
    )
}