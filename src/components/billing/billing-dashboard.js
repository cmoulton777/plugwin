import React from 'react';
import { connect } from 'react-redux';

import { getSubscriptions } from '../../redux/modules/authentication';
import { cancelSubscriptionAndUnverify, clearBusinessCache } from '../../redux/modules/business';
import { toggleModal } from '../../redux/modules/user';

import SettingsPopover from '../business/settings-popover';

const deleteBtnProps = {
    labelColor: "#fff",
    backgroundColor: "#f96161"
};

const inlineAlignStyle = {
    display: 'inline-block',
    verticalAlign: 'middle'
};

class BillingDashboard extends React.PureComponent {
    constructor(props) {
        super(props);
    }
    handleCancelAndUnverify = (subId, busId) => {
        this.props.clearBusinessCache();
        this.props.cancelSubscriptionAndUnverify(subId, busId, () => {
            this.props.toggleModal();
        });
    };
    render () {
        const { subscriptions, isMobile, isPhone } = this.props;
        return (
            <div className="billing-dashboard-container" style={{padding: `${isMobile ? "15" : "30"}px 0`}}>
                {subscriptions && subscriptions.length > 0 && subscriptions.map((s, i) => (
                    <div className="subscription-container" style={{display: 'table', textAlign: 'left', padding: 15, margin: isMobile ? 0 : '0px auto'}} key={`plgsub-${i+1}`}>
                        <span style={{fontSize: isPhone ? 18 : 24, fontWeight: 500}}>{s.name}</span>
                        <br/>
                        <div style={{display: 'inline', width: '100%'}}>
                            <span style={Object.assign({}, {marginRight: 5}, inlineAlignStyle)}>Auto-pay scheduled for: {s.nextPaymentDue}</span>
                            <SettingsPopover
                                headerText={"Are you sure?"}
                                originLabel={"Cancel subscription"}
                                rootStyle={Object.assign({}, {width: 'auto', marginLeft: !isMobile ? 5 : 0}, isMobile ? {
                                    marginTop: 10
                                } : inlineAlignStyle)}
                                btnWidth={isPhone ? 'auto' : 225}
                                primaryProps={deleteBtnProps}
                                originProps={Object.assign({}, deleteBtnProps, {
                                    labelStyle: isPhone ? { fontSize: 12 } : null
                                })}
                                primaryOnClick={() => this.handleCancelAndUnverify(s.subId, s.id)}
                                primaryLabel={`Confirm`}
                                closeLabel={"Go back"}
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    
};

const mapStateToProps = ({util, authentication}) => ({
    isPhone: util.isPhone,
    isMobile: util.isMobile,
    subscriptions: getSubscriptions(authentication.vendorAccounts)
});

export default connect(mapStateToProps, { cancelSubscriptionAndUnverify, toggleModal, clearBusinessCache })(BillingDashboard);