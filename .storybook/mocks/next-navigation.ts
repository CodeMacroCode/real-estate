// Mock for next/navigation in Storybook
export const useRouter = () => ({
  push: (url: string) => console.log(`[Storybook Router] push: ${url}`),
  replace: (url: string) => console.log(`[Storybook Router] replace: ${url}`),
  prefetch: () => {},
  back: () => console.log('[Storybook Router] back'),
  forward: () => console.log('[Storybook Router] forward'),
  refresh: () => console.log('[Storybook Router] refresh'),
});

export const usePathname = () => '/dashboard';

export const useSearchParams = () => new URLSearchParams();

export const useParams = () => ({});

export const redirect = (url: string) => {
  console.log(`[Storybook Router] redirect to: ${url}`);
};

export const notFound = () => {
  console.log('[Storybook Router] notFound');
};
