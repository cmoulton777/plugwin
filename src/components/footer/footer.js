import React from 'react';
import {connect} from 'react-redux';
import {getAppUrl} from '../../util/environment-utils';
import {logoutUser} from '../../redux/modules/authentication';

const Footer = ({authenticated, isMobile, logoutUser, specific}) => {
    const signOutSection = <div className="col-md-4">
        <a
            href="javascript:void(null);"
            onClick={e => {
            e.preventDefault();
            logoutUser();
        }}>{!isMobile
                ? 'Logout of Plugwin'
                : 'Sign Out'}</a>
    </div>;
    return (
        <footer
            className={`container${isMobile
            ? ' mobile'
            : ''}`}
            style={{
                backgroundColor: "#ededed"
            }}>
            <div className="row">
                {!isMobile && authenticated && signOutSection}
                <div className={`col-md-${authenticated ? '4' : '12'} main-col`}>Powered by{" "}
                    <span className="plug-span">plugwin</span>
                </div>
                {authenticated && <div className="col-md-4">
                    <a href={`${getAppUrl()}/dashboard`}>Visit Plugwin Dashboard</a>
                </div>}
                {authenticated && isMobile && signOutSection}
            </div>
        </footer>
    );
};

const mapStateToProps = ({authentication, util, businesses}) => ({isMobile: util.isMobile, authenticated: authentication.authenticated, specific: businesses.specific});

export default connect(mapStateToProps, {logoutUser})(Footer);