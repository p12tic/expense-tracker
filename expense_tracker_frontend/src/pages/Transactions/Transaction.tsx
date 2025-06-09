import {observer} from "mobx-react-lite";
import {NavbarComponent} from "../../components/Navbar";
import {TableButton} from "../../components/TableButton";
import {StaticField} from "../../components/StaticField";
import React, {useEffect, useState} from "react";
import {useToken} from "../../utils/AuthContext";
import {Link, useNavigate, useParams} from "react-router-dom";
import {
  centsToString,
  formatDate,
  formatTimezone,
} from "../../components/Tools";
import {AuthAxios, getApiUrlForCurrentWindow} from "../../utils/Network";
import {Col, Row, Table, Button, Alert, Container} from "react-bootstrap";
import dayjs, {Dayjs} from "dayjs";
import ModalImage from "react-modal-image";

interface TransactionElement {
  desc: string;
  user: number;
  dateTime: Dayjs;
  timezoneOffset: number;
  tags: Tag[];
  subs: Subtransaction[];
  images: number[];
}
interface TransactionTag {
  tag: number;
  transaction: number;
}
interface Tag {
  id: number;
  name: string;
  desc: string;
  user: number;
}
interface Subtransaction {
  id: number;
  transaction: number;
  account: number;
  amount: number;
  accountName: string;
}
interface Account {
  id: number;
  user: number;
  name: string;
  desc: string;
}

export const Transaction = observer(() => {
  const auth = useToken();
  const [state, setState] = useState<TransactionElement>({
    desc: "",
    user: 0,
    dateTime: dayjs(),
    timezoneOffset: -dayjs().utcOffset(),
    tags: [],
    subs: [],
    images: [],
  });
  const {id} = useParams();
  const navigate = useNavigate();
  if (auth.getToken() === "") {
    navigate("/login");
  }
  useEffect(() => {
    const FetchTransaction = async () => {
      await AuthAxios.get(`transactions?id=${id}`, auth.getToken()).then(
        async (res) => {
          const transaction: TransactionElement = res.data[0];
          transaction.dateTime = dayjs(res.data[0]["date_time"]);
          transaction.timezoneOffset = res.data[0]["timezone_offset"];
          let Tags: Tag[] = [];
          let Subs: Subtransaction[] = [];
          await AuthAxios.get(
            `transaction_tags?transaction=${id}`,
            auth.getToken(),
          ).then(async (transactionTags) => {
            Tags = await Promise.all(
              transactionTags.data.map(async (transTag: TransactionTag) => {
                const tagRes = await AuthAxios.get(
                  `tags?id=${transTag.tag}`,
                  auth.getToken(),
                );
                const tag: Tag = tagRes.data[0];
                return tag;
              }),
            );
          });
          await AuthAxios.get(
            `subtransactions?transaction=${id}`,
            auth.getToken(),
          ).then(async (subsRes) => {
            Subs = await Promise.all(
              subsRes.data.map(async (sub: Subtransaction) => {
                const accRes = await AuthAxios.get(
                  `accounts?id=${sub.account}`,
                  auth.getToken(),
                );
                const acc: Account = accRes.data[0];
                sub.accountName = acc.name;
                return sub;
              }),
            );
          });
          await AuthAxios.get(
            `transaction_image?transaction=${id}`,
            auth.getToken(),
          ).then((res) => {
            transaction.images = res.data.map(
              (image: {id: number}) => image.id,
            );
          });
          transaction.dateTime = dayjs(transaction.dateTime);
          transaction.subs = Subs;
          transaction.tags = Tags;
          setState(transaction);
        },
      );
    };
    FetchTransaction();
  }, []);
  if (id === undefined) {
    navigate("/transactions");
    return;
  }

  return (
    <Container>
      <NavbarComponent />
      <Row>
        <Col>
          <h1>Transaction "{state?.desc}"</h1>
        </Col>
        <Col md="auto" className="d-flex justify-content-end">
          <TableButton dest={`/transactions/${id}/edit`} name={"Edit"} />
          <TableButton
            dest={`/transactions/${id}/delete`}
            name={"Delete"}
            type="danger"
          />
        </Col>
      </Row>
      <StaticField
        label="Date and time"
        content={formatDate(state?.dateTime)}
      />
      <StaticField
        label="Timezone"
        content={<div>{formatTimezone(state.timezoneOffset)}</div>}
      />
      <h3>Tags</h3>
      {state.tags.length > 0 ? (
        state.tags.map((tag) => (
          <Button variant="secondary" role="button" style={{marginRight: 4}}>
            {tag.name}
          </Button>
        ))
      ) : (
        <Alert key="info" variant="info" transition={false}>
          No tags have been defined for this transaction
        </Alert>
      )}
      <h3>Affected accounts</h3>
      <Table size="sm">
        <thead>
          {state.subs.length > 0 ? (
            <tr>
              <th>Account</th>
              <th>Amount</th>
            </tr>
          ) : (
            <></>
          )}
        </thead>
        <tbody>
          {state.subs.length > 0 ? (
            state.subs.map((sub: Subtransaction, id) => (
              <tr key={id}>
                <td>
                  <Link to={`/accounts/${sub.account}`}>{sub.accountName}</Link>
                </td>
                <td>{centsToString(sub.amount)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td>This transaction does not affect any accounts</td>
            </tr>
          )}
        </tbody>
      </Table>
      <h3>Images</h3>
      {state.images.length > 0 ? (
        <Container fluid>
          <Row>
            <Col style={{overflowX: "auto"}}>
              <div className="images-container">
                {state.images.map((imageId: number) => (
                  <Col key={imageId} className="image-box" xs="auto">
                    <center>
                      <ModalImage
                        small={
                          getApiUrlForCurrentWindow() +
                          "transaction_image/" +
                          imageId
                        }
                        large={
                          getApiUrlForCurrentWindow() +
                          "transaction_image/" +
                          imageId
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
    </Container>
  );
});
