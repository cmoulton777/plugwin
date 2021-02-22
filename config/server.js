module.exports = () => {
  // Default to dev presets
  const serverConfig = {
    port: 8081
  };

  switch (process.env.NODE_ENV) {
    case "production":
      break;
    case "stage":
      break;
    case "test":
      break;
    case "dev":
    default:
      break;
  }

  return serverConfig;
};
