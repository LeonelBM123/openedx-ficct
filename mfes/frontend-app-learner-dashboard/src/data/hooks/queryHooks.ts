import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useBackedData, useMasquerade } from 'data/context';
import {
  initializeList,
  getCourseCreatorStatus,
  getPopularCourses,
  getCourseProgress,
} from 'data/services/lms/api';
import { learnerDashboardQueryKeys } from './queryKeys';

const FIVE_MINUTES = 5 * 60 * 1000;

const useInitializeLearnerHome = () => {
  const { masqueradeUser } = useMasquerade();
  const { backUpData, setBackUpData } = useBackedData();

  const query = useQuery({
    queryKey: learnerDashboardQueryKeys.initialize(masqueradeUser),
    queryFn: async () => initializeList(masqueradeUser),
    retry: false,
    retryOnMount: !masqueradeUser,
    refetchOnMount: !masqueradeUser,
  });

  useEffect(() => {
    if (!masqueradeUser && query.data) {
      setBackUpData(query.data);
    }
  }, [masqueradeUser, query.data, setBackUpData]);

  // When masquerading fails, show the original user's dashboard rather than an error
  let { data } = query;
  if (masqueradeUser && query.isError) {
    data = backUpData;
  }

  return { ...query, data };
};

// Estado de course creator del usuario, desde el home de Studio.
// retry: false para que un 403/CORS no reintente en bucle.
const useCourseCreatorStatus = () => useQuery({
  queryKey: learnerDashboardQueryKeys.courseCreatorStatus(),
  queryFn: () => getCourseCreatorStatus(),
  retry: false,
});

// Cursos mas demandados. retry: false para que, si el endpoint aun no esta desplegado,
// la seccion simplemente no se muestre en vez de reintentar en bucle.
const usePopularCourses = (limit: number = 8) => useQuery({
  queryKey: learnerDashboardQueryKeys.popularCourses(limit),
  queryFn: () => getPopularCourses(limit),
  retry: false,
  staleTime: FIVE_MINUTES,
});

// Progreso de un curso. Cada CourseCard pide el suyo, por lo que solo se consultan
// los cursos de la pagina visible.
const useCourseProgress = (courseId: string, enabled: boolean = true) => useQuery({
  queryKey: learnerDashboardQueryKeys.courseProgress(courseId),
  queryFn: () => getCourseProgress(courseId),
  enabled: enabled && !!courseId,
  retry: false,
  staleTime: FIVE_MINUTES,
});

export {
  useInitializeLearnerHome,
  useCourseCreatorStatus,
  usePopularCourses,
  useCourseProgress,
};
