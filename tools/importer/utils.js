import boxen from 'boxen'; // eslint-disable-line import/no-extraneous-dependencies
import colors from 'colors'; // eslint-disable-line import/no-extraneous-dependencies

colors.setTheme({
  info: 'cyan',
  data: 'grey',
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
  success: 'green',
  highlight: 'magenta',
});

export const logger = {
  info: (message) => console.log(colors.info(message)), // eslint-disable-line no-console
  success: (message) => console.log(colors.success(message)), // eslint-disable-line no-console
  warn: (message) => console.log(colors.warn(message)), // eslint-disable-line no-console
  error: (message) => console.log(colors.error(message)), // eslint-disable-line no-console
  debug: (message) => console.log(colors.debug(message)), // eslint-disable-line no-console
  data: (message) => console.log(colors.data(message)), // eslint-disable-line no-console

  box: (title, content, options = {}) => {
    console.log(boxen(content, { // eslint-disable-line no-console
      title,
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      titleAlignment: 'center',
      ...options,
    }));
  },

  request: (method, url) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(colors.highlight(`[${timestamp}] ${method} ${url}`)); // eslint-disable-line no-console
  },
};

export const formatFileSize = (bytes) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${Math.round((bytes / (1024 ** i)) * 100) / 100} ${sizes[i]}`;
};

export const formatDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

export { colors };
