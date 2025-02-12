import React, {useState} from "react";
import {observer} from "mobx-react-lite";
import {useToken} from "./Auth/AuthContext";
import {AuthAxios} from "../utils/Network";
import {Navbar, Container, Nav, NavDropdown} from "react-bootstrap";

export const NavbarComponent = observer(function NavbarComponent() {
    const auth = useToken();
    const [username, setUsername] = useState('');
    AuthAxios.get("token", auth.getToken()).then(res => {
        setUsername(res.data[0].username);
    });
    return (
        <>
            <Navbar expand="lg" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand href="#">Expense tracker</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                    <Navbar.Collapse id="navbar">
                        <Nav className="me-auto">
                            <Nav.Link className="active" href="/transactions">
                                Transactions
                            </Nav.Link>
                            <Nav.Link href="/accounts">Accounts</Nav.Link>
                            <Nav.Link href="/graphs">Graphs</Nav.Link>
                            <NavDropdown title="Misc">
                                <NavDropdown.Item href="/chained_accounts">
                                    Chained accounts
                                </NavDropdown.Item>
                                <NavDropdown.Item href="/tags">Tags</NavDropdown.Item>
                                <NavDropdown.Item href="/presets">Presets</NavDropdown.Item>
                            </NavDropdown>
                            {auth.getToken() === '' ?
                                <Nav.Link href="/user/login">Not authenticated</Nav.Link>
                                :
                                <Nav.Link href="/user/edit">Logged in as {username}</Nav.Link>
                            }
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
        </>
    )
})