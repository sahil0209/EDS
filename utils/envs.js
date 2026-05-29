const isLowerEnv = () => {
  const { hostname } = window.location;

  return [
    hostname === 'localhost',
    hostname.endsWith('.aem.page'),
    hostname.endsWith('.aem.live'),
    hostname.startsWith('latest.'),
    hostname.startsWith('stage.'),
  ].some(Boolean);
};

export default isLowerEnv;
