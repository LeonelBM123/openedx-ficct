import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';

import { usePopularCourses, useInitializeLearnerHome } from 'data/hooks';

import PopularCourses from '.';
import messages from './messages';

jest.mock('data/hooks', () => ({
  usePopularCourses: jest.fn(),
  useInitializeLearnerHome: jest.fn(),
}));

const popularCourse = (courseId, title, enrollmentCount) => ({
  course_id: courseId,
  title,
  org: 'FICCT',
  number: 'INF102',
  short_description: '',
  image_url: '/asset-v1:image.jpg',
  about_url: `/courses/${courseId}/about`,
  enrollment_count: enrollmentCount,
  start: null,
});

const renderComponent = ({ popular = [], isError = false, enrolledIds = [] } = {}) => {
  usePopularCourses.mockReturnValue({ data: popular, isError });
  useInitializeLearnerHome.mockReturnValue({
    data: { courses: enrolledIds.map((courseId) => ({ courseRun: { courseId } })) },
  });
  return render(<IntlProvider locale="en"><PopularCourses /></IntlProvider>);
};

describe('PopularCourses', () => {
  it('renders the section with the popular courses', () => {
    renderComponent({ popular: [popularCourse('course-v1:a', 'Base de Datos', 5)] });
    expect(screen.getByText(messages.sectionTitle.defaultMessage)).toBeInTheDocument();
    expect(screen.getByText('Base de Datos')).toBeInTheDocument();
  });

  it('shows the enrollment count of each course', () => {
    renderComponent({ popular: [popularCourse('course-v1:a', 'Base de Datos', 5)] });
    expect(screen.getByText('5 inscritos')).toBeInTheDocument();
  });

  it('excludes courses the learner is already enrolled in', () => {
    renderComponent({
      popular: [
        popularCourse('course-v1:a', 'Base de Datos', 5),
        popularCourse('course-v1:b', 'Redes', 3),
      ],
      enrolledIds: ['course-v1:a'],
    });
    expect(screen.queryByText('Base de Datos')).not.toBeInTheDocument();
    expect(screen.getByText('Redes')).toBeInTheDocument();
  });

  it('renders nothing when every popular course is already enrolled', () => {
    renderComponent({
      popular: [popularCourse('course-v1:a', 'Base de Datos', 5)],
      enrolledIds: ['course-v1:a'],
    });
    expect(screen.queryByTestId('PopularCourses')).not.toBeInTheDocument();
  });

  it('renders nothing when the endpoint fails', () => {
    renderComponent({ popular: [], isError: true });
    expect(screen.queryByTestId('PopularCourses')).not.toBeInTheDocument();
  });
});
