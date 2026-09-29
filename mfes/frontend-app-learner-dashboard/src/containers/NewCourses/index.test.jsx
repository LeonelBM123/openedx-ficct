import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { useNewCourses, useInitializeLearnerHome } from 'data/hooks';

import NewCourses from '.';
import messages from './messages';

jest.mock('data/hooks', () => ({
  useNewCourses: jest.fn(),
  useInitializeLearnerHome: jest.fn(),
}));

const course = (courseId, title, extra = { created: '2026-01-01T00:00:00Z' }) => ({
  course_id: courseId,
  title,
  org: 'FICCT',
  number: 'INF102',
  image_url: '/asset-v1:image.jpg',
  about_url: `/courses/${courseId}/about`,
  enrollment_count: 0,
  ...extra,
});

const renderComponent = ({ courses = [], isError = false, enrolledIds = [] } = {}) => {
  useNewCourses.mockReturnValue({ data: courses, isError });
  useInitializeLearnerHome.mockReturnValue({
    data: { courses: enrolledIds.map((courseId) => ({ courseRun: { courseId } })) },
  });
  return render(<IntlProvider locale="en"><NewCourses /></IntlProvider>);
};

describe('NewCourses', () => {
  it('renders the section with the new badge', () => {
    renderComponent({ courses: [course('course-v1:a', 'Base de Datos')] });
    expect(screen.getByText(messages.sectionTitle.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText('Base de Datos')).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
  });

  it('excludes courses the learner is already enrolled in', () => {
    renderComponent({
      courses: [course('course-v1:a', 'Base de Datos'), course('course-v1:b', 'Redes')],
      enrolledIds: ['course-v1:a'],
    });
    expect(screen.queryByText('Base de Datos')).not.toBeInTheDocument();
    expect(screen.getByText('Redes')).toBeInTheDocument();
  });

  it('renders nothing on error', () => {
    renderComponent({ courses: [course('course-v1:a', 'Base de Datos')], isError: true });
    expect(screen.queryByTestId('NewCourses')).not.toBeInTheDocument();
  });

  it('renders nothing when the backend does not return `created`', () => {
    renderComponent({ courses: [course('course-v1:a', 'Base de Datos', {})] });
    expect(screen.queryByTestId('NewCourses')).not.toBeInTheDocument();
  });
});
