import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testsService } from '../services/testsService';

export const useTests = () => {
  return useQuery({
    queryKey: ['tests'],
    queryFn: () => testsService.getTests(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useTest = (id: number) => {
  return useQuery({
    queryKey: ['test', id],
    queryFn: () => testsService.getTest(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSubmitTest = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, answers }: { id: number; answers: number[] }) =>
      testsService.submitTest(id, answers),
    onSuccess: (_, { id }) => {
      // После успешной отправки обновляем кэш тестов
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      queryClient.invalidateQueries({ queryKey: ['test', id] });
    },
  });
};