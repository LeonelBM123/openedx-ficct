import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { getLocale, useIntl } from '@edx/frontend-platform/i18n';
import {
  IconButton, Icon, OverlayTrigger, Popover,
} from '@openedx/paragon';
import { ArrowBackIos, ArrowForward } from '@openedx/paragon/icons';

import { daycmp } from '../utils';
import messages from '../messages';

const WEEKDAY_COUNT = 7;

// Semana empieza en lunes (convención en es_419), a diferencia del domingo por defecto de
// Intl/Date en inglés.
const getWeekdayLabels = (locale) => {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  // 2024-01-01 fue lunes: arrancamos ahí para leer lun..dom en orden.
  return [...Array(WEEKDAY_COUNT)].map((_, i) => {
    const d = new Date(Date.UTC(2024, 0, 1 + i));
    return formatter.format(d);
  });
};

const buildMonthGrid = (year, month) => {
  const firstOfMonth = new Date(year, month, 1);
  // getDay(): 0=domingo..6=sábado. Convertimos a offset lunes=0..domingo=6.
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % WEEKDAY_COUNT !== 0) {
    cells.push(null);
  }

  const weeks = [];
  for (let i = 0; i < cells.length; i += WEEKDAY_COUNT) {
    weeks.push(cells.slice(i, i + WEEKDAY_COUNT));
  }
  return weeks;
};

const DayCell = ({ date, events, isToday }) => {
  const intl = useIntl();

  if (!date) {
    return <td className="month-calendar__cell month-calendar__cell--empty" aria-hidden="true" />;
  }

  const dayNumber = date.getDate();
  const hasEvents = events.length > 0;

  const cellContent = (
    <div
      className={classNames('month-calendar__day', {
        'month-calendar__day--today': isToday,
        'month-calendar__day--has-events': hasEvents,
      })}
      tabIndex={hasEvents ? 0 : -1}
    >
      <span>{dayNumber}</span>
      {hasEvents && <span className="month-calendar__dot" aria-hidden="true" />}
    </div>
  );

  return (
    <td className="month-calendar__cell" role="gridcell">
      {hasEvents ? (
        <OverlayTrigger
          trigger={['hover', 'focus']}
          placement="top"
          overlay={(
            <Popover id={`month-calendar-day-${date.toISOString()}`}>
              <Popover.Content>
                <ul className="list-unstyled m-0 small">
                  {events.map((event) => (
                    <li key={event.title}>
                      {event.assignmentType && `${event.assignmentType}: `}{event.title}
                    </li>
                  ))}
                </ul>
              </Popover.Content>
            </Popover>
          )}
        >
          {cellContent}
        </OverlayTrigger>
      ) : cellContent}
      <span className="sr-only">
        {hasEvents && intl.formatMessage(
          messages.calendarDayEventsAltText,
          { count: events.length },
        )}
      </span>
    </td>
  );
};

DayCell.propTypes = {
  date: PropTypes.instanceOf(Date),
  events: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    assignmentType: PropTypes.string,
  })).isRequired,
  isToday: PropTypes.bool.isRequired,
};

DayCell.defaultProps = {
  date: null,
};

const MonthCalendar = ({ courseDateBlocks }) => {
  const intl = useIntl();
  const locale = getLocale();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const weeks = useMemo(
    () => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map();
    courseDateBlocks.forEach((block) => {
      const date = new Date(block.date);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(block);
    });
    return map;
  }, [courseDateBlocks]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(cursor),
    [cursor, locale],
  );

  const goToPreviousMonth = () => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goToNextMonth = () => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  return (
    <div className="month-calendar" data-testid="dates-month-calendar">
      <div className="d-flex align-items-center justify-content-between mb-2">
        <IconButton
          src={ArrowBackIos}
          iconAs={Icon}
          alt={intl.formatMessage(messages.calendarPreviousMonthAltText)}
          onClick={goToPreviousMonth}
          size="sm"
        />
        <span className="font-weight-bold text-capitalize" aria-live="polite">{monthLabel}</span>
        <IconButton
          src={ArrowForward}
          iconAs={Icon}
          alt={intl.formatMessage(messages.calendarNextMonthAltText)}
          onClick={goToNextMonth}
          size="sm"
        />
      </div>
      <table className="month-calendar__table" role="grid" aria-label={monthLabel}>
        <thead>
          <tr role="row">
            {weekdayLabels.map((label) => (
              <th key={label} scope="col" className="month-calendar__cell month-calendar__weekday">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={weekIndex} role="row">
              {week.map((date, dayIndex) => {
                const key = date ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : `empty-${dayIndex}`;
                return (
                  <DayCell
                    key={key}
                    date={date}
                    events={date ? (eventsByDay.get(key) || []) : []}
                    isToday={!!date && daycmp(date, today) === 0}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

MonthCalendar.propTypes = {
  courseDateBlocks: PropTypes.arrayOf(PropTypes.shape({
    title: PropTypes.string,
    date: PropTypes.string,
    assignmentType: PropTypes.string,
  })).isRequired,
};

export default MonthCalendar;
