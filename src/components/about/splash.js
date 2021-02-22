import React from 'react';
import { connect } from 'react-redux';
import { toggleModal } from '../../redux/modules/user';
import LoginRegister from '../authentication/login-register';
import RaisedButton from 'material-ui/RaisedButton';
import VideoComp from '../general/video-comp';

const splashImgLabels = [
    'More exposure',
    "More customers",
    "More $"
];

const Splash = props => {
    const { toggleModal, isMobile } = props;
    return (
        <div className="splash-container">
            <div className="splash-section">
                <h3>Customers are your best marketers<br/>Reward them.</h3>
            </div>
            <br/>
            <RaisedButton backgroundColor="#333333" labelColor="#fff" primary={true}
                label="Get Started"
                onClick={
                    e => {
                    e.preventDefault();
                    toggleModal({
                        type: " ",
                        extraClasses: "auth-modal show-close",
                        children: <LoginRegister type="register"/>
                    });
                }} />
            <br/>
            <VideoComp isMobile={isMobile} source={"https://cdn.plugwin.com/videos/Plugwin10SecIntro.mp4"} />
            <div className="img-container">
                {Array.from(Array(1), () => 0).map((v, i) => (
                    <div key={`img${i+2}`} className={`splash-img col-md-3 col-sm-6 col-xs-12`}>
                        <img src={`https://cdn.plugwin.com/img/splashi_${i+2}.svg`} />
                        <span style={{
                            lineHeight: '15px'
                        }} dangerouslySetInnerHTML={{__html: splashImgLabels[i]}} />
                    </div>
                ))}
                {Array.from(Array(2), () => 0).map((v, i) => (
                    <div key={`img${i+3}`} className="splash-img col-md-3 col-sm-6 col-xs-12">
                        <img src={`https://cdn.plugwin.com/img/splashi_${i+3}.svg`} />
                        <span style={{
                            lineHeight: (splashImgLabels[i+1].length > 12 ? '15px' : '25px')
                        }} dangerouslySetInnerHTML={{__html: splashImgLabels[i+1]}} />
                    </div>
                ))}
            </div>
            <div className="splash-section">
                <p>Plugwin incentivizes your customers to <br/>make purchases and refer their friends</p>
            </div>
        </div>
    );
};

const mapStateToProps = ({util}) => ({isMobile: util.isMobile, isPhone: util.isPhone});

export default connect(mapStateToProps, { toggleModal })(Splash);