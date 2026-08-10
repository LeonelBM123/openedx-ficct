import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { useCourseData, useEntitlementInfo, useIsMasquerading } from 'hooks';
import { useCourseProgress } from 'data/hooks';

import CourseCardProgress from '.';
import messages from './messages';

jest.mock('hooks', () => ({
  useCourseData: jest.fn(),
  useEntitlementInfo: jest.fn(),
  useIsMasquerading: jest.fn(),
}));

jest.mock('data/hooks', () => ({
  useCourseProgress: jest.fn(),
}));

const cardId = 'card-0';
const courseId = 'course-v1:FICCT+INF102+2026-1';

const renderComponent = ({
  completionSummary = { complete_count: 3, incomplete_count: 7, locked_count: 0 },
  isPending = false,
  isError = false,
  isMasquerading = false,
  entitlementInfo = { isEntitlement: false, isFulfilled: false },
  courseRun = { courseId },
} = {}) => {
  useCourseData.mockReturnValue({ courseRun });
  useIsMasquerading.mockReturnValue(isMasquerading);
  useEntitlementInfo.mockReturnValue(entitlementInfo);
  useCourseProgress.mockReturnValue({ data: completionSummary, isPending, isError });
  return render(<IntlProvider locale="en"><CourseCardProgress cardId={cardId} /></IntlProvider>);
};

describe('CourseCardProgress', () => {
  it('renders the label and the completed percentage of the course', () => {
    renderComponent();
    expect(screen.getByTestId('CourseCardProgress')).toBeInTheDocument();
    expect(screen.getByText(messages.progressLabel.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText('30 %')).toBeInTheDocument();
  });

  it('shows the completed state when the course is at 100%', () => {
    renderComponent({ completionSummary: { complete_count: 10, incomplete_count: 0, locked_count: 0 } });
    expect(screen.getByText(messages.courseCompleted.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText('100 %')).toBeInTheDocument();
    expect(screen.getByTestId('CourseCardProgress')).toHaveClass('is-complete');
  });

  it('does not show the completed state below 100%', () => {
    renderComponent();
    expect(screen.queryByText(messages.courseCompleted.defaultMessage)).not.toBeInTheDocument();
    expect(screen.getByTestId('CourseCardProgress')).not.toHaveClass('is-complete');
  });

  it('renders a placeholder while loading', () => {
    renderComponent({ isPending: true, completionSummary: undefined });
    expect(screen.getByTestId('CourseCardProgressLoading')).toBeInTheDocument();
  });

  it('renders nothing when the progress request fails', () => {
    renderComponent({ isError: true, completionSummary: undefined });
    expect(screen.queryByTestId('CourseCardProgress')).not.toBeInTheDocument();
  });

  it('renders nothing when the course has no completable units', () => {
    renderComponent({ completionSummary: { complete_count: 0, incomplete_count: 0, locked_count: 0 } });
    expect(screen.queryByTestId('CourseCardProgress')).not.toBeInTheDocument();
  });

  it('renders nothing while masquerading', () => {
    renderComponent({ isMasquerading: true });
    expect(screen.queryByTestId('CourseCardProgress')).not.toBeInTheDocument();
  });

  it('renders nothing for an unfulfilled entitlement', () => {
    renderComponent({ entitlementInfo: { isEntitlement: true, isFulfilled: false } });
    expect(screen.queryByTestId('CourseCardProgress')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no course run', () => {
    renderComponent({ courseRun: {} });
    expect(screen.queryByTestId('CourseCardProgress')).not.toBeInTheDocument();
  });
});
