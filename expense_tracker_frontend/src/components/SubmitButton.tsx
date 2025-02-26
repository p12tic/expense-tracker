import {Col, Row, Button} from "react-bootstrap";


export function SubmitButton(submitButtonProps) {
    return (
        <Row>
            <Col xs={4} sm={2} className="ms-auto">
                <Button variant="primary" type="submit" style={{width:"100%"}}>{submitButtonProps.text}</Button>
            </Col>
        </Row>
    )
}