import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { STRIPE_PUBLIC_KEY } from '../../constants/key-constants';
import StripeCheckout from 'react-stripe-checkout';

import { toggleModal } from "../../redux/modules/user";
import { verifyAndChargeBusiness, clearBusinessCache } from '../../redux/modules/business';

let today = new Date();

class StripeForm extends Component {
  constructor(props) {
    super(props);
  }
  
  onToken = (token) => {
    if (token && token.id) {
      let tokenData = {
        stripeToken: token.id
      };
      this.props.clearBusinessCache();
      this.props.verifyAndChargeBusiness(tokenData, this.props.busId, () => {
        this.props.toggleModal();
      });
    }
  };

  render() {
    return (
      <div style={{textAlign: 'center'}}>
        <p>By clicking below, you agree to paying $19.95 (USD) per month, and your billing cycle will begin on: {today.toLocaleDateString()}.</p>
        <br/>
        <StripeCheckout
          token={this.onToken}
          stripeKey={STRIPE_PUBLIC_KEY}
          panelLabel={"Let Customers See You"}
          amount={1995}
          currency="USD"
          email={this.props.email}
          name={"Plugwin"}
          image={"https://cdn.plugwin.com/icons/android-chrome-192x192.png"}
          description={`Register ${this.props.busName || "on Plugwin"}`}
        />
     </div>
    );
  }
};

export default withRouter(connect(null, { verifyAndChargeBusiness, toggleModal, clearBusinessCache })(StripeForm));
