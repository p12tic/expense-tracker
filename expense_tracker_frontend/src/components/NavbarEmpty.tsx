import {Container, Navbar} from "react-bootstrap";
import React from "react";

export function NavbarEmpty() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary mb-3">
      <Container>
        <Navbar.Brand href="#" className="text-start">
          Expense tracker
        </Navbar.Brand>
      </Container>
    </Navbar>
  );
}
