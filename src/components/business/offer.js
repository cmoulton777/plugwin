import React, { Component } from "react";
import { Line } from "react-progressbar.js";

export default class Offer extends Component {
  render = () => {
    let {
      offer,
      isOwned,
      name,
      id,
      isMobile,
      onContentClick,
      onInfoClick,
      onRedeemClick,
      subHistory,
      isUsed,
      dateDifference,
      isOffersOnlyView,
      isBusOnly,
      progress,
      transHistory
    } = this.props;
    const {
      title,
      description,
      offerType,
      expDate,
      maxUsageCount,
      vendorActionRequired,
      _id
    } = offer;
    const isAutomated = !!vendorActionRequired;
    const isExpired = expDate && dateDifference < 0;
    if (isExpired && !isOwned && !isBusOnly && !isOffersOnlyView) {
      return null;
    }
    // Test offer progress
    // console.log(`${name}: ${Math.floor(progress * 100)}%`);
    const criteriaMet =
      offerType === "DEFAULT" ||
      (progress && offerType === "EARNED" && Number(progress) >= 1);

    let options = null;
    let containerStyle = null;

    if (offerType === "EARNED" && progress && !criteriaMet) {
      options = {
        strokeWidth: 100,
        easing: "easeInOut",
        duration: parseInt(1400 * progress),
        color: "#fff",
        trailColor: "#ccc",
        trailWidth: 100,
        svgStyle: {
          width: "100%",
          height: "100%"
        },
        from: {
          color: "#32CD32"
        },
        to: {
          color: "#008000"
        },
        step: (state, bar) => {
          bar.path.setAttribute("stroke", state.color);
        }
      };
    }
    const busActionStyle = isBusOnly
      ? {
          marginRight: 0
        }
      : null;
    const handleRedeemOffer = () =>
      criteriaMet ? onRedeemClick(offer, _id, id, isAutomated) : null;
    const redeemable =
      isUsed && isMobile ? null : isUsed || isExpired ? (
        <span
          className={`offers-btn user-notice${isUsed ? " used" : ""}${
            isExpired ? " exp" : ""
          }`}
          style={busActionStyle}
        >
          {isUsed ? "USED" : "EXPIRED"}
        </span>
      ) : criteriaMet || offerType === "DEFAULT" ? (
        <button
          className="offers-btn user-action"
          style={Object.assign({}, busActionStyle, {
            color: "green",
            borderColor: "green"
          })}
          onClick={handleRedeemOffer}
        >
          Redeem
        </button>
      ) : (
        <button
          className="offers-btn user-action"
          style={Object.assign(
            {},
            { fontSize: !parseInt(progress) ? 12 : "inherit" },
            !isOwned
              ? {
                  marginRight: 0
                }
              : null
          )}
          onClick={() =>
            onInfoClick(offer, Object.assign({}, subHistory, transHistory), id)
          }
          style={busActionStyle}
        >
          {progress !== 0 ? (
            <Line
              progress={progress}
              text={`${Math.round(progress * 100).toFixed(0)}%`}
              options={options}
              initialAnimate={true}
              containerClassName={"offer-progressbar"}
            />
          ) : (
            "See Info"
          )}
          {progress !== 0 ? (
            <span
              className="material-icons"
              style={{
                verticalAlign: "middle",
                position: "absolute",
                transform: "translate(75%, -50%)",
                fontSize: 18,
                color: "#333"
              }}
            >
              info
            </span>
          ) : null}
        </button>
      );
    const ownedContent = isOwned ? (
      <button
        className="offers-btn"
        onClick={() => onContentClick("Edit", id, offer)}
      >
        Edit Offer
      </button>
    ) : null;
    const contentContainerClass = `content-container${isOwned ? " owned" : ""}${
      isUsed ? " is-used" : ""
    }${isBusOnly ? " just-bus" : ""}`;
    const offerIcon =
      offerType === "DEFAULT" ? (
        <span className={`offer-icon coupon${isMobile ? " mobile" : ""}`} />
      ) : (
        <span className={`offer-icon reward${isMobile ? " mobile" : ""}`} />
      );
    const contentContainer =
      !isMobile && !isUsed ? (
        <div className={contentContainerClass}>
          {offerIcon}
          <h4>{title}</h4>
        </div>
      ) : (
        <div
          className={contentContainerClass}
          style={{
            justifyContent: isUsed ? "space-between" : "flex-start"
          }}
        >
          {offerIcon}
          <h4>{title}</h4>
          {isUsed && isMobile ? (
            <span
              className={`offers-btn user-notice used`}
              style={Object.assign({}, busActionStyle, {
                width: "auto",
                margin: !isMobile ? "0 30px" : 0,
                position: "relative"
              })}
            >
              USED
            </span>
          ) : (
            <div style={{visibility: 'hidden'}} />
          )}
        </div>
      );
    return (
      <div className="offer-container">
        {contentContainer}
        <div className="actions-container">
          {redeemable}
          {ownedContent}
        </div>
      </div>
    );
  };
}
