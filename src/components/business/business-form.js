import React from "react";
import { connect } from "react-redux";
import { Field, reduxForm, formValueSelector, change } from "redux-form";
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";
import {
  SelectField,
  TextField
} from "redux-form-material-ui";
import { isEmail, isURL } from "validator";

import AutoComplete from "./redux-form-material-ui/AutoComplete";
import ColorPicker from "../form-fields/color-picker";
import { categories, subcategoryMapper, getSubcategoriesByCategory } from "../../util/business-utils";
import Alert from "../notification/alert";

import { getAppUrl } from "../../util/environment-utils";
import {
  CHANGE_BUSINESS
} from "../../redux/modules/business";
import { toggleModal } from "../../redux/modules/user";

import SettingsPopover from "./settings-popover";
import { paramCase } from "change-case";

import StripeForm from "../billing/stripe-form";

let form = reduxForm({ form: "editBusiness" });

/* Form validators and normalizers */
const required = value => (value ? undefined : "Required");

const email = value => !isEmail(value) ? "Enter a valid email address" : undefined;

const url = value => !isURL(value) ? "Enter a valid URL" : undefined;

const fullWidth = {
  width: "calc(100% - 25px)"
};

const requiredStyle = {
  position: 'absolute',
  bottom: -12
};

const phoneLabelStyle = {
  fontSize: 12
};

class BusinessForm extends React.PureComponent {
  constructor(props) {
    super(props);
  };

  handleColorChange = (color, name) => {
    this.props.change(name, color);
  };

