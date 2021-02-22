import React from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import Instructional from "../general/instructional";
import StripeForm from "../billing/stripe-form";
import { getAppUrl } from "../../util/environment-utils";
import { paramCase } from "change-case";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";

import { toggleModal } from "../../redux/modules/user";

const inputStyle = {
    textAlign: "center",
    padding: 4,
    fontSize: 14,
    cursor: "text",
    display: 'inline-block',
    marginBottom: 15,
    width: 'calc(100% - 50px)'
};

class BusinessLinks extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {
            copied: -1
        };
        const { name, id } = props;
        this.baseLink = `${getAppUrl()}/bus/${paramCase(name)}/${id}`;
        this.links = [
            {label: `Recommend ${name}`, val: `${this.baseLink}/recommend`},
            {label: `${name} Splash Page`, val: this.baseLink},
            {label: `${name} Customer Credit Request`, val: `${this.baseLink}/request`}
        ];
    }

    handleClipboardSuccess = index => this.setState({copied: index});

    copyToClipboard = i => {
        let link = this.links[i].val;
        var copyText = document.getElementById(`busLink${i}`);
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
          this.handleClipboardSuccess(i);
        }
    };

    renderCopySection = (v, index) => {
        const copyClass = this.state.copied === index ? " copied" : "";
        return (
            <li style={{position: 'relative', paddingBottom: 20}} key={`ccont-${index+1}`}>
                <label>{this.links[index].label}</label>
                <div style={{display: 'inline'}}>
                    <input id={`busLink${index}`} style={inputStyle} value={this.links[index].val} onChange={e => e.preventDefault()} />
                    <span className="material-icons center-align" style={{
                        cursor: 'pointer', 
                        marginLeft: 15,
                        padding: 5
                    }} onClick={() => this.copyToClipboard(index)}>content_copy</span>
                </div>
                <span className={`copy-notice${copyClass}`} style={{position: 'absolute', bottom: 10, left: 0, color: "green"}}>Copied</span>
            </li>
        );
    };

    render () {
        const { name, showEdit, showVerify, onExit, isPhone } = this.props;
        return (
            <Instructional
                body={
                    <div>
                        <h3 style={{textAlign: "center"}}>To copy any of the following links, click{" "}<span className={`material-icons${!isPhone ? " center-align" : ""}`} 
                            style={{ 
                                verticalAlign: 'middle',
                                display: 'inline-block'
                            }}>content_copy</span></h3>
                        <br/>
                        <ul style={{
                            paddingLeft: 0,
                            listStyle: 'none'
                        }}>
                            {Array.from(Array(3), () => 0).map(this.renderCopySection)}
                        </ul>
                        {showVerify && (
                            <div style={{textAlign: 'center'}}>
                                <p>
                                    Now that you have added{" "}{name}{" "}on Plugwin, you'll want your business to be visible to customers.
                                    <br/><br/><b>Click "Let Customers See You" and put &ldquo;{name}&rdquo; in the notes section of your payment to get the ball rolling!</b>
                                </p>
                                <br/>
                                <RaisedButton backgroundColor="#0070ba" labelColor="#fff" onClick={e => {
                                    e.preventDefault();
                                    this.props.toggleModal({ type: "Let Customers See You", children: <StripeForm busName={name} busId={this.props.id} email={this.props.email} /> });   
                                    }} label="Let Customers See You" />
                            </div>
                        )}
                        {showVerify && <br />}
                        {showEdit && <br />}
                        {showEdit && <p style={{
                            maxWidth: 'calc(100% - 100px)'
                        }}>The links above can always be accessed in the "Edit" view of {name} located on the{" "}
                        <a href="javascript:void(null);" onClick={
                            e => {
                                e.preventDefault();
                                this.props.history.push("/dashboard");
                            }
                        }>Plugwin dashboard page.</a></p>}
                    </div>
                }
                minHeight={425}
                isTemporary={false}
                exitLabel={"Close"}
                exit={this.props.onExit} 
          />
        );
    }
};

const mapStateToProps = ({util}) => ({
    isPhone: util.isPhone
});

export default withRouter(connect(mapStateToProps, { toggleModal } )(BusinessLinks));