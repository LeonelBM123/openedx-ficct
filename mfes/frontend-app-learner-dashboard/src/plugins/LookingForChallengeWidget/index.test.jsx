import { render, screen } from '@testing-library/react';
import { IntlProvider } from '@edx/frontend-platform/i18n';
import { useCourseCreatorStatus } from 'data/hooks';
import LookingForChallengeWidget from '.';
import messages from './messages';

const courseSearchUrl = 'http://localhost:18000/course-search-url';

const mockMutate = jest.fn();

jest.mock('data/hooks', () => ({
  useInitializeLearnerHome: () => ({
    data: {
      platformSettings: {
        courseSearchUrl,
      },
    },
  }),
  useCourseCreatorStatus: jest.fn(),
  useRequestCourseCreator: () => ({ mutate: mockMutate, isPending: false }),
}));

jest.mock('./track', () => ({
  findCoursesWidgetClicked: (href) => jest.fn().mockName(`track.findCoursesWidgetClicked('${href}')`),
}));

describe('LookingForChallengeWidget', () => {
  beforeEach(() => {
    useCourseCreatorStatus.mockReturnValue({ data: 'unrequested' });
  });

  describe('render', () => {
    it('card image', () => {
      render(<IntlProvider locale="en"><LookingForChallengeWidget /></IntlProvider>);
      const image = screen.getByRole('img', { alt: 'course side widget' });
      expect(image).toBeInTheDocument();
    });
    it('prompt', () => {
      render(<IntlProvider locale="en"><LookingForChallengeWidget /></IntlProvider>);
      const prompt = screen.getByText(messages.lookingForChallengePrompt.defaultMessage);
      expect(prompt).toBeInTheDocument();
    });
    it('hyperlink', () => {
      render(<IntlProvider locale="en"><LookingForChallengeWidget /></IntlProvider>);
      const link = screen.getByRole('link', { href: courseSearchUrl });
      expect(link).toBeInTheDocument();
    });
    // brand-link es la clase que aplica <Hyperlink variant="brand"> a "Encuentra un curso",
    // de modo que ambas acciones del widget se ven igual.
    it('become instructor action shares the find-courses link style', () => {
      render(<IntlProvider locale="en"><LookingForChallengeWidget /></IntlProvider>);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('become-instructor-link');
      expect(button).toHaveClass('brand-link');
    });
    it('hides the instructor action when the user is already a creator', () => {
      useCourseCreatorStatus.mockReturnValue({ data: 'granted' });
      render(<IntlProvider locale="en"><LookingForChallengeWidget /></IntlProvider>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
    it('shows the pending state without a button', () => {
      useCourseCreatorStatus.mockReturnValue({ data: 'pending' });
      render(<IntlProvider locale="en"><LookingForChallengeWidget /></IntlProvider>);
      expect(screen.getByText(messages.instructorRequestPending.defaultMessage)).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
