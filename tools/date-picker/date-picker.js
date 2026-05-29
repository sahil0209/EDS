// eslint-disable-next-line import/no-unresolved
import DA_SDK from 'https://da.live/nx/utils/sdk.js';

(async function init() {
  const { actions } = await DA_SDK;

  const currentDate = new Date();
  let selectedDate = null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentMonthElement = document.getElementById('currentMonth');
  const calendarGrid = document.getElementById('calendarGrid');
  const selectedDateDisplay = document.getElementById('selectedDateDisplay');
  const prevMonthButton = document.getElementById('prevMonth');
  const nextMonthButton = document.getElementById('nextMonth');

  function formatDate(date) {
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);

    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  function insertDate() {
    if (!selectedDate) return;

    const formattedDate = formatDate(selectedDate);

    try {
      actions.sendText(formattedDate);
      actions.closeLibrary();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error inserting date:', error);

      navigator.clipboard.writeText(formattedDate).then(() => {
        showMessage(`Date copied to clipboard: ${formattedDate}`, 'success');
      }).catch(() => {
        showMessage('Failed to insert date. Please copy manually.', 'error');
      });
    }
  }

  function generateCalendar(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    calendarGrid.innerHTML = '';

    dayNames.forEach((day) => {
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      dayHeader.textContent = day;
      calendarGrid.appendChild(dayHeader);
    });

    for (let i = 0; i < startingDayOfWeek; i += 1) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'calendar-day empty';
      calendarGrid.appendChild(emptyCell);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayElement = document.createElement('div');
      dayElement.className = 'calendar-day';
      dayElement.textContent = day;
      dayElement.dataset.day = day;

      const cellDate = new Date(year, month, day);
      const today = new Date();

      if (cellDate.toDateString() === today.toDateString()) {
        dayElement.classList.add('today');
      }

      if (selectedDate && cellDate.toDateString() === selectedDate.toDateString()) {
        dayElement.classList.add('selected');
      }

      dayElement.addEventListener('click', () => {
        // eslint-disable-next-line no-use-before-define
        selectDate(cellDate);
      });
      calendarGrid.appendChild(dayElement);
    }
  }

  function selectDate(date) {
    selectedDate = date;
    selectedDateDisplay.textContent = formatDate(date);

    generateCalendar(currentDate.getFullYear(), currentDate.getMonth());

    insertDate();
  }

  function updateCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    currentMonthElement.textContent = `${monthNames[month]} ${year}`;
    generateCalendar(year, month);
  }

  function navigateMonth(direction) {
    if (direction === 'prev') {
      currentDate.setMonth(currentDate.getMonth() - 1);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    updateCalendar();
  }

  // Event listeners
  prevMonthButton.addEventListener('click', () => navigateMonth('prev'));
  nextMonthButton.addEventListener('click', () => navigateMonth('next'));

  // Initialize calendar
  updateCalendar();
}());
