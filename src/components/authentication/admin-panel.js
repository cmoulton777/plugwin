import React, { Component } from "react";
import { connect } from 'react-redux';
import { CHANGE_BUSINESS, performAdminAction, getAllBusinesses, GET_ALL_BUSINESSES, clearBusinessCache } from '../../redux/modules/business';
import { toggleModal } from '../../redux/modules/user';
import Alert from "../notification/alert";

const btnStyle = {
    border: "0.5px solid #333",
    padding: "4px 12px",
    borderRadius: 2
};

class AdminPanel extends Component {
    constructor (props) {
        super(props);
    }

    componentDidMount = () => this.props.getAllBusinesses();

    performAction = (action, id) => this.props.performAdminAction(action, this.props.userId, id).then(response => {
        if (response && response.message) {
            this.props.getAllBusinesses().then(response => {
                if (response && response.businesses) {
                    this.props.toggleModal();
                    setTimeout(() => {
                        this.props.clearBusinessCache();
                    }, 5000);
                }
            });
        }
    });

    launchActionModal = (action, name, id) => {
        let actionString = action.charAt(0) + action.slice(1).toLowerCase();
        return this.props.toggleModal({
            type: `${actionString} ${name}`,
            children: (
                <div>
                    <p>Are you sure you want to{" "}<b>{`${actionString.toLowerCase()} ${name}`}</b>?</p>
                    <div style={{textAlign: "center", paddingTop: 15}}>
                        <button style={Object.assign({}, btnStyle, {
                                margin: '0 5px',
                                color: "#fff",
                                background: "#333"
                            })} onClick={e => {
                            this.performAction(action, id);
                        }}>{actionString}</button>
                        <button style={Object.assign({}, btnStyle, {
                                margin: '0 5px',
                                color: "#333",
                                background: "#fff"
                            })} onClick={e => this.props.toggleModal()}>Cancel</button>
                    </div>
                </div>
            )
        });
    }

    render () {
        const { all, errors, message, loading, busLoading, isPhone } = this.props;
        const phoneStyle = {
            margin: !isPhone ? '0 15px' : '0 7px'
        };
        return (
            <div className={`admin-panel-container${!busLoading && !loading ? "": " is-loading"}`} style={{
                textAlign: 'center',
                width: 'auto',
                margin: '100px auto 0',
                maxWidth: 960,
                minWidth: 300,
                background: "#fff",
                borderRadius: 5
            }}>
                <Alert errors={errors} icon="error_outline"/>
                <Alert message={message} icon="done" />
                {(errors && errors.length) || message ? <br/> : null}
                {all && all.length > 0 && all.map((b, i) => (
                    <div className="business-container" 
                    style={{
                        padding: 25, 
                        color: "#333", 
                        display: "flex",
                        flexDirection: "row", 
                        alignItems: "center",
                        justifyContent: "space-between"
                    }} key={i}>
                        <h1 style={Object.assign({}, { margin: 0, fontWeight: 300 }, isPhone ? {
                            fontSize: 12
                        } : null)}>{b.name}{!isPhone && <span 
                            style={{
                                fontSize: 10, 
                                display: 'inline-block', 
                                verticalAlign: 'middle'
                            }}>{`  (${b.email})`}</span>}</h1>
                        <div>
                            <button onClick={e => this.launchActionModal(!b.verified ? "VERIFY" : "UNVERIFY", b.name, b.id)} style={Object.assign({}, phoneStyle, btnStyle, {
                                background: b.verified ? "red" : "green",
                                color: "#fff"
                            })} dangerouslySetInnerHTML={{ __html: b.verified ? "Unverify" : "Verify &#x2714;"}} />
                            <button onClick={e => this.launchActionModal("DELETE", b.name, b.id)} style={Object.assign({}, phoneStyle, btnStyle, { background: "red", color: "#fff" })}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
};

const mapStateToProps = ({util, authentication, businesses}) => ({
    userId: authentication.user,
    isPhone: util.isPhone,
    errors: businesses.errors[CHANGE_BUSINESS],
    message: businesses.messages[CHANGE_BUSINESS],
    loading: businesses.loading[CHANGE_BUSINESS],
    busLoading: businesses.loading[GET_ALL_BUSINESSES],
    all: businesses.all
});

export default connect(mapStateToProps, { getAllBusinesses, toggleModal, performAdminAction, clearBusinessCache })(AdminPanel);