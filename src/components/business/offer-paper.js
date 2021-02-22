import React from "react";
import MenuItem from "material-ui/MenuItem";
import { Field } from "redux-form";
import { SelectField, TextField, Checkbox, DatePicker } from "redux-form-material-ui";
import Paper from "material-ui/Paper";
import {
  getDateMMDDYYYY,
  pluralize,
  dollarFormat
} from "../../util/helper-methods";

import { offerUtils, metrics } from "../../util/business-utils";

const requiredStyle = {
  position: 'absolute',
  bottom: -10
};

/* Form validators and normalizers */
const required = value => (value ? undefined : "Required");

const paperStyle = {
  width: "calc(100% - 15px)",
  position: "relative",
  borderStyle: "dashed",
  minHeight: 325,
  padding: "15px 15px 35px",
  textAlign: "left",
  margin: "15px auto 30px"
};

const OffersPaper = props => {
  const {
    vals,
    isMobile,
    isPhone,
    businessName,
    purchaseTypes,
    categories,
    lessThanZeroInt,
    lessThanZeroFloat
  } = props;
  if (!vals) {
    return null;
  }
  const isEarned = vals && vals.offerType === "EARNED";
  let isTypeOriented = !!vals && (purchaseTypes || categories);
  if (isTypeOriented && vals.strategy.indexOf('LOY') > -1) {
    isTypeOriented = vals.userMetric === metrics.AMT || vals.userMetric === metrics.UNIQUE;
  } else {
    isTypeOriented = false;
  }
  let methods = Object.assign({}, offerUtils.methods);
  if (isTypeOriented) {
    if (!purchaseTypes) {
      delete methods.BY_PURCH;
    } else if (!categories) {
      delete methods.BY_CAT;
    }
  }
  let selectName = vals.method ? vals.method === "P" ? "purchaseType" : vals.method === "C" ? "category" : "" : null;
  let typeSelects = vals.method ? vals.method === "P" ? purchaseTypes : vals.method === "C" ? categories : [] : null;
  const offerIconStyle = {
    position: "absolute",
    top: isMobile ? 13 : 15,
    left: 15
  };
  return (
    <Paper style={paperStyle} zDepth={3}>
      <h2
        style={{
          marginTop: 0,
          marginLeft: 40,
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          overflow: "hidden"
        }}
      >
        {businessName}
      </h2>
      {vals &&
        vals.title && (
          <h3
            style={{
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
              fontWeight: 300
            }}
          >
            {vals.title}
          </h3>
        )}
      {isEarned && (
          <ul
            style={{
              fontWeight: 500,
              listStyle: "none",
              fontSize: 14,
              paddingLeft: 0
            }}
          >
            <span style={{ fontSize: 18 }}>Requirements</span>
            <li>
              Customer earns reward by making :
              <br />
              <Field
                name="strategy"
                style={{
                  textAlign: "left",
                  fontSize: 14,
                  width: "auto",
                  display: "block",
                  maxWidth: !isMobile
                    ? "calc(75% - 25px)"
                    : "100%",
                  minWidth: !isMobile ? 256 : 220
                }}
                validate={required}
                errorStyle={requiredStyle}
                component={SelectField}
                autoWidth={true}
                floatingLabelText={
                  !vals.strategy ? "Select reward method..." : null
                }
              >
                {offerUtils.earnedTypes.map((type, i) => (
                  <MenuItem
                    key={i}
                    value={type.value}
                    primaryText={type.display}
                  />
                ))}
              </Field>
            </li>
            {vals.strategy && vals.strategy.indexOf("REC") > -1 ? (
              <li>
                That result in the Purchaser...
                <br />
                <div className="multi-field-section">
                  <Field
                    className="multi-field in-paper"
                    name="recomendeeMetric"
                    style={{
                      textAlign: "left",
                      fontSize: 14,
                      display: "inline-block"
                    }}
                    validate={required}
                    errorStyle={requiredStyle}
                    component={SelectField}
                    autoWidth={true}
                    floatingLabelText={
                      !vals.recomendeeMetric ? "Select metric..." : null
                    }
                  >
                    {offerUtils.metrics["REC"].map((type, i) => (
                      <MenuItem
                        key={i}
                        value={type.value}
                        primaryText={type.display}
                      />
                    ))}
                  </Field>
                  <Field
                    className="multi-field in-paper"
                    name="recomendeeQuant"
                    style={{
                      textAlign: "left",
                      fontSize: 14,
                      display: "inline-block"
                    }}
                    type="number"
                    validate={required}
                    errorStyle={requiredStyle}
                    component={TextField}
                    normalize={
                      vals.recomendeeMetric === metrics.AMT
                        ? lessThanZeroFloat
                        : lessThanZeroInt
                    }
                    hintText={
                      !vals.recomendeeQuant
                        ? `How Many ${
                            vals.recomendeeMetric === metrics.AMT
                              ? "($)"
                              : vals.recomendeeMetric === metrics.NUM_OF
                                ? "Times"
                                : ""
                          }`
                        : null
                    }
                  />
                </div>
              </li>
            ) : null}
            {vals.strategy && vals.strategy.indexOf("LOY") > -1 ? (
              <li>
                {vals.strategy.indexOf("REC") > -1 ? "and when" : "When"} the customer...
                <br />
                <div className="multi-field-section">
                  <Field
                    className="multi-field in-paper"
                    name="userMetric"
                    style={{
                      textAlign: "left",
                      fontSize: 14,
                      display: "inline-block"
                    }}
                    validate={required}
                    errorStyle={requiredStyle}
                    component={SelectField}
                    autoWidth={true}
                    floatingLabelText={
                      !vals.userMetric ? "Select metric..." : null
                    }
                  >
                    {offerUtils.metrics["LOY"].map((type, i) => (
                      <MenuItem
                        key={i}
                        value={type.value}
                        primaryText={type.display}
                      />
                    ))}
                  </Field>
                  <Field
                    className="multi-field in-paper"
                    name="userQuant"
                    style={{
                      textAlign: "left",
                      fontSize: 14,
                      display: "inline-block"
                    }}
                    type="number"
                    validate={required}
                    errorStyle={requiredStyle}
                    component={TextField}
                    normalize={
                      vals.userMetric === metrics.AMT
                        ? lessThanZeroFloat
                        : lessThanZeroInt
                    }
                    hintText={
                      !vals.userQuant
                        ? `How Many ${
                            vals.userMetric === metrics.AMT
                              ? "($)"
                              : vals.userMetric === metrics.NUM_OF
                                ? "Times"
                                : ""
                          }`
                        : null
                    }
                  />
                  </div>
              </li>
            ) : null}
            {isEarned && isTypeOriented && (
              <li>
                Reward based on Purchase...
                <br />
                <div className="multi-field-section">
                  <Field
                    name="method"
                    className="multi-field in-paper"
                    style={{
                      textAlign: "left",
                      fontSize: 14,
                      width: "auto",
                      display: "inline-block",
                      maxWidth: !isMobile
                        ? "calc(75% - 25px)"
                        : "100%",
                      marginLeft: 0
                    }}
                    component={SelectField}
                    autoWidth={true}
                    floatingLabelText={null}
                  >
                    {Object.keys(methods).map((type, i) => (
                      <MenuItem
                        key={i}
                        value={offerUtils.methods[type].value}
                        primaryText={offerUtils.methods[type].display}
                      />
                    ))}
                  </Field>
                  {vals.method && typeSelects && (
                    <Field
                      name={selectName}
                      className="multi-field in-paper"
                      style={{
                        textAlign: "left",
                        fontSize: 14,
                        width: "auto",
                        display: "inline-block",
                        maxWidth: !isMobile
                          ? "calc(75% - 25px)"
                          : "100%"
                      }}
                      validate={required}
                      errorStyle={requiredStyle}
                      component={SelectField}
                      autoWidth={true}
                      floatingLabelText={null}
                    >
                      <MenuItem value="" primaryText={vals.method === "P" ? "Select type..." : vals.method === "C" ? "Select category..." : ""} />
                      {typeSelects.map((type, i) => (
                        <MenuItem
                          key={`methodType-${i}`}
                          value={type.id}
                          primaryText={type.name}
                        />
                      ))}
                    </Field>
                  )}
                </div>
              </li>
            )}
            {isEarned && isTypeOriented && vals.method && (vals.purchaseType || vals.category) &&
            (<li>
                Applies to purchases no earlier than...
                <br />
                <div>
                  <Field
                    name="noEarlierThan"
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
                    hintText={!vals.noEarlierThan ? "Select date" : null}
                  />
                </div>
            </li>)}
          </ul>
        )}
      {vals &&
        vals.description && (
          <p style={{ letterSpacing: -0.25 }}>{vals.description}</p>
        )}
      {isEarned && (
        <Field
          name="vendorActionRequired"
          style={{
            textAlign: "left",
            fontSize: 14,
            width: "auto",
            display: "block",
            maxWidth: "100%",
            minWidth: !isPhone ? 256 : 220
          }}
          label={`Use automatic redemption?${!isPhone ? " (ideal for deliverable rewards)" : ""}`}
          component={Checkbox}
          labelPosition={"left"}
        />
      )}
      {!isMobile &&
        vals &&
        vals.expDate && (
          <b
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              padding: 5,
              borderBottomLeftRadius: 2,
              background: "rgba(51, 51, 51, 0.25)",
              letterSpacing: -0.1,
              textTransform: "uppercase"
            }}
          >
            {`Expires: ${getDateMMDDYYYY(vals.expDate)}`}
          </b>
        )}
      {vals &&
        ((vals.expDate && isMobile) || vals.maxUsageCount) && (
          <b
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              padding: "5px 0",
              width: "100%",
              fontSize: isMobile ? 11 : "inherit",
              textAlign: "center",
              letterSpacing: -0.1,
              textTransform: "uppercase",
              background: "rgba(51, 51, 51, 0.25)"
            }}
          >
            {vals.maxUsageCount
              ? `Limit ${vals.maxUsageCount} ${pluralize(
                  vals.maxUsageCount,
                  "Use"
                )} Per Customer`
              : null}
            {isMobile && vals.expDate && vals.maxUsageCount && ` | `}
            {isMobile && vals.expDate
              ? `Expires: ${getDateMMDDYYYY(vals.expDate)}`
              : null}
          </b>
        )}
      {vals && vals.offerType ? (
        vals.offerType === "DEFAULT" ? (
          <span style={offerIconStyle} className={`offer-icon coupon${isMobile ? " mobile" : ""}`} />
        ) : (
          <span
            style={offerIconStyle}
            className={`offer-icon reward${isMobile ? " mobile" : ""}`}
          />
        )
      ) : null}
    </Paper>
  );
};

export default OffersPaper;
