import React from 'react';
import _ from "lodash";
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import RaisedButton from 'material-ui/RaisedButton';

import Alert from '../notification/alert';
import SettingsPopover from "./settings-popover";

import {
    changePurchaseType, CHANGE_BUSINESS, clearBusinessCache, getCategoryById
} from '../../redux/modules/business';
import { toggleModal } from '../../redux/modules/user';
import CreditForm from './credit-form';
import { pluralize } from '../../util/helper-methods';

class PurchaseTypeView extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            types: props.types || []
        }
    }

    handleDeleteType = id => this.props.changePurchaseType("DELETE", this.props.business, id).then(response => {
        if (response && response.purchaseTypes) {
            if (!response.purchaseTypes || response.purchaseTypes.length === 0) {
                this.props.toggleModal();
            } else {
                this.setState({ types: response.purchaseTypes });
            }
        }
    });

    handleEditType = (id, formData) => this.props.changePurchaseType("EDIT", this.props.business, id, formData);

    launchEditType = type => {
        let categories = this.props.categories || [];
        this.props.toggleModal({
            type: "Edit Purchase Type",
            children: <CreditForm 
                        type="purchaseType"
                        isEdit={true} 
                        onExit={() => {
                            this.props.toggleModal();
                            this.props.clearBusinessCache();
                        }}
                        onSubmit={(formData) => this.handleEditType(type._id, formData)}
                        closeModal={(purchaseTypes, cats, businessName, businessId) => this.props.relaunchView(purchaseTypes, businessName, businessId, false, null, cats)}
                        business={this.props.business}
                        categories={categories}
                        {...type}
                    />
        })
    }

    render () {
        const { business, errors, isPhone, categories } = this.props;
        const { types } = this.state;
        return (
            <div>
                <Alert errors={errors} icon="error_outline"/>
                {types && types.length > 0 && types.map((type, i) => (
                    <div className="type-container" style={{padding: '15px 0    '}} key={`purType${i}`}>
                        <p><b>{`${type.description}`}</b>{isPhone ? <br /> : " "}{`(${type.category && categories && categories.length ? `Category: ${getCategoryById(categories, type.category).name}, ` : ""}$${type.amountSpent.toFixed(2)})`}</p>
                        <div className="type-action-container">
                            <RaisedButton label="Edit" primary={true} onClick={() => this.launchEditType(type)} />
                            <SettingsPopover
                                headerText={"Are you sure?"}
                                originLabel={"Delete"}
                                rootStyle={{marginLeft: 5, display: "inline-block", width: 'auto'}}
                                btnWidth={isPhone ? 'auto' : 225}
                                primaryProps={{
                                    backgroundColor: "#F96161",
                                    labelStyle: { color: "#fff" }
                                }}
                                originProps={{
                                    backgroundColor: "#F96161",
                                    labelStyle: { color: "#fff" }
                                }}
                                primaryOnClick={() => this.handleDeleteType(type._id)}
                                closeOnPrimary={true}
                                primaryLabel={"Yes, remove this"}
                                closeLabel={"No, keep this"}
                            />
                        </div>
                    </div>
                ))}
            </div>
        )
    }
};

const mapStateToProps = ({util, businesses}) => ({
    isPhone: util.isPhone,
    errors: businesses.errors[CHANGE_BUSINESS]
});

export default withRouter(connect(mapStateToProps, { changePurchaseType, toggleModal, clearBusinessCache })(PurchaseTypeView));
