import {Col, Row} from "react-bootstrap";


export function StaticField(staticFieldProps) {
    return (
        <Row>
            <Col xs={4} sm={2} className="tmp-static-field-label">{staticFieldProps.label}</Col>
            <Col xs={8} sm={10} className="tmp-static-field-content">{staticFieldProps.content}</Col>
        </Row>
    )

}