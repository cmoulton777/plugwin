import React from "react";
import { connect } from "react-redux";
import { Field, reduxForm, formValueSelector } from "redux-form";
import { offerUtils, metrics } from "../../util/business-utils";
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";
import {
  SelectField,
  TextField,
  DatePicker
} from "redux-form-material-ui";
import Moment from "moment";
import OffersPaper from "./offer-paper";
import SettingsPopover from "./settings-popover";
import Alert from "../notification/alert";

import {
  CHANGE_BUSINESS
} from "../../redux/modules/business";

import {
  getDateMMDDYYYY,
  filterObjByUnallowed
} from "../../util/helper-methods";

Moment.locale("en");

const fullWidth = {
  width: "calc(100% - 25px)"
};

const requiredStyle = {
  position: 'absolute',
  bottom: -10
};

/* Form validators and normalizers */
const required = value => (value ? undefined : "Required");

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

let tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

let OffersForm = props => {
  // console.log("Offer Form props: ", props);
  const {
    handleSubmit,
    pristine,
    valid,
    reset,
    submitting,
    isMobile,
    isPhone,
    businessName,
    businessId,
    onSubmit,
    onExit,
    type,
    id /*offer id (on edit only)*/,
    vals,
    errors,
    purchaseTypes,
    categories
  } = props;
  let handleOfferDelete = null;
  if (props.onDelete) {
    handleOfferDelete = () => props.onDelete(businessId, id, onExit);
  }
  const deleteBtnProps = {
    labelColor: "#fff",
    disabled: submitting,
    backgroundColor: "#f96161"
  };
  
  const handleFormSubmit = formProps => {
    if (formProps.offerType === "EARNED") {
      formProps.earnedOffer = {
        strategy: formProps.strategy,
        userMetric: formProps.userMetric,
        userQuant: Number(formProps.userQuant),
        recomendeeMetric: formProps.recomendeeMetric,
        recomendeeQuant: Number(formProps.recomendeeQuant),
        method: formProps.method,
        noEarlierThan: formProps.noEarlierThan
      };
      if (formProps.strategy.indexOf('LOY') === -1 || formProps.userMetric === metrics.NUM_OF) {
        formProps.earnedOffer.method = "";
      }
      if (formProps.purchaseType) {
        formProps.earnedOffer.purchaseType = formProps.purchaseType;
      }
      if (formProps.category) {
        formProps.earnedOffer.category = formProps.category;
      }
      formProps = Object.assign(
        {},
        filterObjByUnallowed(formProps, Object.keys(formProps.earnedOffer))
      );
    }
    let thirdParam = type === "Edit" ? id : null;
    console.log('formProps: ', formProps);
    onSubmit(businessId, formProps, thirdParam).then(response => {
      if (response.message) {
        onExit();
      }
    });
  };
  return (
    <form
      className="offers-form"
      onSubmit={handleSubmit(handleFormSubmit)}
      style={{
        textAlign: "center"
      }}
    >
      <Alert errors={errors} icon="error_outline"/>
      <Field
        name="title"
        component={TextField}
        hintText="Title goes here..."
        floatingLabelText="Title"
        style={fullWidth}
        errorStyle={requiredStyle}
        validate={required}
        maxLength={60}
      />
      <br />
      <Field
        name="description"
        component={TextField}
        hintText="Redemption and legal details go here..."
        floatingLabelText="Description"
        multiLine={true}
        style={fullWidth}
        maxLength={500}
        errorStyle={requiredStyle}
        validate={required}
        rows={2}
        rowsMax={3}
      />
      <br />
      {!isMobile ? (
        <div className="multi-field-section">
          <Field
            className="multi-field thirds"
            name="expDate"
            component={DatePicker}
            format={null}
            minDate={tomorrow}
            mode={"landscape"}
            autoOk={false}
            hideCalendarDate={false}
            cancelLabel={!vals || !vals.expDate ? "CHOOSE NO EXPIRATION" : "CANCEL"}
            formatDate={getDateMMDDYYYY}
            hintText="Pick the expiration date..."
            floatingLabelText="Expiration Date"
          />
          <Field
            className="multi-field thirds"
            name="maxUsageCount"
            component={TextField}
            type="number"
            hintText="1"
            onKeyPress={(ev) => {
              if (ev.key === 'Enter' || ev.keyCode == '13') {
                ev.preventDefault();
              }
            }}
            floatingLabelText={"Limit Per Customer"}
            validate={required}
            errorStyle={requiredStyle}
            normalize={lessThanZeroInt}
            parse={v => Number(v)}
          />
          <Field
            className="multi-field thirds"
            name="offerType"
            style={{ textAlign: "left" }}
            component={SelectField}
            hintText="Select offer type..."
            floatingLabelText={"Type of Offer"}
          >
            {offerUtils.offerTypes.map((type, i) => (
              <MenuItem key={i} value={type.value} primaryText={type.display} />
            ))}
          </Field>
        </div>
      ) : (
        <div style={{ width: "100%" }}>
          <div className="multi-field-section">
            <Field
              className="multi-field"
              name="expDate"
              component={DatePicker}
              format={null}
              minDate={tomorrow}
              mode={"portrait"}
              cancelLabel={"CHOOSE NO EXPIRATION / CANCEL"}
              autoOk={true}
              hideCalendarDate={false}
              formatDate={date =>
                date &&
                `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
              }
              hintText="Pick the expiration date..."
              floatingLabelText="Expiration Date"
            />
            <Field
              className="multi-field"
              name="maxUsageCount"
              component={TextField}
              onKeyPress={(ev) => {
                if (ev.key === 'Enter' || ev.keyCode == '13') {
                  ev.preventDefault();
                }
              }}
              type="number"
              hintText="1"
              floatingLabelText={"Customer Limit"}
              validate={required}
              errorStyle={requiredStyle}
              normalize={lessThanZeroInt}
              parse={v => Number(v)}
            />
          </div>
          <br />
          <Field
            name="offerType"
            style={{ textAlign: "left" }}
            component={SelectField}
            hintText="Select offer type..."
            floatingLabelText={"Offer Type"}
          >
            {offerUtils.offerTypes.map((type, i) => (
              <MenuItem key={i} value={type.value} primaryText={type.display} />
            ))}
          </Field>
        </div>
      )}
      <br />
      <OffersPaper
        purchaseTypes={purchaseTypes}
        categories={categories}
        vals={vals}
        isMobile={isMobile}
        isPhone={isPhone}
        lessThanZeroFloat={lessThanZeroFloat}
        lessThanZeroInt={lessThanZeroInt}
        businessName={businessName}
      />
      <div
        className="field-group-container"
        style={{
          textAlign: "center"
        }}
      >
        {type !== "Add" && props.onDelete && (
          <SettingsPopover
              headerText={"Are you sure?"}
              originLabel={"Delete Offer"}
              rootStyle={{marginRight: 5, display: "inline-block", width: 'auto'}}
              primaryProps={deleteBtnProps}
              originProps={deleteBtnProps}
              primaryOnClick={handleOfferDelete}
              primaryLabel={"Yes, delete this offer."}
              closeLabel={"No, keep this offer"}
          />
        )}
        <RaisedButton
          type="submit"
          label={type === "Add" ? "Create Offer" : "Save Offer"}
          style={type !== "Add" ? {marginLeft: 5} : null}
          primary={true}
          disabled={!valid || pristine || submitting}
        />
      </div>
    </form>
  );
};

// Decorate with redux-form
OffersForm = reduxForm({
  form: "OffersForm", // a unique identifier for this form
  enableReinitialize: true
})(OffersForm);

OffersForm = connect(({ util, form, authentication, businesses }, ownProps) => {
  const { OffersForm } = form;
  const { isMobile, isPhone } = util;
  const isValues = OffersForm && OffersForm.values;
  const isStrategyProp = ownProps.earnedOffer && ownProps.earnedOffer.strategy;
  // console.log(ownProps);
  return {
    errors: businesses.errors[CHANGE_BUSINESS],
    user: authentication.user,
    vals: isValues ? Object.assign({}, OffersForm.values) : null,
    isMobile,
    isPhone,
    initialValues: {
      title: ownProps.title || "",
      description: ownProps.description || "",
      expDate: ownProps.expDate ? new Date(ownProps.expDate) : null,
      offerType: ownProps.offerType || "DEFAULT",
      vendorActionRequired: ownProps.offerType === "EARNED" ? ownProps.vendorActionRequired : false,
      maxUsageCount: ownProps.maxUsageCount
        ? ownProps.maxUsageCount.toString()
        : "1",
      strategy: isStrategyProp ? ownProps.earnedOffer.strategy : "REC",
      userMetric: isStrategyProp
        ? ownProps.earnedOffer.userMetric
        : offerUtils.metrics["LOY"][0].value,
      recomendeeMetric: isStrategyProp
        ? ownProps.earnedOffer.recomendeeMetric
        : offerUtils.metrics["REC"][0].value,
      userQuant: isStrategyProp
        ? ownProps.earnedOffer.userQuant
          ? ownProps.earnedOffer.userQuant.toString()
          : ""
        : "",
      recomendeeQuant: isStrategyProp
        ? ownProps.earnedOffer.recomendeeQuant
          ? ownProps.earnedOffer.recomendeeQuant.toString()
          : ""
        : "",
      method: isStrategyProp ? ownProps.earnedOffer.method : "",
      purchaseType: isStrategyProp && ownProps.earnedOffer.method && ownProps.earnedOffer.method === "P" 
        ? ownProps.earnedOffer.purchaseType || (ownProps.purchaseTypes ? ownProps.purchaseTypes[0].id : "") : "",
      category: isStrategyProp && ownProps.earnedOffer.method && ownProps.earnedOffer.method === "C" 
        ? ownProps.earnedOffer.category || (ownProps.categories ? ownProps.categories[0].id : "") : "",
      noEarlierThan: !isStrategyProp || !ownProps.earnedOffer.method ? null : ownProps.earnedOffer.noEarlierThan ? new Date(ownProps.earnedOffer.noEarlierThan) : null
    }
  };
})(OffersForm);

export default OffersForm;
