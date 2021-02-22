import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import Popover from 'material-ui/Popover';
import Menu from 'material-ui/Menu';

export default class SettingsPopover extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      open: false,
    };
  }

  handleClick = (event) => {
    // This prevents ghost click.
    event.preventDefault();

    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    });
  };

  handleRequestClose = () => {
    this.setState({
      open: false,
    });
  };

  render() {
    const { 
      rootStyle,
      headerText,
      btnWidth,
      originLabel, 
      originProps,
      primaryLabel,
      primaryProps,
      primaryOnClick, 
      closeOnPrimary,
      closeLabel, 
      anchorOrigin, 
      targetOrigin 
    } = this.props;
    return (
      <div style={rootStyle}>
        <RaisedButton
          type="button"
          onClick={this.handleClick}
          label={originLabel}
          {...originProps}
        />
        <Popover
          open={this.state.open}
          anchorEl={this.state.anchorEl}
          zDepth={3}
          style={{
            padding: 15,
            textAlign: 'center'
          }}
          autoCloseWhenOffScreen={true}
          useLayerForClickAway={true}
          anchorOrigin={anchorOrigin || {
            horizontal: "left",
            vertical: "top"
          }}
          targetOrigin={targetOrigin || {
            horizontal: "left",
            vertical: "bottom"
          }}
          onRequestClose={this.handleRequestClose}
        >
          <Menu>
            {headerText && <h2 style={{fontWeight: 300, marginTop: 0}}>{headerText}</h2>}
            <br/>
            <RaisedButton
                type="button"
                onClick={() => {
                  if (!closeOnPrimary) {
                    primaryOnClick();
                  } else { 
                    primaryOnClick();
                    this.handleRequestClose();
                  }
                }}
                style={{width: btnWidth || 200}}
                primary={!primaryProps}
                label={primaryLabel}
                {...primaryProps}
            />
            <br/>
            <br/>
            <RaisedButton
                type="button"
                style={{width: btnWidth || 200}}
                onClick={this.handleRequestClose}
                secondary={true}
                label={closeLabel}
            />
          </Menu>
        </Popover>
      </div>
    );
  }
};