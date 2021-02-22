import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { reduxForm } from "redux-form";
import { Field } from "redux-form";
import Alert from "../notification/alert";
import { Button } from "react-bootstrap";
import { Link, withRouter } from "react-router-dom";
import { getApiUrl, getAppUrl } from "../../util/environment-utils";
import { setCookie, getAuthenticatedWithPromise } from "../../util/cookie-utils";
import changeCase from "change-case";
import Paper from "material-ui/Paper";

import ForgotPassword from "./forgot-password";
import TextInput from "../form-fields/text-input";
import { basicPlugRedirect, toggleModal, toggleModalSec } from "../../redux/modules/user";
import {
  login,
  register,
  clearAuthCache,
  googleLogin,
  facebookLogin,
  CHANGE_AUTH
} from "../../redux/modules/authentication";
import { errorPropTypes } from "../../util/proptype-utils";
import LegalInfo from "../about/legal-info";
import { legalSource } from "../../util/plugwin-utils";
import { gglIcon, fbIcon, emailIcon } from "../social/social-media-utils";

const required = value => (value
  ? undefined
  : " ");

let form = reduxForm({ form: "login" });

class LoginRegister extends Component {
  static propTypes = {
    handleSubmit: PropTypes.func,
    desiredPath: PropTypes.string,
    toggleModal: PropTypes.func,
    basicPlugRedirect: PropTypes.func,
    login: PropTypes.func,
    register: PropTypes.func,
    errors: errorPropTypes,
    message: PropTypes.string,
    loading: PropTypes.bool
  };

  static formSpec = {
    login: [
      {
        id: "email",
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "you@email.com",
        validate: required,
        autocomplete: "login-section login email",
        component: TextInput
      },
      {
        id: "password",
        name: "password",
        label: "Password",
        type: "password",
        placeholder: "********",
        validate: required,
        autocomplete: "login-section login password",
        component: TextInput
      }
    ],
    register: [
      {
        id: "firstName",
        name: "name.first",
        label: "First Name",
        type: "text",
        validate: required,
        placeholder: "John",
        component: TextInput
      },
      {
        id: "lastName",
        name: "name.last",
        label: "Last Name",
        type: "text",
        validate: required,
        placeholder: "Smith",
        component: TextInput
      },
      {
        id: "email",
        name: "email",
        label: "Email",
        type: "email",
        validate: required,
        placeholder: "you@email.com",
        component: TextInput
      },
      {
        id: "password",
        name: "password",
        label: "Password",
        type: "password",
        validate: required,
        placeholder: "********",
        component: TextInput
      },
      {
        id: "passwordConfirm",
        name: "passwordConfirm",
        label: "Confirm Password",
        type: "password",
        validate: required,
        placeholder: "********",
        component: TextInput
      }
    ]
  };

  constructor(props) {
    super(props);
    this.state = {
      type: props.type || "login",
      method: props.isEmail ? "email" : "",
      showGoogle: true
    };
    if (props.type !== "login") {
      form = reduxForm({ form: props.type });
    }
  }

  componentWillMount = () => !this.props.isEmail ? this.props.clearAuthCache() : false;

  navigateToEntryPoint = () => {
    if (this.props.onAuthenticate && typeof this.props.onAuthenticate === 'function') {
      return this.props.onAuthenticate();
    }
    const path = this.props.desiredPath || "/dashboard";
    // // console.log("Entry point: ", path);
    this.props.clearAuthCache();
    this.props.toggleModal();
    return this.props.history.push(path);
  };

  handleFormSubmit = formProps => {
    const { type } = this.state;
    if (type === "login") {
      this.props.login(formProps, this.navigateToEntryPoint);
    } else {
      this.props.register(formProps, this.navigateToEntryPoint);
    }
  };

  closeTempOverlay = () => {
    this.props.clearAuthCache();
    this.props.toggleModalSec();
  };

