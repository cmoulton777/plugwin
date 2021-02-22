import React, {Component} from 'react';
import {connect} from 'react-redux';

const BUG_TRACKER_URL = "https://docs.google.com/spreadsheets/d/1OgFstj5LUeOdPyMTWjh4JgBEiLjtOP_MZbt9MA3F" +
        "-Ck/edit#gid=0";

class BugTracker extends Component {
    myWindow = null;
    openInNewWindow = () => {
        this.myWindow = window.open(BUG_TRACKER_URL, "myWindow", "width=1000,height=750");
    };
    openInNewTab = () => {
        Object.assign(document.createElement('a'), {
            target: '_blank',
            href: BUG_TRACKER_URL
        }).click();
    }
    handleBugLink = e => {
        if (this.props.isMobile) {
            this.openInNewTab();
        } else {
            if (this.myWindow) {
                this
                    .myWindow
                    .focus();
            }
            this.openInNewWindow();
        }
    }
    render = () => <button
        style={{
        textTransform: "uppercase",
        position: "fixed",
        zIndex: 2147483647,
        background: "limegreen",
        color: "#333",
        fontWeight: 700,
        transform: 'translateX(-50%)',
        left: '50%',
        top: 10,
        border: "0.5px outset #333",
        borderRadius: 2,
        padding: "6px 12px"
    }}
        onClick={this.handleBugLink}>Bug Tracker</button>;
}

const mapStateToProps = ({util}) => ({isMobile: util.isMobile});

export default connect(mapStateToProps)(BugTracker);