import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { reduxForm } from 'redux-form';
import { Link } from 'react-router-dom';
import TextInput from '../form-fields/text-input';
import GenericForm from '../form-fields/generic-form';
import { forgotPassword, CHANGE_AUTH } from '../../redux/modules/authentication';
import { errorPropTypes } from '../../util/proptype-utils';

const required = value => (value
  ? undefined
  : " ");

const form = reduxForm({
  form: 'forgotPassword',
});

class ForgotPassword extends Component {
  static propTypes = {
    forgotPassword: PropTypes.func,
    handleSubmit: PropTypes.func,
    errors: errorPropTypes,
    message: PropTypes.string,
    loading: PropTypes.bool,
  };

  formSpec = [
    { id: 'email', name: 'email', label: "Email", type: 'email', validate: required, placeholder: 'you@yourdomain.com', component: TextInput },
  ];

  handleFormSubmit = formProps => this.props.forgotPassword(formProps, this.props.isSocial).then(() => this.props.close());

  render() {
    const { handleSubmit, errors, message, loading, valid, pristine, submitting, isSocial } = this.props;
    return (
      <div className={`auth-box container ${loading ? 'is-loading' : ''}`}>
        <h1>{isSocial ? "Request Your Own Plugwin Login" : "Forgot Password"}</h1>
        {isSocial && <br/>}
        {isSocial && <p style={{color: "#fff"}}>Enter the email associated with the Google or Facebook account you used to sign up.</p>}
        {isSocial && <br/>}
        <GenericForm
          onSubmit={handleSubmit(this.handleFormSubmit)}
          errors={errors}
          classNames="form auth-form"
          message={message}
          formSpec={this.formSpec}
          submitText="Send Email Link"
          valid={valid}
          pristine={pristine}
          submitting={submitting}
        />
        <br/>
          <a  
            className="inline"
            href={"javascript:void(null);"}
            onClick={this.props.close}
          >
              Back to login
          </a>
      </div>
    );
  }
}

const mapStateToProps = ({ authentication }) => ({
  errors: authentication.errors[CHANGE_AUTH],
  message: authentication.messages[CHANGE_AUTH],
  loading: authentication.loading[CHANGE_AUTH]
});

export default connect(mapStateToProps, { forgotPassword })(form(ForgotPassword));
