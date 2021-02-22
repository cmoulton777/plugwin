import React from "react";
import _ from "lodash";
import {connect} from "react-redux";
import {Field, reduxForm} from "redux-form";
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";
import {
    SelectField,
    TextField,
    DatePicker
} from "redux-form-material-ui";

import {toggleModal} from "../../redux/modules/user";
import {toggleOverlay} from "../../redux/modules/authentication";
import {getUsersByBusinessSub, getPurchaseTypes, getCategories, getCategoryById, getBusiness} from "../../redux/modules/business";

import SettingsPopover from "./settings-popover";
import NotificationsView from "../notification/notifications-view";
import FlatButton from "material-ui/FlatButton/FlatButton";
import { pluralize } from "../../util/helper-methods";
import AutoCompleteField from "./auto-complete";

import { getDateMMDDYYYY } from "../../util/helper-methods";

const fullWidth = {
    width: "calc(100% - 25px)"
};

const isNotObjectId = value => !(/^[a-z0-9]+$/i.test(value) && value.length === 24);

/* Form validators and normalizers */
const required = value => (value
  ? undefined
  : "Required");

const greaterThanZero = value => value && parseFloat(value) > 0 ? undefined : "Cannot be $0.00";

const email = value => {
  if (!value) {
    return undefined;
  }
  if (value.indexOf("@") === -1) {
    return !/^[a-z0-9]+$/i.test(value) || value.length !== 24 ?
    "Select a subscriber or enter a valid email address" : undefined;
  }
  if (value.indexOf("(") > -1) {
    return !(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value.split("(")[1].slice(0, -1))) ?
    'Invalid email address' : undefined;
  }
  return !(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(value)) ?
    'Invalid email address' : undefined;
};

const requiredStyle = {
    position: 'absolute',
    bottom: -12
};

const lessThanZeroInt = value =>
  value
    ? parseInt(value) < 1
      ? parseInt(value) > -1
        ? "1"
        : parseInt(Math.abs(parseInt(value))).toString()
      : parseInt(value).toString()
    : "";

const lessThanZeroFloat = value =>
  value
    ? parseFloat(value) < 0
      ? parseFloat(value) > -2 ? "0.00" : Math.abs(Number(value)).toString()
      : value.toString().indexOf(".") > -1 &&
        value.toString().split(".").length === 2 &&
        value.toString().split(".")[1].length > 2
        ? parseFloat(value).toFixed(2).toString()
        : value.toString()
    : "";

class CreditForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      purchaseType: props.purchaseType || "",
      isCustom: (props.type !== "award" && props.type !== "request") || !props.purchaseTypes || props.purchaseTypes.length === 0,
      isQuickClick: false
    }
  }
  componentDidMount () {
    if (this.props.type === 'modify' && this.props.purchaseType && !this.props.purchaseTypes && this.props.businessId) {
      this.props.getBusiness(this.props.businessId);
    }
  }
  handlePurchaseTypeChange = (e, key, payload) => {
    // key exists and is not empty string (as selecting "Custom" would trigger)
    if (this.state.purchaseType !== key) {
      if (key) {
        let type = _.mapKeys(this.props.purchaseTypes, p => p._id)[key];
        let purchases = this.props.purchases ? Number(this.props.purchases) : 1;
        this.props.change('amountSpent', (Number(type.amountSpent)*purchases).toFixed(2));
      }
      this.setState({ purchaseType: key});
    }
  }
  componentDidUpdate (prevProps) {
    if (this.props.type === "award" && this.props.purchaseTypes && this.props.purchaseTypes.length > 0 && prevProps.purchaseTypes !== this.props.purchaseTypes) {
      this.setState({ isCustom: false });
    }
  }
  useCustom = (use = true) => this.setState({isCustom: use});
  useQuickClick = (use = true) => this.setState({isQuickClick: use});
  onPurchaseTypeClick = (type, isRequest = false) => {
    this.props.change('purchaseType', type._id);
    this.props.change('visits', "1");
    this.props.change('purchases', "1");
    this.props.change('amountSpent', type.amountSpent.toString());
    if (isRequest && typeof this.props.hasPlugger !== 'undefined' && this.props.hasPlugger) {
      this.useQuickClick();
    }
    this.useCustom();
  }
  clearTransactionFields = () => {
    this.props.change('visits', "1");
    this.props.change('purchases', "1");
    this.props.change('amountSpent', "");
    this.props.change('description', "");
  }
  
  handlePurchasesChange = (e, val) => {
    const { pType, purchases } = this.props;
    if (pType && val && Number(val) !== purchases) {
      this.props.change("amountSpent", (Number(_.mapKeys(this.props.purchaseTypes, p => p._id)[pType].amountSpent)*Number(val)).toFixed(2));
    }
  }
  
  render () {
    const {
      handleSubmit,
      searchText,
      pristine,
      valid,
      reset,
      submitting,
      business,
      businessName,
      businesses,
      user,
      userId,
      subscribers,
      isPhone,
      onSubmit,
      onExit,
      closeModal,
      type,
      purchaseTypes,
      categories,
      category,
      hasPlugger,
      isEdit,
      descriptionText,
      pType,
      purchases
    } = this.props;
    const deleteBtnProps = {
      labelColor: "#fff",
      disabled: submitting,
      backgroundColor: "#f96161"
    };
    const {
      isCustom,
      isQuickClick
    } = this.state;
    const isAward = type === "award";
    const isModify = type === "modify";
    const isRequest = type === "request";
    const isPurchaseType = type === "purchaseType";
    let users = null;
    if (isPurchaseType || isAward) {
      if (business || (subscribers && subscribers.length && businesses && businesses.length === 1)) {
        let bus = business || businesses[0]._id;
        users = getUsersByBusinessSub(bus, subscribers);
      }
    }
    let busName = null;
    if (isPurchaseType || isAward) {
      if (businesses && businesses.length > 0) {
        busName = businesses.length > 1 ? (business ? _.mapKeys(businesses, b => b._id)[business].name : null) : businesses[0].name;
      } else {
        busName = business ? _.mapKeys(vendorAccounts, b => b._id)[business].name : null;
      }
    }
    const dataSource = !isPurchaseType && isAward && users && users.map(user => {
      const userName = user.name.trim();
      const nameSegment = userName ? `${userName} (${user.email})` : `guest${user._id.substr(user._id.length-10)} (${user.email})`;
      return ({
        text: nameSegment,
        value: user._id
      });
    });
    if (dataSource && user && user.length > 0 && isNotObjectId(user)) {
      if (dataSource.length > 4) {
        dataSource.splice(4, 0, {text: user, value: user});
      } else {
        dataSource.push({text: user, value: user});
      }
    }
    let dataSourceCategory = null;
    if (isPurchaseType && categories && categories.length) {
      dataSourceCategory = categories.map(cat => ({
        text: cat.name.trim(),
        value: cat._id
      }));
      if (dataSourceCategory && category && category.length > 0 && isNotObjectId(category)) {
        if (dataSourceCategory.length > 4) {
          dataSourceCategory.splice(4, 0, {text: category, value: category});
        } else {
          dataSourceCategory.push({text: category, value: category});
        }
      }
    }
    const handleFormSubmit = formProps => {
      if (!formProps.business) {
        formProps = Object.assign({}, formProps, {
          business: business || businesses[0]._id
        });
      }
      let formData = Object.assign({}, formProps);
      if (!formData.user && !isPurchaseType) {
        formData = Object.assign({}, formProps, {
          user: user || userId
        });
      } else if (formData.user.indexOf("@") > -1) {
        let encodedUserInfo = encodeURIComponent(formProps.user);
        formData.user = encodedUserInfo;
      }
      if (isPurchaseType) {
        delete formData.user;
      }
      if (this.props.requestApproved) {
        formData.requestApproved = true;
      }
      if (isAward) {
        this.props.toggleOverlay();
      }
      onSubmit(formData).then(response => {
        if (response && response.message) {
          onExit();
          if (response.message.indexOf("New user") > -1 || isModify) {
            setTimeout(() => {
              this.props.toggleModal({
                type: "Notifications",
                children: <NotificationsView />
              });
            }, 100);
          } else if (isPurchaseType || (response.purchaseTypes && response.purchaseTypes.length > 0)) {
            let businessRef = business || businesses[0]._id;
            if (isEdit) {
              closeModal(response.purchaseTypes, response.categories, busName, businessRef);
            } else {
              closeModal(businessRef);
            }
          } else if (!isAward) {
            closeModal();
          }
        } else {
          console.log(response);
          console.log(response.errors[0].error);
        }
      });
    };
    return (
      <form
        className="credit-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{
        textAlign: "center"
      }}>
        {!isAward && !isModify && ((isRequest && isCustom) || isPurchaseType) && <h5>{isPurchaseType && businesses && businesses.length > 1 && "Select the business you want to use. "}Enter the purchase credit you wish to {isPurchaseType ? "have recieved" : "recieve"} below{isPurchaseType && " when you use this purchase type to award purchase credit for customers and they use it to request purchase credit from you"}.</h5>}
          <div style={{width: "100%"}}>
            <div>
              {(business && !isAward && !isPurchaseType && businessName) || ((isAward || isPurchaseType) && businesses && ( businesses.length === 1 || (isPurchaseType && this.props.isEdit && business && _.mapKeys(businesses, b => b._id)[business])) )
              ? (
                  <div className="business-selection">
                    <h2
                        style={{
                        margin: '0 0 5px',
                        fontWeight: 300
                    }}>{businessName || businesses[0].name}</h2>
                  </div>
              )
              : (isAward || isPurchaseType) && businesses && businesses.length > 1
                  ? (
                      <Field 
                          name="business" 
                          className="business-selection"
                          style={Object.assign({textAlign: 'left'}, fullWidth)}
                          menuStyle={{
                            textAlign: 'left'
                          }}
                          component={SelectField} 
                          floatingLabelText={"Select a business"}
                          validate={required}
                      >
                          {businesses && businesses.map((busOption, i) => (
                              <MenuItem value={busOption._id} key={i} primaryText={busOption.name}/>
                          ))}
                      </Field>
                  )
                  : null}
                  {isAward && (users ?
                    <AutoCompleteField
                      name="user" 
                      className="award-search"
                      validate={[required, email]}
                      floatingLabelText={'Choose Customer to Award'}
                      maxSearchResults={5}
                      popoverProps={{
                        className: "award-search-popover",
                        canAutoPosition: isPhone,
                        zDepth: 2
                      }}
                      hintText={!user && "Find/enter new subscriber by email"}
                      dataSource={dataSource} 
                    />
                  :
                    <AutoCompleteField
                      name="user" 
                      className="award-search"
                      validate={required}
                      disabled={true}
                      floatingLabelText={'Select a business first'}
                      dataSource={[{text: "Select a business first"}]}
                    />
                )}
            </div>
            <br />
            {((isAward || isRequest) && !isCustom && purchaseTypes && purchaseTypes.length) ? (
              <div style={{textAlign: "center"}}>
                <div className="purchase-types-container" style={{position: 'relative', padding: '40px 10px 10px'}}>
                  {purchaseTypes.map((p, i) => (
                    <RaisedButton fullWidth={isPhone} key={`pt-${i+1}`} style={{margin: (!isPhone ? 5 : '15px 0'), display: isPhone ? 'block' : 'inline-block'}} primary={true} label={p.description} onClick={() => this.onPurchaseTypeClick(p, isRequest)}/>
                  ))}
                  <div style={Object.assign({}, {position: 'absolute', top: 10, right: (isPhone || isRequest ? "50%" : 12), fontSize: 18, cursor: "pointer"}, isPhone || isRequest ? {
                    WebkitTransform: 'translateX(50%)',
                    transform: 'translateX(50%)',
                    minWidth: 200
                  } : null)}
                  onClick={() => {
                    let busId = business || businesses[0]._id;
                    if (isAward && this.props.viewPurchaseTypes && typeof this.props.viewPurchaseTypes === 'function') {
                      this.props.viewPurchaseTypes(purchaseTypes, busName, busId, user, categories);
                    }
                  }}>{isRequest ? "Select a Purchase Type" : `Edit Purchase ${pluralize(purchaseTypes.length, "Type")} `}{isAward && <span className="material-icons" style={{
                    verticalAlign: 'text-bottom',
                    display: 'inline-block'
                  }}>edit</span>}</div>
                </div>
                <br />
                <a style={{color: "#333", textDecoration: 'underline'}} href="javascript:void(null);" onClick={e => {
                  e.preventDefault();
                  this.clearTransactionFields();
                  this.useCustom();
                }}>{isAward ? "Enter customer credit award manually" : "Request purchase credit manually"}</a>
              </div>
            ) :
            <div>
              <div style={{position: 'relative'}}>
              {(isAward || isRequest || isModify) && purchaseTypes && purchaseTypes.length > 0 && (
                  <div style={{width: 'calc(100% - 25px)', margin: '-14px auto 0'}}>
                    <Field
                      name="purchaseType"
                      style={isQuickClick ? {display: "none"} : null}
                      component={SelectField}
                      fullWidth={true}
                      floatingLabelText="Purchase Type"
                      validate={!descriptionText ? required : null}
                      errorStyle={!descriptionText ? requiredStyle : {}}
                      onChange={this.handlePurchaseTypeChange}
                    >
                      <MenuItem value={""} primaryText={"Custom"} />
                      {purchaseTypes.map(p => (
                        <MenuItem value={p._id} key={`ptselect-${p._id}`} primaryText={p.description} />
                      ))}
                    </Field>
                  </div>
                )}
              {!isPhone ? 
              <div className="multi-field-section">
                  {!isPurchaseType && 
                    <Field
                      name={"visits"}
                      style={isQuickClick ? {display: "none"} : null}
                      className="multi-field thirds"
                      component={TextField}
                      errorStyle={requiredStyle}
                      type="number"
                      floatingLabelText={"Number of Visits"}
                      hintText="1"
                      validate={required}
                      normalize={lessThanZeroInt}
                      parse={v => Number(v)}/>}
                  {!isPurchaseType && <Field
                      name={"purchases"}
                      className="multi-field thirds"
                      component={TextField}
                      errorStyle={requiredStyle}
                      onChange={this.handlePurchasesChange}
                      type="number"
                      floatingLabelText={"Unique Purchases"}
                      hintText="1"
                      validate={required}
                      normalize={lessThanZeroInt}
                      parse={v => Number(v)}/>}
                  <Field
                      name={"amountSpent"}
                      className="multi-field thirds"
                      component={TextField}
                      errorStyle={requiredStyle}
                      type="number"
                      hintText="$0.00"
                      floatingLabelText={!isPurchaseType ? "Amount Spent ($)" : "Value ($)"}
                      validate={[required, greaterThanZero]}
                      normalize={lessThanZeroFloat}
                  />
              </div>
              :   
                  <div style={{width: "100%"}}>
                      {!isPurchaseType && (
                        <div className="multi-field-section">
                            <Field
                                name={"visits"}
                                style={isQuickClick ? {display: "none"} : null}
                                className="multi-field"
                                component={TextField}
                                errorStyle={requiredStyle}
                                type="number"
                                floatingLabelText={"Number of Visits"}
                                hintText="1"
                                validate={required}
                                normalize={lessThanZeroInt}
                                parse={v => Number(v)}/>
                            <Field
                                name={"purchases"}
                                className="multi-field"
                                component={TextField}
                                errorStyle={requiredStyle}
                                onChange={this.handlePurchasesChange}
                                type="number"
                                floatingLabelText={"Unique Purchases"}
                                hintText="1"
                                validate={required}
                                normalize={lessThanZeroInt}
                                parse={v => Number(v)}/>
                        </div>
                      )}
                      {!isPurchaseType && <br />}
                      <Field
                          name={"amountSpent"}
                          component={TextField}
                          errorStyle={requiredStyle}
                          type="number"
                          hintText="$0.00"
                          floatingLabelText={!isPurchaseType ? "Amount Spent ($)" : "Value ($)"}
                          validate={[required, greaterThanZero]}
                          normalize={lessThanZeroFloat}
                      />
                  </div>
              }
            </div>
            {!isPurchaseType && pType && <br/>}
            {!isPurchaseType && pType && (
              <Field
                name="onOrAfter"
                component={DatePicker}
                validate={required}
                errorStyle={requiredStyle}
                format={null}
                maxDate={new Date()}
                mode={!isPhone ? "landscape" : "portrait"}
                autoOk={false}
                hideCalendarDate={false}
                cancelLabel={"Cancel"}
                formatDate={getDateMMDDYYYY}
                hintText={"Select"}
                floatingLabelText={purchases && Number(purchases) > 1 ? "Earliest Purchase Date" : "Purchase Date"}
              />
            )}
            <br/>
            <div
              className="field-group-container"
              style={{
              textAlign: 'center'
            }}>
              {((isRequest && !hasPlugger) || isAward) && <label className="recommend-label" style={{width: 'calc(100% - 25px)'}}><b>Be sure to include the email of the primary person who recommended {businessName || busName || "this business"}{" "}
              {isRequest ? "to you " : "to the customer outside of Plugwin"}{isPhone ? <br/> : " "}(to the best of your knowledge).</b></label>}
              {!isQuickClick && <Field
                  name="description"
                  component={TextField}
                  validate={isPurchaseType || ((isAward || isModify || isRequest) && !pType) ? required : null}
                  errorStyle={isPurchaseType || ((isAward || isModify || isRequest) && !pType) ? requiredStyle : {}}
                  floatingLabelText={isPurchaseType ? "Purchase Type Name" : "Purchase Credit Description"}
                  hintText={"Describe the transaction(s)"}
                  multiLine={!isPurchaseType}
                  style={fullWidth}
                  maxLength={isPurchaseType ? 40 : 164}
                  rows={isPurchaseType ? 1 : 2}
                  rowsMax={isPurchaseType ? 1 : 3}
              />}
            </div>
            {isPurchaseType && <br/>}
            {isPurchaseType && <div
              className="field-group-container"
              style={{
              textAlign: 'center'
            }}>
              {categories && categories.length > 0 ?
                <AutoCompleteField
                  name="category"
                  style={fullWidth}
                  fullWidth={true}
                  floatingLabelText={"Purchase Category Name"}
                  dataSource={dataSourceCategory}
                />
              :
                <Field
                    name="category"
                    component={TextField}
                    floatingLabelText={"Purchase Category Name"}
                    style={fullWidth}
                    maxLength={40}
                />
              }
            </div>}
            <br />
            <div
              className="field-group-container"
              style={{
              textAlign: "center"
            }}>
              <RaisedButton
                type="submit"
                label={isAward || isModify ? "Award Credit" : !isPurchaseType ? "Get Rewarded" : `${isEdit ? "Update" : "Create"} Purchase Type`}
                primary={true}
                disabled={!valid || (pristine && !isModify) || submitting} 
              />
            </div>
            {isModify && <br />}
            {isModify && this.props.onDecline && (
              <div
                className="field-group-container"
                style={{
                textAlign: "center"
              }}>
                <SettingsPopover
                  headerText={"Are you sure?"}
                  originLabel={"Decline Request"}
                  rootStyle={{display: "inline-block", width: 'auto'}}
                  primaryProps={deleteBtnProps}
                  originProps={deleteBtnProps}
                  primaryOnClick={this.props.onDecline}
                  primaryLabel={"Yes, decline"}
                  closeLabel={"No, do not"}
                />
              </div>
            )}
          </div>
          }
        </div>
      </form>
    );
  }
};
  