  handleLegalClick = (e, src) => {
    e.preventDefault();
    this.props.clearAuthCache();
    this.props.toggleModalSec({
      type: e.target.text,
      closeOverride: this.closeTempOverlay,
      children: <LegalInfo src={src} />
    });
  };

  handleForgotPassword = (e, isSocial = false) => {
    e.preventDefault();
    this.props.clearAuthCache();
    this.props.toggleModalSec({
      extraClasses: "auth-modal",
      closeOverride: this.closeTempOverlay,
      children: <ForgotPassword close={this.closeTempOverlay} isSocial={isSocial} />
    });
  };

  authWithFacebook = token => this.props.facebookLogin(token, this.navigateToEntryPoint);

  checkFacebookOrSignIn = () => {
    const havePopupBlockers = ('' + window.open).indexOf('[native code]') === -1;
    if (havePopupBlockers) {
      return alert("Please ensure you allow popups for this site if you wish to use Facebook.");
    } else {
      FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          this.authWithFacebook(response.authResponse.accessToken);
        } else {
          FB.login(response => {
            if (response.status === 'connected') {
              this.authWithFacebook(response.authResponse.accessToken);
            } else {
              alert('You must log in or sign up using an alternative method.');
            }
          }, {scope: 'public_profile,email'});
        }
      });
    }
  };

  onGoogleSignIn = (GoogleUser) => {
    let token = GoogleUser.getAuthResponse().access_token;
    // console.log(token);
    if (token) {
      this.props.googleLogin(token, this.navigateToEntryPoint);
    }
  };

  clearMethod = () => {
    this.setState({method: ""}, () => {
      this.props.clearAuthCache();
      document.getElementById("appTop").scrollTop = 0;
    });
  };

  setMethodForEmail = () => this.setState({method: "email"});

  render = () => {
    const {
      handleSubmit,
      errors,
      message,
      loading,
      desiredPath,
      submitting,
      valid,
      pristine,
      busOnlyDisplay,
      location
    } = this.props;
    const { type, method } = this.state;
    const isEmail = method === "email";
    const otherType = type === "login" ? "register" : "login";
    const capitalizedType = type.charAt(0).toUpperCase() + type.substring(1);
    const businessRedirect =
      desiredPath && desiredPath.split("/")[1] === "plug" && desiredPath.split("/")[2] === "confirmed"
        ? changeCase.titleCase(desiredPath.split("/")[3])
        : null;
    const businessOnlyRedirect = 
      desiredPath && desiredPath.split("/")[1] === 'bus' ?
        changeCase.titleCase(desiredPath.split("/")[2])
        : !busOnlyDisplay || !location ? null : location.pathname.split("/")[1] === 'bus' ? changeCase.titleCase(location.pathname.split("/")[2]) : null;
    const plugId = businessRedirect ? desiredPath.split("/")[3] : null;
    const handleBasicPlugRedirect = () =>
      plugId ? this.props.basicPlugRedirect(plugId) : null;
    const disclaimerSection = (
      <span
        className="tos-disclaimer"
        style={{
          display: "block",
          fontSize: 14,
          fontWeight: 300,
          margin: "0 0 15px",
          color: "#ededed",
          textAlign: isEmail ? 'left' : 'center'
        }}
          >
        By signing up you indicate that you have read and agree to the{" "}
        <a
          href={"javascript:void(null);"}
          onClick={e => this.handleLegalClick(e, legalSource.terms)}
        >
          Terms of Use
        </a>{" "}
        and{" "}
        <a
          href={"javascript:void(null);"}
          onClick={e => this.handleLegalClick(e, legalSource.privacy)}
        >
          Privacy Policy
        </a>.
      </span>
    );
    return (
      <div
        className={`auth-box container ${
          loading || submitting ? "is-loading" : ""
        }`}
      >
        <h1 style={{textAlign: 'center', color: "#fff", fontWeight: 300}}>{businessRedirect || businessOnlyRedirect ? 
          <span>{businessRedirect || businessOnlyRedirect} Rewards</span>
        : <span className="plug-span">plugwin</span>}</h1>
        <h4><span>Get rewarded for recommending<br/>{businessRedirect || businessOnlyRedirect || 'your favorite businesses'}</span></h4>
        <br/>
        {!isEmail ? <div>
          <Paper id="signinButton" className={`social-login-btn${window.googleDisabled ? ' disab' : ''}`} zDepth={3} onClick={() => {
              if (window.googleDisabled || !gapi["auth2"]) {
                return false;
              }
              let myAuth = gapi.auth2.getAuthInstance();
              if (myAuth.isSignedIn.get()) {
                myAuth.signOut().then(myAuth.signIn({scope: 'profile email'}).then(this.onGoogleSignIn)).catch(err => {
                  console.log(err);
                });
              } else {
                myAuth.signIn({scope: 'profile email'}).then(this.onGoogleSignIn).catch(err => {
                  console.log(err);
                });
              }
          }}>{gglIcon(24, 24, "#EDEDED")}<span>Continue with Google</span></Paper>
          <br />
          <Paper id="fbSignIn" className="social-login-btn" zDepth={3} onClick={this.checkFacebookOrSignIn}>
            {fbIcon(24, 24, "#EDEDED")}<span>Continue with Facebook</span></Paper>
          <br/>
          <Paper className="social-login-btn" zDepth={3} onClick={this.setMethodForEmail}>
            {emailIcon(24, 24, "#EDEDED")}<span>Continue with Email</span></Paper>
          <br/>
        </div> : null}
        {isEmail ? <form className="form auth-form" onSubmit={handleSubmit(this.handleFormSubmit)}>
          <Alert errors={errors} icon="error_outline" />
          <Alert message={message} icon="done" />
          <ul className="form-list">
            {LoginRegister.formSpec[type].map(field => (
              <li key={field.id}>
                <Field {...field} />
              </li>
            ))}
          </ul>
          <div style={{textAlign: 'center'}}>
            <Button bsSize="large" bsStyle="default" type="button" style={{marginRight: 10}} onClick={this.clearMethod}>Cancel</Button>
            <Button bsSize="large" bsStyle="primary" type="submit" style={{marginLeft: 10}} disabled={!valid || pristine || submitting}>
              {capitalizedType}
            </Button>
          </div>
        </form> : null}
        {isEmail && <br />}
        {disclaimerSection}
        {isEmail && type === "login" ? (
          <a
            className="inline"
            href={"javascript:void(null);"}
            onClick={this.handleForgotPassword}
          >
            Forgot password?
          </a>
        ) : null}
        {isEmail && <br/>}
        {isEmail && type === "login" && (
          <a
           className="inline"
           href={"javascript:void(null);"}
           onClick={e => this.handleForgotPassword(e, true)}
          >
            Already registered using Google or Facebook?
          </a>
        )}
        {isEmail && type === "login" && <br />}
        {isEmail ? <a href={"javascript:void(null);"} onClick={e => {
          e.preventDefault();
          this.props.clearAuthCache();
          this.setState({ type: otherType }, () => {
            document.getElementById("appTop").scrollTop = 0;
          });
        }}to={otherType} className="inline highlight">
          {type === "login" ? "New to Plugwin?" : "Already a user?"}
        </a> : null}
      </div>
    );
  };
}

const mapStateToProps = ({ authentication }) => ({
  user: authentication.user,
  errors: authentication.errors[CHANGE_AUTH],
  message: authentication.messages[CHANGE_AUTH],
  loading: authentication.loading[CHANGE_AUTH],
  authenticated: authentication.authenticated,
  desiredPath: authentication.desiredPath
});

export default withRouter(
  connect(mapStateToProps, {
    login,
    register,
    googleLogin,
    facebookLogin,
    clearAuthCache,
    basicPlugRedirect,
    toggleModal,
    toggleModalSec
  })(form(LoginRegister))
);
