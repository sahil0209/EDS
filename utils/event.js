/**
 * Fetches event data for the current page
 * @param {string} eventId - Optional event ID to search for
 * @returns {Promise<object|null>} Event data or null if not found
 */
async function getEventData(eventId) {
  const currentPath = window.location.pathname;

  try {
    const events = await window.fetchEventData();

    let event = events.find((eventData) => {
      const pathMatch = currentPath === eventData.path;
      const idMatch = eventId && eventData.eventId === eventId;
      return pathMatch || idMatch;
    });

    if (!event) {
      const parentEvent = events.find((eventData) => currentPath.startsWith(`${eventData.path}/`));
      if (parentEvent && parentEvent.categories) {
        event = parentEvent.categories.find((category) => currentPath === category.path);
        if (event) {
          event = {
            ...event,
            eventId: parentEvent.id || parentEvent.eventId,
            eventIcon: parentEvent.eventIcon,
            registrationStartDate: parentEvent.registrationStartDate,
            startDate: parentEvent.startDate,
            endDate: parentEvent.endDate,
            gradient: parentEvent.gradient,
            byline: parentEvent.byline,
          };
        }
      }

      if (!event) {
        event = parentEvent;
      }
    }

    return event || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load events:', error);
    return null;
  }
}

// eslint-disable-next-line import/prefer-default-export
export { getEventData };