  render () {
    const {
      handleSubmit,
      type,
      pristine,
      valid,
      submitting, 
      errors,
      onSubmit,
      business,
      closeModal,
      isMobile,
      isPhone,
      subcategory,
      subcategories,
      vals,
      initialValues
    } = this.props;
    const colorFieldStyle = !isPhone ? {
      verticalAlign: 'middle',
      display: 'inline-block',
      marginLeft: 15
    } : {
      paddingTop: 10
    };
    const deleteBtnProps = {
      labelColor: "#fff",
      disabled: submitting,
      backgroundColor: "#f96161"
    };
    const isAdd = type && type.toLowerCase() === "add";
    if (isAdd) {
      form = reduxForm({ form: "addBusiness" });
    }
    const primaryChanged = !isAdd && vals && (vals.primaryColor !== initialValues.primaryColor);
    const handleFormSubmit = formProps => {
      let workingURL = formProps.baseUrl.toLowerCase();
      let prefix = 'http://';
      if (workingURL.substr(0, prefix.length) !== prefix)
      {
          workingURL = prefix + workingURL;
      } else if (workingURL.substr(0, prefix.length).toLowerCase() === prefix) {
          workingURL = prefix + workingURL.slice(prefix.length);
      }
      formProps.links = [
        {label: "Home", val: workingURL}
      ];
      onSubmit(formProps, primaryChanged);
    };
    const editBreak = !isAdd && <br/>;
    return (
      <form
        className="business-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{
          textAlign: "center"
        }}
      >
        {isAdd && <h1 style={{fontWeight: 300}}>{vals && vals.name ? vals.name : "Your Business Name Here"}</h1>}
        <Alert errors={errors} icon="error_outline"/>
        <Field
          name="name"
          style={fullWidth}
          errorStyle={requiredStyle}
          component={TextField}
          hintText="Enter your business name here..."
          floatingLabelText="Business name"
          validate={required}
          maxLength={50}
        />
        <br/>
        <Field
          name="email"
          style={fullWidth}
          errorStyle={requiredStyle}
          component={TextField}
          hintText="Enter your business email here..."
          floatingLabelText="Business email"
          validate={[required, email]}
          maxLength={40}
        />
        <br/>
        {!isMobile ?
              <div className="multi-field-section">
                  <Field
                      className="multi-field"
                      name="category"
                      style={{ textAlign: "left" }}
                      component={SelectField}
                      autoWidth={true}
                      validate={required}
                      onChange={(e, key) => {
                        let formStr = isAdd ? "addBusiness" : "editBusiness";
                        this.props.change(formStr, "subcategory", "");
                        this.props.untouch(formStr, "subcategory");
                      }}
                      errorStyle={requiredStyle}
                      hintText="Select the most fitting category..."
                      floatingLabelText={"Business Category"}>
                          {categories.map((cat, i) => (
                              <MenuItem key={i} value={cat.value} primaryText={cat.description} />
                          ))}
                  </Field>
                  <Field
                      className="multi-field"
                      name="subcategory"
                      disabled={!subcategories}
                      style={{ textAlign: "left" }}
                      component={SelectField}
                      autoWidth={true}
                      validate={required}
                      errorStyle={requiredStyle}
                      hintText={!subcategories ? "Choose the category first..." : "Select the most fitting subcategory..."}
                      floatingLabelText={subcategories ? "Business Subcategory" : "Select the category first"}>
                          {subcategories ? subcategories.map((scat, i) => (
                              <MenuItem key={i} value={scat.value} primaryText={scat.description} />
                          )) : <MenuItem value={""} primaryText="Choose the category first" />}
                  </Field>
              </div>
          :
              <div>
                  <Field
                      name="category"
                      className="business-select"
                      style={Object.assign(fullWidth, { textAlign: "left" })}
                      component={SelectField}
                      validate={required}
                      fullWidth={true}
                      onChange={(e, key) => {
                        let formStr = isAdd ? "addBusiness" : "editBusiness";
                        this.props.change(formStr, "subcategory", "");
                        this.props.untouch(formStr, "subcategory");
                      }}
                      errorStyle={requiredStyle}
                      hintText="Select the most fitting category..."
                      floatingLabelText={"Business Category"}>
                          {categories.map((cat, i) => (
                              <MenuItem key={i} value={cat.value} primaryText={cat.description} />
                          ))}
                  </Field>
                  <br/>
                  <Field
                      name="subcategory"
                      className="business-select"
                      disabled={!subcategories}
                      style={Object.assign(fullWidth, { textAlign: "left" })}
                      component={SelectField}
                      fullWidth={true}
                      errorStyle={requiredStyle}
                      validate={required}
                      hintText={!subcategories ? "Choose the category first..." : "Select the most fitting subcategory..."}
                      floatingLabelText={subcategories ? "Business Subcategory" : "Select the category first"}>
                          {subcategories ? subcategories.map((scat, i) => (
                              <MenuItem key={i} value={scat.value} primaryText={scat.description} />
                          )) : <MenuItem value={""} primaryText="Choose the category first" />}
                  </Field>
              </div>
          }
        <br />
        <Field
          name="baseUrl"
          style={fullWidth}
          component={TextField}
          hintText="www.yourwebsite.com/"
          floatingLabelText="Your Business Link"
          validate={[required, url]}
          maxLength={100}
          errorStyle={requiredStyle}
        />
        <br/>
        <br/>
        <div className="multi-field-section" style={{
          marginTop: 20
        }}>
          <div className="multi-field color-field">
            <label style={{
              display: 'inline'
            }}>Primary Color
              <Field
                ref={input => this.colorValue = input}
                name="primaryColor"
                component="input"
                type="hidden"
              />
              <Field
                style={colorFieldStyle}
                name="primaryColor"
                component={ColorPicker}
                initialColor={this.props.initialValues.primaryColor}
                onColorChange={color => this.handleColorChange(color, 'primaryColor')}
                />
            </label>
          </div>
          <div className="multi-field color-field">
            <label style={{
               display: 'inline'
            }}>Secondary Color
              <Field
                ref={input => this.colorValue = input}
                name="secondaryColor"
                component="input"
                type="hidden"
              />
              <Field
                style={colorFieldStyle}
                name="secondaryColor"
                component={ColorPicker}
                initialColor={this.props.initialValues.secondaryColor}
                onColorChange={color => this.handleColorChange(color, 'secondaryColor')}
                />
            </label>
          </div>
        </div>
        <br/>
        <Field
          name="description"
          style={fullWidth}
          component={TextField}
          hintText="Enter a brief business description here..."
          floatingLabelText="Description"
          multiLine={true}
          maxLength={75}
          rows={2}
          rowsMax={3}
        />
        {editBreak}
        {editBreak}
        {!isAdd && this.props.handleLaunchLinksView && <RaisedButton 
              style={{margin: '0 5px'}}
              secondary={true} onClick={e => {
                e.preventDefault();
                this.props.handleLaunchLinksView();
              }} label="View Your Links" />}
        <br/>
        <br/>
        {!isAdd && !this.props.isVerified && <RaisedButton style={{margin: '0 5px'}} backgroundColor="#0070ba" labelColor="#fff" onClick={e => {
            e.preventDefault();
            this.props.toggleModal({ type: "Let Customers See You", children: <StripeForm busName={this.props.name || ""} busId={this.props.id} email={this.props.email}/> });                       
          }} label="Let Customers See You" />}
        {!isAdd && !this.props.isVerified && <br/>}
        {!isAdd && !this.props.isVerified && <br/>}
        <div
          className="field-group-container"
          style={{
            textAlign: "center"
          }}
        >
          {!isAdd && this.props.onDelete && (
            <SettingsPopover
              headerText={"Are you sure?"}
              originLabel={"Remove"}
              rootStyle={{marginRight: 5, display: "inline-block", width: 'auto'}}
              btnWidth={isPhone ? 'auto' : 225}
              primaryProps={deleteBtnProps}
              originProps={Object.assign({}, deleteBtnProps, {
                labelStyle: isPhone ? phoneLabelStyle : null
              })}
              primaryOnClick={this.props.onDelete}
              primaryLabel={"Yes, remove this business"}
              closeLabel={"No, keep this business"}
            />
          )}
          
