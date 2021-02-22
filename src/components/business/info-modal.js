import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Modal, Button } from "react-bootstrap";
import CircularProgress from 'material-ui/CircularProgress';

import Alert from "../notification/alert";
import { errorPropTypes } from "../../util/proptype-utils";
import { USER_ACTION } from "../../redux/modules/user";
import {
  deleteBusiness,
  CHANGE_BUSINESS
} from "../../redux/modules/business";
import { makePastTense, makePresentProg } from "../../util/helper-methods";

/*Color status helper function for progress based on current second count*/
const getStatusColors = progress => {
  if(progress > 45) {
    return "#93C480"; /*green*/
  } else if (progress > 30) {
    return "#FEE59D"; /*yellow*/
  } else {
    return "#DF6668" /*red*/
  }
};

const COUNTDOWN_SIZE = 100;

class InfoModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      redeem: 60
    };
    this.timer = 0;
  }

  startTimer = () => {
    if (this.timer === 0) {
      this.timer = setInterval(this.countDown, 1000);
    }
  }

  countDown = () => {
    // Remove one second, set state so a re-render happens.
    let redeem = this.state.redeem - 1;
    this.setState({ redeem });
    
    // Check if we're at zero.
    if (redeem == 0) { 
      let formData =
          this.props.offer && this.props.offer.earnedOffer
            ? this.props.compactFormData(this.props.offer.earnedOffer)
            : null;
      this.props.dataCall(this.props.offer.userId, this.props.offer.busId, this.props.offer.offId, formData, this.handleResetTimer);
    }
  }

  componentWillUnmount() {
    if (this.props.type === "RED") {
      let formData =
          this.props.offer && this.props.offer.earnedOffer
            ? this.props.compactFormData(this.props.offer.earnedOffer)
            : null;
      this.props.dataCall(this.props.offer.userId, this.props.offer.busId, this.props.offer.offId, formData, this.handleResetTimer);
    }
  }

  shouldComponentUpdate = (nextProps, nextState) => {
    if (this.state !== nextState) {
      return true;
    }
    if (nextProps.type !== this.props.type && nextProps.type === "RED") {
      this.startTimer();
      this.countDown();
    }
    return true;
  };
  handleResetTimer = () => {
    clearInterval(this.timer);
    this.setState({redeem: 60});
    this.timer = 0;
  };
  /* Modal/Custom Methods */
  close = () => {
    // $("html").removeClass("modal-open");
    this.props.clearModalState();
    return true;
  };

  renderModalBody = () => {
    let body = null;
    const {
      type,
      offer,
      offerInfo,
      dataCall,
      text,
      btnText,
      btnTextSec,
      message,
      loading,
      errors,
      auth
    } = this.props;
    let handleDataCall = null;
    let isErr = false;
    switch (type) {
      case "INF":
        body = offerInfo;
        break;
      case "RED_INIT":
        handleDataCall = () => dataCall(offer);
        body = (
          <div
            style={{
              textAlign: "center"
            }}
          >
            <p
              dangerouslySetInnerHTML={{
                __html: text
              }}
            />
            <div
              className="btn-section"
              style={{
                marginTop: 20,
                textAlign: "center"
              }}
            >
              <Button
                bsSize="large"
                bsStyle="primary"
                onClick={handleDataCall}
                disabled={false}
              >
                {btnText}
              </Button>
              <Button
                bsSize="large"
                bsStyle="primary"
                onClick={() => this.close()}
                disabled={false}
              >
                {btnTextSec}
              </Button>
            </div>
          </div>
        );
        break;
      case "RED":
        let formData =
          offer && offer.earnedOffer
            ? this.props.compactFormData(offer.earnedOffer)
            : null;
        handleDataCall = () =>
          dataCall(offer.userId, offer.busId, offer.offId, formData, this.handleResetTimer);
        isErr =
          auth.errors && auth.errors.length > 0 && auth.errors[0].length > 0;
        body = (
          <div
            style={{
              textAlign: "center"
            }}
          >
            {offerInfo}
            <div className="countdown-container" style={{height: COUNTDOWN_SIZE}}>
              <CircularProgress
                mode="determinate"
                value={Math.trunc((this.state.redeem / 60)*100)}
                color={getStatusColors(this.state.redeem)}
                min={0}
                max={100}
                size={COUNTDOWN_SIZE}
                thickness={7}
              />
              <span className="countdown-text">{this.state.redeem}</span>
            </div>
            <p>
              <b>Once this countdown finishes, you will no longer be able to redeem
              this offer.</b>
            </p>
            <Button
              bsSize="large"
              bsStyle={`${
                auth.message && auth.message.length > 0
                  ? "success"
                  : auth.loading ? "warning" : isErr ? "danger" : "primary"
              }`}
              onClick={handleDataCall}
              disabled={auth.message != null && auth.message.length > 0}
              style={{
                marginTop: 15,
                textTransform: "capitalize"
              }}
            >
              {auth.message && auth.message.length > 0
                ? makePastTense(btnText)
                : auth.loading ? makePresentProg(btnText) : btnText}
            </Button>
          </div>
        );
        break;
      case "DEL":
        handleDataCall = () => dataCall();
        isErr = errors && errors.length > 0 && errors[0].length > 0;
        body = (
          <div
            style={{
              textAlign: "center"
            }}
          >
            <p
              dangerouslySetInnerHTML={{
                __html: text
              }}
            />
            <Button
              bsSize="large"
              bsStyle={`${
                message && message.length > 0
                  ? "success"
                  : loading ? "warning" : isErr ? "danger" : "primary"
              }`}
              onClick={handleDataCall}
              disabled={message != null && message.length > 0}
              style={{
                marginTop: 20,
                textTransform: "capitalize"
              }}
            >
              {message && message.length > 0
                ? makePastTense(btnText.split(" ")[0])
                : loading ? makePresentProg(btnText.split(" ")[0]) : btnText}
            </Button>
          </div>
        );
        break;
      default:
        break;
    }
    return body;
  };

  render = () => {
    const { errors, message, loading, type } = this.props;
    const modalContent = type ? this.renderModalBody() : null;
    return (
      <Modal
        id="modal-scroll-body"
        className="info-modal"
        show={type != null}
        onHide={() => {
          if (type === "RED" && this.props.dataCall && this.props.offer) {
            let formData = !this.props.offer.earnedOffer
              ? null
              : this.props.compactFormData(this.props.offer.earnedOffer);
            this.props.dataCall(
              this.props.offer.userId,
              this.props.offer.busId,
              this.props.offer.offId,
              formData,
              this.handleResetTimer
            );
          } else {
            this.close();
          }
        }}
      >
        <Modal.Header closeButton />
        <Modal.Body>
          {type ? (
            <div className="modal-info-wrapper">{modalContent}</div>
          ) : null}
        </Modal.Body>
      </Modal>
    );
  };
};

const mapStateToProps = ({ user, businesses }) => ({
  errors: businesses.errors[CHANGE_BUSINESS],
  message: businesses.messages[CHANGE_BUSINESS],
  loading: businesses.loading[CHANGE_BUSINESS],
  auth: {
    errors: user.errors[USER_ACTION],
    message: user.messages[USER_ACTION],
    loading: user.loading[USER_ACTION]
  }
});

export default connect(mapStateToProps, {})(InfoModal);
