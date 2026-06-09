import { useQuery } from '@tanstack/react-query';
import { sectionsService } from '../services/sectionsService';

export const useSections = (page = 1, limit = 12) => {
  return useQuery({
    queryKey: ['sections', page, limit],
    queryFn: () => sectionsService.getSections(page, limit),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSection = (id: number) => {
  return useQuery({
    queryKey: ['section', id],
    queryFn: () => sectionsService.getSection(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSearchSections = (query: string) => {
  return useQuery({
    queryKey: ['sections-search', query],
    queryFn: () => sectionsService.searchSections(query),
    enabled: query.length >= 2,
    staleTime: 60 * 1000,
  });
};
