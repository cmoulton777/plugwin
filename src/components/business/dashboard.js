import React, {Component} from "react";
import PropTypes from "prop-types";
import {connect} from "react-redux";
import {Button, OverlayTrigger, Popover, Tooltip} from "react-bootstrap";
import RaisedButton from "material-ui/RaisedButton";
import {Link} from "react-router-dom";
import Callout from "react-callout";
import { paramCase } from "change-case";

import Badge from 'material-ui/Badge';
import Avatar from 'material-ui/Avatar';
import ActionCheckCircle from 'material-ui/svg-icons/action/check-circle';
import LoginRegister from "../authentication/login-register";
import StripeForm from "../billing/stripe-form";

import {FadeAndSlideTransition, TransitionPool} from "../../util/transition-utils";

import {getAuthenticatedUser, resendBusinessVerification, toggleOverlay, toggleCopied} from "../../redux/modules/authentication";
import {
  getAuthenticatedUserInfo,
  redeemOffer,
  clearUserCache,
  toggleModal,
  toggleModalSec,
  requestCredit,
  generatePlug
} from "../../redux/modules/user";
import {
  deleteOffer,
  GET_BUSINESS,
  GET_BUSINESSES,
  GET_SUBSCRIBED_TO,
  CHANGE_BUSINESS,
  getNBusinesses,
  getBusiness,
  clearBusinessCache,
  getBusinessById,
  addOffer,
  editOffer,
  editBusiness,
  prepareBusinessRemoval,
  addPurchaseType,
  getPurchaseTypes
} from "../../redux/modules/business";
import Alert from "../notification/alert";
import {errorPropTypes} from "../../util/proptype-utils";
import {categories, subcategoryMapper, metrics} from "../../util/business-utils";
import {getAppUrl} from "../../util/environment-utils";
import {pluralize, dollarFormat, filterObj, filterObjByUnallowed} from "../../util/helper-methods";
import InfoModal from "./info-modal";
import Offer from "./offer";
import BusinessForm from "./business-form";
import CreditForm from "./credit-form";
import OffersForm from "./offers-form";
import NotificationsView from "../notification/notifications-view";
import ShareSection from "../social/share-section";
import BusinessLinks from "./business-links";
import PurchaseTypeView from "./purchase-type-view";

class Dashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: props.type === "my-offers"
        ? [-2]
        : [],
      infoType: null,
      infoOffer: null,
      infoHistory: null
    };
  }

  componentDidMount () {
    if (this.props.type === 'business') {
      this.props.getBusiness(this.props.id).then(response => {
        this.props.getAuthenticatedUser().then(authResponse => {
          if (response && response.business && (response.business.verified || (authResponse.user.id && response.business.userId === authResponse.user.id))) {
            if (this.props.trigger) {
              let hasPlugger = authResponse.subscribedTo && authResponse.subscribedTo.length && _.mapKeys(authResponse.subscribedTo, s => s._id)[response.business.id].hasPlugger;
              this.handleTrigger(this.props.trigger.toUpperCase(), response.business.name, response.business.id, response.business.purchaseTypes, hasPlugger);
            }
          } else {
            window.location.href = `${getAppUrl()}/not-found`;
          }
        });
      });
    }
  }

  handleTrigger = (trigger, name, id, purchaseTypes, hasPlugger) => {
    switch (trigger) {
      case 'REQUEST':
        return this.handleCreditRequest(name, id, purchaseTypes, hasPlugger);
      case 'RECOMMEND':
      default:
        let { user } = this.props;
        let subHistory = user && user.subscribedTo && user.subscribedTo[id] ? Object.assign({}, user.subscribedTo[id]) : null;
        return this.handlePlugAction(null, 0, subHistory, id, name);
    }
  };

  handleClipboardSuccess = e => {
    this
      .props
      .toggleCopied();
    this
      .props
      .toggleModal(null);
    setTimeout(() => {
      this
        .props
        .toggleCopied();
    }, 4000);
  };

  copyToClipboard = (link, i) => {
    var copyText = document.getElementById(`copy-${i}`);
    if (navigator.userAgent.match(/ipad|iphone/i)) {
      let range, 
          selection;
      range = document.createRange();
      range.selectNodeContents(copyText);
      selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      copyText.setSelectionRange(0, 999999);
    } else {
      copyText.select();
    }
    document.execCommand("Copy");

    if (window.getSelection && window.getSelection().toString() === link) {
      this.handleClipboardSuccess();
    }
  };

  componentWillMount = () => {
    if (this.props.type === 'business') {
      $('body').addClass('bus-only');
    } else if ($('body.bus-only').length) {
      $('body.bus-only').removeClass('bus-only');
    }
    this
      .props
      .clearBusinessCache();
    window.addEventListener("resize", this.mobileCheck);
  };

  shouldComponentUpdate = (nextProps, nextState) => {
    if (this.props.type && this.state.expanded.indexOf(-2) === -1 && nextState.expanded.indexOf(-2) === -1) {
      return (this.setState({
        expanded: [-2]
      }, () => {
        return true;
      }) || false);
    }
    return true;
  };

  renderCategoryDisplay = business => {
    const {subcategory, category} = business;
    let subcategories = subcategoryMapper[category - 1000];
    /* create sub-array of subcategory descriptions and access by the difference of
        the given subcategory value and the base value which becomes the new zero-index*/
    let subcategoryText = subcategories.map(s => [s.description])[subcategory - subcategories[0].value];
    return <h4>{`${subcategoryText}`}</h4>;
  };

  openOffersModal = (type, id, offer) => {
    let off = offer
      ? Object.assign({}, offer)
      : null;
    const busData = _.mapKeys(this.props.all, b => b.id)[id];
    let { purchaseTypes, categories, name } = busData;
    purchaseTypes = purchaseTypes && purchaseTypes.length ? purchaseTypes.map(p => ({
      id: p._id,
      name: p.description
    })) : null;
    categories = categories && categories.length ? categories.map(c => ({
      id: c._id,
      name: c.name
    })) : null;
    this
      .props
      .toggleModal({type: `${type} Offer | ${name}`, children: (<OffersForm
        type={type}
        businessId={id}
        onExit={() => {
        this
          .handleUpdateDashboard(() => {
            this
                .props
                .clearUserCache();
              this.props.clearBusinessCache();
              this
                .props
                .toggleModal(null);
          });
      }}
        {...off}
        purchaseTypes={purchaseTypes}
        categories={categories}
        onDelete={this.handleDeleteOffer}
        onSubmit={type === "Edit"
        ? this.props.editOffer
        : this.props.addOffer}
        businessName={name}/>)});
  };

  handleUpdateDashboard = callback => {
    return this
      .props
      .getNBusinesses(this.props.userId, this.props.buses.length, true).then(response => {
        if (response && response.businesses && callback && typeof callback === 'function') {
          callback();
        }
      });
  };

  handleUpdateUserInfo = callback => {
    return this
      .props
      .getAuthenticatedUser().then(response => {
        if (response && response.user && callback && typeof callback === 'function') {
          callback();
        }
      });
  };

  clearInfoState = callback => {
    let type = this.state.infoType;
    if (type === "RED") {
      this.handleUpdateUserInfo(() => {
        this.setState({
          infoType: null,
          infoOffer: null,
          infoHistory: null
        }, () => {
          this.props.clearUserCache();
          if (callback && typeof callback === 'function') {
            callback();
          }
        });
      });
    } else {
      this.setState({
        infoType: null,
        infoOffer: null,
        infoHistory: null
      }, () => {
          this
            .props
            .clearBusinessCache();
      });
    }
  };

  getDateDifference = expDate => {
    let expiration = null;
    let dateDifference = -1;
    if (expDate) {
      expiration = new Date(expDate);
      const today = new Date();
      dateDifference = parseInt(Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return dateDifference;
  };

  renderMetricsDisplay = (metric, quant, subHistory, isUser = true, earnedOffer, busId) => {
    let display = null;
    let val = quant;
    let extra = "";
    let isTypeBased = isUser && earnedOffer && metric !== metrics.NUM_OF && earnedOffer.method && !!busId;
    if (subHistory) {
      extra = " more";
      let comp = isUser ? earnedOffer && !earnedOffer.method ? this.compareMetric(metric, subHistory, isUser) : isTypeBased ? this.compareByType(earnedOffer, subHistory, Boolean(earnedOffer.method === "P")) : quant
        : this.compareMetric(metric, subHistory, isUser);
      val = quant - comp;
      /* should never see 0 in criteria view */
      if (val <= 0) {
        return 0;
      }
    }
    let getAdditionalText = null;
    if (isTypeBased) {
      getAdditionalText = (isAmount = false) => {
        if (!isTypeBased) {
          return "";
        }
        let busRef = _.mapKeys(this.props.all, b => b.id)[busId];
        if (earnedOffer.method === "P") {
          let pType = _.mapKeys(busRef.purchaseTypes, p => p._id)[earnedOffer.purchaseType];
           return ` o${isAmount ? "n" : "f"} "${pType.description}"`;
        } else {
          let cat = _.mapKeys(busRef.categories, c => c._id)[earnedOffer.category];
          return ` o${isAmount ? "n" : "f"} the items/services from the "${cat.name}" category`;
        }
      };
    }
    switch (metric) {
      case metrics.UNIQUE:
        display = `make ${val}${extra} unique ${pluralize(val, "purchase")}${typeof getAdditionalText === 'function' ? getAdditionalText() : ""}`;
        break;
      case metrics.NUM_OF:
        display = `make ${val}${extra
          ? extra
          : " total"} ${pluralize(val, "visit")}`;
        break;
      case metrics.AMT:
        display = `spend $${dollarFormat(val)}${extra}${typeof getAdditionalText === 'function' ? getAdditionalText(true) : ""}`;
        break;
      default:
        break;
    }
    return display;
  };

  compareMetric = (metric, quants, isUser = true) => {
    let count = 0;
    if (!quants || !quants.visits) {
      return count;
    }
    const {
      visits,
      appliedVisits,
      purchases,
      appliedPurchases,
      amountSpent,
      appliedAmountSpent
    } = quants;
    const subPropType = isUser
      ? "count"
      : "recommendeeCount";
    switch (metric) {
      case metrics.UNIQUE:
        count = purchases[subPropType] - appliedPurchases[subPropType];
        break;
      case metrics.NUM_OF:
        count = visits[subPropType] - appliedVisits[subPropType];
        break;
      case metrics.AMT:
        count = amountSpent[subPropType] - appliedAmountSpent[subPropType];
        break;
      default:
        break;
    }
    return count;
  };

  compactDataForRedeemOffer = earnedOffer => {
    let formData = {};
    const getMetricFromType = metric => {
      switch (metric) {
        case metrics.UNIQUE:
          return "Purchases";
        case metrics.NUM_OF:
          return "Visits";
        case metrics.AMT:
          return "AmountSpent";
        default:
          break;
      }
    };

    const {strategy, userMetric, userQuant, recomendeeMetric, recomendeeQuant, method, purchaseType, category, noEarlierThan} = earnedOffer;

    if (strategy.indexOf("LOY") > -1) {
      formData.user = {
        metric: getMetricFromType(userMetric),
        count: userQuant
      };
      if (method) {
        if (method === 'P' && purchaseType) {
          formData.user.purchaseType = purchaseType;
        } else if (method === 'C' && category) {
          formData.user.category = category;
        }
        if (noEarlierThan) {
          formData.user.onOrAfter = noEarlierThan;
        }
      }
    }
    if (strategy.indexOf("REC") > -1) {
      formData.rec = {
        metric: getMetricFromType(recomendeeMetric),
        count: recomendeeQuant
      };
    }

    return formData;
  };

  compareByType = (earnedOffer, transHistory, isPT = false) => {
    let count = 0;
    if (!earnedOffer.userQuant) {
      return count;
    }
    let { userMetric, noEarlierThan, userQuant } = earnedOffer;
    let transMap = null;
    if (isPT) {
      transMap = transHistory.pHistory ? Object.assign({}, transHistory.pHistory[earnedOffer.purchaseType]) : null;
    } else {
      transMap = transHistory.cHistory ? Object.assign({}, transHistory.cHistory[earnedOffer.category]) : null;
    }
    if (!transMap || !transMap.instances || !transMap.instances.length) {
      return count;
    }
    transMap.instances = transMap.instances.filter(i => i && i.date && new Date(i.date) > new Date(noEarlierThan));
    if (!transMap.instances.length) {
      return count;
    }
    let iter = 0;
    switch (userMetric) {
      case metrics.UNIQUE:
        while (count < Number(userQuant) && iter < transMap.instances.length) {
          count += transMap.instances[iter].available["count"];
          iter++;
        }
      case metrics.AMT:
      default:
        while (count < Number(userQuant) && iter < transMap.instances.length) {
          count += transMap.instances[iter].available["amount"];
          iter++;
        }
    }
    return count;
  }

  generateAggregateProgress = (earnedOffer, transHistory) => {
    const {strategy, userMetric, userQuant, recomendeeMetric, recomendeeQuant, method} = earnedOffer;
    const isDefault = !method && userMetric !== metrics.NUM_OF;
    const byCat = !isDefault && method === "C";
    const byPT = !isDefault && method === "P";
    let sum = 0;
    let tot = 0;
    switch (strategy) {
      case "LOY":
        if (isDefault) {
          sum = this.compareMetric(userMetric, transHistory);
        } else if (this.compareMetric(userMetric, transHistory) >= userQuant) {
          if (byCat) {
            sum = this.compareByType(earnedOffer, transHistory);
          } else if (byPT) {
            sum = this.compareByType(earnedOffer, transHistory, true);
          }
        }
        tot = userQuant;
        break;
      case "REC":
        sum = this.compareMetric(recomendeeMetric, transHistory, false);
        tot = recomendeeQuant;
        break;
      default:
        let recSum, userSum = 0;
        if (isDefault) {
          userSum = this.compareMetric(userMetric, transHistory);
        } else if (this.compareMetric(userMetric, transHistory) >= userQuant) {
          if (byCat) {
            userSum = this.compareByType(earnedOffer, transHistory);
          } else if (byPT) {
            userSum = this.compareByType(earnedOffer, transHistory, true);
          }
        }
        recSum = this.compareMetric(recomendeeMetric, transHistory, false);
        let aggValue = 0;
        if (userSum >= userQuant) {
          aggValue += 0.5;
        } else {
          aggValue += (userSum/userQuant)/2;
        }
        if (recSum >= recomendeeQuant) {
          aggValue += 0.5;
        } else {
          aggValue += (recSum/recomendeeQuant)/2;
        }
        return parseFloat(aggValue);
    }
    return parseFloat(sum / tot);
  };

  renderCriteriaSection = (earnedOffer, subHistory, busId) => {
    const {strategy, userMetric, userQuant, recomendeeMetric, recomendeeQuant, method} = earnedOffer;
    const userAdvice = subHistory
      ? this.renderMetricsDisplay(userMetric, userQuant, subHistory, true, earnedOffer, busId)
      : this.renderMetricsDisplay(userMetric, userQuant, null, true, earnedOffer, busId);
    const recAdvice = subHistory
      ? this.renderMetricsDisplay(recomendeeMetric, recomendeeQuant, subHistory, false)
      : this.renderMetricsDisplay(recomendeeMetric, recomendeeQuant);
    const userSection = strategy.indexOf("LOY") > -1 && userAdvice
      ? (
        <li>You {userAdvice}</li>
      )
      : null;
    const recomendeeSection = strategy.indexOf("REC") > -1 && recAdvice
      ? (
        <li>Your recomendees {recAdvice}</li>
      )
      : null;
    if (!recomendeeSection && !userSection) {
      return 0;
    }
    return (
      <ul style={{
        listStyle: "none"
      }}>
        {userSection}
        {recomendeeSection}
      </ul>
    );
  };
  setInfoOffer = (offer, infoHistory, busId) => {
    offer.busId = busId;
    this.setState({infoOffer: offer, infoType: "INF", infoHistory});
  };

  setRedeemOffer = (offer, offerId, busId, isAutomated = false) => {
    if (isAutomated && offer.offerType === "EARNED") {
      let formData = this.compactDataForRedeemOffer(offer.earnedOffer);
      this.props.toggleOverlay();
      this.props.redeemOffer(this.props.userId, busId, offerId, formData, true).then(response => {
        if (response && response.message) {
          this.props.toggleOverlay();
          this.props.getAuthenticatedUser().then(response => {
            if (response && response.user && response.user.notifications && response.user.notifications.length) {
              this.props.toggleModal({type: "Notifications", children: <NotificationsView />});
            }
          });
        }
      });
    } else {
      let infoOffer = filterObj(offer, ["title", "description", "earnedOffer"]);
      infoOffer.offId = offerId;
      infoOffer.busId = busId;
      infoOffer.userId = this.props.userId;
      this.setState({infoOffer, infoType: "RED_INIT"});
    }
  };
  setRedeemingOffer = filteredOffer => {
    let infoOffer = Object.assign({}, filteredOffer);
    this.setState({infoOffer, infoType: "RED"});
  };

  renderOfferInfo = (offer, isPopover, subHistory, busId) => {
    const {
      title,
      description,
      maxUsageCount,
      expDate,
      offerType,
      earnedOffer
    } = offer;
    const {isMobile} = this.props;
    const {infoType} = this.state;
    const lightTextStyle = {
      fontWeight: 300,
      fontSize: 18,
      color: "green"
    };
    let dateDifference = this.getDateDifference(expDate);
    const isEarned = offerType === "EARNED" && earnedOffer;
    const criteria = isEarned
      ? subHistory
        ? this.renderCriteriaSection(earnedOffer, subHistory, busId)
        : this.renderCriteriaSection(earnedOffer, null, busId)
      : null;
    const capitalize = {
      textTransform: "capitalize"
    };
    return (
      <div>
        {(isMobile || (infoType && infoType === "RED")) && (!isPopover || typeof isPopover === "undefined")
          ? (
            <h2 style={capitalize}>{title}</h2>
          )
          : null}
        {isMobile || (infoType && (infoType === "RED" || infoType === "INF"))
          ? (
            <p style={capitalize}>{description}</p>
          )
          : null}
        {isMobile || (infoType && infoType === "RED")
          ? <br/>
          : null}
        {!maxUsageCount
          ? null
          : (
            <ul style={{
              listStyle: "none"
            }}>
              {criteria
                ? (
                  <li>
                    <b>Requirements</b>
                  </li>
                )
                : typeof criteria === "number"
                  ? (
                    <li>
                      <b>Requirements Met</b>
                    </li>
                  )
                  : null}
              {criteria}
              <br/> {dateDifference > 0
                ? (
                  <li style={lightTextStyle}>
                    Expires {dateDifference > 30 ? `on ${(new Date(expDate)).toLocaleDateString()}` : `in ${dateDifference} ${pluralize(dateDifference, "day")}`}
                  </li>
                )
                : dateDifference == 0
                  ? (
                    <li>
                      <b
                        style={{
                        textTransform: "uppercase"
                      }}>
                        This offer expires today!
                      </b>
                    </li>
                  )
                  : null}
            </ul>
          )}
      </div>
    );
  };

  handleLaunchEditBusiness = business => {
      this.props.toggleModal({
          type: `Edit ${business.name}`,
          children: 
            <BusinessForm 
                type="edit"
                isVerified={business.verified}
                handleLaunchLinksView={() => {
                  this.props.toggleModalSec({
                    extraClasses: "instructional-modal",
                    children: <BusinessLinks
                        name={business.name}
                        id={business.id}
                        onExit={() => this.props.toggleModalSec()}
                    />
                  })
                }}
                onDelete={() => this.props.prepareBusinessRemoval(business.id).then(() => {
                  this.onEditBusinessExit();
                })}
                onSubmit={(formData, isPreview = false) => this.props.editBusiness(business.id, this.props.userId, formData, this.onEditBusinessExit, isPreview)}
                {...business}
            />
      });
  };

  onEditBusinessExit = (business, isPreview = false) => {
    this.props.history.push("/dashboard");
    this.handleUpdateDashboard();
    if (!isPreview) {
      this.props.toggleModal();
    }
    this.props.clearBusinessCache();
    this.props.getAuthenticatedUser().then(response => {
        if (!business && response && response.user && response.user.notifications && response.user.notifications.length > 0 && response.user.notifications.length !== this.props.notifications.length) {
          this.props.toggleModal({type: "Notifications", children: (<NotificationsView />)});
        }
    });
    if (business && isPreview) {
      this.handleLaunchPreview(business);
      this.handleLaunchEditBusiness(business);
    }
  };

  handleLaunchPreview = business => {
    if (!this.props.isMobile) {
      this.busPreview = window.open(`${getAppUrl()}/bus/${paramCase(business.name)}/${business.id}`, "Business Preview", "width=1100, height=700").focus();
    } else {
      this.busPreview = window.open(`${getAppUrl()}/bus/${paramCase(business.name)}/${business.id}`, "Business Preview").focus();
    }
  }

  handlePlugAction = (e, index, subHistory, _id, name) => {
    if (this.props.userId) {
      this.handlePlugClick(e, index, subHistory, _id, name);
    } else {
      this.props.toggleModal({
        type: ' ',
        extraClasses: "auth-modal show-close",
        children: <LoginRegister busOnlyDisplay={true} onAuthenticate={() => this.props.getAuthenticatedUser().then(response => {
          if (response && response.user) {
            let subHist = response.user.subscribedTo && response.user.subscribedTo[_id] ? response.user.subscribedTo[_id] : null;
            this.handlePlugClick(null, index, subHist, _id, name, response.user.id);
          }
        })}/>
      });
    }
  };

  handlePlugClick = (e, index, subHistory, _id, name) => {
    let {isMobile} = this.props;
    const isNativeShare = navigator.share !== undefined;
    if (!subHistory || !subHistory.plugged) {
      this
        .props
        .toggleOverlay();
      this
        .props
        .generatePlug(this.props.userId, _id)
        .then(response => {
          if (response && response.link) {
            this
            .props
            .toggleOverlay();
            this.handleUpdateUserInfo();
            this
              .props
              .toggleModal({extraClasses: "no-full", children: (<ShareSection
                copyToClipboard={this.copyToClipboard}
                closeModal={() => this.props.toggleModal()}
                isNativeShare={isNativeShare}
                businessName={name}
                url={response.link}
                text={"Plugwin Recommend"}
                i={index}
                isMobile={isMobile}/>)});
          }
        });
    } else {
      if (e && isNativeShare) {
        navigator.share({
          title: `Check Out ${name}`,
          text: `I highly recommend ${name}!`,
          url: subHistory.plugged
        }).then(() => {
          console.log("Successfully launched");
        }).catch(err => {
          console.error(err);
        });
      } else {
        this
        .props
        .toggleModal({extraClasses: "no-full", children: (<ShareSection
          copyToClipboard={this.copyToClipboard}
          closeModal={() => this.props.toggleModal()}
          isNativeShare={isNativeShare}
          businessName={name}
          url={subHistory.plugged}
          text={"Plugwin Recommend"}
          i={index}
          isMobile={isMobile}/>)});
      }
    }
  };

  makeCreditRequest = (name, _id, purchaseTypes, hasPlugger = false) => {
    this
        .props
        .toggleModal({
          type: `${name}`,
          children: (<CreditForm
            type="request"
            onSubmit={this.props.requestCredit}
            onExit={() => this.props.getAuthenticatedUser().then(response => {
              if (response && response.user) {
                this.props.clearUserCache();
                if (response.user.notifications && response.user.notifications.length > 0) {
                  this.props.toggleModal({type: "Notifications", children: (<NotificationsView />)});
                }
              }
            })}
            hasPlugger={hasPlugger}
            business={_id}
            purchaseTypes={purchaseTypes}
            closeModal={() => this.props.toggleModal(null)}/>)});
  }

  handleCreditRequest = (name, _id, purchaseTypes, hasPlugger = false) => {
    if (this.props.user) {
      this.makeCreditRequest(name, _id, purchaseTypes, hasPlugger);
    } else {
      this.props.toggleModal({
        type: ' ',
        extraClasses: "auth-modal show-close",
        children: <LoginRegister busOnlyDisplay={true} onAuthenticate={() => this.makeCreditRequest(name, _id, purchaseTypes, hasPlugger)}/>
      });
    }
  }

  renderBusiness = (business, index) => {
    let {user, type, id, isMobile, isPhone} = this.props;
    let {expanded} = this.state;
    let {name, links, description, offers, verified, purchaseTypes} = business;
    let _id = business.id;
    let subscribedTo = user
      ? user.subscribedTo
      : null;
    let subHistory = subscribedTo && subscribedTo[_id] != null
      ? subscribedTo[_id]
      : null;

    let transHistory = subHistory
      ? filterObjByUnallowed(subHistory, ["usedOffers", "id"])
      : null;

    let subCanRequest = subHistory
      ? subHistory.canRequest
      : true;

    let subOffers = subHistory
      ? subHistory.usedOffers
      : null;
    const isUsed = offer => subOffers && subOffers[offer._id] != null && subOffers[offer._id].usage >= offer.maxUsageCount;
    const isOffersOnlyView = type && type === "my-offers";
    const isBusOnlyView = type && type === "business" && id;
    const linkStyle = isBusOnlyView
      ? {
        cursor: "initial !important"
      }
      : null;
    const isExpanded = expanded.indexOf(index) > -1 || isOffersOnlyView || isBusOnlyView;
    const isOffers = offers && offers.length > 0;
    const state = isExpanded
      ? "less"
      : "more";
    const isOwned = user && business.userId === user.id && !isOffersOnlyView && !isBusOnlyView;
    const needsVerification = isOwned && !verified;
    const expand = () => {
      let {expanded} = this.state;
      if (expanded === index) {
        expanded.splice(index, 1);
      } else {
        expanded.push(index);
      }
      this.setState({expanded});
    };
    const mobileClass = isMobile
      ? " mobile"
      : "";
    const onContentClick = isOwned
      ? this.openOffersModal
      : null;
    const noDescriptionClass = (!description || description.length === 0) && !isMobile
      ? "no-desc"
      : "";
    const ownedContent = isOwned && !isMobile
      ? (
        <button
          className="offers-btn add-btn"
          onClick={() => onContentClick("Add", _id)}>
          Add Offer
        </button>
      )
      : null;
    const ownedContentMobile = isOwned && isMobile
      ? (
        <button
          className="offers-btn mobile top-align"
          onClick={() => onContentClick("Add", _id)}>
          Add Offer
        </button>
      )
      : null;
    const onCreditRequestClick = () => {
      if (!isOwned && subCanRequest) {
        let hasPlugger = subHistory && subHistory.hasPlugger;
        this.handleCreditRequest(name, _id, purchaseTypes, hasPlugger);
      }
    };
    const creditRequestStyle = !isOwned && subCanRequest && !isMobile
      ? isOffersOnlyView
        ? {
          top: 45,
          right: 40
        }
        : isBusOnlyView
          ? {
            right: 30
          }
          : null
      : null;
    const resendVerificationBtn = needsVerification
      ? (
        <a
          className={`resend-btn${mobileClass}`}
          href={"javascript:void(null);"}
          onClick={e => {
          e.preventDefault();
          this.props.toggleModal({ type: "Let Customers See You", children: <StripeForm busName={name} busId={_id} email={business.email}/> });
        }}>
          Verify your business
        </a>
      )
      : null;
    const busCreditClass = isBusOnlyView ? " bus-only" : "";
    const creditRequestBtn = !isOwned && subCanRequest
      ? (
        <a
          className={`request-btn${mobileClass}${busCreditClass}`}
          style={creditRequestStyle}
          href={"javascript:void(null);"}
          onClick={e => {
            e.preventDefault();
            onCreditRequestClick();
          }}>
          Want to get rewarded?
        </a>
      )
      : null;
    const editBtn = isOwned
      ? (
        <a className={`edit-btn${mobileClass}`} href="javascript:void(null);" onClick={e => {
          e.preventDefault();
          this.handleLaunchEditBusiness(business);
        }}>
          <span className="material-icons">edit</span>
          {!isMobile
            ? <span>EDIT</span>
            : null}
        </a>
      )
      : null;
    const offersIndex = isOffers
      ? !isExpanded
        ? (offers.length > 2
          ? 2
          : 1)
        : offers.length
      : null;
    const expandClass = `expand-section${mobileClass}`;/*${
      isExpanded ? " expanded" : ""
    }`*/
    const onExpandClick = () => (isOffers
      ? expand()
      : null);
    const isExpandSection = isOffers && expanded.indexOf(-2) === -1 && !isBusOnlyView && !isOffersOnlyView;
    const expandSection = isExpandSection && offersIndex && offers.length >= offersIndex + 1
      ? (!isMobile
        ? (
          <div className={expandClass}>
            <i onClick={onExpandClick} className="material-icons toggle-expand">{`expand_${state}`}</i>
            <span onClick={onExpandClick}>
              SHOW {isExpanded
                ? "LESS"
                : "MORE"}
            </span>
          </div>
        )
        : (
          <div className={expandClass}>
            <button className="expand-btn" onClick={onExpandClick}>
              <i className="material-icons toggle-expand">{`expand_${state}`}</i>
              <span>SHOW {isExpanded
                  ? "LESS"
                  : "MORE"}</span>
            </button>
          </div>
        ))
      : null;
    const returnSection = isBusOnlyView
      ? (
        <h4 style={{
          marginTop: 25,
          fontWeight: 300
        }}>
          <i
            className="material-icons center-align"
            onClick={e => {
            window.location.href = links[0].val;
          }}
            style={{
            fontSize: 32,
            width: 32,
            cursor: 'pointer',
            marginRight: 5
          }}>arrow_back</i>{` Return to `}
          <a
            style={{
            textDecoration: 'underline',
            color: '#333'
          }}
            href={links[0].val}>{name}</a>
        </h4>
      )
      : null;
    const unownedRecStyle = !isOwned ? {
      height: 30,
      width: 150,
      fontSize: 20,
      lineHeight: "20px"
    } : null;
    const avatarSize = !isMobile || isBusOnlyView ? (!isPhone ? 70 : 50) : 40;
    const avatarBody = (name.split(" ").length >= 2 ? (name.split(" ")[0].charAt(0) + name.split(" ")[1].charAt(0)) : name.charAt(0)).toUpperCase();
    const avatarContent = <Avatar size={avatarSize} backgroundColor={business.theme && business.theme.primary ? business.theme.primary : "#333333"}>{avatarBody}</Avatar>;  
    const onAvatarClick = () => { if (!isMobile) window.location.href = `${getAppUrl()}/bus/${paramCase(name)}/${_id}` };
    let noCouponSection = null;
    if (!user && isBusOnlyView) {
      let origLength = offers.length;
      offers = offers.filter(o => o.offerType === "EARNED");
      if (origLength !== offers.length) {
        noCouponSection = <h3><a style={{
          marginTop: 15,
          color: 'rgb(51, 51, 51)',
          fontWeight: 500
        }} href="javascript:void(null)" onClick={e => {
          e.preventDefault();
          this.props.toggleModal({
            type: " ",
            extraClasses: "auth-modal show-close",
            children: <LoginRegister busOnlyDisplay={true} onAuthenticate={() => this.props.getAuthenticatedUser().then(response => {
              if (response && response.user) {
                this.props.toggleModal();
              }
            })}/>
          });
        }}>Join {name} Rewards to View More</a></h3>
      }
    }
    return (
      <FadeAndSlideTransition duration={150} key={index}>
        <div
          className={`business-wrapper${isOwned
          ? " is-owner"
          : ""}`}>
          <div className={`business-main`}>
            <div className={`business-content${isBusOnlyView ? ' bus-only-content' : ''}`}>
              <div className={`business-profile${isPhone && !isOffersOnlyView && !isBusOnlyView ? ' is-phone' : ''}`}>
                <div className="profile-section has-avatar" 
                  style={isPhone && !isBusOnlyView ? {marginRight: 20} : {cursor: 'pointer'}}
                  onClick={onAvatarClick}>
                  {verified 
                    ? (
                      <Badge
                        badgeContent={<ActionCheckCircle style={{color: "#337ab7"}}/>}
                        style={{
                          padding: 0
                        }}
                        badgeStyle={{
                          top: 'auto',
                          bottom: -2,
                          right: -5,
                          width: isMobile && !isBusOnlyView ? 16 : 24,
                          height: isMobile && !isBusOnlyView ? 16 : 24,
                          backgroundColor: "#fff"
                        }}
                      >
                        {avatarContent}
                      </Badge>
                    )
                  :
                     avatarContent
                  }
                </div>
                <div className="profile-section">
                  <a
                    className={mobileClass}
                    target="_blank"
                    style={linkStyle}
                    href={links[0].val}>
                    <h2
                      className={noDescriptionClass}
                      style={!isMobile && name.length > 15
                      ? {
                        fontSize: 24,
                        lineHeight: "inherit"
                      }
                      : null}>
                      {name}
                    </h2>
                  </a>
                  {!isOffersOnlyView
                    ? this.renderCategoryDisplay(business)
                    : null}
                  {!isMobile && description && description.length > 0 && !isOffersOnlyView
                    ? (
                      <h5
                        style={{
                        marginBottom: 0,
                        fontSize: description.length > 15
                          ? 12
                          : "inherit"
                      }}>
                        {description}
                      </h5>
                    )
                    : null}
                </div>
              </div>
            </div>
            {!isOffersOnlyView
              ? (
                <div className={`business-actions${mobileClass} ${noDescriptionClass}`}
                  style={isPhone && isOwned ? {
                    marginTop: 20
                  } : null}>
                  {ownedContent}
                  <button
                    className={`plug action`}
                    onClick={e => this.handlePlugAction(e, index, subHistory, _id, name)}>
                    <div className={`plug-svg-wrapper${mobileClass}`} style={Object.assign({}, unownedRecStyle)}>
                      Recommend
                    </div>
                  </button>
                  {isBusOnlyView && creditRequestBtn}
                </div>
              )
              : null}
          </div>
          {isOffers
            ? (
              <div className="business-offers expanded-content">
                {isBusOnlyView && isOffers
                  ? (
                    <h3 style={{
                      marginBottom: 15
                    }}>Offers</h3>
                  )
                  : null}
                <TransitionPool
                  children={isOffers
                  ? offers.sort((a, b) => isUsed(a) && !isUsed(b)
                    ? 1
                    : isUsed(b) && !isUsed(a)
                      ? -1
                        : 0)
                    .slice(0, offersIndex)
                    .map((offer, i) => (
                      <FadeAndSlideTransition duration={150} key={`offer-${i}`}>
                        <Offer
                          offer={offer}
                          isOwned={isOwned}
                          isOffersOnlyView={isOffersOnlyView}
                          isBusOnly={isBusOnlyView}
                          name={name}
                          id={_id}
                          progress={offer.offerType === "EARNED"
                          ? this.generateAggregateProgress(offer.earnedOffer, transHistory)
                          : 0}
                          isMobile={isMobile}
                          onContentClick={onContentClick}
                          dateDifference={this.getDateDifference(offer.expDate)}
                          isUsed={isUsed(offer)}
                          transHistory={transHistory}
                          subHistory={subOffers && subOffers[offer._id] != null
                          ? subOffers[offer._id]
                          : null}
                          onInfoClick={isMobile || offer.offerType === "EARNED"
                          ? this.setInfoOffer
                          : null}
                          onRedeemClick={this.setRedeemOffer}/>
                      </FadeAndSlideTransition>
                    ))
                  : null}/> {expandSection}
              </div>
            )
            : null}
          {editBtn}
          {resendVerificationBtn}
          {!isBusOnlyView && creditRequestBtn}
          {ownedContentMobile}
          {noCouponSection}
          {noCouponSection && <br/>}
          {returnSection}
        </div>
      </FadeAndSlideTransition>
    );
  };

  handleDeleteOffer = (bus, off, callback) => this.props.deleteOffer(bus, off).then(response => {
    if (response && response.message && callback && typeof callback === 'function') {
      callback();
    }
  });

  handleRedeemOffer = (user, bus, off, formData, callback) => this.props.redeemOffer(user, bus, off, formData).then(response => {
    if (response && response.message && callback && typeof callback === 'function') {
      this.clearInfoState(callback);
    }
  });

  handleLoadMore = () => {
      this
      .props
      .getNBusinesses(this.props.userId, 10, false, (this.props.myLast ? this.props.buses.slice(this.props.myLast).length : this.props.buses.length))
      .then(value => {
        let elemIndex = value.businesses.length > 5
          ? this.props.buses.length - 6
          : this.props.buses.length - 1;
        document.getElementsByClassName("business-wrapper")
        [elemIndex].scrollIntoView({behavior: "smooth"});
    });
  }

  render = () => {
    const {
      errors,
      message,
      loading,
      user,
      buses,
      isMore,
      type,
      myLast,
      isMobile
    } = this.props;
    const {infoType, infoOffer, infoHistory} = this.state;
    const isMyOffers = type && type === "my-offers";
    const isBusiness = type && type === "business";

    const divider = myLast
      ? myLast
      : 0;

    const isBusinesses = buses && buses.length > 0;

    const myBuses = isBusinesses && myLast
      ? buses.slice(0, divider)
      : null;
    const otherBuses = isBusinesses && myLast
      ? buses.slice(divider)
      : null;

    const topContent = !user
      ? null
      : isMyOffers
        ? (buses && buses.length > 0
          ? (
            <h1
              style={{
                marginBottom: 35,
                marginTop: 0
              }}>
              My Offers
            </h1>
          )
          : null)
        : !isBusiness && myBuses && myBuses.length > 0
          ? (
            <h1
              style={{
                marginBottom: 35,
                marginTop: 0
              }}>{`My Business${myBuses.length > 1
                ? "es"
                : ""}`}</h1>
          )
          : null;
    const noPaddingClass = isBusiness && isMobile ? " no-padding" : "";
    return (
      <div
        className={`dashboard container clearfix${noPaddingClass}${loading || (buses && buses.length === 0 && !isMyOffers)
        ? " is-loading"
        : ""}`}
        style={{
        display: "table",
        textAlign: "center"
      }}>
        {message && message.length > 0
          ? (<Alert message={message} icon="done"/>)
          : null}
        <div
          className="dashboard-wrapper"
          style={{
          textAlign: "left"
        }}>
          {/* {topContent} */}
          {isMyOffers || isBusiness || !myLast
            ? (
              <div
                className={`business-feed container in-context clearfix${isBusiness
                ? " just-bus"
                : ""}`}>
                <TransitionPool
                  children={buses && buses.length > 0
                  ? buses.map((business, index) => this.renderBusiness(business, index))
                  : null}/>
              </div>
            )
            : (
              <div className="dashboard-section">
                <div
                  className={`business-feed container in-context clearfix`}
                  style={myBuses ? {
                  marginBottom: 40
                } : null}>
                  <TransitionPool
                    children={myBuses && myBuses.length > 0
                    ? myBuses.map((business, index) => this.renderBusiness(business, index))
                    : null}/>
                </div>
                <div className={`business-feed container in-context clearfix`}>
                  <TransitionPool
                    children={otherBuses && otherBuses.length
                    ? otherBuses.map((business, index) => this.renderBusiness(business, myLast + index))
                    : null}/>
                </div>
              </div>
            )}
        </div>
        {buses && buses.length > 0 && isMore && (
            <RaisedButton
              label={"View More"}
              primary={true}
              onClick={this.handleLoadMore}
              style={{
                margin: "25px 0"
              }}/>
          )}
        <InfoModal
          type={infoType}
          offer={infoType && infoOffer
          ? infoOffer
          : null}
          text={!infoType
          ? null
          : infoType === "RED_INIT"
              ? "<b>Once you click 'Understood', you will have to show this to the appropriate bu" +
                "siness representative in less than a minute.</b>"
              : null}
          btnText={!infoType
          ? null
          : infoType === "RED"
              ? "Redeem"
              : infoType === "RED_INIT"
                ? "Understood"
                : null}
          btnTextSec={infoType && infoType === "RED_INIT"
          ? "Cancel"
          : null}
          offerInfo={infoType && (infoType === "INF" || infoType === "RED") && infoOffer
          ? infoHistory
            ? this.renderOfferInfo(infoOffer, false, infoHistory, infoOffer.busId)
            : this.renderOfferInfo(infoOffer, false, null, infoOffer.busId)
          : null}
          dataCall={!infoType
          ? null
          : infoType === "RED_INIT"
              ? this.setRedeemingOffer
              : infoType === "RED"
                ? this.handleRedeemOffer
                : null}
          compactFormData={infoType && infoType === "RED"
          ? this.compactDataForRedeemOffer
          : null}
          clearModalState={this.clearInfoState}
        />
      </div>
    );
  };
}

Dashboard.propTypes = {
  buses: PropTypes.arrayOf(PropTypes.shape({name: PropTypes.string, category: PropTypes.number})),
  all: PropTypes.arrayOf(PropTypes.shape({name: PropTypes.string, category: PropTypes.number})),
  subbed: PropTypes.arrayOf(PropTypes.shape({name: PropTypes.string, category: PropTypes.number})),
  bus: PropTypes.shape({name: PropTypes.string, category: PropTypes.number}),
  type: PropTypes.string,
  id: PropTypes.string,
  isMore: PropTypes.bool,
  user: PropTypes.shape({firstName: PropTypes.string}),
  clearBusinessCache: PropTypes.func,
  clearUserCache: PropTypes.func,
  getAuthenticatedUser: PropTypes.func,
  generatePlug: PropTypes.func,
  toggleModal: PropTypes.func,
  getBusiness: PropTypes.func,
  getNBusinesses: PropTypes.func,
  redeemOffer: PropTypes.func,
  deleteOffer: PropTypes.func,
  authenticated: PropTypes.bool,
  message: PropTypes.string,
  loading: PropTypes.bool,
  isMobile: PropTypes.bool
};

const mapStateToProps = ({
  util,
  user,
  authentication,
  businesses
}, ownProps) => {
  const {all, specific, subbed, myLast} = businesses;
  const bus = all && all
    .map(b => b.id)
    .indexOf(ownProps.id) > -1
    ? getBusinessById(ownProps.id, all)
    : specific
      ? specific
      : !businesses.loading[GET_BUSINESS]
        ? {
          notFound: true
        }
        : null;
  const buses = ownProps && ownProps.type
    ? ownProps.type === "my-offers"
      ? subbed
      : ownProps.type === "business" && bus && bus.name
        ? [...Array(1).fill(bus)]
        : null
    : all;
  return {
    modalProps: user.modal,
    isPhone: util.isPhone,
    isMobile: util.isMobile,
    userId: authentication.user,
    buses,
    bus,
    all,
    subbed,
    myLast,
    isMore: ownProps && ownProps.type
      ? false
      : businesses.isMore,
    notifications: authentication.notifications || null,
    user: getAuthenticatedUserInfo({user, authentication}),
    authenticated: authentication.authenticated,
    errors: businesses.errors[GET_BUSINESSES],
    message: businesses.messages[GET_BUSINESSES],
    loading: (businesses.loading[GET_BUSINESSES] && !(businesses.all && businesses.all.length > 0)) || (businesses.loading[GET_SUBSCRIBED_TO] && !(businesses.subbed && businesses.subbed.length > 0))
  };
};

export default connect(mapStateToProps, {
  toggleModal,
  toggleModalSec,
  toggleOverlay,
  toggleCopied,
  resendBusinessVerification,
  getAuthenticatedUser,
  requestCredit,
  deleteOffer,
  getNBusinesses,
  generatePlug,
  getBusiness,
  redeemOffer,
  clearUserCache,
  clearBusinessCache,
  addPurchaseType,
  addOffer,
  editOffer,
  editBusiness,
  prepareBusinessRemoval,
  getAuthenticatedUser
})(Dashboard);