// Decorate with redux-form
CreditForm = reduxForm({
  form: "creditForm", // a unique identifier for this form
  enableReinitialize: true
})(CreditForm);

CreditForm = connect((state, ownProps) => {
  const unfilteredBusinesses = state.authentication.vendorAccounts;
  const {subscribers} = state.businesses;
  const businesses = !unfilteredBusinesses
    ? null
    : subscribers
      ? unfilteredBusinesses.filter(b => getUsersByBusinessSub(b._id, subscribers) != null)
      : unfilteredBusinesses;
  const business = state.form && state.form.creditForm
    ? state.form.creditForm.values.business
    : ownProps.business || "";
  const user = state.form && state.form.creditForm ?
    state.form.creditForm.values.user
    : ownProps.user || "";
  const category = state.form && state.form.creditForm ?
    state.form.creditForm.values.category
    : ownProps.category || "";
  const purchases = state.form && state.form.creditForm ?
    state.form.creditForm.values.purchases
    : ownProps.purchases || "";
  const purchaseTypes = ownProps.purchaseTypes || (subscribers ? getPurchaseTypes(business, subscribers) : state.businesses.specific ? state.businesses.specific.purchaseTypes : null);
  return {
    vendorAccounts: state.authentication.vendorAccounts,
    isPhone: state.util.isPhone,
    userId: state.authentication.user,
    business,
    purchaseTypes,
    categories: ownProps.categories || getCategories(business, subscribers),
    user,
    category,
    businesses,
    purchases,
    pType: state.form && state.form.creditForm ?
      state.form.creditForm.values.purchaseType : ownProps.purchaseType || "",
    descriptionText: state.form && state.form.creditForm ?
      state.form.creditForm.values.description : "",
    businessName: ownProps.name || "",
    subscribers,
    initialValues: {
      business: ownProps.business || "",
      purchaseType: ownProps.purchaseType || "",
      category: ownProps.categories && ownProps.category ? ownProps.category : "",
      onOrAfter: ownProps.onOrAfter ? new Date(ownProps.onOrAfter) : null,
      description: ownProps.description || "",
      user: ownProps.userId || ownProps.user || "",
      visits: ownProps["visits"] || "1",
      purchases: ownProps["purchases"] || "1",
      amountSpent: ownProps["amountSpent"] || ""
    }
  };
}, {toggleModal, toggleOverlay, getBusiness})(CreditForm);

export default CreditForm;
