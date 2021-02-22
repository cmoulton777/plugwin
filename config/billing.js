module.exports = () => {
    // Default to dev presets
    let billingConfig = {
      stripeApiKey: 'sk_test_9HQTJxZgVX4OO6GAKQpLCPpT',
    };
  
    switch (process.env.NODE_ENV) {
      case 'production':
        billingConfig.stripeApiKey = 'sk_live_t6KlHZBWeYjOvYjNMJzpRXoN';
        break;
      case 'stage':
        break;
      case 'dev':
      default:
        break;
    }
  
    return billingConfig;
  };