          <RaisedButton
            type="submit"
            style={!isAdd ? {marginLeft: 5} : null}
            labelStyle={isPhone ? phoneLabelStyle : null}
            label={isAdd ? "Add Your Business" : `Update${primaryChanged ? ' and Preview' : ''}`}
            primary={true}
            disabled={!valid || pristine || submitting}
          />
        </div>
      </form>
    );
  }
  
};

// Decorate with redux-form
BusinessForm = reduxForm({
  form: "BusinessForm", // a unique identifier for this form
  enableReinitialize: true
})(BusinessForm);

BusinessForm = connect(({ util, form, authentication, businesses }, ownProps) => {
  const { BusinessForm } = form;
  const { isMobile, isPhone } = util;
  const isValues = BusinessForm && !!BusinessForm.values;
  return {
    errors: businesses.errors[CHANGE_BUSINESS],
    vals: isValues ? Object.assign({}, BusinessForm.values) : null,
    isMobile,
    isPhone,
    subcategories: isValues ? getSubcategoriesByCategory(BusinessForm.values.category) : ownProps.category ? getSubcategoriesByCategory(ownProps.category) : getSubcategoriesByCategory(categories[0].value),
    initialValues: {
      name: ownProps.name || "",
      email: ownProps.email || authentication.email || "",
      category: ownProps.category || categories[0].value,
      subcategory: ownProps.subcategory || "",
      baseUrl: ownProps.links && ownProps.links[0].val ? ownProps.links[0].val : "",
      description: ownProps.description || "",
      primaryColor: ownProps.theme && ownProps.theme.primary ? ownProps.theme.primary : "rgb(51, 51, 51)",
      secondaryColor: ownProps.theme && ownProps.theme.secondary ? ownProps.theme.secondary : "rgb(255, 255, 255)"
    }
  };
}, { toggleModal })(BusinessForm);

export default BusinessForm;
