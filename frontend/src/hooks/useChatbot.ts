import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chatbotApi, ChatbotConfig } from "@/lib/api";

export function useChatbotConfig() {
  return useQuery<ChatbotConfig>({
    queryKey: ["chatbot","config"],
    queryFn: () => chatbotApi.getConfig(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateChatbotConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChatbotConfig>) => chatbotApi.updateConfig(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(["chatbot","config"], updated);
    },
  });
}
