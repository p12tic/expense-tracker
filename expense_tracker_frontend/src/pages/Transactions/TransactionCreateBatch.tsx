import {observer} from "mobx-react-lite";
import {useToken} from "../../utils/AuthContext";
import {useNavigate} from "react-router-dom";
import {FormEvent, useEffect, useRef, useState} from "react";
import {AuthAxios} from "../../utils/Network";
import {Button, Card, Col, Container, Form, Row} from "react-bootstrap";
import {NavbarComponent} from "../../components/Navbar";
import ModalImage from "react-modal-image";
import {useDropzone} from "react-dropzone";
import {v4 as uuidv4} from "uuid";

interface Preset {
  id: number;
  name: string;
}
interface Account {
  id: number;
  name: string;
}
interface Image {
  id: string;
  image: File;
}

export const TransactionCreateBatch = observer(() => {
  const auth = useToken();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  const [presets, setPresets] = useState<Preset[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selection, setSelection] = useState<Preset | Account>();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [name, setName] = useState<string>("");
  useEffect(() => {
    const fetchPresets = async () => {
      const presetsRes = await AuthAxios.get(`presets`, auth.getToken());
      setPresets(presetsRes.data);
    };
    const fetchAccounts = async () => {
      const accountsRes = await AuthAxios.get(`accounts`, auth.getToken());
      setAccounts(accountsRes.data);
    };
    fetchPresets();
    fetchAccounts();
  }, []);
  function handleSelect(selectedItem: Preset | Account) {
    setSelection(selectedItem);
  }
  const {getRootProps, getInputProps} = useDropzone({
    accept: {
      "image/*": [],
    },
    onDrop: (acceptedFiles) => {
      setImages((prevImg) => [
        ...prevImg,
        ...acceptedFiles.map((file) => ({id: uuidv4(), image: file})),
      ]);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    },
  });
  function handleImageRemove(targetImage: string) {
    setImages((image) => image.filter((img) => img.id !== targetImage));
  }
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selection === undefined) {
      return;
    }
    const bodyParams = new FormData();
    bodyParams.append("name", name);
    bodyParams.append("selection", JSON.stringify(selection));
    images.map((image) => bodyParams.append("images", image.image));
    await AuthAxios.post("transaction_batch", auth.getToken(), bodyParams);
    navigate("/transactions");
  };
  return (
    <Container>
      <NavbarComponent />
      <Form onSubmit={handleSubmit}>
        <Card style={{marginTop: "20px"}}>
          <Card.Body>
            <Row style={{borderBottom: "solid #dee2e6 1px"}}>
              <h2>Select preset or account</h2>
            </Row>
            <br />
            <Row>
              <Col style={{borderRight: "solid #dee2e6 1px"}}>
                <h4>Presets</h4>
                <br />
                {presets.map((preset, id) =>
                  selection === preset ? (
                    <Button
                      variant="info"
                      className="tmp-preset-button"
                      style={{marginBottom: "0.2em", marginRight: "0.3em"}}
                      data-id={`${preset.id}`}
                      key={id}
                    >
                      {preset.name}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="tmp-preset-button"
                      onClick={() => handleSelect(preset)}
                      style={{marginBottom: "0.2em", marginRight: "0.3em"}}
                      data-id={`${preset.id}`}
                      key={id}
                    >
                      {preset.name}
                    </Button>
                  ),
                )}
              </Col>
              <Col>
                <h4>Accounts</h4>
                <br />
                {accounts.map((account, id) =>
                  selection === account ? (
                    <Button
                      variant="info"
                      className="tmp-preset-button"
                      style={{marginBottom: "0.2em", marginRight: "0.3em"}}
                      data-id={`${account.id}`}
                      key={id}
                    >
                      {account.name}
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      className="tmp-preset-button"
                      onClick={() => handleSelect(account)}
                      style={{marginBottom: "0.2em", marginRight: "0.3em"}}
                      data-id={`${account.id}`}
                      key={id}
                    >
                      {account.name}
                    </Button>
                  ),
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>
        <Row className="mt-4">
          <Col xs={4} sm={2} className="align-content-center text-end">
            <Form.Label className="mb-0" htmlFor="id_description">
              Description
            </Form.Label>
          </Col>
          <Col xs={8} sm={10} className="align-content-center">
            <Form.Control
              type="text"
              name="name"
              key="id_name"
              value={name}
              required={true}
              id="id_description"
              onChange={(e) => setName(e.target.value)}
            />
          </Col>
        </Row>
        <h4 className="pt-2">Images</h4>
        <div
          {...getRootProps({className: "dropzone"})}
          style={{cursor: "pointer"}}
        >
          <input {...getInputProps()} />
          <p className="image-dropbox">
            Drag and drop images here, or click to select images
          </p>
        </div>
        {images.length > 0 ? (
          <Container className="pb-3" fluid>
            <Row>
              <Col style={{overflowX: "auto"}}>
                <div className="images-container">
                  {images.map((image: Image) => (
                    <Col key={image.id} className="image-box" xs="auto">
                      <Button
                        onClick={() => handleImageRemove(image.id)}
                        variant={""}
                        className="image-remove-button"
                      >
                        &#10006;
                      </Button>
                      <center>
                        <ModalImage
                          small={URL.createObjectURL(image.image)}
                          large={URL.createObjectURL(image.image)}
                        />
                      </center>
                    </Col>
                  ))}
                </div>
              </Col>
            </Row>
          </Container>
        ) : (
          <p>No images attached to this batch</p>
        )}
        <Row>
          <Col xs={4} sm={2} className="ms-auto">
            <Button
              variant="primary"
              type="submit"
              style={{width: "100%"}}
              disabled={selection === undefined || images.length === 0}
            >
              Create
            </Button>
          </Col>
        </Row>
      </Form>
    </Container>
  );
});
