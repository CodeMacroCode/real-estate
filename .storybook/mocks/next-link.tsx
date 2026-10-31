import React from 'react';

export interface NextLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string | object;
  children: React.ReactNode;
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
}

export default function Link({ href, children, ...props }: NextLinkProps) {
  const targetHref = typeof href === 'object' ? '#' : href;
  return (
    <a
      href={targetHref}
      onClick={(e) => {
        // Prevent real navigation in Storybook iframe
        e.preventDefault();
        console.log(`[Storybook Link] Navigate to ${targetHref}`);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
