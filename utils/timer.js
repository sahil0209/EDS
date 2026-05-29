import { createElement } from './dom.js';
import { parseDate } from './date.js';

/**
 * Calculates time remaining until a target date
 * @param {Date} targetDate - The target date to count down to
 * @returns {Object} Object with days, hours, minutes, seconds
 */
function calculateTimeRemaining(targetDate) {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();

  if (difference <= 0) {
    return {
      days: 0, hours: 0, minutes: 0, seconds: 0, expired: true,
    };
  }

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((difference % (1000 * 60)) / 1000);

  return {
    days,
    hours,
    minutes,
    seconds,
    expired: false,
  };
}

/**
 * Formats a number with leading zeros
 * @param {number} num - Number to format
 * @param {number} digits - Number of digits (default 2)
 * @returns {string} Formatted number string
 */
function padNumber(num, digits = 2) {
  return num.toString().padStart(digits, '0');
}

/**
 * Creates individual digit containers for flip-clock style timer
 * @param {string} value - The value to display (e.g., "141", "04")
 * @returns {Element} Container with individual digit elements
 */
function createDigitGroup(value) {
  const digits = value.split('');
  return createElement(
    'div',
    { class: 'timer-digits' },
    digits.map((digit) => createElement('div', { class: 'timer-digit' }, [createElement('span', {}, digit)])),
  );
}

/**
 * Creates the HTML structure for a countdown timer
 * @param {string} className - CSS class name for the timer container
 * @returns {Element} Timer element with proper structure
 */
function createTimerElement(className = 'event-header-countdown') {
  return createElement('div', { class: className }, [
    createElement('div', { class: 'timer-group' }, [
      createDigitGroup('000'),
      createElement('div', { class: 'timer-label' }, 'Days'),
    ]),
    createElement('div', { class: 'timer-group' }, [
      createDigitGroup('00'),
      createElement('div', { class: 'timer-label' }, 'Hours'),
    ]),
    createElement('div', { class: 'timer-group' }, [
      createDigitGroup('00'),
      createElement('div', { class: 'timer-label' }, 'Mins'),
    ]),
    createElement('div', { class: 'timer-group' }, [
      createDigitGroup('00'),
      createElement('div', { class: 'timer-label' }, 'Secs'),
    ]),
  ]);
}

/**
 * Updates the display of a digit group with new values
 * @param {Element} digitsEl - The digit group element
 * @param {string} value - The new value to display
 */
function updateDigitGroup(digitsEl, value) {
  const digits = value.split('');
  const digitElements = digitsEl.querySelectorAll('.timer-digit span');

  digits.forEach((digit, index) => {
    if (digitElements[index]) {
      digitElements[index].textContent = digit;
    }
  });
}

/**
 * Creates and manages a countdown timer
 * @param {string|number|Date} targetDate - Target date to count down to
 * @param {Element} timerElement - DOM element containing timer groups
 * @returns {Object} Timer object with start/stop methods
 */
function createCountdownTimer(targetDate, timerElement) {
  const target = parseDate(targetDate);

  if (!target) {
    // eslint-disable-next-line no-console
    console.error('Invalid target date for countdown timer');
    return null;
  }

  const dayDigitsEl = timerElement.querySelector('.timer-group:nth-child(1) .timer-digits');
  const hourDigitsEl = timerElement.querySelector('.timer-group:nth-child(2) .timer-digits');
  const minDigitsEl = timerElement.querySelector('.timer-group:nth-child(3) .timer-digits');
  const secDigitsEl = timerElement.querySelector('.timer-group:nth-child(4) .timer-digits');

  let intervalId = null;

  function updateTimer() {
    const timeRemaining = calculateTimeRemaining(target);

    if (timeRemaining.expired) {
      updateDigitGroup(dayDigitsEl, '000');
      updateDigitGroup(hourDigitsEl, '00');
      updateDigitGroup(minDigitsEl, '00');
      updateDigitGroup(secDigitsEl, '00');

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      return;
    }

    updateDigitGroup(dayDigitsEl, padNumber(timeRemaining.days, 3));
    updateDigitGroup(hourDigitsEl, padNumber(timeRemaining.hours));
    updateDigitGroup(minDigitsEl, padNumber(timeRemaining.minutes));
    updateDigitGroup(secDigitsEl, padNumber(timeRemaining.seconds));
  }

  function start() {
    updateTimer();
    intervalId = setInterval(updateTimer, 1000);
  }

  function stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  return {
    start,
    stop,
    updateTimer,
  };
}

export {
  calculateTimeRemaining,
  padNumber,
  createTimerElement,
  createCountdownTimer,
};
