import {useToken} from "../Auth/AuthContext";
import {useState} from "react";
import {NavbarComponent} from "../Navbar";
import {observer} from "mobx-react-lite";
import {useNavigate} from "react-router-dom";
import {AuthAxios} from "../../utils/Network";
import {Col, Form, Row, Container} from "react-bootstrap";
import {SubmitButton} from "../SubmitButton";


export const AccountCreate = observer(function AccountCreate() {
    const auth = useToken();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    if (auth.getToken() === '') {
        navigate('/login');
    }
    let bodyParameters = {
        'Name': ``,
        'Description': ``,
        'action': `create`
    };

    const submitHandler = async (e) => {
        e.preventDefault();
        bodyParameters.Name = name;
        bodyParameters.Description = desc;
        await AuthAxios.post("accounts", auth.getToken(), bodyParameters).catch(err => console.error(err));
        navigate('/accounts');
    }
    return (
        <Container>
            <NavbarComponent/>
            <h1>Create new account</h1>
            <Form id="account-create-form" onSubmit={submitHandler}>
                <Form.Group>
                    <Row className="mb-3">
                        <Col xs={4} sm={2} className="text-end">
                            <Form.Label htmlFor="id_name">Name</Form.Label>
                        </Col>
                        <Col xs={8} sm={10}>
                            <Form.Control type="text" name="name" key="id_name" required={true}
                                          onChange={(e) => setName(e.target.value)}/>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col xs={4} sm={2} className="text-end">
                            <Form.Label htmlFor="id_desc">Description</Form.Label>
                        </Col>
                        <Col xs={8} sm={10}>
                            <Form.Control type="text" name="description" key="id_desc"
                                          onChange={(e) => setDesc(e.target.value)}/>
                        </Col>
                    </Row>
                    <SubmitButton text="Save"/>
                </Form.Group>
            </Form>
        </Container>
    )
})