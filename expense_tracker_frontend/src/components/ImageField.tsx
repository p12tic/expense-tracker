import {Button, Col, Container, Row} from "react-bootstrap";
import type {TransactionImage} from "../utils/Interfaces";
import ModalImage from "react-modal-image";
import React, {Dispatch, SetStateAction, useRef} from "react";
import {useDropzone} from "react-dropzone";
import {v4 as uuidv4} from "uuid";

interface ImageFieldProps {
  images: TransactionImage[];
  setImages: Dispatch<SetStateAction<TransactionImage[]>>;
}

export const ImageField = ({images, setImages}: ImageFieldProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
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
  const handleImageRemove = (targetImage: string) => {
    setImages((image) => image.filter((img) => img.id !== targetImage));
  };
  return (
    <>
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
                {images.map((image: TransactionImage) => (
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
                        small={
                          typeof image.image != "string"
                            ? URL.createObjectURL(image.image)
                            : image.image
                        }
                        large={
                          typeof image.image != "string"
                            ? URL.createObjectURL(image.image)
                            : image.image
                        }
                      />
                    </center>
                  </Col>
                ))}
              </div>
            </Col>
          </Row>
        </Container>
      ) : (
        <p>No images attached to this transaction</p>
      )}
    </>
  );
};
