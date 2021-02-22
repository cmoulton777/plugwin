module.exports = () => {
    // Default to dev presets
    let dbConfig = {
      url:
        "mongodb://admin:REntal16!#@ds161262.mlab.com:61262/dev-plugwin",
      opts: {
        useMongoClient: true,
        autoReconnect: true
      }
    };
  
    switch (process.env.NODE_ENV) {
      case "production":  
        dbConfig.url = "mongodb://admin:kyGu4nZRLHvwAbD7@SG-plugwindb01-13412.servers.mongodirector.com:27017/admin?ssl=true"
        break;
      case "stage":
        break;
      case "test":
        break;
      case "dev":
      default:
        break;
    }
  
    return dbConfig;
  };