import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {reduxForm, Field} from 'redux-form';
import {Link, withRouter} from 'react-router-dom';
import Alert from '../notification/alert'
import TextInput from '../form-fields/text-input';
import {Button} from 'react-bootstrap';
import {resetPassword, CHANGE_AUTH, RESET_PASSWORD} from '../../redux/modules/authentication';
import {toggleModal} from '../../redux/modules/user';
import LoginRegister from "./login-register";
import {errorPropTypes} from '../../util/proptype-utils';

const required = value => (value
  ? undefined
  : " ");

const form = reduxForm({form: 'resetPassword'});

class ResetPassword extends Component {
  static propTypes = {
    isCredited: PropTypes.bool,
    isSocial: PropTypes.bool,
    resetPassword: PropTypes.func,
    handleSubmit: PropTypes.func,
    errors: errorPropTypes,
    message: PropTypes.string,
    loading: PropTypes.bool,
    params: PropTypes.shape({token: PropTypes.string})
  };

  formSpec = [];

  constructor(props) {
    super(props);
    let formItems = [
      {
        id: 'password',
        name: 'password',
        label: `${props.isCredited ? "New " : props.isSocial ? "Your " : ""}Password`,
        type: 'password',
        placeholder: '********',
        validate: required,
        component: TextInput
      }, {
        id: 'passwordConfirm',
        name: 'passwordConfirm',
        label: 'Confirm Password',
        type: 'password',
        placeholder: '********',
        validate: required,
        component: TextInput
      }
    ];
    if (props.isCredited) {
      let moreFields = [
        {
          id: "firstName",
          name: "name.first",
          label: "First Name",
          type: "text",
          placeholder: "John",
          validate: required,
          component: TextInput
        },
        {
          id: "lastName",
          name: "name.last",
          label: "Last Name",
          type: "text",
          placeholder: "Smith",
          validate: required,
          component: TextInput
        },
      ];
      formItems.unshift(...moreFields);
    }
    this.formSpec.push(...formItems);
  }

  handleFormSubmit = formProps => this
    .props
    .resetPassword(formProps, this.props.match.params.token, this.props.isSocial)
    .then((value) => {
      if (value && value.message) {
        this.launchLogin(null, true)
      }
    });

  launchLogin = (e, useEmail = false) => {
    if (e) {
      e.preventDefault();
    }
    this.props.history.push("/");
    this.props.toggleModal({
      type: " ",
      extraClasses: "auth-modal show-close",
      children: <LoginRegister isEmail={useEmail}/>
    });
  }

  render() {
    const {handleSubmit, errors, message, loading, isCredited, isSocial, submitting, pristine, valid} = this.props;
    const isSubmitted = message.length > 0;
    const highlightClass = isSubmitted
      ? ' highlight'
      : '';
    return (
      <div
        className={`auth-box container reset-container ${loading
        ? 'is-loading'
        : ''}`}>
        <h1>{isCredited || isSocial ? "Update Your Info" : "Reset Password"}</h1>
        <br/>
        <form className="form" onSubmit={handleSubmit(this.handleFormSubmit)}>
          <Alert errors={errors} icon="error_outline"/>
          <Alert message={message} icon="done"/> {!isSubmitted
            ? (
              <div>
                <ul className="form-list">
                  {this.formSpec && this.formSpec.length && this.formSpec
                    .map(field => <li key={field.id}><Field {...field}/></li>)}
                </ul>
                <Button bsSize="large" bsStyle="primary" disabled={pristine || !valid || submitting} type="submit">{isCredited || isSocial ? "Submit" : "Change Password"}</Button><br/>
              </div>
            )
            : null
}
        </form>
        <a  
          className="inline"
          href={"javascript:void(null);"}
          onClick={this.launchLogin}
        >
            {isCredited ? 'Use Facebook or Google' : 'Back to login'}
        </a>
        {isCredited && <br/>}
        {isCredited && (
          <a  
            className="inline"
            href={"javascript:void(null);"}
            onClick={e => this.launchLogin(e, true)}
          >
              Login with your temporary password
          </a>
        )}
      </div>
    );
  }
}

const mapStateToProps = ({authentication}) => ({errors: authentication.errors[CHANGE_AUTH], message: authentication.messages[CHANGE_AUTH], loading: authentication.loading[CHANGE_AUTH]});

export default withRouter(connect(mapStateToProps, {resetPassword, toggleModal})(form(ResetPassword)));
