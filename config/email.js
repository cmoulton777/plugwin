module.exports = () => {
    // Default to dev presets
    const emailConfig = {
      apiKey: 'key-397344d8e7b89ef33f14f5a66b814006',
      domain: 'plugwin.com',
    };
  
    switch (process.env.NODE_ENV) {
      case 'production':
        break;
      case 'stage':
        break;
      case 'dev':
      default:
        break;
    }
  
    return emailConfig;
  };